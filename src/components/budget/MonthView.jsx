import React, { useState } from 'react';
import { useBudget } from '../../hooks/useBudget';
import { 
  ChevronLeft, ChevronRight, Plus, Trash2, 
  Lock, LockOpen, CheckCircle, Circle, ArrowRightLeft, 
  DollarSign, Wallet, ShoppingBag, Coins, CreditCard 
} from 'lucide-react';

const round = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

const SmartInput = ({ value, onChange, placeholder, disabled, className, type="text" }) => {
  const handleFocus = (e) => {
    if (!disabled && (e.target.value.includes('Nouveau') || e.target.value === '0')) {
      onChange('');
    }
  };
  return (
    <input value={value} type={type} disabled={disabled} onFocus={handleFocus} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={className}/>
  );
};

// --- COMPOSANT : Colonne Flexible (Débit direct) ---
const FlexibleBudgetColumn = ({ cat, expenses, onSpend, onRemove, isClosed }) => {
  const [note, setNote] = useState('');
  const [amount, setAmount] = useState('');
  
  const totalSpent = round(expenses.reduce((sum, e) => sum + e.amount, 0));
  const remaining = round(cat.budget - totalSpent);
  const isOver = remaining < 0;

  const handleSpend = () => { if (note && amount) { onSpend(cat.id, note, amount); setNote(''); setAmount(''); } };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-4 border-b border-slate-100 bg-slate-50">
        <div className="flex justify-between items-start mb-1">
           <span className="font-bold text-slate-800 text-sm">{cat.label}</span>
           <span className="text-xs font-bold text-slate-400 bg-white px-2 py-0.5 rounded border">
             Obj: {cat.budget}€
           </span>
        </div>
        <div className={`text-right font-black text-lg ${isOver ? 'text-red-500' : 'text-emerald-600'}`}>
           {isOver ? '-' : ''}{Math.abs(remaining).toLocaleString()} €
        </div>
        <div className="text-[10px] text-right text-slate-400">
           {isOver ? 'Dépassement' : 'Restant'}
        </div>
      </div>

      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-60 bg-slate-50/30 min-h-[100px]">
        {expenses.length === 0 && <div className="text-center text-[10px] text-slate-300 py-8 italic opacity-60">Aucune dépense</div>}
        {expenses.map(e => (
          <div key={e.id} className="bg-white p-2 rounded-xl border border-slate-100 shadow-sm text-[11px] group">
            <div className="flex justify-between items-start"><span className="font-bold text-slate-700 leading-tight">{e.label}</span><span className="font-black text-slate-900 ml-2">{round(e.amount)}€</span></div>
            {!isClosed && <div className="text-right mt-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => onRemove(e.id, e.amount)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={12}/></button></div>}
          </div>
        ))}
      </div>

      {!isClosed && (
        <div className="p-3 border-t border-slate-100 bg-white">
           <input value={note} onChange={e => setNote(e.target.value)} placeholder="Note..." className="w-full border-b border-slate-200 text-[11px] p-1.5 outline-none mb-2 focus:border-blue-400 bg-transparent"/>
           <div className="flex gap-2">
             <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full border border-slate-200 rounded-lg text-xs p-2 text-right outline-none focus:border-blue-400"/>
             <button onClick={handleSpend} disabled={!amount || !note} className="bg-slate-800 text-white p-2 rounded-lg hover:bg-black transition-colors disabled:opacity-30"><Plus size={16}/></button>
           </div>
        </div>
      )}
    </div>
  );
};

