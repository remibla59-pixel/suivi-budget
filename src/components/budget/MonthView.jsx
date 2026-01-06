import React, { useState } from 'react';
import { useBudget } from '../../hooks/useBudget';
import { ChevronLeft, ChevronRight, Calculator, Plus, Trash2, TrendingUp } from 'lucide-react';

export default function MonthView() {
  const { config, monthlyData, updateMonthEntry, addIncomeLine, updateIncomeLine, removeIncomeLine } = useBudget();
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));

  // --- PREPARATION DES DONNEES ---
  const mData = monthlyData[currentMonth] || { revenusList: [], depenses: {} };
  
  // 1. Calcul des Revenus (Somme de la liste)
  const revenusList = mData.revenusList || [];
  const totalRevenus = revenusList.reduce((sum, item) => sum + (item.montant || 0), 0);

  // 2. Calcul des Dépenses
  const calcTotal = (type) => config.postes
    .filter(p => p.type === type)
    .reduce((sum, p) => sum + (mData.depenses[p.id] !== undefined ? mData.depenses[p.id] : (type === 'fixe' ? p.montant : 0)), 0);

  const totalFixe = calcTotal('fixe');
  const totalObligatoire = calcTotal('obligatoire');
  const totalSecondaire = calcTotal('secondaire');
  const totalEpargne = config.epargneCibles.reduce((sum, e) => sum + e.mensuel, 0);

  const totalSorties = totalFixe + totalObligatoire + totalSecondaire + totalEpargne;
  const resteAVivre = totalRevenus - totalSorties;

  // Helpers Navigation
  const changeMonth = (offset) => {
    const d = new Date(currentMonth + "-01");
    d.setMonth(d.getMonth() + offset);
    setCurrentMonth(d.toISOString().slice(0, 7));
  };
  const formatMonth = (iso) => new Date(iso + "-01").toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      
      {/* NAVIGATION MOIS */}
      <div className="flex items-center justify-between bg-slate-800 text-white p-4 rounded-xl shadow-lg">
        <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-700 rounded-full"><ChevronLeft /></button>
        <h2 className="text-2xl font-bold capitalize">{formatMonth(currentMonth)}</h2>
        <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-700 rounded-full"><ChevronRight /></button>
      </div>

      {/* KPI GLOBAL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CARTE REVENUS (Nouvelle version) */}
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-emerald-500 md:col-span-1">
           <div className="flex justify-between items-center mb-2">
             <label className="text-sm text-slate-500 font-bold uppercase">Entrées d'argent</label>
             <button onClick={() => addIncomeLine(currentMonth)} className="text-emerald-600 hover:bg-emerald-50 p-1 rounded"><Plus size={18}/></button>
           </div>
           
           <div className="space-y-2 max-h-40 overflow-y-auto">
             {revenusList.length === 0 && <p className="text-xs text-slate-400 italic">Aucun revenu saisi.</p>}
             {revenusList.map(rev => (
               <div key={rev.id} className="flex gap-2 items-center">
                 <input 
                   type="text" 
                   placeholder="Libellé"
                   value={rev.label}
                   onChange={(e) => updateIncomeLine(currentMonth, rev.id, 'label', e.target.value)}
                   className="w-full text-sm border-b border-transparent focus:border-emerald-300 outline-none"
                 />
                 <input 
                   type="number" 
                   placeholder="0"
                   value={rev.montant}
                   onChange={(e) => updateIncomeLine(currentMonth, rev.id, 'montant', e.target.value)}
                   className="w-20 text-sm font-bold text-right outline-none text-emerald-700"
                 />
                 <button onClick={() => removeIncomeLine(currentMonth, rev.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>
               </div>
             ))}
           </div>
           <div className="mt-2 pt-2 border-t flex justify-between font-bold text-slate-800">
             <span>Total</span>
             <span>{totalRevenus.toLocaleString()} €</span>
           </div>
        </div>

        {/* CARTE DEPENSES */}
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-red-400">
          <label className="text-sm text-slate-500 font-bold uppercase">Total Sorties</label>
          <div className="text-3xl font-bold text-slate-800 mt-2">{totalSorties.toLocaleString()} €</div>
          <p className="text-xs text-slate-400 mt-1">Dont épargne: {totalEpargne}€</p>
        </div>

        {/* CARTE SOLDE */}
        <div className={`p-6 rounded-xl shadow-sm border-l-4 ${resteAVivre >= 0 ? 'bg-emerald-50 border-emerald-500' : 'bg-red-50 border-red-500'}`}>
          <label className="text-sm text-slate-500 font-bold uppercase">Reste à Vivre</label>
          <div className={`text-3xl font-bold mt-2 ${resteAVivre >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {resteAVivre.toLocaleString()} €
          </div>
        </div>
      </div>

      {/* TABLEAU DES DEPENSES */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 flex items-center gap-2">
          <Calculator size={20} /> Détail des Sorties
        </div>
        
        <div className="divide-y divide-slate-100">
          <SectionHeader title="Charges Fixes (Prélèvements)" />
          {config.postes.filter(p => p.type === 'fixe').map(p => (
            <RowInput 
              key={p.id} label={p.label} target={p.montant} 
              value={mData.depenses[p.id] ?? p.montant} 
              onChange={(v) => updateMonthEntry(currentMonth, p.id, v)} 
            />
          ))}

          <SectionHeader title="Enveloppes Variables (Courses, Plaisirs...)" />
          {config.postes.filter(p => p.type !== 'fixe').map(p => (
            <RowInput 
              key={p.id} label={p.label} target={p.montant} isVariable 
              value={mData.depenses[p.id] ?? 0} 
              onChange={(v) => updateMonthEntry(currentMonth, p.id, v)} 
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const SectionHeader = ({ title }) => (
  <div className="p-3 bg-slate-100/50 text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</div>
);

const RowInput = ({ label, target, value, onChange, isVariable = false }) => {
  const diff = target - value;
  return (
    <div className="flex items-center justify-between p-3 hover:bg-slate-50 transition-colors">
      <div className="flex-1">
        <div className="font-medium text-slate-700">{label}</div>
        {isVariable && <div className="text-xs text-slate-400">Budget: {target}€ • Reste: <span className={diff < 0 ? 'text-red-500 font-bold' : 'text-emerald-500'}>{diff}€</span></div>}
      </div>
      <div className="flex items-center gap-2">
        <input 
          type="number" 
          value={value} 
          onChange={(e) => onChange(e.target.value)}
          className={`w-28 text-right p-2 border rounded-lg outline-none font-mono ${isVariable && value > target ? 'bg-red-50 text-red-700 border-red-300' : 'border-slate-200'}`}
        />
        <span className="text-slate-400 text-sm w-4">€</span>
      </div>
    </div>
  );
};