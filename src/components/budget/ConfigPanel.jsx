import React from 'react';
import { useBudget } from '../../hooks/useBudget';
import { 
  Trash2, PlusCircle, Wallet, PiggyBank, 
  ShieldCheck, CreditCard, Info 
} from 'lucide-react';

const SmartInput = ({ value, onChange, placeholder, isNumber }) => {
  const handleFocus = (e) => {
    const val = e.target.value;
    if (val === '0' || (typeof val === 'string' && val.includes('Nouveau'))) {
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
      className={`p-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 transition-all ${isNumber ? 'text-right font-mono font-bold' : 'w-full'}`}
    />
  );
};

const ConfigSection = ({ title, children, icon: Icon, colorClass }) => (
  <div className={`mb-8 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 ${colorClass}`}>
    <div className="flex items-center gap-3 mb-6 border-b border-slate-50 pb-4">
      {Icon && <Icon className="text-slate-400" size={24} />}
      <h3 className="text-lg font-bold text-slate-700 uppercase tracking-wider">{title}</h3>
    </div>
    <div className="space-y-4">{children}</div>
  </div>
);

export default function ConfigPanel() {
  const { 
    config, updateConfigPoste, addConfigPoste, removeConfigPoste, 
    updateAccountInitial, setProvisionAccount 
  } = useBudget();

  return (
    <div className="max-w-4xl mx-auto p-4 pb-20 space-y-4">
      
      {/* HEADER DE LA PAGE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 px-2">
        <div>
          <h2 className="text-3xl font-black text-slate-800">Paramètres</h2>
          <p className="text-slate-500 font-medium">Structurez vos comptes et charges fixes</p>
        </div>
      </div>

      {/* 1. SECTION COMPTES BANCAIRES */}
      <ConfigSection title="Mes Comptes & Soldes" icon={Wallet}>
        <div className="grid gap-3">
          {(config.comptes || []).map(compte => (
            <div key={compte.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 gap-4">
              <div className="flex items-center gap-4">
                 <div className="p-2 bg-white rounded-lg shadow-sm">
                   <CreditCard size={20} className="text-slate-400" />
                 </div>
                 <div>
                   <span className="font-bold text-slate-700 block">{compte.label}</span>
                   <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">{compte.type}</span>
                 </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">Solde Actuel</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32">
                      <SmartInput 
                        isNumber 
                        value={compte.initial} 
                        onChange={(v) => updateAccountInitial(compte.id, v)} 
                      />
                    </div>
                    <span className="text-slate-400 font-bold">€</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ConfigSection>

      {/* 2. RÉGLAGES DES TRANSFERTS AUTOMATIQUES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4 text-blue-700 font-bold">
            <PiggyBank size={20} />
            <span>Cible des Provisions</span>
          </div>
          <p className="text-xs text-blue-600 mb-4 leading-relaxed">
            Choisissez le compte qui reçoit les virements mensuels des charges annualisées (Rémi).
          </p>
          <select 
            value={config.provisionAccountId || ''} 
            onChange={(e) => setProvisionAccount(e.target.value)}
            className="w-full p-3 rounded-xl border-none shadow-sm font-bold text-blue-900 outline-none"
          >
            <option value="">Sélectionner un compte</option>
            {config.comptes.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>

        <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4 text-emerald-700 font-bold">
            <ShieldCheck size={20} />
            <span>Cible Épargne Précaution</span>
          </div>
          <p className="text-xs text-emerald-600 mb-4 leading-relaxed">
            Choisissez le compte pour votre fonds d'urgence (Véro).
          </p>
          <select 
            value={config.savingsAccountId || ''} 
            className="w-full p-3 rounded-xl border-none shadow-sm font-bold text-emerald-900 outline-none"
            disabled // Ce champ est indicatif, géré via le type de compte livretA par défaut
          >
            <option value="livretA">Livret A Véro (Précaution)</option>
          </select>
        </div>
      </div>

      {/* 3. CHARGES FIXES MENSULLES */}
      <ConfigSection title="Prélèvements Fixes Mensuels" icon={CreditCard}>
        <div className="flex justify-between items-center mb-4">
          <p className="text-xs text-slate-400 font-medium italic">Ex: Loyer, EDF, Internet, Crédits...</p>
          <button 
            onClick={() => addConfigPoste('fixe')} 
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95"
          >
            <PlusCircle size={16} /> Ajouter une charge
          </button>
        </div>

        <div className="space-y-3">
          {config.postes.filter(p => p.type === 'fixe').map(poste => (
            <div key={poste.id} className="flex gap-3 items-center group">
              <SmartInput 
                value={poste.label} 
                onChange={(v) => updateConfigPoste({ ...poste, label: v })} 
                placeholder="Nom du prélèvement" 
              />
              <div className="w-32 flex items-center gap-2">
                <SmartInput 
                  isNumber 
                  value={poste.montant} 
                  onChange={(v) => updateConfigPoste({ ...poste, montant: parseFloat(v) || 0 })} 
                  placeholder="0.00" 
                />
                <span className="text-slate-400 font-bold">€</span>
              </div>
              <button 
                onClick={() => { if(confirm("Supprimer ce poste ?")) removeConfigPoste(poste.id); }} 
                className="text-slate-200 hover:text-red-500 p-2 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          {config.postes.filter(p => p.type === 'fixe').length === 0 && (
            <div className="text-center py-8 text-slate-300 text-sm border-2 border-dashed border-slate-100 rounded-2xl">
              Aucune charge fixe configurée.
            </div>
          )}
        </div>
      </ConfigSection>

      {/* NOTE FINALE */}
      <div className="bg-slate-100 p-4 rounded-2xl flex gap-3 items-start">
        <Info className="text-slate-400 shrink-0" size={18} />
        <p className="text-[11px] text-slate-500 leading-relaxed">
          <strong>Note :</strong> Les modifications effectuées ici impactent les calculs de tous les mois non clôturés. Assurez-vous de la cohérence de vos soldes bancaires pour que le reste-à-vivre soit le plus précis possible.
        </p>
      </div>

    </div>
  );
}