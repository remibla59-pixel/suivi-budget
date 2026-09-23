// --- Calculs budgétaires purs (aucune dépendance React/Firebase) ---
// Ces helpers portent toute la logique chiffrée de l'app : ils sont utilisés par
// BudgetContext et testés unitairement (voir budgetMath.test.js).

// Arrondi monétaire à 2 décimales, sans les erreurs de virgule flottante.
export const round = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

// Clé du mois suivant au format 'AAAA-MM' (ex: '2026-12' -> '2027-01').
export const nextMonthKey = (monthKey) => {
  const [year, month] = String(monthKey).split('-').map(Number);
  return month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`;
};

// Virement mensuel lissé : on provisionne en N les besoins de N+1, lissés sur 12 mois.
export const monthlyProvisionTarget = (provisionsByYear, monthKey) => {
  const year = String(Number(String(monthKey).split('-')[0]) + 1);
  const total = ((provisionsByYear || {})[year] || []).reduce((sum, p) => sum + (p.amount || 0), 0);
  return { year, total: round(total), monthly: Math.round(total / 12) };
};

// Fin d'exercice : les cagnottes d'enveloppes non dépensées reviennent sur le compte
// courant (aucune somme perdue, elles sont remises à zéro pour repartir en janvier).
export const releaseEnvelopeLeftovers = (envelopes, comptes) => {
  const envelopeList = envelopes || [];
  const accountList = comptes || [];
  const leftover = round(envelopeList.reduce((sum, e) => sum + (e.currentBalance || 0), 0));
  const nextEnvelopes = envelopeList.map((e) => ({ ...e, currentBalance: 0 }));
  const nextComptes = leftover === 0
    ? accountList
    : accountList.map((c) => (c.type === 'courant' ? { ...c, initial: round((c.initial || 0) + leftover) } : c));
  return { leftover, envelopes: nextEnvelopes, comptes: nextComptes };
};

// --- Garde-fou de clôture ---
// Un mois ne se clôture que si toutes les charges fixes du mois ont été confirmées,
// si les enveloppes obligatoires à budget mensuel ont été versées et si le virement de
// provisions (quand il y en a un) a bien été fait. Les enveloppes secondaires ne bloquent pas.
// Renvoie ce qui manque : `pendingFixed`, `pendingEnvelopes`, `provisionPending`, `canClose`.
export const closingBlockers = (postes, monthData, monthlyProvision = 0, envelopes = []) => {
  const m = monthData || {};
  const fixedStatus = m.fixedStatus || {};
  const pendingFixed = (postes || [])
    .filter((p) => p.type === 'fixe' && !fixedStatus[p.id])
    .map((p) => p.label || 'Charge fixe');
  // Seules les enveloppes obligatoires (category 'courant') bloquent, et uniquement
  // celles qui ont un budget mensuel à verser.
  const pendingEnvelopes = (envelopes || [])
    .filter((e) => e.category === 'courant' && (e.budgetMonthly || 0) > 0 && !m[`funded_${e.id}`])
    .map((e) => e.label || 'Enveloppe');
  // Aucun virement à confirmer quand le montant mensuel lissé est nul.
  const provisionPending = (Number(monthlyProvision) || 0) > 0 && !m.provisionDone;
  return {
    pendingFixed,
    pendingEnvelopes,
    provisionPending,
    canClose: pendingFixed.length === 0 && pendingEnvelopes.length === 0 && !provisionPending,
  };
};

// Message lisible listant ce qui empêche la clôture (une ligne par élément manquant).
export const closingBlockerMessage = (blockers, monthlyProvision = 0) => {
  const lines = [];
  if ((blockers.pendingFixed || []).length > 0) {
    lines.push(`• Charges fixes non confirmées : ${blockers.pendingFixed.join(', ')}`);
  }
  if ((blockers.pendingEnvelopes || []).length > 0) {
    lines.push(`• Enveloppes obligatoires non versées : ${blockers.pendingEnvelopes.join(', ')}`);
  }
  if (blockers.provisionPending) {
    lines.push(`• Virement de provisions non confirmé (${monthlyProvision} €)`);
  }
  return lines.join('\n');
};

// Rapprochement bancaire : écart entre le solde suivi par l'app et le solde réel
// constaté sur le relevé. Renvoie l'écriture à historiser, ou null si rien ne change.
export const buildBalanceAdjustment = (account, realBalance, date, note) => {
  if (!account) return null;
  const previous = round(account.initial || 0);
  const newBalance = round(parseFloat(realBalance) || 0);
  const delta = round(newBalance - previous);
  if (delta === 0) return null;
  return { id: Date.now(), accountId: account.id, date, previous, newBalance, delta, note: note || '' };
};
