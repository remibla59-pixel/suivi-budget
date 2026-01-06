import React, { useState } from 'react';
import { useBudget } from '../../hooks/useBudget';
import { ChevronLeft, ChevronRight, Calculator, Plus, Trash2, Lock, CheckCircle, Circle, ArrowRightLeft, DollarSign } from 'lucide-react';

const SmartInput = ({ value, onChange, placeholder, disabled, className, type="text" }) => {
  const handleFocus = (e) => {
    if (!disabled && (e.target.value.includes('Nouveau') || e.target.value === '0')) {
      onChange('');
    }
  };
  return (
    <input
      value={value} type={type} disabled={disabled} onFocus={handleFocus} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder} className={className}
    />
  );
};

// COMPOSANT ENVELOPPE (Inchangé, je le garde pour la structure)
const EnvelopeCard = ({ poste, budget, report, expenses, onAdd, onRemove, isClosed }) => {
   // ... (copier le code précédent d'EnvelopeCard) ...
   // Pour gagner de la place ici, je suppose que vous gardez le même code qu'avant pour EnvelopeCard
   // Si vous voulez que je le remette complet, dites le moi !
   const [isOpen, setIsOpen] = useState(false);
   const [newLabel, setNewLabel] = useState('');
   const [newAmount, setNewAmount] = useState('');
   const totalSpent = expenses.reduce((sum, item) => sum + item.amount, 0);
   const available = (budget + (report || 0)) - totalSpent;
   return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden mb-3 shadow-sm">
       {/* ... Contenu enveloppe ... */}
       <div onClick={() => setIsOpen(!isOpen)} className="p-4 flex justify-between items-center cursor-pointer hover:bg-slate-50">
          <div className="font-bold text-slate-700">{poste.label}</div>
          <div className={`font-mono font-bold ${available<0?'text-red-500':'text-emerald-600'}`}>{available}€</div>
       </div>
       {isOpen && (
         <div className="p-4 bg-slate-50 border-t">
            {expenses.map(e => (
               <div key={e.id} className="flex justify-between text-sm mb-2"><span>{e.label}</span><span>{e.amount}€ <button onClick={()=>onRemove(e.id)}><Trash2 size={12}/></button></span></div>
            ))}
            {!isClosed && <div className="flex gap-2"><input value={newLabel} onChange={e=>setNewLabel(e.target.value)} placeholder="Note" className="border p-1 flex-1"/><input value={newAmount} onChange={e=>setNewAmount(e.target.value)} placeholder="0" className="border p-1 w-20"/><button onClick={()=>{onAdd(poste.id, newLabel, newAmount);setNewAmount('');setNewLabel('')}}><Plus size={16}/></button></div>}
         </div>
       )}
    </div>
   );
};

