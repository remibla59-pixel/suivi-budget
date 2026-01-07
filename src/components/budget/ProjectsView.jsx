import React, { useState } from 'react';
import { useBudget } from '../../hooks/useBudget';
import { Target, Plus, Trash2, TrendingUp, PiggyBank, Coins } from 'lucide-react';

const ProjectCard = ({ project, onFund, onRemove }) => {
  const [fundAmount, setFundAmount] = useState('');
  const [targetAccount, setTargetAccount] = useState('ldd'); // Par défaut
  
  // Calculs : current est la somme des allocations
  const currentTotal = (project.allocations?.ldd || 0) + (project.allocations?.casden || 0);
  const progress = Math.min((currentTotal / project.target) * 100, 100);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-5">
        <div className="flex justify-between items-start mb-4">
           <div>
             <h3 className="font-black text-lg text-slate-800 leading-tight">{project.label}</h3>
           </div>
           <button onClick={() => {if(confirm("Supprimer ce projet ?")) onRemove(project.id)}} className="text-slate-300 hover:text-red-500 transition-colors">
             <Trash2 size={18}/>
           </button>
        </div>

        {/* Jauges et Totaux */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1 font-medium">
            <span className="font-black text-emerald-600">{Math.round(currentTotal).toLocaleString()} €</span>
            <span className="text-slate-400">Objectif : {project.target.toLocaleString()} €</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-3">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 shadow-sm" style={{ width: `${progress}%` }}></div>
          </div>
          
          {/* Détail répartition */}
          <div className="flex gap-2 text-[10px]">
            <span className="bg-purple-50 text-purple-600 px-2 py-1 rounded font-bold border border-purple-100">
               LDD : {(project.allocations?.ldd || 0).toLocaleString()}€
            </span>
            <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded font-bold border border-blue-100">
               CASDEN : {(project.allocations?.casden || 0).toLocaleString()}€
            </span>
          </div>
        </div>

        {/* Zone financement */}
        <div className="bg-slate-50 p-3 rounded-xl">
           <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Ajouter de l'argent (Depuis Courant)</label>
           <div className="flex flex-col gap-2">
             <div className="flex gap-2">
                <input 
                  type="number" 
                  placeholder="Montant" 
                  value={fundAmount} 
                  onChange={e => setFundAmount(e.target.value)}
                  className="w-full p-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 bg-white font-bold"
                />
                <button 
                  onClick={() => { if(fundAmount) { onFund(project.id, fundAmount, targetAccount); setFundAmount(''); }}}
                  disabled={!fundAmount}
                  className="bg-slate-900 text-white px-3 rounded-lg hover:bg-black disabled:opacity-50 transition-colors"
                >
                  <Plus size={18}/>
                </button>
             </div>
             <select 
               value={targetAccount} 
               onChange={(e) => setTargetAccount(e.target.value)}
               className="w-full p-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none font-bold text-slate-600"
             >
               <option value="ldd">Vers LDD Véro</option>
               <option value="casden">Vers Compte CASDEN</option>
             </select>
           </div>
        </div>
      </div>
    </div>
  );
};

