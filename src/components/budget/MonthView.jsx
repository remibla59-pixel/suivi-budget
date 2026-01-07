import React, { useState } from 'react';
import { useBudget } from '../../hooks/useBudget';
import { 
  ChevronLeft, ChevronRight, Calculator, Plus, Trash2, 
  Lock, LockOpen, CheckCircle, Circle, ArrowRightLeft, 
  DollarSign, Wallet, ShoppingBag 
} from 'lucide-react';

// Utilitaire pour arrondir proprement les centimes
const round = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

const SmartInput = ({ value, onChange, placeholder, disabled, className, type="text" }) => {
  const handleFocus = (e) => {
    if (!disabled && (e.target.value.includes('Nouveau') || e.target.value === '0')) {
      onChange('');
    }
  };
  return (
    <input 
      value={value} 
      type={type} 
      disabled={disabled} 
      onFocus={handleFocus} 
      onChange={(e) => onChange(e.target.value)} 
      placeholder={placeholder} 
      className={className}
    />
  );
};

// COMPOSANT COLONNE ENVELOPPE (Utilisé pour Courant et Plaisirs)
const EnvelopeColumn = ({ env, funded, expenses, onFund, onSpend, onRemove, isClosed }) => {
  const [note, setNote] = useState('');
  const [amount, setAmount] = useState('');

  const handleSpend = () => {
    if (note && amount) { 
      onSpend(env.id, note, amount); 
      setNote(''); 
      setAmount(''); 
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
      {/* HEADER DE L'ENVELOPPE */}
      <div className={`p-3 border-b ${funded ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
        <div className="flex justify-between items-start mb-2">
           <span className="font-bold text-slate-800 text-sm truncate pr-2">{env.label}</span>
           <span className={`text-lg font-bold ${env.currentBalance < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
             {round(env.currentBalance).toLocaleString()}€
           </span>
        </div>
        
        {!funded && !isClosed ? (
          <button 
            onClick={() => onFund(env.id)} 
            className="w-full text-[10px] uppercase font-bold bg-white border border-emerald-200 text-emerald-600 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
          >
             + Remplir ({env.budgetMonthly}€)
          </button>
        ) : (
          <div className="text-[10px] text-center text-emerald-600 font-bold bg-emerald-100/50 rounded-lg py-1 border border-emerald-200/50">
             Budget Mensuel Versé
          </div>
        )}
      </div>

      {/* LISTE DES DÉPENSES EFFECTUÉES */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-60 bg-slate-50/30">
        {expenses.length === 0 && <div className="text-center text-[10px] text-slate-300 py-6 italic">Aucune dépense</div>}
        {expenses.map(e => (
          <div key={e.id} className="bg-white p-2 rounded-lg border border-slate-100 shadow-sm text-[11px]">
            <div className="flex justify-between items-start">
              <span className="font-medium text-slate-700 leading-tight">{e.label}</span>
              <span className="font-bold text-slate-900 ml-2">{round(e.amount)}€</span>
            </div>
            {!isClosed && (
              <div className="text-right mt-1">
                <button onClick={() => onRemove(e.id, env.id, e.amount)} className="text-slate-300 hover:text-red-500 transition-colors">
                  <Trash2 size={12}/>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* FORMULAIRE DE SAISIE DE DÉPENSE */}
      {!isClosed && (
        <div className="p-2 border-t border-slate-100 bg-white">
           <input 
             value={note} 
             onChange={e => setNote(e.target.value)} 
             placeholder="Note (ex: Leclerc...)" 
             className="w-full border-b text-[11px] p-1 outline-none mb-1 focus:border-blue-300"
           />
           <div className="flex gap-1">
             <input 
               type="number" 
               value={amount} 
               onChange={e => setAmount(e.target.value)} 
               placeholder="0.00" 
               className="w-full border rounded text-xs p-1 text-right outline-none focus:ring-1 focus:ring-blue-200"
             />
             <button 
               onClick={handleSpend} 
               disabled={!amount || !note} 
               className="bg-slate-800 text-white p-1.5 rounded-lg hover:bg-black disabled:opacity-30 transition-all"
             >
               <Plus size={14}/>
             </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default function MonthView() {
  const { 
    config, monthlyData, addIncomeLine, updateIncomeLine, removeIncomeLine, 
    updateFixedExpense, toggleFixedCheck, fundEnvelope, spendEnvelope, 
    removeEnvelopeExpense, toggleMonthlyProvision, addProvisionExpense, 
    removeProvisionExpense, validateMonth, reopenMonth 
  } = useBudget();

  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));

  const mData = monthlyData[currentMonth] || {};
  const isClosed = mData.isClosed;
  const currentYear = currentMonth.split('-')[0];

  // --- CALCULS DES VALEURS ---
  const revenusList = mData.revenusList || [];
  const totalRevenus = round(revenusList.reduce((sum, item) => sum + (item.montant || 0), 0));

  const provisionsOfYear = config.provisionsByYear?.[currentYear] || [];
  const totalAnnualProvisions = round(provisionsOfYear.reduce((sum, p) => sum + (p.amount || 0), 0));
  const monthlyProvisionAmount = Math.round(totalAnnualProvisions / 12);
  const isProvisionDone = mData.provisionDone || false;

  const totalFixe = round(config.postes.filter(p => p.type === 'fixe').reduce((sum, p) => sum + (mData.depenses?.[p.id] ?? p.montant), 0));
  const totalEpargne = round(config.epargneCibles.reduce((sum, e) => sum + e.mensuel, 0));

  // Calcul des fonds sortis du compte courant vers les enveloppes ce mois-ci
  const fundedEnvelopesAmount = config.envelopes.reduce((sum, env) => {
    return sum + (mData[`funded_${env.id}`] ? env.budgetMonthly : 0);
  }, 0);

  const totalSorties = round(totalFixe + totalEpargne + (isProvisionDone ? monthlyProvisionAmount : 0) + fundedEnvelopesAmount);
  const resteAVivre = round(totalRevenus - totalSorties);

  // ÉTAT LOCAL POUR LES PROVISIONS
  const [selectedProvId, setSelectedProvId] = useState('');
  const [provExpenseNote, setProvExpenseNote] = useState('');
  const [provExpenseAmount, setProvExpenseAmount] = useState('');

  const handleAddProvExpense = () => {
    if (selectedProvId && provExpenseAmount) {
      const defaultLabel = provisionsOfYear.find(p => p.id === selectedProvId)?.label || 'Facture';
      const finalLabel = provExpenseNote ? `${defaultLabel} (${provExpenseNote})` : defaultLabel;
      addProvisionExpense(currentMonth, selectedProvId, finalLabel, provExpenseAmount);
      setProvExpenseAmount(''); setProvExpenseNote(''); setSelectedProvId('');
    }
  };

  // NAVIGATION
  const changeMonth = (offset) => {
    const d = new Date(currentMonth + "-01");
    d.setMonth(d.getMonth() + offset);
    setCurrentMonth(d.toISOString().slice(0, 7));
  };

  const changeYear = (e) => {
    const year = e.target.value;
    const month = currentMonth.split('-')[1];
    setCurrentMonth(`${year}-${month}`);
  };

  const handleValidate = () => { if (window.confirm("Voulez-vous clôturer ce mois ?")) { const next = validateMonth(currentMonth); setCurrentMonth(next); }};
  const handleReopen = () => { if (window.confirm("Voulez-vous rouvrir ce mois pour modifications ?")) reopenMonth(currentMonth); };

  return (
    <div className="max-w-6xl mx-auto p-2 sm:p-4 space-y-6 pb-20">
      
      {/* NAVIGATION MOIS / ANNEE */}
      <div className={`flex items-center justify-between p-4 rounded-2xl shadow-lg text-white transition-colors duration-500 ${isClosed ? 'bg-slate-700' : 'bg-blue-900'}`}>
        <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white/20 rounded-full transition-colors"><ChevronLeft /></button>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-3">
            {isClosed ? (
               <button onClick={handleReopen} className="flex items-center gap-2 bg-slate-600 hover:bg-slate-500 px-4 py-1 rounded-full border border-slate-400 text-sm font-medium transition-all">
                 <Lock size={16} className="text-orange-300" />
                 <span>Mois Clôturé</span>
                 <LockOpen size={14} className="ml-1 opacity-60" />
               </button>
            ) : (
               <span className="text-2xl font-bold capitalize">{new Date(currentMonth + "-01").toLocaleDateString('fr-FR', { month: 'long' })}</span>
            )}
            <select 
              value={currentYear} 
              onChange={changeYear} 
              className="bg-transparent border-none font-bold text-2xl text-white cursor-pointer focus:ring-0"
            >
               {[2025, 2026, 2027, 2028].map(y => <option key={y} value={y} className="text-black">{y}</option>)}
            </select>
          </div>
        </div>
        <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white/20 rounded-full transition-colors"><ChevronRight /></button>
      </div>

      {/* CARTES KPI RÉSUMÉ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-emerald-500">
           <div className="flex justify-between items-center mb-3">
             <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Entrées d'argent</label>
             {!isClosed && <button onClick={() => addIncomeLine(currentMonth)} className="text-emerald-600 hover:bg-emerald-50 p-1 rounded-full transition-colors"><Plus size={20}/></button>}
           </div>
           <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
             {revenusList.map(rev => (
               <div key={rev.id} className="flex gap-2 items-center">
                 <SmartInput value={rev.label} disabled={isClosed} onChange={(v) => updateIncomeLine(currentMonth, rev.id, 'label', v)} className="w-full text-sm border-b border-transparent focus:border-emerald-300 outline-none bg-transparent" />
                 <SmartInput type="number" value={rev.montant} disabled={isClosed} onChange={(v) => updateIncomeLine(currentMonth, rev.id, 'montant', v)} className="w-20 text-sm font-bold text-right outline-none text-emerald-700 bg-transparent" />
                 {!isClosed && <button onClick={() => removeIncomeLine(currentMonth, rev.id)} className="text-slate-200 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>}
               </div>
             ))}
           </div>
           <div className="mt-3 pt-3 border-t border-slate-50 flex justify-between font-bold text-slate-800">
             <span className="text-sm">Total</span>
             <span>{totalRevenus.toLocaleString()} €</span>
           </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-red-400">
          <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Sorties Prévues</label>
          <div className="text-3xl font-bold text-slate-800 mt-2">{totalSorties.toLocaleString()} €</div>
          <div className="text-[10px] text-slate-400 mt-2 font-medium">
            Fixes + Épargne + Enveloppes ({fundedEnvelopesAmount}€)
          </div>
        </div>

        <div className={`p-6 rounded-2xl shadow-sm border-l-4 transition-colors ${resteAVivre >= 0 ? 'bg-emerald-50 border-emerald-500' : 'bg-red-50 border-red-500'}`}>
          <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Reste sur Compte</label>
          <div className={`text-3xl font-bold mt-2 ${resteAVivre >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {resteAVivre.toLocaleString()} €
          </div>
          <div className="text-[10px] opacity-60 mt-2">Solde théorique fin de mois</div>
        </div>
      </div>

      {/* ENVELOPPES COURANTES (4 COLONNES) */}
      <section>
        <h3 className="font-bold text-slate-700 mb-4 px-2 flex items-center gap-2">
          <Wallet size={20} className="text-emerald-500"/> Dépenses Courantes
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {config.envelopes.filter(e => e.category === 'courant').map(env => (
            <EnvelopeColumn 
              key={env.id} env={env} funded={mData[`funded_${env.id}`]} 
              expenses={(mData.envelopeExpenses || []).filter(e => e.envId === env.id)} 
              onFund={(id) => fundEnvelope(currentMonth, id)} 
              onSpend={spendEnvelope.bind(null, currentMonth)} 
              onRemove={removeEnvelopeExpense.bind(null, currentMonth)} 
              isClosed={isClosed} 
            />
          ))}
        </div>
      </section>

      {/* ENVELOPPES PLAISIRS */}
      <section>
        <h3 className="font-bold text-slate-700 mb-4 px-2 flex items-center gap-2 mt-8">
          <ShoppingBag size={20} className="text-indigo-500"/> Enveloppes Plaisirs
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {config.envelopes.filter(e => e.category === 'secondaire').map(env => (
            <EnvelopeColumn 
              key={env.id} env={env} funded={mData[`funded_${env.id}`]} 
              expenses={(mData.envelopeExpenses || []).filter(e => e.envId === env.id)} 
              onFund={(id) => fundEnvelope(currentMonth, id)} 
              onSpend={spendEnvelope.bind(null, currentMonth)} 
              onRemove={removeEnvelopeExpense.bind(null, currentMonth)} 
              isClosed={isClosed} 
            />
          ))}
        </div>
      </section>

      {/* PROVISIONS ANNUALISÉES */}
      <section className="bg-white rounded-2xl shadow-sm overflow-hidden border border-blue-200 mt-8">
        <div className="p-4 bg-blue-50 border-b border-blue-100">
          <h3 className="font-bold text-blue-800 flex items-center gap-2">
            <ArrowRightLeft size={18}/> Provisions Annualisées (Livret Rémi)
          </h3>
        </div>
        <div className="p-4 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-sm gap-4">
            <div>
              <div className="font-bold text-slate-700">Virement Mensuel d'Épargne</div>
              <div className="text-xs text-slate-500">Montant lissé : {monthlyProvisionAmount}€ / mois</div>
            </div>
            <button 
              onClick={() => toggleMonthlyProvision(currentMonth, monthlyProvisionAmount)} 
              disabled={isClosed} 
              className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${isProvisionDone ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'}`}
            >
              {isProvisionDone ? <><CheckCircle size={18}/> Virement Effectué</> : 'Confirmer le virement'}
            </button>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
             <div className="text-[10px] font-bold text-slate-400 uppercase mb-3 tracking-widest">Payer une facture via les provisions</div>
             
             <div className="space-y-2 mb-4">
               {(mData.provisionExpenses || []).map(exp => (
                 <div key={exp.id} className="flex justify-between items-center text-xs bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                   <span className="font-semibold text-slate-700">{exp.label}</span>
                   <div className="flex items-center gap-4">
                     <span className="font-bold text-orange-600">{round(exp.amount)} €</span>
                     {!isClosed && <button onClick={() => removeProvisionExpense(currentMonth, exp.id, exp.amount, exp.provisionId)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>}
                   </div>
                 </div>
               ))}
             </div>

             {!isClosed && (
               <div className="flex flex-col gap-3 mt-4">
                 <select 
                   value={selectedProvId} 
                   onChange={(e) => setSelectedProvId(e.target.value)} 
                   className="w-full p-2.5 border rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-blue-200 transition-all shadow-sm"
                 >
                   <option value="">-- Choisir la charge annualisée --</option>
                   {provisionsOfYear.map(p => (
                     <option key={p.id} value={p.id}>{p.label} (Budget: {p.amount}€)</option>
                   ))}
                 </select>
                 
                 <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Note (ex: Régul, partiel...)" 
                      value={provExpenseNote} 
                      onChange={(e) => setProvExpenseNote(e.target.value)} 
                      className="flex-1 p-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-200 shadow-sm"
                    />
                    <input 
                      type="number" 
                      placeholder="0.00" 
                      value={provExpenseAmount} 
                      onChange={(e) => setProvExpenseAmount(e.target.value)} 
                      className="w-24 p-2.5 border rounded-xl text-sm text-right outline-none focus:ring-2 focus:ring-blue-200 shadow-sm font-mono"
                    />
                    <button 
                      onClick={handleAddProvExpense} 
                      disabled={!selectedProvId || !provExpenseAmount} 
                      className="bg-orange-500 text-white p-2.5 rounded-xl hover:bg-orange-600 disabled:opacity-30 transition-all shadow-md"
                    >
                      <DollarSign size={20} />
                    </button>
                 </div>
               </div>
             )}
          </div>
        </div>
      </section>

      {/* CHARGES FIXES */}
      <section className="bg-white rounded-2xl shadow-sm overflow-hidden p-5 border border-slate-100">
        <h3 className="font-bold text-slate-700 mb-5 flex items-center gap-2">
          <Lock size={20} className="text-slate-400"/> Prélèvements & Charges Fixes
        </h3>
        <div className="grid gap-2">
          {config.postes.filter(p => p.type === 'fixe').map(p => {
            const isChecked = mData.fixedStatus?.[p.id] || false;
            return (
              <div key={p.id} className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-300 ${isChecked ? 'bg-emerald-50 border-emerald-200 shadow-sm' : 'bg-white border-slate-100'}`}>
                <div className="flex items-center gap-4">
                  <button onClick={() => toggleFixedCheck(currentMonth, p.id)} disabled={isClosed} className={`transition-transform active:scale-90 ${isChecked ? 'text-emerald-600' : 'text-slate-300 hover:text-slate-400'}`}>
                    {isChecked ? <CheckCircle size={28} fill="currentColor" className="text-white" /> : <Circle size={28} />}
                  </button>
                  <span className={`text-sm transition-all ${isChecked ? 'text-emerald-800 font-bold' : 'text-slate-700 font-medium'}`}>{p.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <SmartInput type="number" disabled={isClosed} value={mData.depenses?.[p.id] ?? p.montant} onChange={(v) => updateFixedExpense(currentMonth, p.id, v)} className={`w-24 text-right p-1.5 bg-transparent border-b outline-none font-mono font-bold transition-all ${isChecked ? 'text-emerald-700 border-emerald-300' : 'text-slate-600 border-slate-300'}`} />
                  <span className="text-[10px] font-bold text-slate-400">€</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* BOUTON DE CLÔTURE */}
      {!isClosed && (
        <div className="flex justify-center pt-10">
          <button 
            onClick={handleValidate} 
            className="group relative bg-slate-800 text-white px-10 py-4 rounded-full font-bold shadow-xl hover:bg-black hover:scale-105 transition-all duration-300 flex items-center gap-3 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <CheckCircle className="relative z-10" />
            <span className="relative z-10">Valider & Clôturer le mois</span>
          </button>
        </div>
      )}
    </div>
  );
}