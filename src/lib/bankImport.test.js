import { describe, it, expect } from 'vitest';
import {
  transactionKey,
  normalizeLabel,
  encodeTarget,
  decodeTarget,
  suggestTarget,
  ruleKey,
  ruleTargetFor,
  learnBankImportRules,
  buildImportCandidates,
  applyBankImport,
} from './bankImport';

const CONFIG = {
  comptes: [
    { id: 'courant', label: 'Compte Courant', initial: 1000, type: 'courant' },
    { id: 'livretRemi', label: 'Livret A Rémi (Provisions)', initial: 2000, type: 'provision' },
  ],
  postes: [
    { id: 'p1', label: 'Prêt Immo', type: 'fixe', montant: 880 },
    { id: 'p2', label: 'Électricité', type: 'fixe', montant: 90 },
  ],
  budgetsFlexibles: [{ id: 'flex_courses', label: 'Courses', budget: 900 }],
  envelopes: [
    { id: 'env_loisirs', label: 'Loisirs / Resto', budgetMonthly: 100, currentBalance: 50, category: 'secondaire' },
    { id: 'env_cadeaux', label: 'Cadeaux', budgetMonthly: 50, currentBalance: 0, category: 'secondaire' },
  ],
  provisionsByYear: { 2026: [{ id: 'prov_auto', label: 'Assurance auto', amount: 600, spent: 0, history: [] }] },
  provisionAccountId: 'livretRemi',
  bankImportKeys: [],
};

const MONTHLY = { '2026-03': { revenusList: [] }, '2026-04': { isClosed: true } };

const txn = (over = {}) => ({
  fitId: 'FIT-1',
  date: '2026-03-05',
  amount: -880,
  label: 'PRET IMMO ECHEANCE',
  target: 'fixed:p1',
  include: true,
  ...over,
});


describe('transactionKey', () => {
  it('privilégie le FITID fourni par la banque', () => {
    expect(transactionKey({ fitId: 'BP2603050001' })).toBe('fit:BP2603050001');
  });

  it('retombe sur une empreinte date + montant + libellé', () => {
    expect(transactionKey({ date: '2026-03-05', amount: -45.9, label: 'Carrefour Market' }))
      .toBe('fp:2026-03-05|-45.9|CARREFOUR MARKET');
  });

  it('ignore la casse, les accents et la ponctuation dans l’empreinte', () => {
    const a = transactionKey({ date: '2026-03-05', amount: -20, label: 'Prélèvement ÉLECTRICITÉ' });
    const b = transactionKey({ date: '2026-03-05', amount: -20, label: 'prelevement  electricite' });
    expect(a).toBe(b);
  });
});

describe('encodage des cibles', () => {
  it('encode et décode les cibles du sélecteur', () => {
    expect(encodeTarget({ kind: 'fixed', id: 'p1' })).toBe('fixed:p1');
    expect(encodeTarget({ kind: 'none' })).toBe('none');
    expect(encodeTarget({ kind: 'income' })).toBe('income');
    expect(decodeTarget('envelope:env_loisirs')).toEqual({ kind: 'envelope', id: 'env_loisirs' });
    expect(decodeTarget('none')).toEqual({ kind: 'none', id: null });
    expect(decodeTarget('')).toEqual({ kind: 'none', id: null });
  });

  it('normalise les libellés', () => {
    expect(normalizeLabel('Prêt  Immo (Réf. 42)')).toBe('PRET IMMO REF 42');
  });
});

