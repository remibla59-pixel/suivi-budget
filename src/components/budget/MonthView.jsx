import React, { useState } from 'react';
import { useBudget } from '../../hooks/useBudget';
import { ChevronLeft, ChevronRight, Calculator, Plus, Trash2, Lock, CheckCircle } from 'lucide-react';

// Composant Input Intelligent local
const SmartInput = ({ value, onChange, placeholder, disabled, className }) => {
  const handleFocus = (e) => {
    if (!disabled && (e.target.value.includes('Nouveau') || e.target.value === '0')) {
      onChange('');
    }
  };
  return (
    <input
      value={value}
      type={typeof value === 'number' ? 'number' : 'text'}
      disabled={disabled}
      onFocus={handleFocus}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
    />
  );
};

export default function MonthView() {
  const { config, monthlyData, updateMonthEntry, addIncomeLine, updateIncomeLine, removeIncomeLine, validateMonth } = useBudget();
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));

  // DONNEES DU MOIS
  const mData = monthlyData[currentMonth] || { revenusList: [], depenses: {}, reports: {}, isClosed: false };
  const isClosed = mData.isClosed;

  // CALCULS
  const revenusList = mData.revenusList || [];
  const totalRevenus = revenusList.reduce((sum, item) => sum + (item.montant || 0), 0);

  const calcTotal = (type) => config.postes
    .filter(p => p.type === type)
    .reduce((sum, p) => sum + (mData.depenses?.[p.id] !== undefined ? mData.depenses[p.id] : (type.includes('fixe') || type.includes('annual') ? p.montant : 0)), 0);

  const totalFixe = calcTotal('fixe');
  const totalAnnualise = calcTotal('annualise');
  const totalObligatoire = calcTotal('obligatoire'); // Dépensé réel
  const totalSecondaire = calcTotal('secondaire');   // Dépensé réel
  const totalEpargne = config.epargneCibles.reduce((sum, e) => sum + e.mensuel, 0);

  const totalSorties = totalFixe + totalAnnualise + totalObligatoire + totalSecondaire + totalEpargne;
  const resteAVivre = totalRevenus - totalSorties;

  // NAVIGATION
  const changeMonth = (offset) => {
    const d = new Date(currentMonth + "-01");
    d.setMonth(d.getMonth() + offset);
    setCurrentMonth(d.toISOString().slice(0, 7));
  };
  const formatMonth = (iso) => new Date(iso + "-01").toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  // ACTION CLOTURE
  const handleValidate = () => {
    if (window.confirm("Attention : Valider le mois va figer les montants et reporter les excédents d'enveloppes au mois suivant. Continuer ?")) {
      const nextMonth = validateMonth(currentMonth);
      setCurrentMonth(nextMonth); // On passe direct au mois suivant
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 pb-20">
      
      {/* HEADER NAVIGATION */}
      <div className={`flex items-center justify-between p-4 rounded-xl shadow-lg text-white ${isClosed ? 'bg-slate-700' : 'bg-blue-900'}`}>
        <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white/20 rounded-full"><ChevronLeft /></button>
        <div className="flex items-center gap-2">
          {isClosed && <Lock size={20} className="text-orange-300" />}
          <h2 className="text-2xl font-bold capitalize">{formatMonth(currentMonth)}</h2>
        </div>
        <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white/20 rounded-full"><ChevronRight /></button>
      </div>

      {isClosed && (
        <div className="bg-orange-50 text-orange-800 p-3 rounded-lg border border-orange-200 text-sm text-center font-medium">
          🔒 Ce mois est validé et archivé. Vous ne pouvez plus le modifier.
        </div>
      )}

      {/* KPI GLOBAL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* REVENUS */}
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-emerald-500">
           <div className="flex justify-between items-center mb-2">
             <label className="text-sm text-slate-500 font-bold uppercase">Entrées</label>
             {!isClosed && <button onClick={() => addIncomeLine(currentMonth)} className="text-emerald-600 hover:bg-emerald-50 p-1 rounded"><Plus size={18}/></button>}
           </div>
           <div className="space-y-2 max-h-40 overflow-y-auto">
             {revenusList.length === 0 && <p className="text-xs text-slate-400 italic">Aucun revenu.</p>}
             {revenusList.map(rev => (
               <div key={rev.id} className="flex gap-2 items-center">
                 <SmartInput 
                   value={rev.label} disabled={isClosed}
                   onChange={(v) => updateIncomeLine(currentMonth, rev.id, 'label', v)}
                   className="w-full text-sm border-b border-transparent focus:border-emerald-300 outline-none bg-transparent"
                 />
                 <SmartInput 
                   value={rev.montant} disabled={isClosed}
                   onChange={(v) => updateIncomeLine(currentMonth, rev.id, 'montant', v)}
                   className="w-20 text-sm font-bold text-right outline-none text-emerald-700 bg-transparent"
                 />
                 {!isClosed && <button onClick={() => removeIncomeLine(currentMonth, rev.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>}
               </div>
             ))}
           </div>
           <div className="mt-2 pt-2 border-t flex justify-between font-bold text-slate-800">
             <span>Total</span><span>{totalRevenus.toLocaleString()} €</span>
           </div>
        </div>

        {/* DEPENSES */}
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-red-400">
          <label className="text-sm text-slate-500 font-bold uppercase">Sorties & Épargne</label>
          <div className="text-3xl font-bold text-slate-800 mt-2">{totalSorties.toLocaleString()} €</div>
          <div className="text-xs text-slate-400 mt-1 flex justify-between">
            <span>Fixes: {totalFixe + totalAnnualise}€</span>
            <span>Var: {totalObligatoire + totalSecondaire}€</span>
          </div>
        </div>

        {/* SOLDE */}
        <div className={`p-6 rounded-xl shadow-sm border-l-4 ${resteAVivre >= 0 ? 'bg-emerald-50 border-emerald-500' : 'bg-red-50 border-red-500'}`}>
          <label className="text-sm text-slate-500 font-bold uppercase">Solde théorique</label>
          <div className={`text-3xl font-bold mt-2 ${resteAVivre >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {resteAVivre.toLocaleString()} €
          </div>
        </div>
      </div>

      {/* TABLEAU */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 flex items-center gap-2">
          <Calculator size={20} /> Détail des Opérations
        </div>
        
        <div className="divide-y divide-slate-100">
          <SectionHeader title="Dépenses Mensuelles Fixes" />
          {config.postes.filter(p => p.type === 'fixe').map(p => (
            <RowInput key={p.id} label={p.label} target={p.montant} disabled={isClosed}
              value={mData.depenses?.[p.id] ?? p.montant} 
              onChange={(v) => updateMonthEntry(currentMonth, p.id, v)} 
            />
          ))}

          <SectionHeader title="Provisions Annualisées" />
          {config.postes.filter(p => p.type === 'annualise').map(p => (
            <RowInput key={p.id} label={p.label} target={p.montant} disabled={isClosed}
              value={mData.depenses?.[p.id] ?? p.montant} 
              onChange={(v) => updateMonthEntry(currentMonth, p.id, v)} 
            />
          ))}

          <SectionHeader title="Enveloppes Obligatoires" />
          {config.postes.filter(p => p.type === 'obligatoire').map(p => (
            <RowInput key={p.id} label={p.label} target={p.montant} isVariable disabled={isClosed}
              report={mData.reports?.[p.id]} // Affichage du report du mois précédent
              value={mData.depenses?.[p.id] ?? 0} 
              onChange={(v) => updateMonthEntry(currentMonth, p.id, v)} 
            />
          ))}

          <SectionHeader title="Enveloppes Secondaires" />
          {config.postes.filter(p => p.type === 'secondaire').map(p => (
            <RowInput key={p.id} label={p.label} target={p.montant} isVariable disabled={isClosed}
              report={mData.reports?.[p.id]}
              value={mData.depenses?.[p.id] ?? 0} 
              onChange={(v) => updateMonthEntry(currentMonth, p.id, v)} 
            />
          ))}
        </div>
      </div>

      {/* BOUTON VALIDATION */}
      {!isClosed && (
        <div className="flex justify-center pt-6">
          <button 
            onClick={handleValidate}
            className="bg-slate-800 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-slate-700 hover:scale-105 transition flex items-center gap-2"
          >
            <CheckCircle /> Valider & Clôturer le Mois
          </button>
        </div>
      )}
    </div>
  );
}

const SectionHeader = ({ title }) => (
  <div className="p-3 bg-slate-100/50 text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</div>
);

const RowInput = ({ label, target, value, onChange, isVariable = false, disabled, report }) => {
  const diff = (target + (report || 0)) - value; // Budget + Report - Dépense
  return (
    <div className="flex items-center justify-between p-3 hover:bg-slate-50 transition-colors">
      <div className="flex-1">
        <div className="font-medium text-slate-700">{label}</div>
        {isVariable && (
          <div className="text-xs text-slate-400 flex gap-2">
            <span>Budget: {target}€</span>
            {report !== undefined && report !== 0 && (
              <span className={report > 0 ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>
                (Report: {report > 0 ? '+' : ''}{report}€)
              </span>
            )}
            <span>• Reste: <span className={diff < 0 ? 'text-red-500 font-bold' : 'text-emerald-500'}>{diff}€</span></span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <SmartInput 
          disabled={disabled}
          value={value} 
          onChange={onChange}
          placeholder="0"
          className={`w-28 text-right p-2 border rounded-lg outline-none font-mono ${isVariable && value > (target + (report||0)) ? 'bg-red-50 text-red-700 border-red-300' : 'border-slate-200'} ${disabled ? 'bg-slate-100 text-slate-500' : ''}`}
        />
        <span className="text-slate-400 text-sm w-4">€</span>
      </div>
    </div>
  );
};