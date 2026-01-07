import React, { useState } from 'react';
import { useBudget } from '../../hooks/useBudget';
import { BarChart3, Plus, X, PiggyBank, Target } from 'lucide-react';

const round = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

// MODALE POUR AJOUTER UNE ALLOCATION (EPARGNE OU PROJET)
const AllocationModal = ({ isOpen, onClose, type, monthKey }) => {
  const { config, transferToSavings, fundProject } = useBudget();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState(''); // Pour épargne
  const [selectedProject, setSelectedProject] = useState(''); // Pour projets
  const [targetAccount, setTargetAccount] = useState('ldd'); // Pour projets

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!amount) return;

    if (type === 'savings') {
      transferToSavings(amount, note, monthKey);
    } else if (type === 'project') {
      if (!selectedProject) return;
      fundProject(selectedProject, amount, targetAccount, monthKey);
    }
    
    // Reset et fermeture
    setAmount(''); setNote(''); setSelectedProject('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
          <h3 className="font-bold flex items-center gap-2">
            {type === 'savings' ? <PiggyBank size={18}/> : <Target size={18}/>}
            {type === 'savings' ? 'Vers Épargne (Précaution)' : 'Financer un Projet'}
          </h3>
          <button onClick={onClose} className="text-white/60 hover:text-white"><X size={20}/></button>
        </div>
        
        <div className="p-6 space-y-4">
          
          {/* CHAMP MONTANT */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Montant (€)</label>
            <input 
              type="number" 
              autoFocus
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full text-2xl font-black p-2 border-b-2 border-slate-200 outline-none focus:border-blue-500 text-slate-800"
              placeholder="0.00"
            />
          </div>

          {/* CHAMPS SPECIFIQUES EPARGNE */}
          {type === 'savings' && (
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Note (Optionnel)</label>
              <input 
                value={note}
                onChange={e => setNote(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg outline-none text-sm"
                placeholder="Ex: Prime, Reste mois..."
              />
            </div>
          )}

          {/* CHAMPS SPECIFIQUES PROJETS */}
          {type === 'project' && (
            <>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Choisir le Projet</label>
                <select 
                  value={selectedProject}
                  onChange={e => setSelectedProject(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none text-sm font-bold bg-white"
                >
                  <option value="">-- Sélectionner --</option>
                  {(config.projects || []).map(p => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Compte Cible</label>
                <select 
                  value={targetAccount}
                  onChange={e => setTargetAccount(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none text-sm bg-white"
                >
                  <option value="ldd">LDD Véro</option>
                  <option value="casden">Compte CASDEN</option>
                </select>
              </div>
            </>
          )}

          <div className="pt-2">
            <button 
              onClick={handleConfirm}
              disabled={!amount || (type === 'project' && !selectedProject)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              Valider le virement
            </button>
            <p className="text-[10px] text-center text-slate-400 mt-2">
              Cela débitera votre Compte Courant.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default function AnalysisView() {
  const { config, monthlyData, updateAnalysisData } = useBudget();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [initialBalance, setInitialBalance] = useState(0); 
  
  // State pour la modale
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('savings'); // 'savings' or 'project'
  const [modalMonth, setModalMonth] = useState('');

  const openModal = (type, monthKey) => {
    setModalType(type);
    setModalMonth(monthKey);
    setModalOpen(true);
  };

  const months = [
    { idx: '01', label: 'Janvier' }, { idx: '02', label: 'Février' }, { idx: '03', label: 'Mars' },
    { idx: '04', label: 'Avril' }, { idx: '05', label: 'Mai' }, { idx: '06', label: 'Juin' },
    { idx: '07', label: 'Juillet' }, { idx: '08', label: 'Août' }, { idx: '09', label: 'Septembre' },
    { idx: '10', label: 'Octobre' }, { idx: '11', label: 'Novembre' }, { idx: '12', label: 'Décembre' }
  ];

  let carryOver = initialBalance;
  
  const annualData = months.map(m => {
    const monthKey = `${selectedYear}-${m.idx}`;
    const mData = monthlyData[monthKey] || {};

    const totalRevenus = round((mData.revenusList || []).reduce((sum, r) => sum + (r.montant || 0), 0));

    // DEPENSES
    const totalFixe = round(config.postes.filter(p => p.type === 'fixe').reduce((sum, p) => sum + (mData.depenses?.[p.id] ?? p.montant), 0));
    const totalEpargneFixe = round(config.epargneCibles.reduce((sum, e) => sum + e.mensuel, 0));
    const totalChargesFixes = totalFixe + totalEpargneFixe;
    const totalFlexibleSpent = round((mData.flexibleExpenses || []).reduce((sum, e) => sum + e.amount, 0));
    const totalEnvObligatoires = config.envelopes.filter(e => e.category === 'courant').reduce((sum, env) => sum + (mData[`funded_${env.id}`] ? env.budgetMonthly : 0), 0);
    const totalEnvSecondaires = config.envelopes.filter(e => e.category === 'secondaire').reduce((sum, env) => sum + (mData[`funded_${env.id}`] ? env.budgetMonthly : 0), 0);
    
    const nextYear = String(parseInt(selectedYear) + 1);
    const provisionsNextYear = config.provisionsByYear?.[nextYear] || [];
    const monthlyProvisionAmount = Math.round(round(provisionsNextYear.reduce((sum, p) => sum + (p.amount || 0), 0)) / 12);
    const totalProvisionVirement = mData.provisionDone ? monthlyProvisionAmount : 0;

    const totalSorties = round(totalChargesFixes + totalFlexibleSpent + totalEnvObligatoires + totalEnvSecondaires + totalProvisionVirement);
    const soldeAvantAlloc = round(carryOver + totalRevenus - totalSorties);

    // ALLOCATIONS CALCULÉES (SOMME DES TRANSACTIONS ENREGISTRÉES CE MOIS)
    const allocationsList = mData.allocationsList || [];
    const allocSavings = round(allocationsList.filter(a => a.type === 'savings').reduce((sum, a) => sum + a.amount, 0));
    const allocProjects = round(allocationsList.filter(a => a.type === 'project').reduce((sum, a) => sum + a.amount, 0));

    const note = mData.analysis_note || '';
    const soldeFinal = round(soldeAvantAlloc - allocSavings - allocProjects);
    carryOver = soldeFinal;

    return {
      monthKey, label: m.label,
      totalRevenus, totalChargesFixes, totalFlexibleSpent, totalEnvObligatoires, totalEnvSecondaires, totalProvisionVirement, totalSorties,
      soldeAvantAlloc, allocSavings, allocProjects, soldeFinal, note
    };
  });

  return (
    <div className="max-w-full mx-auto p-4 pb-20 space-y-8 overflow-x-hidden">
      <AllocationModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        type={modalType} 
        monthKey={modalMonth}
      />

      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-3"><BarChart3 className="text-blue-400" size={32} /> Vue Annuelle & Trésorerie</h2>
          <p className="text-slate-400 text-sm mt-1">Pilotage du Reste à Vivre et des reports mensuels.</p>
        </div>
        <div className="flex items-center gap-4 bg-white/10 p-2 rounded-xl">
           <span className="font-bold text-sm">Année :</span>
           <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-slate-800 border-none font-black text-xl text-white cursor-pointer rounded outline-none">
             {[2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>{y}</option>)}
           </select>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-4 sticky left-0 bg-slate-50 z-10 min-w-[150px]">Rubriques</th>
                {annualData.map(d => <th key={d.monthKey} className="p-4 text-right min-w-[120px]">{d.label}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              <tr className="bg-blue-50/30">
                <td className="p-4 sticky left-0 bg-blue-50/30 font-bold text-blue-700">Solde Précédent</td>
                {annualData.map((d, i) => <td key={d.monthKey} className="p-4 text-right font-bold text-blue-600">{i === 0 ? <div className="flex items-center justify-end gap-1"><input type="number" value={initialBalance} onChange={(e) => setInitialBalance(parseFloat(e.target.value)||0)} className="w-16 bg-white border border-blue-200 rounded px-1 text-right text-xs" /><span>€</span></div> : <span>{round(annualData[i-1].soldeFinal).toLocaleString()} €</span>}</td>)}
              </tr>
              <tr><td className="p-4 sticky left-0 bg-white font-bold">Total Revenus (+)</td>{annualData.map(d => <td key={d.monthKey} className="p-4 text-right text-emerald-600 font-bold">{d.totalRevenus.toLocaleString()} €</td>)}</tr>
              <tr className="bg-slate-100/50 font-black"><td className="p-4 sticky left-0 bg-slate-100">Total Disponible</td>{annualData.map((d, i) => { const prev = i === 0 ? initialBalance : annualData[i-1].soldeFinal; return <td key={d.monthKey} className="p-4 text-right">{round(prev + d.totalRevenus).toLocaleString()} €</td>})}</tr>
              <tr><td className="p-4 sticky left-0 bg-white">Charges Fixes (-)</td>{annualData.map(d => <td key={d.monthKey} className="p-4 text-right text-red-400">{d.totalChargesFixes.toLocaleString()} €</td>)}</tr>
              <tr><td className="p-4 sticky left-0 bg-white">Dépenses Courantes (-)</td>{annualData.map(d => <td key={d.monthKey} className="p-4 text-right text-orange-500">{d.totalFlexibleSpent.toLocaleString()} €</td>)}</tr>
              <tr><td className="p-4 sticky left-0 bg-white">Env. Obligatoires (-)</td>{annualData.map(d => <td key={d.monthKey} className="p-4 text-right text-slate-500">{d.totalEnvObligatoires.toLocaleString()} €</td>)}</tr>
              <tr><td className="p-4 sticky left-0 bg-white">Env. Secondaires (-)</td>{annualData.map(d => <td key={d.monthKey} className="p-4 text-right text-slate-500">{d.totalEnvSecondaires.toLocaleString()} €</td>)}</tr>
              <tr><td className="p-4 sticky left-0 bg-white">Provisions N+1 (-)</td>{annualData.map(d => <td key={d.monthKey} className="p-4 text-right text-blue-500">{d.totalProvisionVirement.toLocaleString()} €</td>)}</tr>
              <tr className="bg-slate-50 font-black text-slate-800 border-t-2 border-slate-200"><td className="p-4 sticky left-0 bg-slate-50">Surplus / Déficit (Avant Alloc.)</td>{annualData.map(d => <td key={d.monthKey} className={`p-4 text-right ${d.soldeAvantAlloc >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{d.soldeAvantAlloc.toLocaleString()} €</td>)}</tr>
              
              {/* LIGNES AVEC BOUTONS D'ACTION */}
              <tr className="bg-purple-50/30">
                <td className="p-4 sticky left-0 bg-purple-50/30 text-purple-700 font-bold text-xs">Vers Épargne (Précaution)</td>
                {annualData.map(d => (
                  <td key={d.monthKey} className="p-2 text-right relative group">
                    <span className="font-bold text-purple-800">{d.allocSavings > 0 ? d.allocSavings.toLocaleString() + ' €' : '-'}</span>
                    <button onClick={() => openModal('savings', d.monthKey)} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-purple-600 text-white rounded-full p-1 hover:scale-110 transition-all shadow-sm"><Plus size={10}/></button>
                  </td>
                ))}
              </tr>
              <tr className="bg-indigo-50/30">
                <td className="p-4 sticky left-0 bg-indigo-50/30 text-indigo-700 font-bold text-xs">Vers Projets</td>
                {annualData.map(d => (
                  <td key={d.monthKey} className="p-2 text-right relative group">
                    <span className="font-bold text-indigo-800">{d.allocProjects > 0 ? d.allocProjects.toLocaleString() + ' €' : '-'}</span>
                    <button onClick={() => openModal('project', d.monthKey)} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-indigo-600 text-white rounded-full p-1 hover:scale-110 transition-all shadow-sm"><Plus size={10}/></button>
                  </td>
                ))}
              </tr>

              <tr className="bg-emerald-50 border-t-2 border-emerald-100 font-black text-lg"><td className="p-4 sticky left-0 bg-emerald-50 text-emerald-800">RESTE (Report N+1)</td>{annualData.map(d => <td key={d.monthKey} className="p-4 text-right text-emerald-700">{d.soldeFinal.toLocaleString()} €</td>)}</tr>
              <tr><td className="p-4 sticky left-0 bg-white font-bold text-xs text-slate-400">Notes</td>{annualData.map(d => <td key={d.monthKey} className="p-2 min-w-[150px]"><textarea value={d.note} onChange={(e) => updateAnalysisData(d.monthKey, 'analysis_note', e.target.value)} placeholder="Note..." rows="2" className="w-full text-[10px] p-1.5 rounded border border-slate-100 bg-slate-50 resize-none focus:bg-white outline-none"/></td>)}</tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}