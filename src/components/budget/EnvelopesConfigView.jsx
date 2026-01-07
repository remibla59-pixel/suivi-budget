import React from 'react';
import { useBudget } from '../../hooks/useBudget';
import { Wallet, PlusCircle, Trash2, Info, Coins } from 'lucide-react';

const SmartInput = ({ value, onChange, placeholder, isNumber }) => {
  const handleFocus = (e) => {
    const val = e.target.value;
    if (val === '0' || val.includes('Nouvelle')) {
      onChange('');
    }
  };
  return (
    <input
      type={isNumber ? "number" : "text"}
      value={value}
      onFocus={handleFocus}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`p-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-400 transition-all ${isNumber ? 'text-right font-mono font-bold' : 'w-full'}`}
    />
  );
};

export default function EnvelopesConfigView() {
  const { config, updateEnvelopeConfig, addEnvelopeConfig, removeEnvelopeConfig } = useBudget();
  const envelopes = config.envelopes || [];

  const renderSection = (title, category, colorClass, icon: Icon) => (
    <div className={`bg-white rounded-2xl shadow-sm border overflow-hidden mb-8 ${colorClass}`}>
      <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Icon size={18} className="text-slate-500" />
          <h3 className="font-bold text-slate-700 uppercase tracking-wider text-xs">{title}</h3>
        </div>
        <button 
          onClick={() => addEnvelopeConfig(category)} 
          className="flex items-center gap-1 text-[10px] font-bold bg-slate-800 text-white px-3 py-1.5 rounded-lg hover:bg-black transition-all shadow-sm"
        >
          <PlusCircle size={14} /> Ajouter
        </button>
      </div>
      
      <div className="divide-y divide-slate-100">
        {envelopes.filter(e => e.category === category).length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs italic">Aucune enveloppe dans cette catégorie.</div>
        ) : (
          envelopes.filter(e => e.category === category).map(env => (
            <div key={env.id} className="p-4 grid grid-cols-1 md:grid-cols-12 gap-6 items-center hover:bg-slate-50/50 transition-colors">
              {/* NOM */}
              <div className="col-span-4">
                <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">Nom de l'enveloppe</label>
                <SmartInput 
                  value={env.label} 
                  onChange={(v) => updateEnvelopeConfig({ ...env, label: v })} 
                  placeholder="Ex: Courses" 
                />
              </div>

              {/* SOLDE ACTUEL */}
              <div className="col-span-3">
                 <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block italic">Argent actuellement dedans</label>
                 <div className="flex items-center gap-2">
                   <SmartInput 
                     isNumber 
                     value={env.currentBalance} 
                     onChange={(v) => updateEnvelopeConfig({ ...env, currentBalance: parseFloat(v) || 0 })} 
                   />
                   <span className="text-slate-400 font-bold text-sm">€</span>
                 </div>
              </div>

              {/* BUDGET MENSUEL */}
              <div className="col-span-3">
                 <label className="text-[10px] text-blue-500 font-bold uppercase mb-1 block">Virement auto / mois</label>
                 <div className="flex items-center gap-2">
                   <SmartInput 
                     isNumber 
                     value={env.budgetMonthly} 
                     onChange={(v) => updateEnvelopeConfig({ ...env, budgetMonthly: parseFloat(v) || 0 })} 
                   />
                   <span className="text-blue-500 font-bold text-sm">€</span>
                 </div>
              </div>

              {/* SUPPRIMER */}
              <div className="col-span-2 flex justify-end">
                 <button 
                   onClick={() => { if(confirm("Supprimer cette enveloppe ?")) removeEnvelopeConfig(env.id); }} 
                   className="text-slate-200 hover:text-red-500 p-2 transition-colors"
                 >
                   <Trash2 size={20} />
                 </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto p-4 pb-20 space-y-8">
      
      {/* HEADER */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-700 text-white p-8 rounded-3xl shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-2xl">
            <Wallet className="text-emerald-300" size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Configuration des Enveloppes</h2>
            <p className="text-emerald-100 text-sm opacity-80 font-medium">L'argent qui reste en fin de mois est conservé pour le mois suivant.</p>
          </div>
        </div>
      </div>

      {/* INFO TECHNIQUE */}
      <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex gap-3 shadow-sm">
        <Info className="text-blue-500 shrink-0" size={20} />
        <div className="text-xs text-blue-800 leading-relaxed">
          <strong>Principe :</strong> En début de mois, vous cliquez sur "Remplir" dans l'onglet Mensuel. Le montant <strong>"Budget à verser"</strong> sera retiré de votre compte courant et ajouté au <strong>"Solde Actuel"</strong> de l'enveloppe correspondante.
        </div>
      </div>

      {/* SECTIONS */}
      {renderSection("Dépenses Courantes (Alimentaire, Carburant...)", "courant", "border-emerald-100", Wallet)}
      {renderSection("Enveloppes Secondaires (Loisirs, Cadeaux...)", "secondaire", "border-indigo-100", Coins)}

      <div className="text-center text-[11px] text-slate-400 italic">
        Toutes les modifications sont sauvegardées automatiquement sur votre compte.
      </div>
    </div>
  );
}