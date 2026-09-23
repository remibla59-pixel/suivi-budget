// --- Rapprochement et application d'un import de relevé bancaire ---
// Ces fonctions sont pures : `applyBankImport` reconstruit la config et les données
// mensuelles à partir des lignes validées par l'utilisateur, ce qui permet de tester
// tout l'impact comptable (soldes, enveloppes, provisions) sans React ni Firestore.

import { round } from './budgetMath';

const ACCENTS = /[\u0300-\u036f]/g;

// Normalise un libellé pour les comparaisons (majuscules, sans accents ni ponctuation).
export const normalizeLabel = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(ACCENTS, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();

// Mots significatifs (4 lettres et plus) : évite les rapprochements sur « EAU » ou « CB ».
const significantWords = (value) => normalizeLabel(value).split(' ').filter((w) => w.length >= 4);

// Clé stable d'une opération : FITID (identifiant unique fourni par la banque) quand
// il existe, sinon une empreinte date + montant + libellé.
export const transactionKey = (txn) =>
  txn?.fitId
    ? `fit:${txn.fitId}`
    : `fp:${txn?.date ?? ''}|${round(txn?.amount ?? 0)}|${normalizeLabel(txn?.label ?? txn?.name ?? '')}`;

// Cibles encodées pour un <select> : 'none', 'income', 'fixed:p1', 'envelope:env_x'…
const ENCODED_KINDS = ['fixed', 'flexible', 'envelope', 'provision'];

export const encodeTarget = ({ kind, id } = {}) =>
  ENCODED_KINDS.includes(kind) && id ? `${kind}:${id}` : (kind || 'none');

export const decodeTarget = (value) => {
  const [kind, ...rest] = String(value ?? '').split(':');
  return { kind: kind || 'none', id: rest.join(':') || null };
};

// Suggestion automatique : on rapproche le libellé bancaire des intitulés configurés
// (charges fixes, dépenses courantes, enveloppes). Un montant identique à ±1 € renforce
// fortement une charge fixe. Les factures provisionnées restent un choix manuel.
export const suggestTarget = (txn, config = {}) => {
  const haystack = new Set(significantWords(`${txn?.label ?? ''} ${txn?.name ?? ''} ${txn?.memo ?? ''}`));
  const amount = Math.abs(round(txn?.amount ?? 0));
  const scored = [];

  const consider = (kind, item, bonus = 0) => {
    if (!item?.label) return;
    const matched = significantWords(item.label).filter((w) => haystack.has(w));
    if (matched.length === 0 && bonus === 0) return;
    scored.push({ kind, id: item.id, label: item.label, score: matched.length + bonus });
  };

  (config.postes || [])
    .filter((p) => p.type === 'fixe')
    .forEach((p) => consider('fixed', p, Math.abs((p.montant ?? 0) - amount) <= 1 ? 2 : 0));
  (config.budgetsFlexibles || []).forEach((b) => consider('flexible', b));
  (config.envelopes || []).forEach((e) => consider('envelope', e));

  scored.sort((a, b) => b.score - a.score);
  return scored.length ? scored[0] : { kind: 'none', id: null, label: '' };
};

// --- Rappels mémorisés ------------------------------------------------------
// Chaque classement choisi par l'utilisateur est retenu sous forme de règle
// { match, target } : le libellé sert de clé, la cible encodée est réappliquée
// automatiquement aux imports suivants. Les libellés bancaires charrient souvent
// des références qui changent d'un mois à l'autre (numéro de mandat, date…), la clé
// ne garde donc que les premiers mots significatifs, hors chiffres.
export const ruleKey = (txn) => {
  const words = significantWords(`${txn?.label ?? ''} ${txn?.name ?? ''}`).filter((w) => !/^\d+$/.test(w));
  if (words.length) return words.slice(0, 3).join(' ');
  return normalizeLabel(txn?.memo ?? txn?.label ?? txn?.name ?? '');
};

// Une cible mémorisée peut devenir obsolète (charge supprimée, enveloppe renommée) :
// on refuse alors la règle plutôt que d'écrire dans une cible inexistante.
export const targetExists = (target, config = {}) => {
  const { kind, id } = decodeTarget(target);
  if (kind === 'none' || kind === 'income') return true;
  if (kind === 'fixed') return (config.postes || []).some((p) => p.id === id && p.type === 'fixe');
  if (kind === 'flexible') return (config.budgetsFlexibles || []).some((b) => b.id === id);
  if (kind === 'envelope') return (config.envelopes || []).some((e) => e.id === id);
  if (kind === 'provision')
    return Object.values(config.provisionsByYear || {}).some((list) => (list || []).some((p) => p.id === id));
  return false;
};

// Cible mémorisée pour une opération, ou `null` si aucune règle ne correspond.
// `config` est optionnel : fourni, il invalide les règles devenues caduques.
export const ruleTargetFor = (txn, rules = [], config) => {
  const key = ruleKey(txn);
  if (!key) return null;
  const rule = (rules || []).find((r) => r?.match === key && r?.target);
  if (!rule) return null;
  if (config && !targetExists(rule.target, config)) return null;
  return rule.target;
};

// Apprend les classements des lignes validées. Une ligne ignorée (« none ») n'est
// jamais mémorisée, et reclasser un libellé déjà connu met à jour la règle existante.
export const learnBankImportRules = (rules = [], rows = []) => {
  const next = [...(rules || [])];
  (rows || []).forEach((row) => {
    if (!row || row.include === false) return;
    const { kind } = decodeTarget(row.target);
    if (!kind || kind === 'none') return;
    const match = ruleKey(row);
    if (!match) return;
    const rule = { id: match, match, target: row.target, label: row.label || row.name || row.memo || '' };
    const index = next.findIndex((r) => r.match === match);
    if (index >= 0) next[index] = rule;
    else next.push(rule);
  });
  return next.slice(-200);
};

// Prépare les lignes proposées à l'utilisateur en écartant ce qui a déjà été importé
// (y compris les doublons présents deux fois dans le même fichier). Les règles
// mémorisées priment sur la suggestion automatique.
export const buildImportCandidates = (transactions, { importedKeys = [], config = {} } = {}) => {
  const known = new Set(importedKeys);
  const rows = [];
  const duplicates = [];
  const rules = config.bankImportRules || [];

  (transactions || []).forEach((txn) => {
    const key = transactionKey(txn);
    if (known.has(key)) {
      duplicates.push({ ...txn, key });
      return;
    }
    known.add(key);
    const remembered = ruleTargetFor(txn, rules, config);
    const suggestion = suggestTarget(txn, config);
    rows.push({
      ...txn,
      key,
      monthKey: String(txn.date || '').slice(0, 7),
      target: remembered || encodeTarget(suggestion),
      targetSource: remembered ? 'memory' : suggestion.kind === 'none' ? 'none' : 'auto',
      include: true,
    });
  });

  return { rows, duplicates };
};

// Applique les lignes validées. Impact par cible :
// - fixed      : marque la charge fixe payée à la date de l'opération et débite le compte courant
// - flexible   : ajoute une dépense courante et débite le compte courant
// - envelope   : ajoute une dépense d'enveloppe et diminue la cagnotte (l'argent y a déjà été versé)
// - provision  : ajoute une facture payée, débite le compte de provisions et incrémente le « spent »
// - income     : ajoute une entrée d'argent (ligne de revenu, sans impact sur les soldes tenus à part)
export const applyBankImport = ({ config = {}, monthlyData = {}, rows = [] } = {}) => {
  let comptes = [...(config.comptes || [])];
  let envelopes = [...(config.envelopes || [])];
  const provisionsByYear = { ...(config.provisionsByYear || {}) };
  const nextMonthlyData = { ...monthlyData };

  const applied = [];
  const skipped = [];
  let totalOut = 0;
  let totalIn = 0;

  const moveCourant = (delta) => {
    comptes = comptes.map((c) => (c.type === 'courant' ? { ...c, initial: round((c.initial || 0) + delta) } : c));
  };

  (rows || []).forEach((row) => {
    if (!row || row.include === false) return;
    const { kind, id } = decodeTarget(row.target);
    if (kind === 'none') return;

    const monthKey = String(row.date || '').slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(monthKey)) {
      skipped.push({ ...row, reason: 'date' });
      return;
    }
    const mData = nextMonthlyData[monthKey] || {};
    if (mData.isClosed) {
      skipped.push({ ...row, reason: 'closed' });
      return;
    }

    const amount = Math.abs(round(row.amount || 0));
    const label = row.label || row.name || row.memo || 'Opération importée';
    // La clé identifie l'opération de façon stable (FITID de la banque ou empreinte).
    const key = row.key || transactionKey(row);
    const entry = { id: key, label, amount, date: row.date };

    if (kind === 'fixed') {
      if (mData.fixedStatus?.[id]) {
        skipped.push({ ...row, reason: 'alreadyPaid' });
        return;
      }
      nextMonthlyData[monthKey] = {
        ...mData,
        depenses: { ...(mData.depenses || {}), [id]: amount },
        fixedStatus: { ...(mData.fixedStatus || {}), [id]: true },
        fixedDates: { ...(mData.fixedDates || {}), [id]: row.date },
      };
      moveCourant(-amount);
    } else if (kind === 'flexible') {
      nextMonthlyData[monthKey] = {
        ...mData,
        flexibleExpenses: [...(mData.flexibleExpenses || []), { ...entry, catId: id }],
      };
      moveCourant(-amount);
    } else if (kind === 'envelope') {
      nextMonthlyData[monthKey] = {
        ...mData,
        envelopeExpenses: [...(mData.envelopeExpenses || []), { ...entry, envId: id }],
      };
      envelopes = envelopes.map((e) =>
        e.id === id ? { ...e, currentBalance: round((e.currentBalance || 0) - amount) } : e);
    } else if (kind === 'provision') {
      const year = monthKey.split('-')[0];
      const yearItems = provisionsByYear[year] || [];
      provisionsByYear[year] = yearItems.map((p) =>
        p.id === id
          ? { ...p, spent: round((p.spent || 0) + amount), history: [...(p.history || []), { ...entry, provisionId: id }] }
          : p);
      nextMonthlyData[monthKey] = {
        ...mData,
        provisionExpenses: [...(mData.provisionExpenses || []), { ...entry, provisionId: id }],
      };
      comptes = comptes.map((c) =>
        c.id === config.provisionAccountId ? { ...c, initial: round((c.initial || 0) - amount) } : c);
    } else if (kind === 'income') {
      nextMonthlyData[monthKey] = {
        ...mData,
        revenusList: [...(mData.revenusList || []), { id: key, label, montant: amount }],
      };
    } else {
      skipped.push({ ...row, reason: 'target' });
      return;
    }

    if (kind === 'income') totalIn = round(totalIn + amount);
    else totalOut = round(totalOut + amount);
    applied.push({ ...row, key, monthKey, kind, targetId: id, amount });
  });

  const appliedKeys = applied.map((r) => r.key);

  return {
    config: {
      ...config,
      comptes,
      envelopes,
      provisionsByYear,
      bankImportKeys: [...(config.bankImportKeys || []), ...appliedKeys].slice(-2000),
    },
    monthlyData: nextMonthlyData,
    applied,
    skipped,
    summary: {
      count: applied.length,
      totalOut,
      totalIn,
      months: [...new Set(applied.map((r) => r.monthKey))].sort(),
    },
  };
};
