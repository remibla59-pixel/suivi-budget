import { describe, it, expect } from 'vitest';
import {
  round,
  nextMonthKey,
  monthlyProvisionTarget,
  releaseEnvelopeLeftovers,
  buildBalanceAdjustment,
  closingBlockers,
  closingBlockerMessage,
} from './budgetMath';

describe('round', () => {
  it('arrondit à 2 décimales sans erreur de virgule flottante', () => {
    expect(round(0.1 + 0.2)).toBe(0.3);
    expect(round(1234.567)).toBe(1234.57);
    expect(round(2)).toBe(2);
  });
});

describe('nextMonthKey', () => {
  it('avance d’un mois dans la même année', () => {
    expect(nextMonthKey('2026-05')).toBe('2026-06');
    expect(nextMonthKey('2026-09')).toBe('2026-10');
  });

  it('bascule sur janvier de l’année suivante après décembre', () => {
    expect(nextMonthKey('2026-12')).toBe('2027-01');
  });
});

describe('monthlyProvisionTarget', () => {
  const provisionsByYear = {
    2026: [{ id: 'a', amount: 1200 }],
    2027: [
      { id: 'b', amount: 1000 },
      { id: 'c', amount: 100 },
    ],
  };

  it('lisse sur 12 mois les provisions de N+1, pas celles de l’année en cours', () => {
    expect(monthlyProvisionTarget(provisionsByYear, '2026-01')).toEqual({
      year: '2027',
      total: 1100,
      monthly: 92, // 1100 / 12 = 91,67 -> arrondi à l'euro
    });
  });

  it('utilise la même année cible N+1 pour décembre', () => {
    expect(monthlyProvisionTarget(provisionsByYear, '2026-12')).toEqual({
      year: '2027',
      total: 1100,
      monthly: 92,
    });
  });

  it('retombe à zéro quand aucune provision n’est saisie pour N+1', () => {
    expect(monthlyProvisionTarget({ 2026: [{ amount: 900 }] }, '2026-03')).toEqual({
      year: '2027',
      total: 0,
      monthly: 0,
    });
    expect(monthlyProvisionTarget(undefined, '2026-03')).toEqual({ year: '2027', total: 0, monthly: 0 });
  });
});

describe('releaseEnvelopeLeftovers (clôture de décembre)', () => {
  const comptes = [
    { id: 'courant', label: 'Compte Courant', initial: 500, type: 'courant' },
    { id: 'livretA', label: 'Livret A', initial: 17000, type: 'epargne' },
  ];
  const envelopes = [
    { id: 'env_loisirs', currentBalance: 30.5, budgetMonthly: 100 },
    { id: 'env_cadeaux', currentBalance: 0.25, budgetMonthly: 50 },
  ];

  it('reverse la totalité des cagnottes sur le compte courant et remet les enveloppes à zéro', () => {
    const { leftover, envelopes: nextEnvelopes, comptes: nextComptes } = releaseEnvelopeLeftovers(envelopes, comptes);

    expect(leftover).toBe(30.75);
    expect(nextEnvelopes.map((e) => e.currentBalance)).toEqual([0, 0]);
    expect(nextComptes.find((c) => c.id === 'courant').initial).toBe(530.75);
    // Aucun autre compte n'est touché
    expect(nextComptes.find((c) => c.id === 'livretA').initial).toBe(17000);
  });

  it('conserve le libellé et le budget mensuel des enveloppes', () => {
    const { envelopes: nextEnvelopes } = releaseEnvelopeLeftovers(envelopes, comptes);
    expect(nextEnvelopes[0]).toMatchObject({ id: 'env_loisirs', budgetMonthly: 100 });
  });

  it('ne touche pas aux comptes quand il n’y a rien à reverser', () => {
    const { leftover, comptes: nextComptes } = releaseEnvelopeLeftovers([{ id: 'e', currentBalance: 0 }], comptes);
    expect(leftover).toBe(0);
    expect(nextComptes).toBe(comptes);
  });

  it('supporte des listes vides', () => {
    const { leftover, envelopes: nextEnvelopes } = releaseEnvelopeLeftovers(undefined, undefined);
    expect(leftover).toBe(0);
    expect(nextEnvelopes).toEqual([]);
  });
});