// --- COMPOSANT : Enveloppe Classique (Cagnotte) ---
const EnvelopeColumn = ({ env, funded, expenses, onFund, onSpend, onRemove, isClosed }) => {
  const [note, setNote] = useState('');
  const [amount, setAmount] = useState('');

  // CALCUL DU MONTANT DE DÉPART (Solde actuel + ce qu'on a dépensé ce mois-ci)
  const spentThisMonth = round(expenses.reduce((sum, e) => sum + e.amount, 0));
  const startBalance = round(env.currentBalance + spentThisMonth);

  const handleSpend = () => { if (note && amount) { onSpend(env.id, note, amount); setNote(''); setAmount(''); } };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden hover:shadow-md transition-shadow">
      <div className={`p-4 border-b ${funded ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
        <div className="flex justify-between items-start mb-1">
           <span className="font-bold text-slate-800 text-sm truncate pr-2" title={env.label}>{env.label}</span>
           {/* SOLDE ACTUEL (GROS) */}
           <span className={`text-lg font-black ${env.currentBalance < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
             {round(env.currentBalance).toLocaleString()}€
           </span>
        </div>
        
        {/* SOLDE DE DÉPART (PETIT) - S'affiche uniquement s'il y a des dépenses ou si c'est rempli */}
        <div className="flex justify-end mb-2">
           <span className="text-[10px] font-bold text-slate-400 bg-white/50 px-1.5 rounded">
             Départ : {startBalance.toLocaleString()}€
           </span>
        </div>

        {/* LOGIQUE D'AFFICHAGE DU BOUTON / BADGE */}
        {funded ? (
          <div className="text-[10px] text-center text-emerald-600 font-bold bg-emerald-100/50 rounded-lg py-1 border border-emerald-200/50">
             Budget versé
          </div>
        ) : !isClosed ? (
          <button 
            onClick={() => onFund(env.id)} 
            className="w-full text-[10px] uppercase font-black bg-white border border-emerald-200 text-emerald-600 py-2 rounded-xl hover:bg-emerald-50 transition-all flex items-center justify-center gap-1"
          >
             <Plus size={12}/> Remplir ({env.budgetMonthly}€)
          </button>
        ) : (
          <div className="text-[10px] text-center text-slate-400 font-bold bg-slate-100 rounded-lg py-1 border border-slate-200">
             Non versé
          </div>
        )}
      </div>

      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-60 bg-slate-50/30 min-h-[100px]">
        {expenses.length === 0 && <div className="text-center text-[10px] text-slate-300 py-8 italic opacity-60">Aucune dépense</div>}
        {expenses.map(e => (
          <div key={e.id} className="bg-white p-2 rounded-xl border border-slate-100 shadow-sm text-[11px] group">
            <div className="flex justify-between items-start">
              <span className="font-bold text-slate-700 leading-tight">{e.label}</span>
              <span className="font-black text-slate-900 ml-2">{round(e.amount)}€</span>
            </div>
            {!isClosed && (
              <div className="text-right mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onRemove(e.id, env.id, e.amount)} className="text-slate-300 hover:text-red-500 transition-colors">
                  <Trash2 size={12}/>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {!isClosed && (
        <div className="p-3 border-t border-slate-100 bg-white">
           <input value={note} onChange={e => setNote(e.target.value)} placeholder="Note..." className="w-full border-b border-slate-200 text-[11px] p-1.5 outline-none mb-2 focus:border-blue-400 bg-transparent"/>
           <div className="flex gap-2">
             <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full border border-slate-200 rounded-lg text-xs p-2 text-right outline-none focus:border-blue-400"/>
             <button onClick={handleSpend} disabled={!amount || !note} className="bg-slate-800 text-white p-2 rounded-lg hover:bg-black transition-colors disabled:opacity-30"><Plus size={16}/></button>
           </div>
        </div>
      )}
    </div>
  );
};

// --- VUE PRINCIPALE ---
export default function MonthView() {
  const { 
    config, monthlyData, addIncomeLine, updateIncomeLine, removeIncomeLine, 
    updateFixedExpense, toggleFixedCheck, fundEnvelope, spendEnvelope, removeEnvelopeExpense, 
    toggleMonthlyProvision, addProvisionExpense, removeProvisionExpense, validateMonth, reopenMonth,
    addFlexibleExpense, removeFlexibleExpense 
  } = useBudget();

  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
  const mData = monthlyData[currentMonth] || {};
  const isClosed = mData.isClosed;
  const currentYear = currentMonth.split('-')[0];

  const revenusList = mData.revenusList || [];
  const totalRevenus = round(revenusList.reduce((sum, item) => sum + (item.montant || 0), 0));
  const provisionsOfYear = config.provisionsByYear?.[currentYear] || [];
  const totalAnnualProvisions = round(provisionsOfYear.reduce((sum, p) => sum + (p.amount || 0), 0));
  const monthlyProvisionAmount = Math.round(totalAnnualProvisions / 12);
  const isProvisionDone = mData.provisionDone || false;

  const totalFixe = round(config.postes.filter(p => p.type === 'fixe').reduce((sum, p) => sum + (mData.depenses?.[p.id] ?? p.montant), 0));
  const totalEpargne = round(config.epargneCibles.reduce((sum, e) => sum + e.mensuel, 0));
  
  // Enveloppes strictes (Cagnottes)
  const fundedEnvelopesAmount = config.envelopes.reduce((sum, env) => sum + (mData[`funded_${env.id}`] ? env.budgetMonthly : 0), 0);
  
  // Dépenses Flexibles (Direct Courant)
  const flexibleExpenses = mData.flexibleExpenses || [];
  const totalFlexibleSpent = round(flexibleExpenses.reduce((sum, e) => sum + e.amount, 0));

  const totalSorties = round(totalFixe + totalEpargne + (isProvisionDone ? monthlyProvisionAmount : 0) + fundedEnvelopesAmount + totalFlexibleSpent);
  const resteAVivre = round(totalRevenus - totalSorties);

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

  const changeMonth = (offset) => {
    const d = new Date(currentMonth + "-01");
    d.setMonth(d.getMonth() + offset);
    setCurrentMonth(d.toISOString().slice(0, 7));
  };
  const handleReopen = () => { if(confirm("⚠️ Rouvrir le mois ?")) reopenMonth(currentMonth); };

  return (
    <div className="max-w-6xl mx-auto p-2 sm:p-4 space-y-8 pb-24">
      
      {/* HEADER */}
      <div className={`flex items-center justify-between p-4 rounded-3xl shadow-xl text-white transition-all duration-500 ${isClosed ? 'bg-slate-700 shadow-slate-200' : 'bg-blue-950 shadow-blue-200'}`}>
        <button onClick={() => changeMonth(-1)} className="p-3 hover:bg-white/10 rounded-2xl"><ChevronLeft /></button>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black capitalize">{new Date(currentMonth + "-01").toLocaleDateString('fr-FR', { month: 'long' })}</span>
            {isClosed && <button onClick={handleReopen} className="flex items-center gap-2 bg-slate-600 px-3 py-1 rounded-full border border-slate-500 text-xs font-bold ml-2"><Lock size={12} className="text-orange-300" /><span>Fermé</span></button>}
            <select value={currentYear} onChange={(e) => {const y=e.target.value; const m=currentMonth.split('-')[1]; setCurrentMonth(`${y}-${m}`);}} className="bg-transparent border-none font-black text-2xl text-white cursor-pointer focus:ring-0">{[2025, 2026, 2027, 2028].map(y => <option key={y} value={y} className="text-black">{y}</option>)}</select>
          </div>
        </div>
        <button onClick={() => changeMonth(1)} className="p-3 hover:bg-white/10 rounded-2xl"><ChevronRight /></button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
           <div className="flex justify-between items-center mb-4"><label className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Entrées d'argent</label>{!isClosed && <button onClick={() => addIncomeLine(currentMonth)} className="text-emerald-600 bg-emerald-50 p-1.5 rounded-xl hover:bg-emerald-100"><Plus size={18}/></button>}</div>
           <div className="space-y-3 max-h-40 overflow-y-auto pr-1">{revenusList.map(rev => (<div key={rev.id} className="flex gap-2 items-center"><SmartInput value={rev.label} disabled={isClosed} onChange={(v) => updateIncomeLine(currentMonth, rev.id, 'label', v)} className="w-full text-sm border-b border-transparent focus:border-emerald-300 outline-none font-medium bg-transparent" /><SmartInput type="number" value={rev.montant} disabled={isClosed} onChange={(v) => updateIncomeLine(currentMonth, rev.id, 'montant', v)} className="w-20 text-sm font-black text-right outline-none text-emerald-600 bg-transparent" />{!isClosed && <button onClick={() => removeIncomeLine(currentMonth, rev.id)} className="text-slate-200 hover:text-red-500"><Trash2 size={14}/></button>}</div>))}</div>
           <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between font-black text-slate-800"><span>Total</span><span>{totalRevenus.toLocaleString()} €</span></div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center text-center">
          <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Sorties Compte Courant</label>
          <div className="text-4xl font-black text-slate-900">{totalSorties.toLocaleString()} €</div>
          <div className="text-[10px] text-slate-400 mt-2 font-bold italic bg-slate-50 rounded-full py-1 px-3 inline-block mx-auto">Tout inclus (Direct + Enveloppes)</div>
        </div>
        <div className={`p-6 rounded-3xl shadow-sm flex flex-col justify-center text-center border-2 ${resteAVivre >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
          <label className={`text-[10px] font-black uppercase tracking-widest mb-2 ${resteAVivre >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>Reste sur Compte</label>
          <div className={`text-4xl font-black ${resteAVivre >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{resteAVivre.toLocaleString()} €</div>
        </div>
      </div>

      {/* 1. DEPENSES COURANTES (4 COLONNES FLEXIBLES) */}
      <section>
        <h3 className="font-black text-slate-800 flex items-center gap-2 mt-8 text-lg mb-4">
          <CreditCard size={20} className="text-blue-500"/> Dépenses Courantes (Débit Direct)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(config.budgetsFlexibles || []).map(cat => (
            <FlexibleBudgetColumn 
              key={cat.id} 
              cat={cat} 
              expenses={flexibleExpenses.filter(e => e.catId === cat.id)} 
              onSpend={(id, note, amount) => addFlexibleExpense(currentMonth, id, note, amount)}
              onRemove={(id, amount) => removeFlexibleExpense(currentMonth, id, amount)}
              isClosed={isClosed} 
            />
          ))}
        </div>
      </section>

      {/* 2. ENVELOPPES OBLIGATOIRES */}
      <section>
        <h3 className="font-black text-slate-800 flex items-center gap-2 mt-8 text-lg mb-4">
          <Wallet size={20} className="text-emerald-500"/> Enveloppes Obligatoires
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {config.envelopes.filter(e => e.category === 'courant').length === 0 ? (
            <div className="col-span-full p-4 text-center text-slate-400 text-sm italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
              Aucune enveloppe obligatoire configurée.
            </div>
          ) : (
            config.envelopes.filter(e => e.category === 'courant').map(env => (
              <EnvelopeColumn key={env.id} env={env} funded={mData[`funded_${env.id}`]} expenses={(mData.envelopeExpenses || []).filter(e => e.envId === env.id)} onFund={(id) => fundEnvelope(currentMonth, id)} onSpend={spendEnvelope.bind(null, currentMonth)} onRemove={removeEnvelopeExpense.bind(null, currentMonth)} isClosed={isClosed} />
            ))
          )}
        </div>
      </section>

      {/* 3. ENVELOPPES SECONDAIRES */}
      <section>
        <h3 className="font-black text-slate-800 flex items-center gap-2 mt-8 text-lg mb-4">
          <Coins size={20} className="text-indigo-500"/> Enveloppes Secondaires
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {config.envelopes.filter(e => e.category === 'secondaire').map(env => (
            <EnvelopeColumn key={env.id} env={env} funded={mData[`funded_${env.id}`]} expenses={(mData.envelopeExpenses || []).filter(e => e.envId === env.id)} onFund={(id) => fundEnvelope(currentMonth, id)} onSpend={spendEnvelope.bind(null, currentMonth)} onRemove={removeEnvelopeExpense.bind(null, currentMonth)} isClosed={isClosed} />
          ))}
        </div>
      </section>

      {/* 4. PROVISIONS */}
      <section className="bg-white rounded-3xl shadow-sm overflow-hidden border border-blue-100 mt-10">
        <div className="p-5 bg-blue-50/50 border-b border-blue-100 flex justify-between items-center"><h3 className="font-black text-blue-900 flex items-center gap-2"><ArrowRightLeft size={20}/> Provisions Annualisées</h3><div className="text-xs font-bold text-blue-400 uppercase tracking-widest bg-white px-2 py-1 rounded-md shadow-sm">Livret Rémi</div></div>
        <div className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between bg-white p-5 rounded-2xl border border-slate-100 shadow-sm gap-4">
            <div><div className="font-black text-slate-800">Épargne Mensuelle Lissée</div><div className="text-xs text-slate-400 font-bold tracking-wider">Cible : {monthlyProvisionAmount}€ / mois</div></div>
            <button onClick={() => toggleMonthlyProvision(currentMonth, monthlyProvisionAmount)} disabled={isClosed} className={`w-full sm:w-auto px-8 py-3 rounded-2xl font-black transition-all ${isProvisionDone ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-600 text-white hover:bg-black shadow-lg shadow-blue-100'}`}>{isProvisionDone ? 'Virement Effectué' : 'Confirmer le virement'}</button>
          </div>
          <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-100">
             <div className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Payer une facture via les provisions</div>
             <div className="space-y-2">{(mData.provisionExpenses || []).map(exp => (<div key={exp.id} className="flex justify-between items-center text-xs bg-white p-3 rounded-xl border border-slate-100 shadow-sm"><span className="font-bold text-slate-700">{exp.label}</span><div className="flex items-center gap-4"><span className="font-black text-orange-600">{round(exp.amount)} €</span>{!isClosed && <button onClick={() => removeProvisionExpense(currentMonth, exp.id, exp.amount, exp.provisionId)} className="text-slate-200 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>}</div></div>))}</div>
             {!isClosed && (
               <div className="flex flex-col gap-3 mt-5">
                 <select value={selectedProvId} onChange={(e) => setSelectedProvId(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-white outline-none shadow-sm"><option value="">-- Choisir la charge --</option>{provisionsOfYear.map(p => (<option key={p.id} value={p.id}>{p.label}</option>))}</select>
                 <div className="flex gap-2"><input type="text" placeholder="Note (ex: Régul)" value={provExpenseNote} onChange={(e) => setProvExpenseNote(e.target.value)} className="flex-1 p-3 border rounded-xl text-sm outline-none font-medium shadow-sm"/><input type="number" placeholder="0.00" value={provExpenseAmount} onChange={(e) => setProvExpenseAmount(e.target.value)} className="w-24 p-3 border rounded-xl text-sm text-right outline-none font-black shadow-sm"/><button onClick={handleAddProvExpense} disabled={!selectedProvId || !provExpenseAmount} className="bg-orange-500 text-white px-4 rounded-xl hover:bg-black transition-colors shadow-lg shadow-orange-100 disabled:opacity-50"><DollarSign size={20} /></button></div>
               </div>
             )}
          </div>
        </div>
      </section>

      {/* 5. FIXES */}
      <section className="bg-white rounded-3xl shadow-sm overflow-hidden p-6 border border-slate-100 mt-10">
        <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2"><Lock size={20} className="text-slate-300"/> Prélèvements Automatiques</h3>
        <div className="grid gap-3">
          {config.postes.filter(p => p.type === 'fixe').map(p => {
            const isChecked = mData.fixedStatus?.[p.id] || false;
            return (
              <div key={p.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${isChecked ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-50'}`}>
                <div className="flex items-center gap-4"><button onClick={() => toggleFixedCheck(currentMonth, p.id)} disabled={isClosed} className={`transition-transform active:scale-90 ${isChecked ? 'text-emerald-500' : 'text-slate-200 hover:text-slate-400'}`}>{isChecked ? <CheckCircle size={30} fill="currentColor" className="text-white" /> : <Circle size={30} />}</button><span className={`text-sm font-bold ${isChecked ? 'text-emerald-800' : 'text-slate-700'}`}>{p.label}</span></div>
                <div className="flex items-center gap-2"><SmartInput type="number" disabled={isClosed} value={mData.depenses?.[p.id] ?? p.montant} onChange={(v) => updateFixedExpense(currentMonth, p.id, v)} className={`w-24 text-right p-1.5 bg-transparent border-b outline-none font-black text-lg ${isChecked ? 'text-emerald-700 border-emerald-200' : 'text-slate-800 border-slate-200'}`} /><span className="text-[10px] font-black text-slate-300">€</span></div>
              </div>
            );
          })}
        </div>
      </section>

      {!isClosed && <div className="flex justify-center pt-10"><button onClick={() => { if(window.confirm("Voulez-vous vraiment clôturer ce mois ?")) { validateMonth(currentMonth); } }} className="bg-slate-900 text-white px-12 py-5 rounded-full font-black shadow-2xl hover:scale-105 transition-all flex items-center gap-3 border-4 border-slate-100"><CheckCircle /> Clôturer le mois</button></div>}
    </div>
  );
}