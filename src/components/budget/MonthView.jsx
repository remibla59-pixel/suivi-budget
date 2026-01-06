import React, { useState } from 'react';
import { useBudget } from '../../hooks/useBudget';
import { ChevronLeft, ChevronRight, Calculator, Plus, Trash2, Lock, CheckCircle, Circle, ArrowRightLeft, DollarSign, Wallet, ShoppingBag } from 'lucide-react';

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

// COMPOSANT COLONNE ENVELOPPE
const EnvelopeColumn = ({ env, funded, expenses, onFund, onSpend, onRemove, isClosed }) => {
  const [note, setNote] = useState('');
  const [amount, setAmount] = useState('');

  const handleSpend = () => {
    if (note && amount) { onSpend(env.id, note, amount); setNote(''); setAmount(''); }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full">
      {/* HEADER */}
      <div className={`p-3 border-b ${funded ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
        <div className="flex justify-between items-start mb-2">
           <span className="font-bold text-slate-800 text-sm">{env.label}</span>
           <span className={`text-lg font-bold ${env.currentBalance < 0 ? 'text-red-500' : 'text-emerald-600'}`}>{round(env.currentBalance)}€</span>
        </div>
        
        {/* BOUTON REMPLIR */}
        {!funded && !isClosed ? (
          <button onClick={() => onFund(env.id)} className="w-full text-xs bg-white border border-emerald-200 text-emerald-600 py-1 rounded hover:bg-emerald-50">
             + Remplir ({env.budgetMonthly}€)
          </button>
        ) : (
          <div className="text-[10px] text-center text-emerald-600 font-bold bg-emerald-100/50 rounded py-0.5">
             budget versé
          </div>
        )}
      </div>

      {/* LISTE DEPENSES */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-60 bg-slate-50/50">
        {expenses.length === 0 && <div className="text-center text-xs text-slate-300 py-4 italic">Vide</div>}
        {expenses.map(e => (
          <div key={e.id} className="bg-white p-2 rounded border border-slate-100 shadow-sm text-xs">
            <div className="flex justify-between">
              <span className="font-medium text-slate-700">{e.label}</span>
              <span className="font-bold text-slate-900">{e.amount}€</span>
            </div>
            {!isClosed && <div className="text-right mt-1"><button onClick={() => onRemove(e.id, env.id, e.amount)} className="text-red-300 hover:text-red-500"><Trash2 size={12}/></button></div>}
          </div>
        ))}
      </div>

      {/* SAISIE */}
      {!isClosed && (
        <div className="p-2 border-t border-slate-100 bg-white rounded-b-xl">
           <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Note..." className="w-full border-b text-xs p-1 outline-none mb-1"/>
           <div className="flex gap-1">
             <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0" className="w-full border rounded text-xs p-1 text-right outline-none"/>
             <button onClick={handleSpend} disabled={!amount} className="bg-slate-800 text-white p-1.5 rounded hover:bg-black"><Plus size={14}/></button>
           </div>
        </div>
      )}
    </div>
  );
};

export default function MonthView() {
  const { config, monthlyData, addIncomeLine, updateIncomeLine, removeIncomeLine, updateFixedExpense, toggleFixedCheck, fundEnvelope, spendEnvelope, removeEnvelopeExpense, toggleMonthlyProvision, addProvisionExpense, removeProvisionExpense, validateMonth } = useBudget();
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));

  const mData = monthlyData[currentMonth] || {};
  const isClosed = mData.isClosed;
  const currentYear = currentMonth.split('-')[0];

  // DONNEES
  const revenusList = mData.revenusList || [];
  const totalRevenus = round(revenusList.reduce((sum, item) => sum + (item.montant || 0), 0));

  const provisionsOfYear = config.provisionsByYear?.[currentYear] || [];
  const totalAnnualProvisions = round(provisionsOfYear.reduce((sum, p) => sum + (p.amount || 0), 0));
  const monthlyProvisionAmount = Math.round(totalAnnualProvisions / 12);
  const isProvisionDone = mData.provisionDone || false;

  const totalFixe = round(config.postes.filter(p => p.type === 'fixe').reduce((sum, p) => sum + (mData.depenses?.[p.id] ?? p.montant), 0));
  const totalEpargne = round(config.epargneCibles.reduce((sum, e) => sum + e.mensuel, 0));

  // TOTAL SORTIES
  // Attention : Le "Remplissage d'enveloppe" est une sortie du Compte Courant.
  // On calcule le total des budgets des enveloppes qui ont été "funded" ce mois-ci.
  const fundedEnvelopesAmount = config.envelopes.reduce((sum, env) => {
    return sum + (mData[`funded_${env.id}`] ? env.budgetMonthly : 0);
  }, 0);

  const totalSorties = round(totalFixe + totalEpargne + (isProvisionDone ? monthlyProvisionAmount : 0) + fundedEnvelopesAmount);
  const resteAVivre = round(totalRevenus - totalSorties);

  // PROVISIONS STATE
  const [selectedProvId, setSelectedProvId] = useState('');
  const [provExpenseNote, setProvExpenseNote] = useState('');
  const [provExpenseAmount, setProvExpenseAmount] = useState('');
  const handleAddProvExpense = () => { /* Identique précedemment */ 
    if (selectedProvId && provExpenseAmount) {
      const defaultLabel = provisionsOfYear.find(p => p.id === selectedProvId)?.label || 'Facture';
      const finalLabel = provExpenseNote ? `${defaultLabel} (${provExpenseNote})` : defaultLabel;
      addProvisionExpense(currentMonth, selectedProvId, finalLabel, provExpenseAmount);
      setProvExpenseAmount(''); setProvExpenseNote(''); setSelectedProvId('');
    }
  };

  const changeMonth = (offset) => { const d = new Date(currentMonth + "-01"); d.setMonth(d.getMonth() + offset); setCurrentMonth(d.toISOString().slice(0, 7)); };
  const changeYear = (e) => { const year = e.target.value; const month = currentMonth.split('-')[1]; setCurrentMonth(`${year}-${month}`); };
  const handleValidate = () => { if (window.confirm("Clôturer le mois ?")) { const next = validateMonth(currentMonth); setCurrentMonth(next); }};

  return (
    <div className="max-w-6xl mx-auto p-2 sm:p-4 space-y-6 pb-20">
      
      {/* HEADER */}
      <div className={`flex items-center justify-between p-4 rounded-xl shadow-lg text-white ${isClosed ? 'bg-slate-700' : 'bg-blue-900'}`}>
        <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white/20 rounded-full"><ChevronLeft /></button>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 text-2xl font-bold capitalize">
            {isClosed && <Lock size={20} className="text-orange-300" />}
            {new Date(currentMonth + "-01").toLocaleDateString('fr-FR', { month: 'long' })}
            <select value={currentYear} onChange={changeYear} className="bg-transparent border-none font-bold text-white cursor-pointer focus:ring-0">
               {[2025, 2026, 2027, 2028].map(y => <option key={y} value={y} className="text-black">{y}</option>)}
            </select>
          </div>
        </div>
        <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white/20 rounded-full"><ChevronRight /></button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-emerald-500">
           <div className="flex justify-between items-center mb-2"><label className="text-sm text-slate-500 font-bold uppercase">Entrées</label>{!isClosed && <button onClick={() => addIncomeLine(currentMonth)} className="text-emerald-600 hover:bg-emerald-50 p-1 rounded"><Plus size={18}/></button>}</div>
           <div className="space-y-2 max-h-40 overflow-y-auto">{revenusList.map(rev => (<div key={rev.id} className="flex gap-2 items-center"><SmartInput value={rev.label} disabled={isClosed} onChange={(v) => updateIncomeLine(currentMonth, rev.id, 'label', v)} className="w-full text-sm border-b border-transparent focus:border-emerald-300 outline-none" /><SmartInput type="number" value={rev.montant} disabled={isClosed} onChange={(v) => updateIncomeLine(currentMonth, rev.id, 'montant', v)} className="w-20 text-sm font-bold text-right outline-none text-emerald-700" />{!isClosed && <button onClick={() => removeIncomeLine(currentMonth, rev.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>}</div>))}</div>
           <div className="mt-2 pt-2 border-t flex justify-between font-bold text-slate-800"><span>Total</span><span>{totalRevenus.toLocaleString()} €</span></div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-red-400">
          <label className="text-sm text-slate-500 font-bold uppercase">Sorties Compte Courant</label>
          <div className="text-3xl font-bold text-slate-800 mt-2">{totalSorties.toLocaleString()} €</div>
          <div className="text-xs text-slate-400 mt-1">Y compris remplissage enveloppes ({fundedEnvelopesAmount}€)</div>
        </div>
        <div className={`p-6 rounded-xl shadow-sm border-l-4 ${resteAVivre >= 0 ? 'bg-emerald-50 border-emerald-500' : 'bg-red-50 border-red-500'}`}>
          <label className="text-sm text-slate-500 font-bold uppercase">Reste sur Compte</label>
          <div className={`text-3xl font-bold mt-2 ${resteAVivre >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{resteAVivre.toLocaleString()} €</div>
        </div>
      </div>

      {/* --- SECTION ENVELOPPES COURANTES (4 COLONNES) --- */}
      <div>
        <h3 className="font-bold text-slate-700 mb-4 px-2 flex items-center gap-2"><Wallet size={18}/> Dépenses Courantes (Enveloppes)</h3>
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
      </div>

      {/* --- SECTION ENVELOPPES PLAISIR --- */}
      <div>
        <h3 className="font-bold text-slate-700 mb-4 px-2 flex items-center gap-2 mt-8"><ShoppingBag size={18}/> Enveloppes Plaisirs</h3>
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
      </div>

      {/* --- PROVISIONS ANNUALISEES --- */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-blue-200 mt-8">
        <div className="p-4 bg-blue-50 border-b border-blue-100"><h3 className="font-bold text-blue-800 flex items-center gap-2"><ArrowRightLeft size={18}/> Provisions Annualisées ({currentYear})</h3></div>
        <div className="p-4 space-y-6">
          <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
            <div><div className="font-bold text-slate-700">Epargne Mensuelle Globale</div><div className="text-xs text-slate-500">Total calculé : {monthlyProvisionAmount}€ / mois</div></div>
            <button onClick={() => toggleMonthlyProvision(currentMonth, monthlyProvisionAmount)} disabled={isClosed} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition ${isProvisionDone ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>{isProvisionDone ? <><CheckCircle size={18}/> Virement Fait</> : 'Faire le virement'}</button>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg">
             <div className="text-xs font-bold text-slate-400 uppercase mb-2">Payer une facture provisionnée</div>
             {(mData.provisionExpenses || []).map(exp => (
               <div key={exp.id} className="flex justify-between items-center text-sm bg-white p-2 rounded border border-slate-200 mb-2">
                 <span className="font-medium text-slate-700">{exp.label}</span>
                 <div className="flex items-center gap-3"><span className="font-bold text-orange-600">{exp.amount} €</span>{!isClosed && <button onClick={() => removeProvisionExpense(currentMonth, exp.id, exp.amount, exp.provisionId)} className="text-red-300 hover:text-red-500"><Trash2 size={14}/></button>}</div>
               </div>
             ))}
             {!isClosed && (
               <div className="flex flex-col gap-2 mt-2">
                 <select value={selectedProvId} onChange={(e) => setSelectedProvId(e.target.value)} className="w-full p-2 border rounded text-sm bg-white outline-none"><option value="">-- Choisir la facture --</option>{provisionsOfYear.map(p => (<option key={p.id} value={p.id}>{p.label} (Prévu: {p.amount}€)</option>))}</select>
                 <div className="flex gap-2"><input type="text" placeholder="Note" value={provExpenseNote} onChange={(e) => setProvExpenseNote(e.target.value)} className="flex-1 p-2 border rounded text-sm outline-none"/><input type="number" placeholder="Montant" value={provExpenseAmount} onChange={(e) => setProvExpenseAmount(e.target.value)} className="w-24 p-2 border rounded text-sm text-right outline-none"/><button onClick={handleAddProvExpense} disabled={!selectedProvId || !provExpenseAmount} className="bg-orange-500 text-white p-2 rounded hover:bg-orange-600 disabled:opacity-50"><DollarSign size={18} /></button></div>
               </div>
             )}
          </div>
        </div>
      </div>

      {/* --- CHARGES FIXES --- */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden p-4 mt-8">
        <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Lock size={18}/> Charges Fixes</h3>
        {config.postes.filter(p => p.type === 'fixe').map(p => {
            const isChecked = mData.fixedStatus?.[p.id] || false;
            return (
              <div key={p.id} className={`flex items-center justify-between p-3 rounded-lg border mb-2 transition-all ${isChecked ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100'}`}>
                <div className="flex items-center gap-3"><button onClick={() => toggleFixedCheck(currentMonth, p.id)} disabled={isClosed} className={`transition-colors ${isChecked ? 'text-emerald-600' : 'text-slate-300 hover:text-slate-400'}`}>{isChecked ? <CheckCircle size={24} fill="currentColor" className="text-white" /> : <Circle size={24} />}</button><span className={`font-medium ${isChecked ? 'text-emerald-700 font-bold' : 'text-slate-700 font-medium'}`}>{p.label}</span></div>
                <div className="flex items-center gap-2"><SmartInput type="number" disabled={isClosed} value={mData.depenses?.[p.id] ?? p.montant} onChange={(v) => updateFixedExpense(currentMonth, p.id, v)} className={`w-24 text-right p-1 bg-transparent border-b outline-none font-mono font-bold ${isChecked ? 'text-emerald-700 border-emerald-300' : 'text-slate-700 border-slate-300'}`} /><span className="text-xs text-slate-400">€</span></div>
              </div>
            );
          })}
      </div>

      {!isClosed && <div className="flex justify-center pt-6"><button onClick={handleValidate} className="bg-slate-800 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-slate-700 hover:scale-105 transition flex items-center gap-2"><CheckCircle /> Valider & Clôturer</button></div>}
    </div>
  );
}