export default function ProjectsView() {
  const { config, addProject, removeProject, fundProject } = useBudget();
  const [isCreating, setIsCreating] = useState(false);
  
  // State formulaire nouveau projet
  const [newLabel, setNewLabel] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [initLDD, setInitLDD] = useState('');    // Allocation initiale LDD
  const [initCasden, setInitCasden] = useState(''); // Allocation initiale CASDEN

  const handleCreate = () => {
    if(newLabel && newTarget) {
      const allocations = {
        ldd: parseFloat(initLDD) || 0,
        casden: parseFloat(initCasden) || 0
      };
      addProject(newLabel, newTarget, allocations);
      setNewLabel(''); setNewTarget(''); setInitLDD(''); setInitCasden(''); setIsCreating(false);
    }
  };

  // Calculs totaux globaux (Physiques)
  const totalLDD = config.comptes.find(c=>c.id==='ldd')?.initial || 0;
  const totalCasden = config.comptes.find(c=>c.id==='casden')?.initial || 0;
  
  // Calculs argent déjà assigné
  const assignedLDD = (config.projects || []).reduce((sum, p) => sum + (p.allocations?.ldd || 0), 0);
  const assignedCasden = (config.projects || []).reduce((sum, p) => sum + (p.allocations?.casden || 0), 0);

  return (
    <div className="max-w-6xl mx-auto p-4 pb-20 space-y-8">
      
      {/* HEADER */}
      <div className="bg-gradient-to-r from-indigo-900 to-purple-800 text-white p-8 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-3xl font-black flex items-center gap-3">
            <Target className="text-pink-400" size={32} /> 
            Grands Projets
          </h2>
          <p className="text-indigo-200 text-sm mt-1 font-medium">Épargne ciblée multi-comptes</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)} 
          className="bg-white/10 backdrop-blur-md border border-white/20 px-6 py-3 rounded-xl font-bold hover:bg-white hover:text-indigo-900 transition-all flex items-center gap-2 shadow-lg"
        >
          <Plus size={20}/> Nouveau Projet
        </button>
      </div>

      {/* FORMULAIRE DE CREATION */}
      {isCreating && (
        <div className="bg-white p-6 rounded-3xl shadow-xl border border-indigo-100 animate-in fade-in slide-in-from-top-4">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><Target size={20}/> Définir un nouvel objectif</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Nom du projet</label>
                <input value={newLabel} onChange={e=>setNewLabel(e.target.value)} placeholder="Ex: Piscine, Voyage..." className="w-full p-3 border rounded-xl outline-none focus:border-indigo-500 font-bold" />
              </div>
              <div>
                 <label className="text-xs font-bold text-slate-400 uppercase ml-1">Objectif total (€)</label>
                 <div className="flex items-center border rounded-xl px-3 bg-white focus-within:border-indigo-500">
                   <input type="number" value={newTarget} onChange={e=>setNewTarget(e.target.value)} placeholder="0" className="w-full p-3 outline-none font-bold" />
                   <span className="text-slate-400 font-bold">€</span>
                 </div>
              </div>
            </div>

            <div className="space-y-4 bg-slate-50 p-4 rounded-xl">
              <label className="text-xs font-black text-slate-500 uppercase">Allocations Initiales (Déjà épargné)</label>
              <div className="flex items-center gap-2">
                 <div className="w-24 text-xs font-bold text-purple-600">Sur LDD :</div>
                 <input type="number" value={initLDD} onChange={e=>setInitLDD(e.target.value)} placeholder="0" className="flex-1 p-2 border rounded-lg text-right font-bold" />
                 <span className="text-xs font-bold text-slate-400">€</span>
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-24 text-xs font-bold text-blue-600">Sur CASDEN :</div>
                 <input type="number" value={initCasden} onChange={e=>setInitCasden(e.target.value)} placeholder="0" className="flex-1 p-2 border rounded-lg text-right font-bold" />
                 <span className="text-xs font-bold text-slate-400">€</span>
              </div>
              <p className="text-[10px] text-slate-400 italic text-center">Ces montants seront réservés sur vos comptes sans virement.</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
            <button onClick={() => setIsCreating(false)} className="px-6 py-3 text-slate-500 hover:bg-slate-50 rounded-xl font-bold transition-colors">Annuler</button>
            <button onClick={handleCreate} disabled={!newLabel || !newTarget} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 shadow-lg shadow-indigo-200 transition-all">Créer le projet</button>
          </div>
        </div>
      )}

      {/* RECAP COMPTES SUPPORTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {/* LDD */}
         <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-purple-50 rounded-xl text-purple-600"><PiggyBank size={24}/></div>
                 <div>
                   <span className="font-bold text-slate-700 block">LDD Véro</span>
                   <span className="text-xs text-slate-400">Solde total : {Math.round(totalLDD).toLocaleString()} €</span>
                 </div>
              </div>
              <div className="text-right">
                <span className="block text-xs font-bold uppercase text-purple-400">Disponible</span>
                <span className="font-black text-xl text-purple-700">{(totalLDD - assignedLDD).toLocaleString()} €</span>
              </div>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
               <div className="h-full bg-purple-500" style={{ width: `${Math.min((assignedLDD/totalLDD)*100, 100)}%` }}></div>
            </div>
            <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-1">
               <span>Affecté projets: {assignedLDD.toLocaleString()} €</span>
            </div>
         </div>

         {/* CASDEN */}
         <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-blue-50 rounded-xl text-blue-600"><TrendingUp size={24}/></div>
                 <div>
                   <span className="font-bold text-slate-700 block">Compte CASDEN</span>
                   <span className="text-xs text-slate-400">Solde total : {Math.round(totalCasden).toLocaleString()} €</span>
                 </div>
              </div>
              <div className="text-right">
                <span className="block text-xs font-bold uppercase text-blue-400">Disponible</span>
                <span className="font-black text-xl text-blue-700">{(totalCasden - assignedCasden).toLocaleString()} €</span>
              </div>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
               <div className="h-full bg-blue-500" style={{ width: `${Math.min((assignedCasden/totalCasden)*100, 100)}%` }}></div>
            </div>
            <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-1">
               <span>Affecté projets: {assignedCasden.toLocaleString()} €</span>
            </div>
         </div>
      </div>

      {/* LISTE DES PROJETS */}
      <h3 className="font-bold text-slate-700 uppercase tracking-widest text-sm mt-8 mb-4 border-b pb-2">Projets en cours</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(config.projects || []).length === 0 && !isCreating && (
          <div className="col-span-full py-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <Coins size={48} className="mx-auto text-slate-300 mb-3"/>
            <p className="text-slate-400 font-medium">Aucun projet pour le moment.</p>
            <button onClick={() => setIsCreating(true)} className="text-indigo-500 font-bold text-sm mt-2 hover:underline">Créer mon premier projet</button>
          </div>
        )}
        {(config.projects || []).map(p => (
          <ProjectCard key={p.id} project={p} onFund={fundProject} onRemove={removeProject} />
        ))}
      </div>
    </div>
  );
}