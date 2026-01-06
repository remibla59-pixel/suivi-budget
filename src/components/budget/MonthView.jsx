import React, { useState } from 'react';
import { useBudget } from '../../hooks/useBudget';
import { ChevronLeft, ChevronRight, Calculator } from 'lucide-react';

export default function MonthView() {
  const { config, monthlyData, updateMonthEntry } = useBudget();
  
  // État local pour le mois sélectionné (Format YYYY-MM)
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));

  // Récupération des données du mois (ou valeurs par défaut)
  const monthData = monthlyData[currentMonth] || { revenus: config.revenusPrevus, depenses: {} };

  // Calculs dynamiques
  const totalFixe = config.postes.filter(p => p.type === 'fixe')
    .reduce((sum, p) => sum + (monthData.depenses[p.id] !== undefined ? monthData.depenses[p.id] : p.montant), 0);
    
  const totalObligatoire = config.postes.filter(p => p.type === 'obligatoire')
    .reduce((sum, p) => sum + (monthData.depenses[p.id] !== undefined ? monthData.depenses[p.id] : 0), 0); // Ici par défaut 0 car c'est du variable réel

  const totalSecondaire = config.postes.filter(p => p.type === 'secondaire')
    .reduce((sum, p) => sum + (monthData.depenses[p.id] !== undefined ? monthData.depenses[p.id] : 0), 0);

  const totalEpargne = config.epargneCibles.reduce((sum, e) => sum + e.mensuel, 0);

  const totalDepenseReelle = totalFixe + totalObligatoire + totalSecondaire + totalEpargne;
  const resteAVivre = monthData.revenus - totalDepenseReelle;

  // Helpers changement mois
  const changeMonth = (offset) => {
    const date = new Date(currentMonth + "-01");
    date.setMonth(date.getMonth() + offset);
    setCurrentMonth(date.toISOString().slice(0, 7));
  };

  const formatMonth = (isoStr) => {
    const date = new Date(isoStr + "-01");
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* HEADER MOIS */}
      <div className="flex items-center justify-between bg-slate-800 text-white p-4 rounded-xl shadow-lg">
        <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-700 rounded-full"><ChevronLeft /></button>
        <h2 className="text-2xl font-bold capitalize">{formatMonth(currentMonth)}</h2>
        <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-700 rounded-full"><ChevronRight /></button>
      </div>

      {/* RECAP KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
          <label className="text-sm text-slate-500 font-semibold uppercase">Revenus Réels</label>
          <div className="flex items-center mt-2">
            <input 
              type="number" 
              value={monthData.revenus} 
              onChange={(e) => updateMonthEntry(currentMonth, 'revenus', e.target.value)}
              className="text-3xl font-bold text-slate-800 w-full bg-transparent outline-none"
            />
            <span className="text-slate-400 ml-2">€</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-red-400">
          <label className="text-sm text-slate-500 font-semibold uppercase">Total Dépenses + Épargne</label>
          <div className="text-3xl font-bold text-slate-800 mt-2">{totalDepenseReelle.toLocaleString()} €</div>
        </div>
        <div className={`p-6 rounded-xl shadow-sm border-l-4 ${resteAVivre >= 0 ? 'bg-emerald-50 border-emerald-500' : 'bg-red-50 border-red-500'}`}>
          <label className="text-sm text-slate-500 font-semibold uppercase">Solde du mois</label>
          <div className={`text-3xl font-bold mt-2 ${resteAVivre >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {resteAVivre.toLocaleString()} €
          </div>
        </div>
      </div>

      {/* TABLEAU DE SAISIE */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 flex items-center gap-2">
          <Calculator size={20} /> Suivi des dépenses
        </div>
        
        <div className="divide-y divide-slate-100">
          {/* SECTION FIXES */}
          <div className="p-4 bg-slate-50/50"><span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Charges Fixes</span></div>
          {config.postes.filter(p => p.type === 'fixe').map(poste => {
            const val = monthData.depenses[poste.id] !== undefined ? monthData.depenses[poste.id] : poste.montant;
            return (
              <RowInput 
                key={poste.id} 
                label={poste.label} 
                target={poste.montant} 
                value={val} 
                onChange={(v) => updateMonthEntry(currentMonth, 'depense', v, poste.id)}
              />
            );
          })}

          {/* SECTION ENVELOPPES */}
          <div className="p-4 bg-slate-50/50 mt-4"><span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Enveloppes & Variables</span></div>
          {config.postes.filter(p => p.type !== 'fixe').map(poste => {
             const val = monthData.depenses[poste.id] !== undefined ? monthData.depenses[poste.id] : 0;
             // Note: Pour les variables, on commence à 0, le montant 'target' est le budget max
             return (
              <RowInput 
                key={poste.id} 
                label={poste.label} 
                target={poste.montant} 
                value={val} 
                isVariable={true}
                onChange={(v) => updateMonthEntry(currentMonth, 'depense', v, poste.id)}
              />
             );
          })}
        </div>
      </div>
    </div>
  );
}

// Sous-composant pour une ligne (plus propre)
const RowInput = ({ label, target, value, onChange, isVariable = false }) => {
  const diff = target - value;
  return (
    <div className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
      <div className="flex-1">
        <div className="font-medium text-slate-700">{label}</div>
        {isVariable && (
          <div className="text-xs text-slate-400">Budget: {target}€ • Reste: <span className={diff < 0 ? 'text-red-500 font-bold' : 'text-emerald-500'}>{diff}€</span></div>
        )}
      </div>
      <div className="w-32 relative">
        <input 
          type="number" 
          value={value} 
          onChange={(e) => onChange(e.target.value)}
          className={`w-full text-right p-2 border rounded-lg focus:ring-2 outline-none font-mono ${isVariable && value > target ? 'border-red-300 bg-red-50 text-red-700' : 'border-slate-200'}`}
        />
        <span className="absolute right-8 top-2.5 text-slate-400 text-xs">€</span>
      </div>
    </div>
  );
};