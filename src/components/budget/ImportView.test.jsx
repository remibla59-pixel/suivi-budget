import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';

// Contexte simulé : l'écran ne doit dépendre que des données du budget.
vi.mock('../../hooks/useBudget', () => ({
  useBudget: () => ({
    config: {
      comptes: [
        { id: 'courant', label: 'Compte Courant', initial: 1000, type: 'courant' },
        { id: 'livretRemi', label: 'Livret A Rémi (Provisions)', initial: 2000, type: 'provision' },
      ],
      postes: [{ id: 'p1', label: 'Prêt Immo', type: 'fixe', montant: 880 }],
      budgetsFlexibles: [{ id: 'flex_courses', label: 'Courses', budget: 900 }],
      envelopes: [{ id: 'env_cadeaux', label: 'Cadeaux', category: 'secondaire', budgetMonthly: 50 }],
      provisionsByYear: { 2026: [{ id: 'prov_auto', label: 'Assurance auto', amount: 600 }] },
      bankImportKeys: [],
      bankImportRules: [
        { id: 'CARREFOUR MARKET', match: 'CARREFOUR MARKET', target: 'flexible:flex_courses', label: 'Carrefour Market' },
        { id: 'LIVRET REMI', match: 'LIVRET REMI', target: 'transfer:livretRemi', label: 'VIR LIVRET A REMI' },
      ],
    },
    monthlyData: {},
    currentMonth: '2026-03',
    importBankTransactions: () => null,
    forgetBankImportRule: () => {},
    clearBankImportRules: () => {},
  }),
}));

import ImportView from './ImportView';

describe('ImportView', () => {
  it('affiche l’écran d’import au repos', () => {
    const html = renderToString(<ImportView />);

    expect(html).toContain('Importer un relevé');
    expect(html).toContain('Choisir un relevé OFX');
    expect(html).toContain('Rapprochez les opérations');
    // Aucun relevé chargé : ni rapprochement, ni bouton de validation.
    expect(html).not.toContain('Rapprochement');
    expect(html).not.toContain('Importer 0 opération');
  });

  it('liste les classements mémorisés avec leur cible', () => {
    const html = renderToString(<ImportView />);

    // Le compteur est interpolé : React insère des commentaires entre les nœuds de texte.
    expect(html).toContain('Classements mémorisés');
    expect(html).toContain('Carrefour Market');
    expect(html).toContain('Dépense courante — Courses');
    // Un virement mémorisé affiche le compte concerné, pas un encodage technique.
    expect(html).toContain('VIR LIVRET A REMI');
    expect(html).toContain('Virement interne — Livret A Rémi (Provisions)');
  });
});
