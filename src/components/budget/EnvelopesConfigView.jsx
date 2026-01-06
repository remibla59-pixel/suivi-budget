import React from 'react';
import { useBudget } from '../../hooks/useBudget';
import { Wallet, PlusCircle, Trash2 } from 'lucide-react';

const SmartInput = ({ value, onChange, placeholder, isNumber }) => (
  <input
    type={isNumber ? "number" : "text"}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className={`p-2 border rounded outline-none focus:ring-2 focus:ring-blue-400 ${isNumber ? 'text-right font-mono' : 'w-full'}`}
  />
);

export default function EnvelopesConfigView() {
  const { config, updateEnvelopeConfig, addEnvelopeConfig, removeEnvelopeConfig } = useBudget();
  const envelopes = config.envelopes || [];

  const renderSection = (title, category, colorClass) => (
    <div className={`bg-white rounded-xl shadow-sm border overflow-hidden mb-6 ${colorClass}`}>
      <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
        <h3 className="font-bold text-slate-700 uppercase tracking-wider text-sm">{title}</h3>
        <button onClick={() => addEnvelopeConfig(category)} className="flex items-center gap-1 text-xs bg-slate-600 text-white px-3 py-1.5 rounded-lg hover:bg-slate-700 transition">
          <PlusCircle size={14} /> Ajouter
        </button>
      </div>
      <div className="divide-y divide-slate-100">
        {envelopes.filter(e => e.category === category).map(env => (
          <div key={env.id} className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <div className="col-span-4">
              <label className="text-[10px] text-slate-400 font-bold uppercase">Nom</label>
              <SmartInput value={env.label} onChange={(v) => updateEnvelopeConfig({ ...env, label: v })} />
            </div>
            <div className="col-span-3">
               <label className="text-[10px] text-slate-400 font-bold uppercase">Solde Actuel (Réel)</label>
               <div className="flex items-center gap-1">
                 <SmartInput isNumber value={env.currentBalance} onChange={(v) => updateEnvelopeConfig({ ...env, currentBalance: parseFloat(v) || 0 })} />
                 <span className="text-slate-500 font-bold">€</span>
               </div>
            </div>
            <div className="col-span-3">
               <label className="text-[10px] text-blue-400 font-bold uppercase">Budget à verser / mois</label>
               <div className="flex items-center gap-1">
                 <SmartInput isNumber value={env.budgetMonthly} onChange={(v) => updateEnvelopeConfig({ ...env, budgetMonthly: parseFloat(v) || 0 })} />
                 <span className="text-slate-500 font-bold">€</span>
               </div>
            </div>
            <div className="col-span-2 flex justify-end mt-4 md:mt-0">
               <button onClick={() => { if(confirm("Supprimer l'enveloppe ?")) removeEnvelopeConfig(env.id); }} className="text-slate-300 hover:text-red-500 p-2"><Trash2 size={18} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-4 pb-20 space-y-8">
      <div className="bg-gradient-to-r from-emerald-800 to-teal-700 text-white p-6 rounded-2xl shadow-xl">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Wallet className="text-emerald-300" /> Gestion des Enveloppes
        </h2>
        <p className="text-emerald-100 text-sm">Configurez ici vos soldes de départ et le budget à allouer chaque mois.</p>
      </div>

      {renderSection("Dépenses Courantes (4 Colonnes)", "courant", "border-emerald-200")}
      {renderSection("Enveloppes Secondaires (Plaisirs)", "secondaire", "border-indigo-200")}
    </div>
  );
}