export default function MonthView() {
  const { config, monthlyData, addIncomeLine, updateIncomeLine, removeIncomeLine, updateFixedExpense, toggleFixedCheck, addVariableExpense, removeVariableExpense, toggleMonthlyProvision, addProvisionExpense, removeProvisionExpense, validateMonth } = useBudget();
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7)); // Format YYYY-MM

  const mData = monthlyData[currentMonth] || {};
  const isClosed = mData.isClosed;
  const currentYear = currentMonth.split('-')[0];

  // 1. REVENUS
  const revenusList = mData.revenusList || [];
  const totalRevenus = revenusList.reduce((sum, item) => sum + (item.montant || 0), 0);

  // 2. PROVISIONS (Calcul du montant à virer ce mois-ci)
  const provisionsOfYear = config.provisionsByYear?.[currentYear] || [];
  const totalAnnualProvisions = provisionsOfYear.reduce((sum, p) => sum + (p.amount || 0), 0);
  const monthlyProvisionAmount = Math.round(totalAnnualProvisions / 12);
  const isProvisionDone = mData.provisionDone || false;

  // 3. DEPENSES
  const varExpensesList = mData.variableExpenses || [];
  const getVarTotal = (pid) => varExpensesList.filter(v => v.posteId === pid).reduce((sum, v) => sum + v.amount, 0);

  const calcTotalByType = (type) => config.postes.filter(p => p.type === type).reduce((sum, p) => {
      if (type === 'obligatoire' || type === 'secondaire') return sum + getVarTotal(p.id);
      return sum + (mData.depenses?.[p.id] !== undefined ? mData.depenses[p.id] : p.montant);
  }, 0);

  const totalFixe = calcTotalByType('fixe'); 
  const totalVariable = calcTotalByType('obligatoire') + calcTotalByType('secondaire');
  const totalEpargne = config.epargneCibles.reduce((sum, e) => sum + e.mensuel, 0);

  // TOTAL SORTIES = Fixes + Variables + Epargne + Virement Provision (si fait)
  const totalSorties = totalFixe + totalVariable + totalEpargne + (isProvisionDone ? monthlyProvisionAmount : 0);
  const resteAVivre = totalRevenus - totalSorties;

  // Gestion des dépenses sur provision (Selecteur)
  const [selectedProvId, setSelectedProvId] = useState('');
  const [provExpenseAmount, setProvExpenseAmount] = useState('');

  const handleAddProvExpense = () => {
    if (selectedProvId && provExpenseAmount) {
      const label = provisionsOfYear.find(p => p.id === selectedProvId)?.label || 'Dépense';
      addProvisionExpense(currentMonth, selectedProvId, label, provExpenseAmount);
      setProvExpenseAmount('');
      setSelectedProvId('');
    }
  };

  // NAVIGATION DATE
  const changeMonth = (offset) => {
    const d = new Date(currentMonth + "-01"); d.setMonth(d.getMonth() + offset);
    setCurrentMonth(d.toISOString().slice(0, 7));
  };
  const changeYear = (e) => { const year = e.target.value; const month = currentMonth.split('-')[1]; setCurrentMonth(`${year}-${month}`); };
  const handleValidate = () => { if (window.confirm("Clôturer le mois ?")) { const next = validateMonth(currentMonth); setCurrentMonth(next); }};

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 pb-20">
      
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

      {/* KPI GLOBAL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-emerald-500">
           <div className="flex justify-between items-center mb-2"><label className="text-sm text-slate-500 font-bold uppercase">Entrées</label>{!isClosed && <button onClick={() => addIncomeLine(currentMonth)} className="text-emerald-600 hover:bg-emerald-50 p-1 rounded"><Plus size={18}/></button>}</div>
           <div className="space-y-2 max-h-40 overflow-y-auto">{revenusList.map(rev => (<div key={rev.id} className="flex gap-2 items-center"><SmartInput value={rev.label} disabled={isClosed} onChange={(v) => updateIncomeLine(currentMonth, rev.id, 'label', v)} className="w-full text-sm border-b border-transparent focus:border-emerald-300 outline-none" /><SmartInput type="number" value={rev.montant} disabled={isClosed} onChange={(v) => updateIncomeLine(currentMonth, rev.id, 'montant', v)} className="w-20 text-sm font-bold text-right outline-none text-emerald-700" />{!isClosed && <button onClick={() => removeIncomeLine(currentMonth, rev.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>}</div>))}</div>
           <div className="mt-2 pt-2 border-t flex justify-between font-bold text-slate-800"><span>Total</span><span>{totalRevenus.toLocaleString()} €</span></div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-red-400">
          <label className="text-sm text-slate-500 font-bold uppercase">Sorties Cash</label>
          <div className="text-3xl font-bold text-slate-800 mt-2">{totalSorties.toLocaleString()} €</div>
          <div className="text-xs text-slate-400 mt-1">Dont virement provision : {isProvisionDone ? monthlyProvisionAmount : 0}€</div>
        </div>
        <div className={`p-6 rounded-xl shadow-sm border-l-4 ${resteAVivre >= 0 ? 'bg-emerald-50 border-emerald-500' : 'bg-red-50 border-red-500'}`}>
          <label className="text-sm text-slate-500 font-bold uppercase">Reste à Vivre</label>
          <div className={`text-3xl font-bold mt-2 ${resteAVivre >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{resteAVivre.toLocaleString()} €</div>
        </div>
      </div>

      {/* --- BLOC PROVISIONS ANNUALISEES --- */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-blue-200">
        <div className="p-4 bg-blue-50 border-b border-blue-100">
          <h3 className="font-bold text-blue-800 flex items-center gap-2"><ArrowRightLeft size={18}/> Provisions Annualisées ({currentYear})</h3>
        </div>
        
        <div className="p-4 space-y-6">
          {/* PARTIE 1 : LE VIREMENT MENSUEL */}
          <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
            <div>
              <div className="font-bold text-slate-700">Epargne Mensuelle Globale</div>
              <div className="text-xs text-slate-500">Total calculé : {monthlyProvisionAmount}€ / mois</div>
            </div>
            <button 
              onClick={() => toggleMonthlyProvision(currentMonth, monthlyProvisionAmount)}
              disabled={isClosed}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition ${isProvisionDone ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            >
              {isProvisionDone ? <><CheckCircle size={18}/> Virement Fait</> : 'Faire le virement'}
            </button>
          </div>

          {/* PARTIE 2 : SAISIR UNE DEPENSE SUR PROVISION */}
          <div className="bg-slate-50 p-3 rounded-lg">
             <div className="text-xs font-bold text-slate-400 uppercase mb-2">Dépenser une provision (Payer une facture)</div>
             
             {/* Liste des dépenses déjà saisies ce mois-ci */}
             {(mData.provisionExpenses || []).map(exp => (
               <div key={exp.id} className="flex justify-between items-center text-sm bg-white p-2 rounded border border-slate-200 mb-2">
                 <span className="font-medium text-slate-700">{exp.label}</span>
                 <div className="flex items-center gap-3">
                   <span className="font-bold text-orange-600">{exp.amount} €</span>
                   {!isClosed && <button onClick={() => removeProvisionExpense(currentMonth, exp.id, exp.amount, exp.provisionId)} className="text-red-300 hover:text-red-500"><Trash2 size={14}/></button>}
                 </div>
               </div>
             ))}

             {/* Formulaire d'ajout */}
             {!isClosed && (
               <div className="flex flex-col sm:flex-row gap-2 mt-2">
                 <select 
                    value={selectedProvId}
                    onChange={(e) => setSelectedProvId(e.target.value)}
                    className="flex-1 p-2 border rounded text-sm bg-white outline-none"
                 >
                   <option value="">-- Choisir la facture payée --</option>
                   {provisionsOfYear.map(p => (
                     <option key={p.id} value={p.id}>{p.label} (Prévu: {p.amount}€)</option>
                   ))}
                 </select>
                 <div className="flex gap-2">
                    <input 
                      type="number" 
                      placeholder="Montant" 
                      value={provExpenseAmount}
                      onChange={(e) => setProvExpenseAmount(e.target.value)}
                      className="w-24 p-2 border rounded text-sm text-right outline-none"
                    />
                    <button 
                      onClick={handleAddProvExpense}
                      disabled={!selectedProvId || !provExpenseAmount}
                      className="bg-orange-500 text-white p-2 rounded hover:bg-orange-600 disabled:opacity-50"
                    >
                      <DollarSign size={18} />
                    </button>
                 </div>
               </div>
             )}
          </div>
        </div>
      </div>

      {/* --- AUTRES SECTIONS (Fixes & Enveloppes) --- */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden p-4">
        <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Lock size={18}/> Charges Fixes</h3>
        {config.postes.filter(p => p.type === 'fixe').map(p => {
            const isChecked = mData.fixedStatus?.[p.id] || false;
            return (
              <div key={p.id} className={`flex items-center justify-between p-3 rounded-lg border mb-2 transition-all ${isChecked ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100'}`}>
                <div className="flex items-center gap-3">
                  <button onClick={() => toggleFixedCheck(currentMonth, p.id)} disabled={isClosed} className={`transition-colors ${isChecked ? 'text-emerald-500' : 'text-slate-300 hover:text-slate-400'}`}>{isChecked ? <CheckCircle size={24} fill="currentColor" className="text-white" /> : <Circle size={24} />}</button>
                  <span className={`font-medium ${isChecked ? 'text-emerald-800 line-through opacity-70' : 'text-slate-700'}`}>{p.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <SmartInput type="number" disabled={isClosed} value={mData.depenses?.[p.id] ?? p.montant} onChange={(v) => updateFixedExpense(currentMonth, p.id, v)} className={`w-24 text-right p-1 bg-transparent border-b outline-none font-mono font-bold ${isChecked ? 'text-emerald-600 border-emerald-200' : 'text-slate-700 border-slate-300'}`} /><span className="text-xs text-slate-400">€</span>
                </div>
              </div>
            );
          })}
      </div>

      <div>
        <h3 className="font-bold text-slate-700 mb-4 px-2 flex items-center gap-2"><Calculator size={18}/> Dépenses Courantes</h3>
        {config.postes.filter(p => p.type === 'obligatoire').map(p => <EnvelopeCard key={p.id} poste={p} budget={p.montant} report={mData.reports?.[p.id]} expenses={varExpensesList.filter(v => v.posteId === p.id)} onAdd={(pid, l, a) => addVariableExpense(currentMonth, pid, l, a)} onRemove={(vid) => removeVariableExpense(currentMonth, vid)} isClosed={isClosed} />)}
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-6 px-2">Plaisirs</h4>
        {config.postes.filter(p => p.type === 'secondaire').map(p => <EnvelopeCard key={p.id} poste={p} budget={p.montant} report={mData.reports?.[p.id]} expenses={varExpensesList.filter(v => v.posteId === p.id)} onAdd={(pid, l, a) => addVariableExpense(currentMonth, pid, l, a)} onRemove={(vid) => removeVariableExpense(currentMonth, vid)} isClosed={isClosed} />)}
      </div>

      {!isClosed && <div className="flex justify-center pt-6"><button onClick={handleValidate} className="bg-slate-800 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-slate-700 hover:scale-105 transition flex items-center gap-2"><CheckCircle /> Valider & Clôturer</button></div>}
    </div>
  );
}