describe('closingBlockers (garde-fou de clôture du mois)', () => {
  const postes = [
    { id: 'p1', label: 'Prêt Immo', type: 'fixe', montant: 880 },
    { id: 'p2', label: 'Électricité', type: 'fixe', montant: 90 },
    { id: 'p3', label: 'Courses', type: 'flexible', montant: 300 },
  ];

  it('bloque la clôture quand une charge fixe n’est pas confirmée', () => {
    const blockers = closingBlockers(postes, { fixedStatus: { p1: true }, provisionDone: true }, 92);

    expect(blockers.pendingFixed).toEqual(['Électricité']);
    expect(blockers.provisionPending).toBe(false);
    expect(blockers.canClose).toBe(false);
  });

  it('bloque la clôture quand le virement de provisions n’est pas confirmé', () => {
    const blockers = closingBlockers(postes, { fixedStatus: { p1: true, p2: true } }, 92);

    expect(blockers.pendingFixed).toEqual([]);
    expect(blockers.provisionPending).toBe(true);
    expect(blockers.canClose).toBe(false);
  });

  it('autorise la clôture quand tout est confirmé', () => {
    const blockers = closingBlockers(postes, { fixedStatus: { p1: true, p2: true }, provisionDone: true }, 92);

    expect(blockers.canClose).toBe(true);
  });

  it('n’exige pas de virement quand le montant mensuel lissé est nul', () => {
    const blockers = closingBlockers(postes, { fixedStatus: { p1: true, p2: true } }, 0);

    expect(blockers.provisionPending).toBe(false);
    expect(blockers.canClose).toBe(true);
  });

  it('considère toutes les charges fixes comme dues sur un mois vide', () => {
    const blockers = closingBlockers(postes, undefined, 0);

    expect(blockers.pendingFixed).toEqual(['Prêt Immo', 'Électricité']);
    expect(blockers.canClose).toBe(false);
    expect(closingBlockers([], {}, 0).canClose).toBe(true);
  });

  it('liste précisément ce qui manque dans le message utilisateur', () => {
    const blockers = closingBlockers(postes, {}, 92);
    const message = closingBlockerMessage(blockers, 92);

    expect(message).toContain('Prêt Immo');
    expect(message).toContain('Électricité');
    expect(message).toContain('92 €');
    expect(closingBlockerMessage(closingBlockers(postes, { fixedStatus: { p1: true, p2: true }, provisionDone: true }, 92), 92)).toBe('');
  });

  describe('enveloppes obligatoires non versées', () => {
    const envelopes = [
      { id: 'env_charge', label: 'Charge partagée', budgetMonthly: 100, category: 'courant' },
      { id: 'env_loisirs', label: 'Loisirs / Resto', budgetMonthly: 100, category: 'secondaire' },
      { id: 'env_vide', label: 'Sans budget', budgetMonthly: 0, category: 'courant' },
    ];
    const toutConfirme = { fixedStatus: { p1: true, p2: true }, provisionDone: true };

    it('bloque la clôture quand une enveloppe obligatoire n’a pas été versée', () => {
      const blockers = closingBlockers(postes, toutConfirme, 92, envelopes);

      expect(blockers.pendingEnvelopes).toEqual(['Charge partagée']);
      expect(blockers.canClose).toBe(false);
    });

    it('ne bloque pas sur une enveloppe secondaire non versée', () => {
      const blockers = closingBlockers(postes, { ...toutConfirme, funded_env_charge: '2026-03-05' }, 92, envelopes);

      expect(blockers.pendingEnvelopes).toEqual([]);
      expect(blockers.canClose).toBe(true);
    });

    it('autorise la clôture quand toutes les enveloppes obligatoires ont été versées', () => {
      const blockers = closingBlockers(
        postes,
        { ...toutConfirme, funded_env_charge: '2026-03-05', funded_env_loisirs: '2026-03-05' },
        92,
        envelopes,
      );

      expect(blockers.pendingEnvelopes).toEqual([]);
      expect(blockers.canClose).toBe(true);
    });

    it('n’exige rien d’une enveloppe obligatoire sans budget mensuel', () => {
      const blockers = closingBlockers(postes, toutConfirme, 0, [{ id: 'env_vide', label: 'Sans budget', budgetMonthly: 0, category: 'courant' }]);

      expect(blockers.pendingEnvelopes).toEqual([]);
      expect(blockers.canClose).toBe(true);
    });

    it('signale les enveloppes obligatoires manquantes dans le message utilisateur', () => {
      const blockers = closingBlockers(postes, toutConfirme, 92, envelopes);
      const message = closingBlockerMessage(blockers, 92);

      expect(message).toContain('Enveloppes obligatoires non versées : Charge partagée');
      expect(message).not.toContain('Loisirs');
      expect(message).not.toContain('Sans budget');
    });

    it('ignore les enveloppes quand aucune n’est configurée', () => {
      expect(closingBlockers(postes, toutConfirme, 0).canClose).toBe(true);
      expect(closingBlockers(postes, toutConfirme, 0, []).pendingEnvelopes).toEqual([]);
    });
  });
});

describe('buildBalanceAdjustment (rapprochement du solde réel)', () => {
  const courant = { id: 'courant', label: 'Compte Courant', initial: 500, type: 'courant' };

  it('calcule l’écart entre le solde suivi et le solde réel constaté', () => {
    const entry = buildBalanceAdjustment(courant, 512.34, '2026-03-15', 'Régul');

    expect(entry).toMatchObject({
      accountId: 'courant',
      date: '2026-03-15',
      previous: 500,
      newBalance: 512.34,
      delta: 12.34,
      note: 'Régul',
    });
  });

  it('accepte une chaîne de caractères et un écart négatif', () => {
    const entry = buildBalanceAdjustment(courant, '480', '2026-03-15');
    expect(entry).toMatchObject({ newBalance: 480, delta: -20, note: '' });
  });

  it('ne crée rien si le solde est identique (ou si l’écart est négligeable)', () => {
    expect(buildBalanceAdjustment(courant, 500, '2026-03-15')).toBeNull();
    // Écart de 0,001 € : l'arrondi le ramène à zéro, rien à historiser.
    expect(buildBalanceAdjustment({ ...courant, initial: 100 }, 100.001, '2026-03-15')).toBeNull();
  });

  it('ignore les valeurs non numériques et les comptes inconnus', () => {
    expect(buildBalanceAdjustment(courant, 'abc', '2026-03-15')).toMatchObject({ newBalance: 0, delta: -500 });
    expect(buildBalanceAdjustment(undefined, 500, '2026-03-15')).toBeNull();
  });
});
