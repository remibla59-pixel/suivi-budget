import React from 'react';
import { useBudget } from '../../hooks/useBudget';
import { Trash2, PlusCircle, Wallet } from 'lucide-react';

const SmartInput = ({ value, onChange, placeholder, isNumber = false }) => {
  const handleFocus = (e) => {
    const val = e.target.value;
    if (val.includes('Nouveau') || val === '0') {
      onChange('');
    }
  };
  return (
    <input
      type={isNumber ? "number" : "text"}
      value={value}
      placeholder={placeholder}
      onFocus={handleFocus}
      onChange={(e) => onChange(e.target.value)}
      className={`p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none ${isNumber ? 'w-full text-right font-mono' : 'flex-1'}`}
    />
  );
};

const ConfigSection = ({ title, children }) => (
  <div className="mb-8 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
    <h3 className="text-lg font-bold text-slate-700 mb-4 border-b pb-2">{title}</h3>
    <div className="space-y-3">{children}</div>
  </div>
);

export default function ConfigPanel() {
  const { config, updateConfigPoste, addConfigPoste, removeConfigPoste, updateAccountInitial } = useBudget();

  const renderPosteSection = (type, title) => (
    <ConfigSection title={title}>
      <div className="flex justify-end mb-2">
        <button onClick={() => addConfigPoste(type)} className="text-blue-600 text-sm font-medium flex items-center gap-1 hover:bg-blue-50 px-2 py-1 rounded">
          <PlusCircle size={16} /> Ajouter une ligne
        </button>
      </div>
      {config.postes.filter(p => p.type === type).map(poste => (
        <div key={poste.id} className="flex gap-3 items-center">
          <SmartInput value={poste.label} onChange={(v) => updateConfigPoste({ ...poste, label: v })} placeholder="Nom" />
          <div className="relative w-32">
            <SmartInput isNumber value={poste.montant} onChange={(v) => updateConfigPoste({ ...poste, montant: parseFloat(v) || 0 })} placeholder="0" />
            <span className="absolute right-8 top-2 text-slate-400 pointer-events-none">€</span>
          </div>
          <button onClick={() => removeConfigPoste(poste.id)} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={18} /></button>
        </div>
      ))}
    </ConfigSection>
  );

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6 text-slate-800 flex items-center gap-2">🛠️ Configuration Générale</h2>
      
      <ConfigSection title="💰 Soldes de Départ (Livrets & Enveloppes)">
        <div className="grid gap-4">
          {config.comptes?.map(compte => (
            <div key={compte.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3"><Wallet className="text-blue-500" size={20} /><span className="font-medium text-slate-700">{compte.label}</span></div>
              <div className="flex items-center gap-2 relative">
                <span className="text-sm text-slate-500">Initial :</span>
                <div className="w-32"><SmartInput isNumber value={compte.initial} onChange={(v) => updateAccountInitial(compte.id, v)} /></div>
                <span className="text-slate-500">€</span>
              </div>
            </div>
          ))}
        </div>
      </ConfigSection>

      {renderPosteSection('fixe', 'Dépenses Mensuelles Fixes (Abonnements, Crédits)')}
      {renderPosteSection('annualise', 'Provisions Annualisées (Impôts, Assurances)')}
      {renderPosteSection('obligatoire', 'Dépenses Courantes (Enveloppes)')}
      {renderPosteSection('secondaire', 'Enveloppes Secondaires (Plaisirs)')}
    </div>
  );
}