describe('suggestTarget (rapprochement automatique)', () => {
  it('reconnaît une charge fixe par son libellé et son montant', () => {
    expect(suggestTarget(txn(), CONFIG)).toMatchObject({ kind: 'fixed', id: 'p1' });
  });

  it('reconnaît une charge fixe au montant seul quand le libellé ne dit rien', () => {
    expect(suggestTarget({ label: 'PRLV SEPA', amount: -90 }, CONFIG)).toMatchObject({ kind: 'fixed', id: 'p2' });
  });

  it('reconnaît une enveloppe ou une dépense courante', () => {
    expect(suggestTarget({ label: 'RESTO DU COIN', amount: -32 }, CONFIG)).toMatchObject({ kind: 'envelope', id: 'env_loisirs' });
    expect(suggestTarget({ label: 'CADEAUX ANNIVERSAIRE', amount: -25 }, CONFIG)).toMatchObject({ kind: 'envelope', id: 'env_cadeaux' });
  });

  it('ne propose rien sans correspondance fiable', () => {
    expect(suggestTarget({ label: 'CARREFOUR MARKET', amount: -45.9 }, CONFIG)).toEqual({ kind: 'none', id: null, label: '' });
    expect(suggestTarget({ label: 'VIR SEPA SALAIRE', amount: 2400 }, CONFIG)).toEqual({ kind: 'none', id: null, label: '' });
  });

  it('ne rapproche pas sur un mot trop court', () => {
    expect(suggestTarget({ label: 'CB EAU', amount: -12 }, CONFIG).kind).toBe('none');
  });
});

describe('buildImportCandidates', () => {
  it('écarte les opérations déjà importées et les doublons du fichier', () => {
    const transactions = [
      txn({ fitId: 'A' }),
      txn({ fitId: 'B', date: '2026-03-06', label: 'CARREFOUR MARKET', amount: -45.9 }),
      txn({ fitId: 'B' }), // même opération deux fois dans le relevé
      txn({ fitId: 'C' }),
    ];
    const { rows, duplicates } = buildImportCandidates(transactions, {
      importedKeys: ['fit:C'],
      config: CONFIG,
    });

    expect(rows.map((r) => r.key)).toEqual(['fit:A', 'fit:B']);
    expect(duplicates.map((r) => r.key)).toEqual(['fit:B', 'fit:C']);
  });

  it('prépare chaque ligne avec son mois, sa cible suggérée et l’inclusion par défaut', () => {
    const { rows } = buildImportCandidates([txn({ fitId: 'A' }), txn({ fitId: 'B', label: 'CB INCONNU', amount: -9 })], {
      config: CONFIG,
    });

    expect(rows[0]).toMatchObject({ key: 'fit:A', monthKey: '2026-03', target: 'fixed:p1', include: true });
    expect(rows[1].target).toBe('none');
  });

  it('supporte un relevé vide', () => {
    expect(buildImportCandidates(undefined, {})).toEqual({ rows: [], duplicates: [] });
  });
});

