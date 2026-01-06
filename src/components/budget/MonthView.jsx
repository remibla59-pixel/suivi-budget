import React, { useState } from 'react';
import { useBudget } from '../../hooks/useBudget';
import { ChevronLeft, ChevronRight, Calculator, Plus, Trash2, Lock, CheckCircle, Circle, ChevronDown, ChevronUp, ArrowRightLeft, Calendar } from 'lucide-react';

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

// --- COMPOSANT PROVISION ANNUALISÉE (SPÉCIAL) ---
const AnnualizedRow = ({ poste, mData, onUpdateSpent, onToggleProvision, isClosed }) => {
  // 1. État du virement mensuel (Provision)
  const isProvisioned = mData.provisionStatus?.[poste.id] || false;
  // 2. Montant réellement dépensé ce mois-ci (ex: Paiement Taxe Foncière)
  const spent = mData.depenses?.[poste.id] || 0;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 mb-2 flex flex-col md:flex-row md:items-center justify-between gap-4">
      
      {/* GAUCHE : LE POSTE */}
      <div className="flex-1">
        <div className="font-bold text-slate-700">{poste.label}</div>
        <div className="text-xs text-slate-500">Montant à mettre de côté : {poste.montant}€ / mois</div>
      </div>

      {/* CENTRE : ACTION EPARGNE (VIREMENT VERS LIVRET) */}
      <div className="flex items-center gap-2 bg-slate-50 p-2 rounded border border-slate-100">
        <button 
          onClick={() => onToggleProvision(poste.id)}
          disabled={isClosed}
          className={`flex items-center gap-2 text-sm ${isProvisioned ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}
        >
          {isProvisioned ? <CheckCircle size={18} /> : <Circle size={18} />}
          <span>{isProvisioned ? 'Virement Fait' : 'À virer'}</span>
        </button>
      </div>

      {/* DROITE : ACTION DEPENSE (PAIEMENT FACTURE) */}
      <div className="flex items-center gap-2 bg-orange-50 p-2 rounded border border-orange-100">
        <span className="text-xs text-orange-700 font-bold uppercase">Payé :</span>
        <SmartInput 
          type="number"
          value={spent === 0 ? '' : spent}
          disabled={isClosed}
          onChange={(v) => onUpdateSpent(poste.id, v)}
          placeholder="0"
          className="w-20 bg-white border border-orange-200 rounded p-1 text-right font-bold text-orange-800 outline-none focus:ring-1 focus:ring-orange-500"
        />
        <span className="text-xs text-orange-700">€</span>
      </div>
      
      {/* MESSAGE D'AIDE : SI DEPENSE > 0 */}
      {spent > 0 && (
        <div className="hidden md:block text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded animate-pulse">
           ⬅ Pensez à virer {spent}€ du Livret vers Courant
        </div>
      )}
    </div>
  );
};

// --- COMPOSANT ENVELOPPE (ACCORDÉON) ---
const EnvelopeCard = ({ poste, budget, report, expenses, onAdd, onRemove, isClosed }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const totalSpent = expenses.reduce((sum, item) => sum + item.amount, 0);
  const available = (budget + (report || 0)) - totalSpent;
  const percent = Math.min(100, (totalSpent / (budget + (report || 0))) * 100);

  const handleAdd = () => { if (newAmount && newLabel) { onAdd(poste.id, newLabel, newAmount); setNewAmount(''); setNewLabel(''); } };

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden mb-3 shadow-sm">
      <div onClick={() => setIsOpen(!isOpen)} className="p-4 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors">
        <div className="flex-1">
          <div className="flex justify-between mb-1">
            <span className="font-bold text-slate-700">{poste.label}</span>
            <span className={`font-mono font-bold ${available < 0 ? 'text-red-500' : 'text-emerald-600'}`}>{available.toLocaleString()} € <span className="text-xs text-slate-400 font-normal">restants</span></span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div className={`h-2 rounded-full ${available < 0 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${percent}%` }}></div>
          </div>
          <div className="text-xs text-slate-400 mt-1 flex gap-2">
            <span>Budget: {budget}€</span>
            {report ? <span className={report > 0 ? "text-emerald-600" : "text-red-500"}>Report: {report}€</span> : null}
            <span>Dépensé: {totalSpent}€</span>
          </div>
        </div>
        <div className="ml-4 text-slate-400">{isOpen ? <ChevronUp /> : <ChevronDown />}</div>
      </div>
      {isOpen && (
        <div className="bg-slate-50 border-t border-slate-100 p-4">
          <div className="space-y-2 mb-4">
            {expenses.map(exp => (
              <div key={exp.id} className="flex justify-between items-center text-sm bg-white p-2 rounded border border-slate-100 shadow-sm">
                <span className="text-slate-700">{exp.label}</span>
                <div className="flex items-center gap-3"><span className="font-bold text-slate-800">{exp.amount} €</span>{!isClosed && <button onClick={() => onRemove(exp.id)} className="text-red-300 hover:text-red-500"><Trash2 size={14} /></button>}</div>
              </div>
            ))}
            {expenses.length === 0 && <p className="text-xs text-slate-400 italic text-center">Aucune dépense.</p>}
          </div>
          {!isClosed && (
            <div className="flex gap-2">
              <input type="text" placeholder="Note" className="flex-1 p-2 border rounded text-sm" value={newLabel} onChange={(e) => setNewLabel(e.target.value)}/>
              <input type="number" placeholder="0" className="w-24 p-2 border rounded text-sm text-right" value={newAmount} onChange={(e) => setNewAmount(e.target.value)}/>
              <button onClick={handleAdd} disabled={!newAmount || !newLabel} className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50"><Plus size={18} /></button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function MonthView() {
  const { config, monthlyData, addIncomeLine, updateIncomeLine, removeIncomeLine, updateFixedExpense, toggleFixedCheck, addVariableExpense, removeVariableExpense, toggleProvisionDone, validateMonth } = useBudget();
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7)); // Format YYYY-MM

  const mData = monthlyData[currentMonth] || {};
  const isClosed = mData.isClosed;

  // REVENUS
  const revenusList = mData.revenusList || [];
  const totalRevenus = revenusList.reduce((sum, item) => sum + (item.montant || 0), 0);

  // CALCULS DEPENSES
  const varExpensesList = mData.variableExpenses || [];
  const getVarTotal = (pid) => varExpensesList.filter(v => v.posteId === pid).reduce((sum, v) => sum + v.amount, 0);

  const calcTotalByType = (type) => config.postes
    .filter(p => p.type === type)
    .reduce((sum, p) => {
      if (type === 'obligatoire' || type === 'secondaire') return sum + getVarTotal(p.id);
      return sum + (mData.depenses?.[p.id] !== undefined ? mData.depenses[p.id] : p.montant);
    }, 0);

  const totalFixe = calcTotalByType('fixe'); 
  // Pour les annualisés, ce qui compte en "Sortie Cash" c'est : Le virement de provision (si fait) + La dépense réelle (si faite) - Le remboursement (si fait).
  // Simplifions : Pour le Reste à Vivre du Compte Courant, la sortie c'est le montant provisionné (si virement fait) + La dépense (si pas couverte).
  // Mais pour faire simple visuellement : Sorties = Fixe + Depenses Annuelles Réelles + Var + Epargne.
  // La provision est un mouvement interne (Courant -> Livret), on va le compter comme une "Dépense/Sortie" du mois pour le reste à vivre.
  
  const annualises = config.postes.filter(p => p.type === 'annualise');
  const totalAnnualiseProvisionne = annualises.reduce((sum, p) => sum + (mData.provisionStatus?.[p.id] ? p.montant : 0), 0);
  // Note: Si on paie la taxe foncière, c'est une sortie, MAIS compensée par le virement entrant du Livret. Donc impact neutre sur le budget mensuel si couvert.
  // Pour le Reste à vivre "Cash", on compte surtout les sorties directes.
  
  const totalVariable = calcTotalByType('obligatoire') + calcTotalByType('secondaire');
  const totalEpargne = config.epargneCibles.reduce((sum, e) => sum + e.mensuel, 0);

  // TOTAL SORTIES CASH (Estimation Reste à Vivre)
  // = Fixes + Variables + Epargne Camping Car + Provisions Annualisées (Virement vers livret)
  const totalSorties = totalFixe + totalVariable + totalEpargne + totalAnnualiseProvisionne;
  const resteAVivre = totalRevenus - totalSorties;

  // NAVIGATION DATE
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

  const handleValidate = () => { if (window.confirm("Clôturer le mois ?")) { const next = validateMonth(currentMonth); setCurrentMonth(next); }};
  const currentYear = currentMonth.split('-')[0];

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 pb-20">
      
      {/* HEADER NAVIGATION */}
      <div className={`flex items-center justify-between p-4 rounded-xl shadow-lg text-white ${isClosed ? 'bg-slate-700' : 'bg-blue-900'}`}>
        <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white/20 rounded-full"><ChevronLeft /></button>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 text-2xl font-bold capitalize">
            {isClosed && <Lock size={20} className="text-orange-300" />}
            {new Date(currentMonth + "-01").toLocaleDateString('fr-FR', { month: 'long' })}
            <select 
              value={currentYear} 
              onChange={changeYear}
              className="bg-transparent border-none font-bold text-white cursor-pointer focus:ring-0"
            >
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y} className="text-black">{y}</option>)}
            </select>
          </div>
        </div>
        <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white/20 rounded-full"><ChevronRight /></button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* REVENUS */}
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-emerald-500">
           <div className="flex justify-between items-center mb-2"><label className="text-sm text-slate-500 font-bold uppercase">Entrées</label>{!isClosed && <button onClick={() => addIncomeLine(currentMonth)} className="text-emerald-600 hover:bg-emerald-50 p-1 rounded"><Plus size={18}/></button>}</div>
           <div className="space-y-2 max-h-40 overflow-y-auto">{revenusList.map(rev => (<div key={rev.id} className="flex gap-2 items-center"><SmartInput value={rev.label} disabled={isClosed} onChange={(v) => updateIncomeLine(currentMonth, rev.id, 'label', v)} className="w-full text-sm border-b border-transparent focus:border-emerald-300 outline-none" /><SmartInput type="number" value={rev.montant} disabled={isClosed} onChange={(v) => updateIncomeLine(currentMonth, rev.id, 'montant', v)} className="w-20 text-sm font-bold text-right outline-none text-emerald-700" />{!isClosed && <button onClick={() => removeIncomeLine(currentMonth, rev.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>}</div>))}</div>
           <div className="mt-2 pt-2 border-t flex justify-between font-bold text-slate-800"><span>Total</span><span>{totalRevenus.toLocaleString()} €</span></div>
        </div>
        {/* SORTIES */}
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-red-400">
          <label className="text-sm text-slate-500 font-bold uppercase">Sorties Cash</label>
          <div className="text-3xl font-bold text-slate-800 mt-2">{totalSorties.toLocaleString()} €</div>
          <div className="text-xs text-slate-400 mt-1">Y compris provisions vers Livret ({totalAnnualiseProvisionne}€)</div>
        </div>
        {/* SOLDE */}
        <div className={`p-6 rounded-xl shadow-sm border-l-4 ${resteAVivre >= 0 ? 'bg-emerald-50 border-emerald-500' : 'bg-red-50 border-red-500'}`}>
          <label className="text-sm text-slate-500 font-bold uppercase">Reste à Vivre</label>
          <div className={`text-3xl font-bold mt-2 ${resteAVivre >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{resteAVivre.toLocaleString()} €</div>
        </div>
      </div>

      {/* 1. PROVISIONS ANNUALISÉES (Nouveau design) */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden p-4 border border-blue-100">
        <h3 className="font-bold text-blue-800 mb-4 flex items-center gap-2"><ArrowRightLeft size={18}/> Provisions Annualisées (Vers Livret Rémi)</h3>
        {annualises.map(p => (
          <AnnualizedRow 
            key={p.id} poste={p} mData={mData} isClosed={isClosed}
            onUpdateSpent={(pid, val) => updateFixedExpense(currentMonth, pid, val)}
            onToggleProvision={(pid) => toggleProvisionDone(currentMonth, pid)}
          />
        ))}
        {annualises.length === 0 && <p className="text-sm text-slate-400 italic">Aucune dépense annualisée configurée.</p>}
      </div>

      {/* 2. CHARGES FIXES */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden p-4">
        <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Lock size={18}/> Charges Fixes</h3>
        <div className="space-y-2">
          {config.postes.filter(p => p.type === 'fixe').map(p => {
            const isChecked = mData.fixedStatus?.[p.id] || false;
            return (
              <div key={p.id} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${isChecked ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100'}`}>
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
      </div>

      {/* 3. ENVELOPPES */}
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