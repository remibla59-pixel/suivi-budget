import React, { useState } from 'react';
import { useBudget } from '../../hooks/useBudget';
import { 
  PiggyBank, PlusCircle, Trash2, Calendar, 
  AlertTriangle, CheckCircle, ChevronDown, ChevronUp,
  Info
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';

const round = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

// SOUS-COMPOSANT POUR CHAQUE LIGNE DE PROVISION
const ProvisionRow = ({ prov, selectedYear, updateProvisionItem, removeProvisionItem }) => {
  const [showHistory, setShowHistory] = useState(false);
  
  const spent = round(prov.spent || 0);
  const diff = round(prov.amount - spent);
  const isOverBudget = diff < 0;
  const isPaid = spent !== 0;

  return (
    <div className="border-b border-slate-100 last:border-0">
      <div className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50 transition-colors group">
          {/* NOM DE LA CHARGE */}
          <div className="col-span-5 md:col-span-4">
            <input 
              value={prov.label} 
              onChange={(e) => updateProvisionItem(selectedYear, { ...prov, label: e.target.value })} 
              placeholder="Ex: Assurance Habitation" 
              className="p-2 border border-transparent focus:bg-white focus:border-blue-200 rounded-xl w-full outline-none bg-transparent font-bold text-slate-700" 
            />
          </div>

          {/* BUDGET PRÉVU */}
          <div className="col-span-3 flex items-center justify-end gap-1">
            <input 
              type="number" 
              value={prov.amount} 
              onChange={(e) => updateProvisionItem(selectedYear, { ...prov, amount: parseFloat(e.target.value) || 0 })} 
              placeholder="0" 
              className="p-2 border border-transparent focus:bg-white focus:border-blue-200 rounded text-right w-full outline-none bg-transparent font-black text-slate-800" 
            />
            <span className="text-slate-400 text-xs font-bold hidden sm:inline">€</span>
          </div>

          {/* DÉPENSÉ (AVEC TOGGLE HISTORIQUE) */}
          <div className="col-span-3 hidden md:flex items-center justify-end">
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl transition-all font-black text-sm ${isPaid ? 'text-slate-700 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100' : 'text-slate-300'}`}
              disabled={!isPaid}
            >
              {spent.toLocaleString()} €
              {isPaid && (showHistory ? <ChevronUp size={14} className="text-blue-500" /> : <ChevronDown size={14} className="text-slate-400" />)}
            </button>
          </div>

          {/* ÉTAT / RESTE */}
          <div className="col-span-3 md:col-span-2 flex justify-center">
            {!isPaid ? (
              <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded-lg uppercase font-black tracking-widest">En attente</span>
            ) : (
              <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg shadow-sm uppercase tracking-tighter ${isOverBudget ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                {isOverBudget ? <AlertTriangle size={12}/> : <CheckCircle size={12}/>}
                {isOverBudget ? `Dépassement ${Math.abs(diff)}€` : `Reste ${diff}€`}
              </div>
            )}
          </div>

          {/* ACTIONS */}
          <div className="col-span-1 flex justify-end">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => { if(confirm("Supprimer cette charge ?")) removeProvisionItem(selectedYear, prov.id); }} 
              className="text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100"
              icon={Trash2}
            />
          </div>
      </div>

      {/* SECTION HISTORIQUE DÉTAILLÉ (DÉROULANTE) */}
      {showHistory && prov.history && prov.history.length > 0 && (
        <div className="bg-slate-100/50 px-10 py-3 border-t border-slate-200 shadow-inner">
          <div className="flex items-center gap-2 mb-2 text-slate-500">
            <Info size={12} />
            <h4 className="text-[10px] font-bold uppercase tracking-widest">Détail des paiements effectués</h4>
          </div>
          <div className="space-y-1">
            {prov.history.map((h, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs text-slate-600 bg-white p-2 rounded border border-slate-200 shadow-sm">
                <div className="flex gap-4">
                  <span className="font-bold text-blue-600 w-16">{h.date}</span>
                  <span className="italic">{h.label}</span>
                </div>
                <span className="font-bold text-orange-600">-{h.amount} €</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default function AnnualView() {
  const { config, addProvisionItem, updateProvisionItem, removeProvisionItem } = useBudget();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  
  const provisions = config.provisionsByYear?.[selectedYear] || [];
  
  // CALCULS GLOBAUX
  const totalAnnual = round(provisions.reduce((sum, p) => sum + (p.amount || 0), 0));
  const monthlyTransfer = Math.round(totalAnnual / 12);
  const totalSpent = round(provisions.reduce((sum, p) => sum + (p.spent || 0), 0));

  const compteProv = config.comptes.find(c => c.id === config.provisionAccountId);
  const soldeReelLivret = compteProv ? compteProv.initial : 0;

  return (
    <div className="max-w-5xl mx-auto p-4 pb-20 space-y-8">
      
      {/* HEADER ÉTENDU */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-800 text-white p-8 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="space-y-2 text-center md:text-left">
          <h2 className="text-3xl font-black flex items-center justify-center md:justify-start gap-3">
            <PiggyBank className="text-yellow-400" size={32} /> 
            Provisions Annualisées
          </h2>
          <p className="text-blue-200 text-sm font-medium opacity-80 uppercase text-[10px] tracking-widest">Gestion des charges lourdes lissées sur l'année</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white/10 p-3 rounded-2xl backdrop-blur-md border border-white/20">
          <Calendar className="text-blue-300" size={20}/>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(e.target.value)} 
            className="bg-transparent text-white font-black rounded px-2 py-1 outline-none cursor-pointer"
          >
            {[2025, 2026, 2027, 2028].map(y => <option key={y} value={y} className="text-black">{y}</option>)}
          </select>
        </div>
      </div>

      {/* GRILLE DES COMPTEURS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
           <div className="text-slate-400 text-[10px] uppercase font-black mb-2 tracking-widest">Besoins Totaux {selectedYear}</div>
           <div className="text-4xl font-black text-slate-800">{totalAnnual.toLocaleString()} €</div>
           <div className="text-[10px] font-bold text-slate-400 mt-2 uppercase">Charges prévues cumulées</div>
        </Card>

        <Card className="bg-blue-600 p-6 shadow-lg text-white border-none transform hover:scale-[1.02] transition-transform">
          <div className="text-blue-100 text-[10px] uppercase font-black mb-2 tracking-widest">Virement Mensuel</div>
          <div className="text-4xl font-black">{monthlyTransfer.toLocaleString()} €</div>
          <div className="text-[10px] font-bold text-blue-200 mt-2 uppercase opacity-80">À provisionner par mois</div>
        </Card>

        <Card className="p-6 border-indigo-100">
          <div className="text-indigo-600 text-[10px] uppercase font-black mb-2 tracking-widest">Solde Réel Livret</div>
          <div className="text-4xl font-black text-indigo-700">{Math.round(soldeReelLivret).toLocaleString()} €</div>
          <div className="text-[10px] font-bold text-slate-400 mt-2 uppercase">Dépensé : <span className="text-orange-500 font-black">{totalSpent}€</span></div>
        </Card>
      </div>

      {/* TABLEAU DES CHARGES */}
      <Card>
        <CardHeader className="p-6 flex flex-row justify-between items-center bg-slate-50/50 border-b border-slate-100">
          <h3 className="font-black text-slate-700 flex items-center gap-2 uppercase tracking-widest text-sm">
            Liste des charges
            <span className="bg-white border border-slate-200 text-slate-400 text-[10px] px-2 py-0.5 rounded-lg shadow-sm font-black">{provisions.length}</span>
          </h3>
          <Button size="sm" onClick={() => addProvisionItem(selectedYear)} icon={PlusCircle}>
            Ajouter une charge
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {/* HEADER COLONNES */}
          <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-100/30 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <div className="col-span-5 md:col-span-4">Intitulé de la charge</div>
            <div className="col-span-3 text-right">Budget Prévu</div>
            <div className="col-span-3 text-right hidden md:block">Total Payé</div>
            <div className="col-span-3 md:col-span-2 text-center">Statut / Reste</div>
            <div className="col-span-1"></div>
          </div>

          {/* LISTE DES LIGNES */}
          <div className="divide-y divide-slate-50">
            {provisions.length === 0 ? (
              <div className="p-12 text-center">
                 <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="text-slate-300" size={32}/>
                 </div>
                 <p className="text-slate-400 italic">Aucune charge provisionnée pour cette année.</p>
              </div>
            ) : (
              provisions.map(prov => (
                <ProvisionRow 
                  key={prov.id} 
                  prov={prov} 
                  selectedYear={selectedYear} 
                  updateProvisionItem={updateProvisionItem} 
                  removeProvisionItem={removeProvisionItem} 
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* NOTE D'INFORMATION */}
      <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3 shadow-sm">
         <Info className="text-amber-500 shrink-0" size={20} />
         <p className="text-xs text-amber-800 leading-relaxed font-medium">
           <strong>Fonctionnement :</strong> Les montants payés sont automatiquement déduits du solde de votre livret lors de la saisie d'une dépense "Provision" dans la vue mensuelle. Le "Virement Mensuel" permet d'anticiper ces dépenses pour ne pas impacter votre compte courant le mois J.
         </p>
      </div>
    </div>
  );
}
