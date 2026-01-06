import React, { useState } from 'react';
import { useBudget } from '../../hooks/useBudget';
import { PiggyBank, PlusCircle, Trash2, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';

// Fonction pour arrondir proprement (2 décimales max)
const round = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

const SmartInput = ({ value, onChange, placeholder, isNumber }) => {
  const handleFocus = (e) => {
    const val = e.target.value;
    // Liste des mots qui déclenchent l'effacement
    if (val === '0' || val.includes('Nouveau') || val.includes('Nouvelle')) {
      onChange('');
    }
  };
  return (
    <input
      type={isNumber ? "number" : "text"}
      value={value}
      onFocus={handleFocus}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`p-2 border rounded outline-none focus:ring-2 focus:ring-blue-400 ${isNumber ? 'text-right font-mono' : 'w-full'}`}
    />
  );
};

export default function AnnualView() {
  const { config, addProvisionItem, updateProvisionItem, removeProvisionItem } = useBudget();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  
  const provisions = config.provisionsByYear?.[selectedYear] || [];
  
  const totalAnnual = round(provisions.reduce((sum, p) => sum + (p.amount || 0), 0));
  const monthlyTransfer = round(totalAnnual / 12);
  const totalSpent = round(provisions.reduce((sum, p) => sum + (p.spent || 0), 0));
  const soldeProvisions = round(totalAnnual - totalSpent);

  return (
    <div className="max-w-5xl mx-auto p-4 pb-20 space-y-8">
      
      {/* HEADER */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-800 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <PiggyBank className="text-yellow-400" /> Planification Annualisée
          </h2>
          <p className="text-blue-200 text-sm">Préparez vos charges pour {selectedYear}.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white/10 p-2 rounded-lg backdrop-blur-sm border border-white/20">
          <Calendar className="text-blue-300" size={20}/>
          <span className="font-bold mr-2">Année :</span>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-white text-blue-900 font-bold rounded px-3 py-1 outline-none cursor-pointer border-none"
          >
            {[2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="text-slate-500 text-sm uppercase font-bold mb-1">Total à payer en {selectedYear}</div>
          <div className="text-4xl font-bold text-slate-800">{totalAnnual.toLocaleString()} €</div>
        </div>
        <div className="bg-blue-50 p-6 rounded-xl shadow-sm border border-blue-100">
          <div className="text-blue-600 text-sm uppercase font-bold mb-1">Épargne Mensuelle</div>
          <div className="text-4xl font-bold text-blue-700">{monthlyTransfer.toLocaleString()} €</div>
          <div className="text-xs text-blue-400 mt-2">À virer tous les mois</div>
        </div>
        <div className="bg-emerald-50 p-6 rounded-xl shadow-sm border border-emerald-100">
          <div className="text-emerald-600 text-sm uppercase font-bold mb-1">Déjà Dépensé (Réel)</div>
          <div className="text-4xl font-bold text-emerald-700">{totalSpent.toLocaleString()} €</div>
          <div className="text-xs text-emerald-500 mt-2">Solde théorique : {soldeProvisions.toLocaleString()} €</div>
        </div>
      </div>

      {/* TABLEAU */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-700">Détail des charges & Suivi</h3>
          <button onClick={() => addProvisionItem(selectedYear)} className="flex items-center gap-1 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition">
            <PlusCircle size={16} /> Ajouter une ligne
          </button>
        </div>

        <div className="grid grid-cols-12 gap-4 p-3 bg-slate-100 text-xs font-bold text-slate-500 uppercase">
          <div className="col-span-5 md:col-span-4">Intitulé</div>
          <div className="col-span-3 text-right">Prévu (Budget)</div>
          <div className="col-span-3 text-right hidden md:block">Dépensé (Réel)</div>
          <div className="col-span-3 md:col-span-2 text-center">État</div>
          <div className="col-span-1"></div>
        </div>

        <div className="divide-y divide-slate-100">
          {provisions.length === 0 && <div className="p-8 text-center text-slate-400 italic">Aucune charge définie pour {selectedYear}.</div>}
          
          {provisions.map(prov => {
            const spent = round(prov.spent || 0);
            const diff = round(prov.amount - spent);
            const isOverBudget = diff < 0;
            const isPaid = spent > 0;

            return (
              <div key={prov.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50">
                <div className="col-span-5 md:col-span-4">
                  <SmartInput value={prov.label} onChange={(v) => updateProvisionItem(selectedYear, { ...prov, label: v })} placeholder="Nom de la charge" />
                </div>
                <div className="col-span-3 flex items-center justify-end gap-1">
                  <SmartInput isNumber value={prov.amount} onChange={(v) => updateProvisionItem(selectedYear, { ...prov, amount: parseFloat(v) || 0 })} placeholder="0" />
                  <span className="text-slate-400 text-xs hidden sm:inline">€</span>
                </div>
                <div className="col-span-3 hidden md:flex items-center justify-end font-mono font-bold text-slate-700">
                  {spent > 0 ? spent.toLocaleString() : '-'} €
                </div>
                <div className="col-span-3 md:col-span-2 flex justify-center">
                  {!isPaid ? (
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">En attente</span>
                  ) : (
                    <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded ${isOverBudget ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                      {isOverBudget ? <AlertTriangle size={12}/> : <CheckCircle size={12}/>}
                      {isOverBudget ? `+${Math.abs(diff)}€` : `Reste ${diff}€`}
                    </div>
                  )}
                </div>
                <div className="col-span-1 flex justify-end">
                  <button onClick={() => { if(confirm("Supprimer cette ligne ?")) removeProvisionItem(selectedYear, prov.id); }} className="text-slate-300 hover:text-red-500 p-2">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}