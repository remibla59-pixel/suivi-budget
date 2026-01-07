import React from 'react';
import { useBudget } from '../../hooks/useBudget';
import { Wallet, PlusCircle, Trash2, Info, Coins } from 'lucide-react';

const SmartInput = ({ value, onChange, placeholder, isNumber }) => {
  const handleFocus = (e) => {
    const val = e.target.value;
    // Efface si c'est une valeur par défaut
    if (val === '0' || (typeof val === 'string' && val.includes('Nouvelle'))) {
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
      className={`p-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-400 transition-all ${
        isNumber ? 'text-right font-mono font-bold' : 'w-full'
      }`}
    />
  );
};

export default function EnvelopesConfigView() {
  const { config, updateEnvelopeConfig, addEnvelopeConfig, removeEnvelopeConfig } = useBudget();
  const envelopes = config.envelopes || [];

  const renderSection = (title, category, colorClass, Icon) => {
    const filteredEnvelopes = envelopes.filter(e => e.category === category);

    return (
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
            <PlusCircle size={14} /> Ajouter une enveloppe
          </button>
        </div>
        
        <div className="divide-y divide-slate-100">
          {filteredEnvelopes.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs italic">
              Aucune enveloppe configurée ici.
            </div>
          ) : (
            filteredEnvelopes.map(env => (
              <div key={env.id} className="p-4 grid grid-cols-1 md:grid-cols-12 gap-6 items-center hover:bg-slate-50/50 transition-colors">
                
                {/* NOM DE L'ENVELOPPE */}
                <div className="col-span-4">
                  <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">Nom</label>
                  <SmartInput 
                    value={env.label} 
                    onChange={(v) => updateEnvelopeConfig({ ...env, label: v })} 
                    placeholder="Ex: Courses" 
                  />
                </div>

                {/* SOLDE ACTUEL (Persistant) */}
                <div className="col-span-3">
                   <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">Solde en cours (Argent réel)</label>
                   <div className="flex items-center gap-2">
                     <SmartInput 
                       isNumber 
                       value={env.currentBalance} 
                       onChange={(v) => updateEnvelopeConfig({ ...env, currentBalance: parseFloat(v) || 0 })} 
                     />
                     <span className="text-slate-400 font-bold text-sm">€</span>
                   </div>
                </div>

                {/* BUDGET MENSUEL (Montant du virement auto) */}
                <div className="col-span-3">
                   <label className="text-[10px] text-blue-500 font-bold uppercase mb-1 block">Virement mensuel prévu</label>
                   <div className="flex items-center gap-2">
                     <SmartInput 
                       isNumber 
                       value={env.budgetMonthly} 
                       onChange={(v) => updateEnvelopeConfig({ ...env, budgetMonthly: parseFloat(v) || 0 })} 
                     />
                     <span className="text-blue-500 font-bold text-sm">€</span>
                   </div>
                </div>

                {/* BOUTON SUPPRIMER */}
                <div className="col-span-2 flex justify-end">
                   <button 
                     onClick={() => { if(confirm("Supprimer définitivement cette enveloppe ?")) removeEnvelopeConfig(env.id); }} 
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
  };

  return (
    <div className="max-w-5xl mx-auto p-4 pb-20 space-y-8">
      
      {/* HEADER */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-700 text-white p-8 rounded-3xl shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-2xl">
            <Wallet className="text-emerald-300" size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Gestion des Enveloppes</h2>
            <p className="text-emerald-100 text-sm opacity-80 font-medium">Configurez vos plafonds et suivez l'argent restant de mois en mois.</p>
          </div>
        </div>
      </div>

      {/* RAPPEL DE FONCTIONNEMENT */}
      <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3 shadow-sm">
        <Info className="text-amber-500 shrink-0" size={20} />
        <div className="text-xs text-amber-800 leading-relaxed">
          <strong>Comment ça marche ?</strong> <br />
          1. Vous définissez le <strong>Virement mensuel</strong> (ex: 400€ pour les courses). <br />
          2. Chaque début de mois, sur l'onglet Mensuel, cliquez sur <strong>"Remplir"</strong> pour ajouter ces 400€ à votre <strong>Solde Actuel</strong>. <br />
          3. Vos dépenses sont déduites du <strong>Solde Actuel</strong>. Ce qui reste en fin de mois est conservé pour le mois suivant.
        </div>
      </div>

      {/* SECTIONS CATEGORIES */}
      {renderSection("Dépenses Courantes (4 Colonnes)", "courant", "border-emerald-100", Wallet)}
      {renderSection("Enveloppes Secondaires / Plaisirs", "secondaire", "border-indigo-100", Coins)}

      <div className="text-center text-[11px] text-slate-400 italic">
        Les modifications sont enregistrées en temps réel dans votre base de données.
      </div>
    </div>
  );
}