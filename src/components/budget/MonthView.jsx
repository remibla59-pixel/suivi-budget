import React, { useState } from 'react';
import { useBudget } from '../../hooks/useBudget';
import { 
  ChevronLeft, ChevronRight, Plus, Trash2, 
  Lock, CheckCircle, Circle, ArrowRightLeft, 
  Wallet, CreditCard, Coins, DollarSign, Undo2, Scale, TriangleAlert
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import ConfirmTransferModal from './ConfirmTransferModal';
import BalanceAdjustModal from './BalanceAdjustModal';
import { PriorityBadge } from '../ui/Priority';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { LABELS, priorityRank, todayISO, formatShortDate } from '../../lib/budgetMeta';
import { closingBlockers, closingBlockerMessage } from '../../lib/budgetMath';

const round = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

const DateInput = ({ value, onChange, disabled }) => (
  <input
    type="date"
    value={value || ''}
    disabled={disabled}
    onChange={(e) => onChange(e.target.value)}
    className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-400 disabled:bg-slate-50 disabled:text-slate-300"
  />
);

// --- COMPOSANT : Colonne Flexible ---
const FlexibleBudgetColumn = ({ cat, expenses, onSpend, onRemove, isClosed }) => {
  const [note, setNote] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());

  const totalSpent = round(expenses.reduce((sum, e) => sum + e.amount, 0));
  const remaining = round(cat.budget - totalSpent);
  const isOver = remaining < 0;

  const handleSpend = () => {
    if (note && amount) { onSpend(cat.id, note, amount, date); setNote(''); setAmount(''); setDate(todayISO()); }
  };

  return (
    <Card className="flex flex-col h-full hover:shadow-md transition-shadow">
      <div className="p-4 border-b border-slate-100 bg-slate-50">
        <div className="flex justify-between items-start mb-2 gap-2">
          <div className="flex flex-col gap-1.5 min-w-0">
            <span className="font-bold text-slate-800 text-sm">{cat.label}</span>
            <PriorityBadge priority={cat.priority} />
          </div>
          <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded border uppercase shrink-0">
            Obj: {cat.budget}€
          </span>
        </div>
        <div className={`text-right font-black text-lg ${isOver ? 'text-red-500' : 'text-emerald-600'}`}>
           {isOver ? '-' : ''}{Math.abs(remaining).toLocaleString()} €
        </div>
        <div className="flex justify-between text-[10px] mt-1 border-t border-slate-200 pt-1">
           <span className="font-bold text-slate-500">Dépensé: {totalSpent}€</span>
           <span className={`text-right ${isOver ? 'text-red-400' : 'text-slate-400'}`}>{isOver ? 'Dépassement' : 'Restant'}</span>
        </div>
      </div>

      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-60 bg-slate-50/30 min-h-[100px]">
        {expenses.length === 0 && <div className="text-center text-[10px] text-slate-300 py-8 italic opacity-60">Aucune dépense</div>}
        {expenses.map(e => (
          <div key={e.id} className="bg-white p-2 rounded-xl border border-slate-100 shadow-sm text-[11px] group">
            <div className="flex justify-between items-start">
              <span className="font-bold text-slate-700 leading-tight">{e.label}</span>
              <span className="font-black text-slate-900 ml-2">{round(e.amount)}€</span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-[9px] font-bold text-slate-400">{formatShortDate(e.date)}</span>
              {!isClosed && <button onClick={() => onRemove(e.id, e.amount)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={12}/></button>}
            </div>
          </div>
        ))}
      </div>

      {!isClosed && (
        <div className="p-3 border-t border-slate-100 bg-white space-y-2">
           <input 
             value={note} 
             onChange={e => setNote(e.target.value)} 
             placeholder="Note..." 
             className="w-full border-b border-slate-200 text-[11px] p-1.5 outline-none focus:border-blue-400 bg-transparent"
           />
           <div className="flex gap-2">
             <input 
               type="number" 
               value={amount} 
               onChange={e => setAmount(e.target.value)} 
               placeholder="0.00" 
               className="w-full border border-slate-200 rounded-xl text-xs p-2 text-right outline-none focus:border-blue-400"
             />
             <Button size="icon" onClick={handleSpend} disabled={!amount || !note} icon={Plus} />
           </div>
           <div className="flex items-center justify-between">
             <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Date</span>
             <DateInput value={date} onChange={setDate} />
           </div>
        </div>
      )}
    </Card>
  );
};

// --- COMPOSANT : Enveloppe Classique ---
const EnvelopeColumn = ({ env, funded, expenses, onFund, onUnfund, onSpend, onRemove, isClosed }) => {
  const [note, setNote] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const spentThisMonth = round(expenses.reduce((sum, e) => sum + e.amount, 0));
  // Solde de départ = solde courant + dépenses du mois - versement du mois (sinon le versement est compté deux fois)
  const startBalance = round(env.currentBalance + spentThisMonth - (funded ? env.budgetMonthly : 0));

  const handleSpend = () => {
    if (note && amount) { onSpend(env.id, note, amount, date); setNote(''); setAmount(''); setDate(todayISO()); }
  };

  return (
    <Card className="flex flex-col h-full hover:shadow-md transition-shadow">
      <div className={`p-4 border-b ${funded ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
        <div className="flex justify-between items-start mb-2 gap-2">
          <div className="flex flex-col gap-1.5 min-w-0">
            <span className="font-bold text-slate-800 text-sm truncate pr-2" title={env.label}>{env.label}</span>
            <PriorityBadge priority={env.priority} />
          </div>
          <span className={`text-lg font-black shrink-0 ${env.currentBalance < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
            {round(env.currentBalance).toLocaleString()}€
          </span>
        </div>
        <div className="flex justify-end mb-2">
          <span className="text-[10px] font-bold text-slate-400 bg-white/50 px-1.5 rounded">Départ : {startBalance.toLocaleString()}€</span>
        </div>
        {funded ? (
          <div className="flex items-center gap-1.5">
            <div className="flex-1 text-[10px] text-center text-emerald-600 font-bold bg-emerald-100/50 rounded-lg py-1 border border-emerald-200/50">
              Versé{typeof funded === 'string' ? ` le ${formatShortDate(funded)}` : ''}
            </div>
            {!isClosed && (
              <button
                onClick={() => onUnfund(env)}
                title="Revenir en arrière sur le versement"
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-white border border-transparent hover:border-emerald-100 transition-colors"
              >
                <Undo2 size={14} />
              </button>
            )}
          </div>
        ) : !isClosed ? (
          <Button variant="outline" size="sm" className="w-full text-[10px] uppercase border-emerald-200 text-emerald-600 hover:bg-emerald-50" onClick={() => onFund(env)} icon={Plus}>
            Remplir ({env.budgetMonthly}€)
          </Button>
        ) : (
          <div className="text-[10px] text-center text-slate-400 font-bold bg-slate-100 rounded-lg py-1 border border-slate-200">Non versé</div>
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
            <div className="flex justify-between items-center mt-1">
              <span className="text-[9px] font-bold text-slate-400">{formatShortDate(e.date)}</span>
              {!isClosed && <button onClick={() => onRemove(e.id, env.id, e.amount)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={12}/></button>}
            </div>
          </div>
        ))}
      </div>
      {!isClosed && (
        <div className="p-3 border-t border-slate-100 bg-white space-y-2">
           <input 
             value={note} 
             onChange={e => setNote(e.target.value)} 
             placeholder="Note..." 
             className="w-full border-b border-slate-200 text-[11px] p-1.5 outline-none focus:border-blue-400 bg-transparent"
           />
           <div className="flex gap-2">
             <input 
               type="number" 
               value={amount} 
               onChange={e => setAmount(e.target.value)} 
               placeholder="0.00" 
               className="w-full border border-slate-200 rounded-xl text-xs p-2 text-right outline-none focus:border-blue-400"
             />
             <Button size="icon" onClick={handleSpend} disabled={!amount || !note} icon={Plus} />
           </div>
           <div className="flex items-center justify-between">
             <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Date</span>
             <DateInput value={date} onChange={setDate} />
           </div>
        </div>
      )}
    </Card>
  );
};

// --- VUE PRINCIPALE ---
export default function MonthView() {
  const {
    config, monthlyData, addIncomeLine, updateIncomeLine, removeIncomeLine,
    updateFixedExpense, payFixedCharge, unpayFixedCharge, updateFixedDate,
    fundEnvelope, unfundEnvelope, spendEnvelope, removeEnvelopeExpense,
    confirmProvisionTransfer, cancelProvisionTransfer, monthlyProvisionTarget,
    addProvisionExpense, removeProvisionExpense, validateMonth, reopenMonth,
    addFlexibleExpense, removeFlexibleExpense, adjustRealBalance,
    currentMonth, setCurrentMonth
  } = useBudget();

  const mData = monthlyData[currentMonth] || {};
  const isClosed = mData.isClosed;
  const currentYear = currentMonth.split('-')[0];
  const monthLabel = new Date(currentMonth + "-01").toLocaleDateString('fr-FR', { month: 'long' });

  // Pop-up de confirmation du mouvement en cours
  const [pending, setPending] = useState(null);
  const [balanceTarget, setBalanceTarget] = useState(null);
  const [selectedProvId, setSelectedProvId] = useState('');
  const [provExpenseNote, setProvExpenseNote] = useState('');
  const [provExpenseAmount, setProvExpenseAmount] = useState('');
  const [provExpenseDate, setProvExpenseDate] = useState(todayISO());

  const revenusList = mData.revenusList || [];
  const totalRevenus = round(revenusList.reduce((sum, item) => sum + (item.montant || 0), 0));

  // --- PROVISIONS : deux sous-catégories parallèles (année en cours / N+1) ---
  const provisionsCurrentYear = config.provisionsByYear?.[currentYear] || [];
  const totalCurrentBudget = round(provisionsCurrentYear.reduce((s, p) => s + (p.amount || 0), 0));
  const totalCurrentSpent = round(provisionsCurrentYear.reduce((s, p) => s + (p.spent || 0), 0));
  const provisionTarget = monthlyProvisionTarget(currentMonth);
  const monthlyProvisionAmount = provisionTarget.monthly;
  const isProvisionDone = mData.provisionDone || false;
  const provisionTransferAmount = mData.provisionAmount != null ? mData.provisionAmount : monthlyProvisionAmount;
  const compteProv = config.comptes.find(c => c.id === config.provisionAccountId);
  const soldeProv = round(compteProv?.initial || 0);

  // Charges fixes (triées par priorité)
  const postesFixes = [...config.postes.filter(p => p.type === 'fixe')].sort((a, b) => priorityRank(a) - priorityRank(b));
  const totalFixeValide = round(config.postes
    .filter(p => p.type === 'fixe' && mData.fixedStatus?.[p.id])
    .reduce((sum, p) => sum + (mData.depenses?.[p.id] ?? p.montant), 0));

  // Garde-fou de clôture : charges fixes à confirmer, enveloppes à verser + virement de provisions
  const blockers = closingBlockers(postesFixes, mData, monthlyProvisionAmount, config.envelopes);

  // Dépenses courantes & enveloppes (triées par priorité)
  const flexibleExpenses = mData.flexibleExpenses || [];
  const totalFlexibleSpent = round(flexibleExpenses.reduce((sum, e) => sum + e.amount, 0));
  const sortedFlexible = [...(config.budgetsFlexibles || [])].sort((a, b) => priorityRank(a) - priorityRank(b));
  const isFunded = (id) => Boolean(mData[`funded_${id}`]);
  const sortedEnvelopes = [...(config.envelopes || [])].sort((a, b) => priorityRank(a) - priorityRank(b));
  const envObligatoires = sortedEnvelopes.filter(e => e.category === 'courant');
  const envSecondaires = sortedEnvelopes.filter(e => e.category === 'secondaire');
  const fundedEnvelopesAmount = round((config.envelopes || []).reduce((sum, env) => sum + (isFunded(env.id) ? env.budgetMonthly : 0), 0));

  const totalSorties = round(totalFixeValide + (isProvisionDone ? provisionTransferAmount : 0) + fundedEnvelopesAmount + totalFlexibleSpent);
  const disponibleCeMois = round(totalRevenus - totalSorties);

  const compteCourant = config.comptes.find(c => c.type === 'courant');
  const soldeCourant = round(compteCourant?.initial || 0);

  const handleAddProvExpense = () => {
    if (selectedProvId && provExpenseAmount) {
      const defaultLabel = provisionsCurrentYear.find(p => p.id === selectedProvId)?.label || 'Facture';
      const finalLabel = provExpenseNote ? `${defaultLabel} (${provExpenseNote})` : defaultLabel;
      addProvisionExpense(currentMonth, selectedProvId, finalLabel, provExpenseAmount, provExpenseDate);
      setProvExpenseAmount(''); setProvExpenseNote(''); setSelectedProvId(''); setProvExpenseDate(todayISO());
    }
  };

  const changeMonth = (offset) => {
    const d = new Date(currentMonth + "-01");
    d.setMonth(d.getMonth() + offset);
    setCurrentMonth(d.toISOString().slice(0, 7));
  };
  const handleReopen = () => { if (confirm("⚠️ Rouvrir le mois ?")) reopenMonth(currentMonth); };

  const handleCloseMonth = () => {
    if (!blockers.canClose) {
      window.alert(`Clôture impossible — il reste à confirmer :\n\n${closingBlockerMessage(blockers, monthlyProvisionAmount)}`);
      return;
    }
    const message = currentMonth.endsWith('-12')
      ? "Clôturer décembre ? Les cagnottes d'enveloppes non dépensées seront recréditées sur le compte courant."
      : "Voulez-vous vraiment clôturer ce mois ?";
    if (window.confirm(message)) validateMonth(currentMonth);
  };

  // --- Pop-up de confirmation : virement réellement effectué ? ---
  const handlePayFixed = (poste) => {
    const amount = parseFloat(mData.depenses?.[poste.id] ?? poste.montant) || 0;
    setPending({
      from: 'Compte Courant', to: poste.label, amount,
      note: `${monthLabel} ${currentYear}`,
      confirmLabel: 'Oui, le paiement est fait',
      onConfirm: (date) => payFixedCharge(currentMonth, poste.id, date)
    });
  };

  const handleUnpayFixed = (poste) => {
    const amount = parseFloat(mData.depenses?.[poste.id] ?? poste.montant) || 0;
    if (window.confirm(`Annuler le paiement de « ${poste.label} » (${amount} €) et recréditer le compte courant ?`)) {
      unpayFixedCharge(currentMonth, poste.id);
    }
  };

  const handleFundEnvelope = (env) => setPending({
    from: 'Compte Courant', to: env.label, amount: env.budgetMonthly,
    note: `Versement mensuel — ${monthLabel} ${currentYear}`,
    confirmLabel: 'Oui, le versement est fait',
    onConfirm: (date) => fundEnvelope(currentMonth, env.id, date)
  });

  const handleUnfundEnvelope = (env) => {
    if (window.confirm(`Annuler le versement de ${env.budgetMonthly} € vers « ${env.label} » ?`)) unfundEnvelope(currentMonth, env.id);
  };

  const handleProvisionTransfer = () => setPending({
    from: 'Compte Courant', to: compteProv?.label || 'Compte Provisions', amount: monthlyProvisionAmount,
    note: `Provisions ${provisionTarget.year} — ${monthLabel} ${currentYear}`,
    confirmLabel: 'Oui, le virement est fait',
    onConfirm: (date) => confirmProvisionTransfer(currentMonth, date)
  });

  const chartData = [
    { name: LABELS.fixed, value: totalFixeValide, color: '#f43f5e' },
    { name: LABELS.flexible, value: totalFlexibleSpent, color: '#3b82f6' },
    { name: 'Enveloppes', value: fundedEnvelopesAmount, color: '#10b981' },
    { name: LABELS.provisions, value: isProvisionDone ? provisionTransferAmount : 0, color: '#8b5cf6' },
  ].filter(d => d.value > 0);

  return (
    <div className="max-w-6xl mx-auto p-2 sm:p-4 space-y-8 pb-24">
      
      {/* HEADER */}
      <ConfirmTransferModal transfer={pending} onConfirm={(date) => pending?.onConfirm(date)} onClose={() => setPending(null)} />

      <BalanceAdjustModal
        key={balanceTarget?.openedAt}
        account={balanceTarget}
        history={(config.balanceAdjustments || []).filter(a => a.accountId === balanceTarget?.id)}
        onConfirm={(value, date, note) => adjustRealBalance(balanceTarget.id, value, date, note)}
        onClose={() => setBalanceTarget(null)}
      />

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

      {/* KPI & REPARTITION */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5">
           <div className="flex justify-between items-center mb-4">
             <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Entrées d'argent</label>
             {!isClosed && (
               <Button variant="ghost" size="icon" className="text-emerald-600 bg-emerald-50" onClick={() => addIncomeLine(currentMonth)} icon={Plus} />
             )}
           </div>
           <div className="space-y-3 max-h-40 overflow-y-auto pr-1">
             {revenusList.map(rev => (
               <div key={rev.id} className="flex gap-2 items-center">
                 <input 
                   value={rev.label} 
                   disabled={isClosed} 
                   onChange={(v) => updateIncomeLine(currentMonth, rev.id, 'label', v.target.value)} 
                   className="flex-1 text-sm border-b border-transparent focus:border-emerald-300 outline-none font-medium bg-transparent" 
                 />
                 <input 
                   type="number" 
                   value={rev.montant} 
                   disabled={isClosed} 
                   onChange={(v) => updateIncomeLine(currentMonth, rev.id, 'montant', v.target.value)} 
                   className="w-20 text-sm font-black text-right outline-none text-emerald-600 bg-transparent" 
                 />
                 {!isClosed && (
                   <button onClick={() => removeIncomeLine(currentMonth, rev.id)} className="text-slate-200 hover:text-red-500">
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
        </Card>

        <Card className="p-6 flex flex-col justify-center text-center">
          <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Sorties Compte Courant</label>
          <div className="text-4xl font-black text-slate-900">{totalSorties.toLocaleString()} €</div>
          <div className="text-[10px] text-slate-400 mt-2 font-bold italic bg-slate-50 rounded-full py-1 px-3 inline-block mx-auto">
            Dont {LABELS.flexible} : {totalFlexibleSpent.toLocaleString()}€
          </div>
        </Card>

          <Card className={`p-6 flex flex-col justify-center text-center border-2 ${disponibleCeMois >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
            <label className={`text-[10px] font-black uppercase tracking-widest mb-2 ${disponibleCeMois >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>Disponible ce mois-ci</label>
            <div className={`text-4xl font-black ${disponibleCeMois >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{disponibleCeMois.toLocaleString()} €</div>
            <div className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">
              {LABELS.realBalance} (compte courant) : <span className={soldeCourant >= 0 ? 'text-slate-700' : 'text-red-600'}>{soldeCourant.toLocaleString()} €</span>
            </div>
            {compteCourant && !isClosed && (
              <button
                onClick={() => setBalanceTarget({ ...compteCourant, openedAt: Date.now() })}
                title="Rapprocher le solde avec mon relevé bancaire"
                className="mt-2 inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 underline decoration-dotted transition-colors"
              >
                <Scale size={11} /> Ajuster le solde réel
              </button>
            )}
          </Card>
        </div>

        <Card className="p-4 flex flex-col items-center justify-center min-h-[200px]">
           <div className="w-full h-full min-h-[180px]">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={chartData}
                   innerRadius={40}
                   outerRadius={60}
                   paddingAngle={5}
                   dataKey="value"
                 >
                   {chartData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={entry.color} />
                   ))}
                 </Pie>
                 <RechartsTooltip 
                   contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold' }}
                   formatter={(val) => `${val}€`}
                 />
               </PieChart>
             </ResponsiveContainer>
           </div>
           <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
              {chartData.map(d => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{d.name}</span>
                </div>
              ))}
           </div>
        </Card>
      </div>

      {/* 1. DEPENSES COURANTES (4 COLONNES FLEXIBLES) */}
      <section>
        <div className="flex items-center justify-between mt-8 mb-4 px-2">
           <h3 className="font-black text-slate-800 flex items-center gap-2 text-lg">
             <CreditCard size={20} className="text-blue-500"/> {LABELS.flexible}
           </h3>
           <div className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
             Total Dépensé : {totalFlexibleSpent.toLocaleString()}€
           </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {sortedFlexible.map(cat => (
            <FlexibleBudgetColumn 
              key={cat.id} 
              cat={cat} 
              expenses={flexibleExpenses.filter(e => e.catId === cat.id)} 
              onSpend={(id, note, amount, date) => addFlexibleExpense(currentMonth, id, note, amount, date)}
              onRemove={(id, amount) => removeFlexibleExpense(currentMonth, id, amount)}
              isClosed={isClosed} 
            />
          ))}
        </div>
      </section>

      {/* 2. ENVELOPPES OBLIGATOIRES */}
      <section>
        <h3 className="font-black text-slate-800 flex items-center gap-2 mt-8 text-lg mb-4">
          <Wallet size={20} className="text-emerald-500"/> {LABELS.envelopesObligatoires}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {envObligatoires.length === 0 ? (
            <div className="col-span-full p-4 text-center text-slate-400 text-sm italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
              Aucune enveloppe obligatoire configurée.
            </div>
          ) : (
            envObligatoires.map(env => (
              <EnvelopeColumn key={env.id} env={env} funded={mData[`funded_${env.id}`]} expenses={(mData.envelopeExpenses || []).filter(e => e.envId === env.id)} onFund={handleFundEnvelope} onUnfund={handleUnfundEnvelope} onSpend={spendEnvelope.bind(null, currentMonth)} onRemove={removeEnvelopeExpense.bind(null, currentMonth)} isClosed={isClosed} />
            ))
          )}
        </div>
      </section>

      {/* 3. ENVELOPPES SECONDAIRES */}
      <section>
        <h3 className="font-black text-slate-800 flex items-center gap-2 mt-8 text-lg mb-4">
          <Coins size={20} className="text-indigo-500"/> {LABELS.envelopesSecondaires}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {envSecondaires.map(env => (
            <EnvelopeColumn key={env.id} env={env} funded={mData[`funded_${env.id}`]} expenses={(mData.envelopeExpenses || []).filter(e => e.envId === env.id)} onFund={handleFundEnvelope} onUnfund={handleUnfundEnvelope} onSpend={spendEnvelope.bind(null, currentMonth)} onRemove={removeEnvelopeExpense.bind(null, currentMonth)} isClosed={isClosed} />
          ))}
        </div>
      </section>

      {/* 4. PROVISIONS */}
      <Card className="border-blue-100 mt-10">
        <CardHeader className="p-5 bg-blue-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h3 className="font-black text-blue-900 flex items-center gap-2"><ArrowRightLeft size={20}/> {LABELS.provisions}</h3>
          <div className="text-left sm:text-right">
            <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Solde sur le compte</div>
            <div className="text-xl font-black text-blue-900">{soldeProv.toLocaleString()} € <span className="text-[10px] font-bold text-blue-400 uppercase">{compteProv?.label}</span></div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Sous-catégorie 1 : année en cours */}
            <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-100">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Année en cours</div>
                  <div className="font-black text-slate-800 text-lg leading-none mt-1">{currentYear}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Payé / Prévu</div>
                  <div className="font-black text-slate-700">{totalCurrentSpent.toLocaleString()} / {totalCurrentBudget.toLocaleString()} €</div>
                </div>
              </div>
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1 mb-4">
                {provisionsCurrentYear.length === 0 && (
                  <div className="text-[11px] italic text-slate-400 text-center py-4">Aucune charge provisionnée pour {currentYear}.</div>
                )}
                {provisionsCurrentYear.map(p => {
                  const reste = round((p.amount || 0) - (p.spent || 0));
                  return (
                    <div key={p.id} className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-100 text-[11px]">
                      <span className="font-bold text-slate-700 truncate pr-2">{p.label}</span>
                      <span className="flex items-center gap-3 shrink-0">
                        <span className="text-slate-400 font-bold">{p.amount} €</span>
                        <span className={`font-black ${reste < 0 ? 'text-red-500' : 'text-emerald-600'}`}>{reste < 0 ? `+${Math.abs(reste)}` : reste} €</span>
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Payer une facture ({currentYear})</div>
              <div className="space-y-2">
               {(mData.provisionExpenses || []).map(exp => (
                 <div key={exp.id} className="flex justify-between items-center text-xs bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                   <span className="font-bold text-slate-700">{exp.label}</span>
                   <div className="flex items-center gap-4">
                     <span className="text-[9px] font-bold text-slate-400">{formatShortDate(exp.date)}</span>
                     <span className="font-black text-orange-600">{round(exp.amount)} €</span>
                     {!isClosed && <button onClick={() => removeProvisionExpense(currentMonth, exp.id, exp.amount, exp.provisionId)} className="text-slate-200 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>}
                   </div>
                 </div>
               ))}
             </div>
             {!isClosed && (
               <div className="flex flex-col gap-3 mt-4">
                 <select 
                   value={selectedProvId} 
                   onChange={(e) => setSelectedProvId(e.target.value)} 
                   className="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-white outline-none shadow-sm"
                 >
                   <option value="">-- Choisir la charge à payer --</option>
                   {provisionsCurrentYear.map(p => (
                     <option key={p.id} value={p.id}>{p.label} (Prévu: {p.amount}€)</option>
                   ))}
                 </select>
                 <div className="flex gap-2">
                   <Input 
                     placeholder="Note (ex: Régul)" 
                     value={provExpenseNote} 
                     onChange={(e) => setProvExpenseNote(e.target.value)} 
                     className="flex-1"
                   />
                   <Input 
                     type="number" 
                     placeholder="0.00" 
                     value={provExpenseAmount} 
                     onChange={(e) => setProvExpenseAmount(e.target.value)} 
                     className="w-28"
                   />
                 </div>
                 <div className="flex items-center gap-2">
                   <DateInput value={provExpenseDate} onChange={setProvExpenseDate} />
                   <Button variant="dark" onClick={handleAddProvExpense} disabled={!selectedProvId || !provExpenseAmount} icon={DollarSign} className="flex-1">
                     Enregistrer la facture
                   </Button>
                 </div>
               </div>
             )}
            </div>

            {/* Sous-catégorie 2 : année N+1 */}
            <div className="bg-blue-50/60 p-5 rounded-2xl border border-blue-100 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Année N+1</div>
                  <div className="font-black text-blue-900 text-lg leading-none mt-1">{provisionTarget.year}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Besoins annuels</div>
                  <div className="font-black text-blue-800">{provisionTarget.total.toLocaleString()} €</div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-blue-100 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-black text-slate-800">Épargne Mensuelle Lissée</span>
                  <span className="font-black text-blue-700">{monthlyProvisionAmount.toLocaleString()} € / mois</span>
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  À provisionner chaque mois de {currentYear} pour {provisionTarget.year}
                </div>
                {isProvisionDone ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 text-[11px] text-center text-emerald-700 font-bold bg-emerald-50 rounded-xl py-2 border border-emerald-100">
                      Virement effectué — {provisionTransferAmount.toLocaleString()} € {mData.provisionDate ? `le ${formatShortDate(mData.provisionDate)}` : ''}
                    </div>
                    {!isClosed && (
                      <button
                        onClick={() => { if (window.confirm(`Annuler ce virement de ${provisionTransferAmount} € ? (retour en arrière)`)) cancelProvisionTransfer(currentMonth); }}
                        title="Revenir en arrière"
                        className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 border border-slate-100 transition-colors"
                      >
                        <Undo2 size={16} />
                      </button>
                    )}
                  </div>
                ) : (
                  <Button
                    disabled={isClosed || monthlyProvisionAmount <= 0}
                    variant="primary"
                    className="w-full px-6"
                    onClick={handleProvisionTransfer}
                  >
                    Confirmer le virement
                  </Button>
                )}
              </div>

              <p className="text-[10px] text-blue-500 font-bold leading-relaxed">
                Les charges {provisionTarget.year} se paramètrent dans l'onglet « Provisions ». Les factures de l'année en cours se paient depuis le compte {compteProv?.label || 'Provisions'}.
              </p>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* 5. FIXES */}
      <Card className="p-6 border-slate-100 mt-10">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-black text-slate-800 flex items-center gap-2">
            <Lock size={20} className="text-slate-300"/> {LABELS.fixed}
          </h3>
          <div className="bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-xl border border-emerald-100 font-black text-xs uppercase tracking-widest">
            Total validé : {totalFixeValide.toLocaleString()} €
          </div>
        </div>
        <div className="grid gap-3">
          {postesFixes.map(p => {
            const isChecked = mData.fixedStatus?.[p.id] || false;
            const currentAmount = mData.depenses?.[p.id] ?? p.montant;
            const paidDate = mData.fixedDates?.[p.id];
            return (
              <div key={p.id} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border transition-all duration-300 ${isChecked ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-50'}`}>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => isChecked ? handleUnpayFixed(p) : handlePayFixed(p)}
                    disabled={isClosed}
                    title={isChecked ? 'Revenir en arrière (annuler le paiement)' : 'Confirmer le paiement'}
                    className={`transition-transform active:scale-90 ${isChecked ? 'text-emerald-500' : 'text-slate-200 hover:text-slate-400'}`}
                  >
                    {isChecked ? <CheckCircle size={30} fill="currentColor" className="text-white" /> : <Circle size={30} />}
                  </button>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${isChecked ? 'text-emerald-800' : 'text-slate-700'}`}>{p.label}</span>
                      <PriorityBadge priority={p.priority} />
                    </div>
                    {isChecked ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Payé le</span>
                        <DateInput value={paidDate || todayISO()} onChange={(d) => updateFixedDate(currentMonth, p.id, d)} disabled={isClosed} />
                      </div>
                    ) : (
                      <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Non payé</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <input 
                    type="number" 
                    disabled={isClosed} 
                    value={currentAmount} 
                    onChange={(v) => updateFixedExpense(currentMonth, p.id, v.target.value)} 
                    className={`w-24 text-right p-1.5 bg-transparent border-b outline-none font-black text-lg ${isChecked ? 'text-emerald-700 border-emerald-200' : 'text-slate-800 border-slate-200'}`} 
                  />
                  <span className="text-[10px] font-black text-slate-300">€</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {!isClosed && (
        <div className="flex flex-col items-center gap-4 pt-10">
          {!blockers.canClose && (
            <div className="w-full max-w-2xl bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 text-left">
              <TriangleAlert size={20} className="text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="text-[11px] font-black uppercase tracking-widest text-amber-700">
                  Clôture bloquée — à confirmer avant de fermer le mois
                </div>
                {blockers.pendingFixed.length > 0 && (
                  <div className="text-xs font-bold text-amber-800">
                    {LABELS.fixed} non confirmées : {blockers.pendingFixed.join(', ')}
                  </div>
                )}
                {blockers.pendingEnvelopes.length > 0 && (
                  <div className="text-xs font-bold text-amber-800">
                    {LABELS.envelopesObligatoires} non versées : {blockers.pendingEnvelopes.join(', ')}
                  </div>
                )}
                {blockers.provisionPending && (
                  <div className="text-xs font-bold text-amber-800">
                    Virement de {LABELS.provisions.toLowerCase()} non confirmé ({monthlyProvisionAmount.toLocaleString()} €)
                  </div>
                )}
              </div>
            </div>
          )}
          <Button
            variant="dark"
            size="lg"
            className={`px-12 py-6 rounded-full border-4 border-slate-100 ${blockers.canClose ? '' : 'opacity-60'}`}
            onClick={handleCloseMonth}
            icon={blockers.canClose ? CheckCircle : TriangleAlert}
          >
            Clôturer le mois
          </Button>
        </div>
      )}
    </div>
  );
}