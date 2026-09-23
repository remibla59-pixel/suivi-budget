import { createContext } from 'react';

// Le contexte vit dans son propre module : un fichier de composant ne doit exposer
// que des composants (fast refresh), et `useBudget` peut ainsi l'importer sans cycle.
export const BudgetContext = createContext();