describe('applyBankImport (impact comptable)', () => {
  it('marque une charge fixe payée, débite le compte courant et retient la clé', () => {
    const result = applyBankImport({ config: CONFIG, monthlyData: MONTHLY, rows: [txn()] });

    expect(result.monthlyData['2026-03'].fixedStatus).toEqual({ p1: true });
    expect(result.monthlyData['2026-03'].depenses).toEqual({ p1: 880 });
    expect(result.monthlyData['2026-03'].fixedDates).toEqual({ p1: '2026-03-05' });
    expect(result.config.comptes.find((c) => c.id === 'courant').initial).toBe(120);
    expect(result.config.bankImportKeys).toEqual(['fit:FIT-1']);
    expect(result.summary).toMatchObject({ count: 1, totalOut: 880, totalIn: 0, months: ['2026-03'] });
    expect(result.skipped).toEqual([]);
  });

  it('ajoute une dépense courante et débite le compte courant', () => {
    const result = applyBankImport({
      config: CONFIG,
      monthlyData: MONTHLY,
      rows: [txn({ fitId: 'FIT-2', target: 'flexible:flex_courses', label: 'CARREFOUR MARKET', amount: -45.9 })],
    });

    expect(result.monthlyData['2026-03'].flexibleExpenses).toEqual([
      { id: 'fit:FIT-2', catId: 'flex_courses', label: 'CARREFOUR MARKET', amount: 45.9, date: '2026-03-05' },
    ]);
    expect(result.config.comptes.find((c) => c.id === 'courant').initial).toBe(954.1);
  });

  it('diminue la cagnotte d’une enveloppe sans retoucher le compte courant', () => {
    const result = applyBankImport({
      config: CONFIG,
      monthlyData: MONTHLY,
      rows: [txn({ target: 'envelope:env_loisirs', label: 'RESTO', amount: -30 })],
    });

    expect(result.config.envelopes.find((e) => e.id === 'env_loisirs').currentBalance).toBe(20);
    expect(result.monthlyData['2026-03'].envelopeExpenses).toHaveLength(1);
    expect(result.monthlyData['2026-03'].envelopeExpenses[0].envId).toBe('env_loisirs');
    expect(result.config.comptes.find((c) => c.id === 'courant').initial).toBe(1000);
  });

  it('impute une facture provisionnée sur l’année et le compte de provisions', () => {
    const result = applyBankImport({
      config: CONFIG,
      monthlyData: MONTHLY,
      rows: [txn({ target: 'provision:prov_auto', label: 'ASSURANCE AUTO', amount: -150 })],
    });

    expect(result.config.provisionsByYear['2026'][0].spent).toBe(150);
    expect(result.config.provisionsByYear['2026'][0].history).toHaveLength(1);
    expect(result.config.comptes.find((c) => c.id === 'livretRemi').initial).toBe(1850);
    expect(result.monthlyData['2026-03'].provisionExpenses[0].provisionId).toBe('prov_auto');
    expect(result.config.comptes.find((c) => c.id === 'courant').initial).toBe(1000);
  });

  it('ajoute une entrée d’argent sans toucher aux soldes', () => {
    const result = applyBankImport({
      config: CONFIG,
      monthlyData: MONTHLY,
      rows: [txn({ target: 'income', label: 'VIR SEPA SALAIRE', amount: 2400 })],
    });

    expect(result.monthlyData['2026-03'].revenusList).toEqual([{ id: 'fit:FIT-1', label: 'VIR SEPA SALAIRE', montant: 2400 }]);
    expect(result.config.comptes.find((c) => c.id === 'courant').initial).toBe(1000);
    expect(result.summary).toMatchObject({ count: 1, totalOut: 0, totalIn: 2400 });
  });

  it('cumule plusieurs lignes du même mois', () => {
    const result = applyBankImport({
      config: CONFIG,
      monthlyData: MONTHLY,
      rows: [txn(), txn({ fitId: 'FIT-2', target: 'flexible:flex_courses', label: 'COURSES', amount: -50 })],
    });

    expect(result.config.comptes.find((c) => c.id === 'courant').initial).toBe(70);
    expect(result.summary.months).toEqual(['2026-03']);
  });

  it('refuse un mois clôturé sans rien modifier', () => {
    const result = applyBankImport({
      config: CONFIG,
      monthlyData: MONTHLY,
      rows: [txn({ fitId: 'FIT-4', date: '2026-04-10' })],
    });

    expect(result.applied).toEqual([]);
    expect(result.config.bankImportKeys).toEqual([]);
    expect(result.skipped).toEqual([expect.objectContaining({ reason: 'closed' })]);
    expect(result.monthlyData['2026-04']).toEqual({ isClosed: true });
  });

  it('ignore une charge fixe déjà payée pour éviter un double débit', () => {
    const monthlyData = { '2026-03': { revenusList: [], fixedStatus: { p1: true } } };
    const result = applyBankImport({ config: CONFIG, monthlyData, rows: [txn()] });

    expect(result.skipped).toEqual([expect.objectContaining({ reason: 'alreadyPaid' })]);
    expect(result.config.comptes.find((c) => c.id === 'courant').initial).toBe(1000);
    expect(result.config.bankImportKeys).toEqual([]);
  });

  it('ignore les lignes décochées, sans cible ou à date illisible', () => {
    const result = applyBankImport({
      config: CONFIG,
      monthlyData: MONTHLY,
      rows: [
        txn({ fitId: 'OFF', include: false }),
        txn({ fitId: 'NONE', target: 'none' }),
        txn({ fitId: 'BAD', date: 'inconnue' }),
      ],
    });

    expect(result.applied).toEqual([]);
    expect(result.skipped).toEqual([expect.objectContaining({ reason: 'date' })]);
    expect(result.config.bankImportKeys).toEqual([]);
  });

  it('ne modifie pas les données d’origine', () => {
    applyBankImport({ config: CONFIG, monthlyData: MONTHLY, rows: [txn()] });

    expect(CONFIG.comptes.find((c) => c.id === 'courant').initial).toBe(1000);
    expect(CONFIG.bankImportKeys).toEqual([]);
    expect(MONTHLY['2026-03'].fixedStatus).toBeUndefined();
  });

  it('supporte un import vide', () => {
    const result = applyBankImport({ config: {}, monthlyData: {}, rows: [] });
    expect(result.applied).toEqual([]);
    expect(result.summary.count).toBe(0);
  });
});

