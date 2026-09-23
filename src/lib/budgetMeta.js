// --- Libellés officiels (à utiliser partout pour éviter les intitulés divergents) ---
export const LABELS = {
  monthly: 'Vue Mensuelle',
  flexible: 'Dépenses Courantes',
  fixed: 'Charges Fixes',
  realBalance: 'Solde réel',
  envelopesObligatoires: 'Enveloppes Obligatoires',
  envelopesSecondaires: 'Enveloppes Secondaires',
  provisions: 'Provisions Annualisées',
  savings: 'Épargne de Précaution',
  projects: 'Grands Projets',
  annual: 'Vue Annuelle',
  analysis: 'Trésorerie',
};

// Libellés courts de navigation (alignés sur LABELS pour éviter les doublons d'intitulés)
export const NAV_LABELS = {
  monthly: 'Mensuel',
  envelopes: 'Enveloppes',
  provisions: 'Provisions',
  analysis: 'Trésorerie',
  projects: 'Projets',
  savings: 'Épargne',
  config: 'Config',
};

// Catégories d'enveloppes : identifiant technique inchangé, libellé unique.
export const ENVELOPE_CATEGORIES = [
  { id: 'courant', label: LABELS.envelopesObligatoires },
  { id: 'secondaire', label: LABELS.envelopesSecondaires },
];

export const ACCOUNT_TYPES = {
  courant: 'Compte Courant',
  epargne: 'Épargne',
  provision: 'Provisions',
};

// --- Catégorisation des catégories (obligatoire → superflu) ---
export const PRIORITIES = [
  { id: 'obligatoire', label: 'Obligatoire', badge: 'bg-red-50 text-red-600 border-red-100', dot: 'bg-red-500' },
  { id: 'important', label: 'Important', badge: 'bg-amber-50 text-amber-600 border-amber-100', dot: 'bg-amber-500' },
  { id: 'futile', label: 'Futile', badge: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400' },
  { id: 'superflu', label: 'Superflu', badge: 'bg-violet-50 text-violet-600 border-violet-100', dot: 'bg-violet-500' },
];

export const DEFAULT_PRIORITY = 'important';

export const priorityOf = (priority) =>
  PRIORITIES.find((p) => p.id === priority) || PRIORITIES.find((p) => p.id === DEFAULT_PRIORITY);

export const priorityRank = (item) => {
  const idx = PRIORITIES.findIndex((p) => p.id === (item?.priority || DEFAULT_PRIORITY));
  return idx === -1 ? 1 : idx;
};

// --- Dates d'opération ---
export const todayISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export const formatShortDate = (value) => {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00`).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  }
  return value;
};
