import React, { useState } from 'react';
import { useBudget } from '../../hooks/useBudget';
import { 
  ChevronLeft, ChevronRight, Calculator, Plus, Trash2, 
  Lock, LockOpen, CheckCircle, Circle, ArrowRightLeft, 
  DollarSign, Wallet, ShoppingBag 
} from 'lucide-react';

// Utilitaire pour arrondir proprement à 2 décimales
const round = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

// Composant Input Intelligent (efface le 0 ou le texte par défaut au focus)
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

// SOUS-COMPOSANT : COLONNE D'UNE ENVELOPPE
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
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden hover:shadow-md transition-shadow">
      {/* En-tête de l'enveloppe */}
      <div className={`p-4 border-b ${funded ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
        <div className="flex justify-between items-start mb-2">
           <span className="font-bold text-slate-800 text-sm truncate pr-2" title={env.label}>{env.label}</span>
           <span className={`text-lg font-black ${env.currentBalance < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
             {round(env.currentBalance).toLocaleString()}€
           </span>
        </div>
        
        {/* Bouton Remplir ou Badge Versé */}
        {!funded && !isClosed ? (
          <button 
            onClick={() => onFund(env.id)} 
            className="w-full text-[10px] uppercase font-black bg-white border border-emerald-200 text-emerald-600 py-2 rounded-xl hover:bg-emerald-50 transition-all flex items-center justify-center gap-1"
          >
             <Plus size={12}/> Remplir ({env.budgetMonthly}€)
          </button>
        ) : (
          <div className="text-[10px] text-center text-emerald-600 font-bold bg-emerald-100/50 rounded-lg py-1 border border-emerald-200/50">
             Budget versé
          </div>
        )}
      </div>

      {/* Liste des dépenses de l'enveloppe */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-60 bg-slate-50/30 min-h-[100px]">
        {expenses.length === 0 && (
          <div className="text-center text-[10px] text-slate-300 py-8 italic opacity-60">
            Aucune dépense
          </div>
        )}
        {expenses.map(e => (
          <div key={e.id} className="bg-white p-2 rounded-xl border border-slate-100 shadow-sm text-[11px] group">
            <div className="flex justify-between items-start">
              <span className="font-bold text-slate-700 leading-tight">{e.label}</span>
              <span className="font-black text-slate-900 ml-2">{round(e.amount)}€</span>
            </div>
            {!isClosed && (
              <div className="text-right mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => onRemove(e.id, env.id, e.amount)} 
                  className="text-slate-300 hover:text-red-500 transition-colors"
                  title="Supprimer la dépense"
                >
                  <Trash2 size={12}/>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Zone de saisie (Note + Montant) */}
      {!isClosed && (
        <div className="p-3 border-t border-slate-100 bg-white">
           <input 
             value={note} 
             onChange={e => setNote(e.target.value)} 
             placeholder="Note (ex: Leclerc...)" 
             className="w-full border-b border-slate-200 text-[11px] p-1.5 outline-none mb-2 focus:border-blue-400 bg-transparent"
           />
           <div className="flex gap-2">
             <input 
               type="number" 
               value={amount} 
               onChange={e => setAmount(e.target.value)} 
               placeholder="0.00" 
               className="w-full border border-slate-200 rounded-lg text-xs p-2 text-right outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
             />
             <button 
               onClick={handleSpend} 
               disabled={!amount || !note} 
               className="bg-slate-800 text-white p-2 rounded-lg hover:bg-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
             >
               <Plus size={16}/>
             </button>
           </div>
        </div>
      )}
    </div>
  );
};

// --- COMPOSANT PRINCIPAL ---
export default function MonthView() {
  const { 
    config, 
    monthlyData, 
    addIncomeLine, 
    updateIncomeLine, 
    removeIncomeLine, 
    updateFixedExpense, 
    toggleFixedCheck, 
    fundEnvelope, 
    spendEnvelope, 
    removeEnvelopeExpense, 
    toggleMonthlyProvision, 
    addProvisionExpense, 
    removeProvisionExpense, 
    validateMonth, 
    reopenMonth 
  } = useBudget();

  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));

  const mData = monthlyData[currentMonth] || {};
  const isClosed = mData.isClosed;
  const currentYear = currentMonth.split('-')[0];

  // --- CALCULS & DONNÉES ---
  
  // 1. Revenus
  const revenusList = mData.revenusList || [];
  const totalRevenus = round(revenusList.reduce((sum, item) => sum + (item.montant || 0), 0));

  // 2. Provisions
  const provisionsOfYear = config.provisionsByYear?.[currentYear] || [];
  const totalAnnualProvisions = round(provisionsOfYear.reduce((sum, p) => sum + (p.amount || 0), 0));
  const monthlyProvisionAmount = Math.round(totalAnnualProvisions / 12);
  const isProvisionDone = mData.provisionDone || false;

  // 3. Fixes & Epargne
  const totalFixe = round(
    config.postes
      .filter(p => p.type === 'fixe')
      .reduce((sum, p) => sum + (mData.depenses?.[p.id] ?? p.montant), 0)
  );
  const totalEpargne = round(config.epargneCibles.reduce((sum, e) => sum + e.mensuel, 0));

  // 4. Enveloppes financées ce mois-ci
  const fundedEnvelopesAmount = config.envelopes.reduce((sum, env) => {
    return sum + (mData[`funded_${env.id}`] ? env.budgetMonthly : 0);
  }, 0);

  // 5. Total Sorties & Reste à Vivre
  const totalSorties = round(totalFixe + totalEpargne + (isProvisionDone ? monthlyProvisionAmount : 0) + fundedEnvelopesAmount);
  const resteAVivre = round(totalRevenus - totalSorties);

  // --- STATE LOCAL (Formulaire Provision) ---
  const [selectedProvId, setSelectedProvId] = useState('');
  const [provExpenseNote, setProvExpenseNote] = useState('');
  const [provExpenseAmount, setProvExpenseAmount] = useState('');

  const handleAddProvExpense = () => {
    if (selectedProvId && provExpenseAmount) {
      const defaultLabel = provisionsOfYear.find(p => p.id === selectedProvId)?.label || 'Facture';
      const finalLabel = provExpenseNote ? `${defaultLabel} (${provExpenseNote})` : defaultLabel;
      addProvisionExpense(currentMonth, selectedProvId, finalLabel, provExpenseAmount);
      setProvExpenseAmount(''); 
      setProvExpenseNote(''); 
      setSelectedProvId('');
    }
  };

  // --- NAVIGATION ---
  const changeMonth = (offset) => {
    const d = new Date(currentMonth + "-01");
    d.setMonth(d.getMonth() + offset);
    setCurrentMonth(d.toISOString().slice(0, 7));
  };

  const handleReopen = () => { 
    if(confirm("⚠️ Voulez-vous vraiment rouvrir ce mois ?\nCela permettra de modifier les montants.")) {
      reopenMonth(currentMonth); 
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-2 sm:p-4 space-y-8 pb-24">
      
      {/* 1. HEADER & NAVIGATION */}
      <div className={`flex items-center justify-between p-4 rounded-3xl shadow-xl text-white transition-all duration-500 ${isClosed ? 'bg-slate-700 shadow-slate-200' : 'bg-blue-950 shadow-blue-200'}`}>
        <button onClick={() => changeMonth(-1)} className="p-3 hover:bg-white/10 rounded-2xl transition-colors">
          <ChevronLeft />
        </button>
        
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-3">
            {isClosed ? (
               <button 
                 onClick={handleReopen} 
                 className="flex items-center gap-2 bg-slate-600 hover:bg-slate-500 px-4 py-1.5 rounded-full border border-slate-500 text-sm font-bold transition-all group"
                 title="Cliquez pour rouvrir"
               >
                 <Lock size={16} className="text-orange-300" /> 
                 <span>Mois Clôturé</span>
                 <LockOpen size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-white"/>
               </button>
            ) : (
               <span className="text-2xl font-black capitalize">
                 {new Date(currentMonth + "-01").toLocaleDateString('fr-FR', { month: 'long' })}
               </span>
            )}
            
            <select 
              value={currentYear} 
              onChange={(e) => {
                const year = e.target.value;
                const month = currentMonth.split('-')[1];
                setCurrentMonth(`${year}-${month}`);
              }} 
              className="bg-transparent border-none font-black text-2xl text-white cursor-pointer focus:ring-0 hover:text-blue-200"
            >
               {[2025, 2026, 2027, 2028].map(y => <option key={y} value={y} className="text-black">{y}</option>)}
            </select>
          </div>
        </div>

        <button onClick={() => changeMonth(1)} className="p-3 hover:bg-white/10 rounded-2xl transition-colors">
          <ChevronRight />
        </button>
      </div>

      {/* 2. KPI / TABLEAU DE BORD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CARTE REVENUS */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
           <div className="flex justify-between items-center mb-4">
             <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Entrées d'argent</label>
             {!isClosed && (
               <button onClick={() => addIncomeLine(currentMonth)} className="text-emerald-600 bg-emerald-50 p-1.5 rounded-xl hover:bg-emerald-100 transition-colors">
                 <Plus size={18}/>
               </button>
             )}
           </div>
           <div className="space-y-3 max-h-40 overflow-y-auto pr-1">
             {revenusList.map(rev => (
               <div key={rev.id} className="flex gap-2 items-center">
                 <SmartInput 
                   value={rev.label} 
                   disabled={isClosed} 
                   onChange={(v) => updateIncomeLine(currentMonth, rev.id, 'label', v)} 
                   className="w-full text-sm border-b border-transparent focus:border-emerald-300 outline-none font-medium bg-transparent" 
                 />
                 <SmartInput 
                   type="number" 
                   value={rev.montant} 
                   disabled={isClosed} 
                   onChange={(v) => updateIncomeLine(currentMonth, rev.id, 'montant', v)} 
                   className="w-20 text-sm font-black text-right outline-none text-emerald-600 bg-transparent" 
                 />
                 {!isClosed && (
                   <button onClick={() => removeIncomeLine(currentMonth, rev.id)} className="text-slate-200 hover:text-red-500 transition-colors">
                     <Trash2 size={14}/>
                   </button>
                 )}
               </div>
             ))}
           </div>
           <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between font-black text-slate-800">
             <span>Total</span>
             <span>{totalRevenus.toLocaleString()} €</span>
           </div>
        </div>

        {/* CARTE SORTIES */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center text-center">
          <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Sorties Compte Courant</label>
          <div className="text-4xl font-black text-slate-900">{totalSorties.toLocaleString()} €</div>
          <div className="text-[10px] text-slate-400 mt-2 font-bold italic bg-slate-50 rounded-full py-1 px-3 inline-block mx-auto">
            Fixes + Épargne + Enveloppes + Provisions
          </div>
        </div>

        {/* CARTE RESTE A VIVRE */}
        <div className={`p-6 rounded-3xl shadow-sm flex flex-col justify-center text-center border-2 transition-colors ${resteAVivre >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
          <label className={`text-[10px] font-black uppercase tracking-widest mb-2 ${resteAVivre >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            Reste sur Compte
          </label>
          <div className={`text-4xl font-black ${resteAVivre >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {resteAVivre.toLocaleString()} €
          </div>
          <div className="text-[10px] opacity-60 mt-2 font-medium">Solde théorique fin de mois</div>
        </div>
      </div>

      {/* 3. SECTION ENVELOPPES COURANTES */}
      <section>
        <h3 className="font-black text-slate-800 flex items-center gap-2 mt-8 text-lg mb-4">
          <Wallet size={20} className="text-emerald-500"/> Dépenses Courantes (Enveloppes)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {config.envelopes.filter(e => e.category === 'courant').map(env => (
            <EnvelopeColumn 
              key={env.id} 
              env={env} 
              funded={mData[`funded_${env.id}`]} 
              expenses={(mData.envelopeExpenses || []).filter(e => e.envId === env.id)} 
              onFund={(id) => fundEnvelope(currentMonth, id)} 
              onSpend={spendEnvelope.bind(null, currentMonth)} 
              onRemove={removeEnvelopeExpense.bind(null, currentMonth)} 
              isClosed={isClosed} 
            />
          ))}
        </div>
      </section>

      {/* 4. SECTION ENVELOPPES PLAISIRS */}
      <section>
        <h3 className="font-black text-slate-800 flex items-center gap-2 mt-8 text-lg mb-4">
          <ShoppingBag size={20} className="text-indigo-500"/> Enveloppes Plaisirs
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {config.envelopes.filter(e => e.category === 'secondaire').map(env => (
            <EnvelopeColumn 
              key={env.id} 
              env={env} 
              funded={mData[`funded_${env.id}`]} 
              expenses={(mData.envelopeExpenses || []).filter(e => e.envId === env.id)} 
              onFund={(id) => fundEnvelope(currentMonth, id)} 
              onSpend={spendEnvelope.bind(null, currentMonth)} 
              onRemove={removeEnvelopeExpense.bind(null, currentMonth)} 
              isClosed={isClosed} 
            />
          ))}
        </div>
      </section>

      {/* 5. SECTION PROVISIONS ANNUALISÉES */}
      <section className="bg-white rounded-3xl shadow-sm overflow-hidden border border-blue-100 mt-10">
        <div className="p-5 bg-blue-50/50 border-b border-blue-100 flex justify-between items-center">
          <h3 className="font-black text-blue-900 flex items-center gap-2">
            <ArrowRightLeft size={20}/> Provisions Annualisées
          </h3>
          <div className="text-xs font-bold text-blue-400 uppercase tracking-widest bg-white px-2 py-1 rounded-md shadow-sm">
            Livret Rémi
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Ligne Virement */}
          <div className="flex flex-col sm:flex-row items-center justify-between bg-white p-5 rounded-2xl border border-slate-100 shadow-sm gap-4">
            <div>
              <div className="font-black text-slate-800">Épargne Mensuelle Lissée</div>
              <div className="text-xs text-slate-400 font-bold tracking-wider">Cible : {monthlyProvisionAmount}€ / mois</div>
            </div>
            <button 
              onClick={() => toggleMonthlyProvision(currentMonth, monthlyProvisionAmount)} 
              disabled={isClosed} 
              className={`w-full sm:w-auto px-8 py-3 rounded-2xl font-black transition-all transform active:scale-95 ${isProvisionDone ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-600 text-white hover:bg-black shadow-lg shadow-blue-100'}`}
            >
              {isProvisionDone ? 'Virement Effectué' : 'Confirmer le virement'}
            </button>
          </div>

          {/* Zone Paiement Factures */}
          <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-100">
             <div className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Payer une facture via les provisions</div>
             
             {/* Liste dépenses provisions */}
             <div className="space-y-2">
               {(mData.provisionExpenses || []).map(exp => (
                 <div key={exp.id} className="flex justify-between items-center text-xs bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                   <span className="font-bold text-slate-700">{exp.label}</span>
                   <div className="flex items-center gap-4">
                     <span className="font-black text-orange-600">{round(exp.amount)} €</span>
                     {!isClosed && (
                       <button onClick={() => removeProvisionExpense(currentMonth, exp.id, exp.amount, exp.provisionId)} className="text-slate-200 hover:text-red-500 transition-colors">
                         <Trash2 size={16}/>
                       </button>
                     )}
                   </div>
                 </div>
               ))}
             </div>

             {/* Formulaire ajout */}
             {!isClosed && (
               <div className="flex flex-col gap-3 mt-5">
                 <select 
                   value={selectedProvId} 
                   onChange={(e) => setSelectedProvId(e.target.value)} 
                   className="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-white outline-none shadow-sm focus:border-blue-400"
                 >
                   <option value="">-- Choisir la charge à payer --</option>
                   {provisionsOfYear.map(p => (
                     <option key={p.id} value={p.id}>{p.label} (Prévu: {p.amount}€)</option>
                   ))}
                 </select>
                 
                 <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Note (ex: Régul, Partiel...)" 
                      value={provExpenseNote} 
                      onChange={(e) => setProvExpenseNote(e.target.value)} 
                      className="flex-1 p-3 border border-slate-200 rounded-xl text-sm outline-none font-medium shadow-sm focus:border-blue-400"
                    />
                    <input 
                      type="number" 
                      placeholder="0.00" 
                      value={provExpenseAmount} 
                      onChange={(e) => setProvExpenseAmount(e.target.value)} 
                      className="w-24 p-3 border border-slate-200 rounded-xl text-sm text-right outline-none font-black shadow-sm focus:border-blue-400"
                    />
                    <button 
                      onClick={handleAddProvExpense} 
                      disabled={!selectedProvId || !provExpenseAmount} 
                      className="bg-orange-500 text-white px-4 rounded-xl hover:bg-black transition-colors shadow-lg shadow-orange-100 disabled:opacity-50"
                    >
                      <DollarSign size={20} />
                    </button>
                 </div>
               </div>
             )}
          </div>
        </div>
      </section>

      {/* 6. SECTION CHARGES FIXES */}
      <section className="bg-white rounded-3xl shadow-sm overflow-hidden p-6 border border-slate-100 mt-10">
        <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2">
          <Lock size={20} className="text-slate-300"/> Prélèvements Automatiques
        </h3>
        <div className="grid gap-3">
          {config.postes.filter(p => p.type === 'fixe').map(p => {
            const isChecked = mData.fixedStatus?.[p.id] || false;
            return (
              <div 
                key={p.id} 
                className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${isChecked ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-50'}`}
              >
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => toggleFixedCheck(currentMonth, p.id)} 
                    disabled={isClosed} 
                    className={`transition-transform active:scale-90 ${isChecked ? 'text-emerald-500' : 'text-slate-200 hover:text-slate-400'}`}
                  >
                    {isChecked ? <CheckCircle size={30} fill="currentColor" className="text-white" /> : <Circle size={30} />}
                  </button>
                  <span className={`text-sm font-bold ${isChecked ? 'text-emerald-800' : 'text-slate-700'}`}>
                    {p.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <SmartInput 
                    type="number" 
                    disabled={isClosed} 
                    value={mData.depenses?.[p.id] ?? p.montant} 
                    onChange={(v) => updateFixedExpense(currentMonth, p.id, v)} 
                    className={`w-24 text-right p-1.5 bg-transparent border-b outline-none font-black text-lg ${isChecked ? 'text-emerald-700 border-emerald-200' : 'text-slate-800 border-slate-200'}`} 
                  />
                  <span className="text-[10px] font-black text-slate-300">€</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* BOUTON CLÔTURE */}
      {!isClosed && (
        <div className="flex justify-center pt-10">
          <button 
            onClick={() => { if(window.confirm("Voulez-vous vraiment clôturer ce mois ?")) { validateMonth(currentMonth); } }} 
            className="bg-slate-900 text-white px-12 py-5 rounded-full font-black shadow-2xl hover:scale-105 transition-all flex items-center gap-3 border-4 border-slate-100"
          >
            <CheckCircle /> Clôturer le mois
          </button>
        </div>
      )}
    </div>
  );
}