describe('règles mémorisées (rappels de classement)', () => {
  const RULES = [{ match: 'CARREFOUR MARKET', target: 'flexible:flex_courses', label: 'Carrefour Market' }];

  it('déduit une clé stable des premiers mots significatifs, sans les références chiffrées', () => {
    expect(ruleKey({ label: 'PRET IMMO ECHEANCE 0012345' })).toBe('PRET IMMO ECHEANCE');
    expect(ruleKey({ label: 'carrefour market 123456' })).toBe('CARREFOUR MARKET');
    // Aucun mot assez long : on retombe sur le libellé complet pour ne pas créer de règle trop large.
    expect(ruleKey({ label: 'CB 12 34' })).toBe('CB 12 34');
  });

  it('retrouve la cible mémorisée malgré des références qui changent', () => {
    expect(ruleTargetFor({ label: 'CARREFOUR MARKET 999' }, RULES, CONFIG)).toBe('flexible:flex_courses');
    expect(ruleTargetFor({ label: 'BOULANGERIE DU COIN' }, RULES, CONFIG)).toBeNull();
  });

  it('ignore une règle dont la cible n’existe plus', () => {
    const stale = [{ match: 'CARREFOUR MARKET', target: 'envelope:env_disparue' }];
    expect(ruleTargetFor({ label: 'CARREFOUR MARKET' }, stale, CONFIG)).toBeNull();
    // Sans config, la règle reste utilisable (appel isolé).
    expect(ruleTargetFor({ label: 'CARREFOUR MARKET' }, stale)).toBe('envelope:env_disparue');
  });

  it('apprend les classements validés, sans mémoriser les lignes ignorées ou décochées', () => {
    const learned = learnBankImportRules([], [
      txn({ label: 'PRET IMMO ECHEANCE', target: 'fixed:p1' }),
      txn({ fitId: 'SAL', label: 'VIR SEPA SALAIRE', target: 'income' }),
      txn({ fitId: 'SKIP', label: 'CARREFOUR MARKET', target: 'none' }),
      txn({ fitId: 'OFF', label: 'LIGNE DECOCHEE', target: 'flexible:flex_courses', include: false }),
    ]);

    expect(learned.map((r) => r.match)).toEqual(['PRET IMMO ECHEANCE', 'SEPA SALAIRE']);
    expect(learned.map((r) => r.target)).toEqual(['fixed:p1', 'income']);
    expect(learned[0].label).toBe('PRET IMMO ECHEANCE');
  });

  it('met à jour la règle quand un libellé est reclassé, sans doublon', () => {
    const first = learnBankImportRules([], [txn({ label: 'PRET IMMO ECHEANCE', target: 'fixed:p1' })]);
    const second = learnBankImportRules(first, [txn({ fitId: 'NEW', label: 'PRET IMMO ECHEANCE 002', target: 'envelope:env_loisirs' })]);

    expect(second).toHaveLength(1);
    expect(second[0]).toMatchObject({ match: 'PRET IMMO ECHEANCE', target: 'envelope:env_loisirs' });
  });

  it('applique la mémoire avant la suggestion automatique', () => {
    const config = { ...CONFIG, bankImportRules: RULES, bankImportKeys: [] };
    const { rows } = buildImportCandidates([txn({ fitId: 'A', label: 'CB CARREFOUR MARKET', amount: -45.9 })], { config });

    expect(rows[0]).toMatchObject({ target: 'flexible:flex_courses', targetSource: 'memory' });
  });

  it('retombe sur la suggestion quand la règle mémorisée est caduque', () => {
    const config = {
      ...CONFIG,
      bankImportKeys: [],
      bankImportRules: [{ match: 'PRET IMMO ECHEANCE', target: 'fixed:p9' }],
    };
    const { rows } = buildImportCandidates([txn()], { config });

    expect(rows[0]).toMatchObject({ target: 'fixed:p1', targetSource: 'auto' });
  });
});
