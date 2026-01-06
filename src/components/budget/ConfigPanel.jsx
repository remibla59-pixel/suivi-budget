import React from 'react';
import { useBudget } from '../../hooks/useBudget';
import { Trash2, PlusCircle, Save, Wallet } from 'lucide-react';

const ConfigSection = ({ title, children }) => (
  <div className="mb-8 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
    <h3 className="text-lg font-bold text-slate-700 mb-4 border-b pb-2">{title}</h3>
    <div className="space-y-3">{children}</div>
  </div>
);

export default function ConfigPanel() {
  const { config, updateConfigPoste, addConfigPoste, removeConfigPoste, updateAccountInitial } = useBudget();

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6 text-slate-800 flex items-center gap-2">
        🛠️ Configuration Générale
      </h2>
      
      {/* 1. COMPTES & ENVELOPPES */}
      <ConfigSection title="💰 Soldes de Départ (Livrets & Enveloppes)">
        <div className="grid gap-4">
          {config.comptes?.map(compte => (
            <div key={compte.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Wallet className="text-blue-500" size={20} />
                <span className="font-medium text-slate-700">{compte.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Initial :</span>
                <input 
                  type="number" 
                  value={compte.initial}
                  onChange={(e) => updateAccountInitial(compte.id, e.target.value)}
                  className="w-32 p-2 border rounded font-mono text-right font-bold text-slate-700"
                />
                <span className="text-slate-500">€</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-2 italic">* Ces montants servent de base pour calculer l'évolution de votre épargne.</p>
      </ConfigSection>

      {/* 2. POSTES DE DEPENSE (Code générique réutilisable) */}
      {['fixe', 'obligatoire', 'secondaire'].map(type => (
        <ConfigSection 
          key={type} 
          title={type === 'fixe' ? "Dépenses Fixes (Abonnements, Crédits...)" : type === 'obligatoire' ? "Enveloppes Obligatoires" : "Enveloppes Plaisirs"}
        >
          <div className="flex justify-end mb-2">
            <button onClick={() => addConfigPoste(type)} className="text-blue-600 text-sm font-medium flex items-center gap-1 hover:bg-blue-50 px-2 py-1 rounded">
              <PlusCircle size={16} /> Ajouter une ligne
            </button>
          </div>
          {config.postes.filter(p => p.type === type).map(poste => (
            <div key={poste.id} className="flex gap-3 items-center">
              <input 
                type="text" 
                value={poste.label} 
                onChange={(e) => updateConfigPoste({ ...poste, label: e.target.value })}
                className="flex-1 p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <div className="relative w-32">
                <input 
                  type="number" 
                  value={poste.montant} 
                  onChange={(e) => updateConfigPoste({ ...poste, montant: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 border rounded text-right pr-8 font-mono"
                />
                <span className="absolute right-3 top-2 text-slate-400">€</span>
              </div>
              <button onClick={() => removeConfigPoste(poste.id)} className="text-red-400 hover:text-red-600 p-2">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </ConfigSection>
      ))}
    </div>
  );
}