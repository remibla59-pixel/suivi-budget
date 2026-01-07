import React, { useState } from 'react';
import { useBudget } from '../../hooks/useBudget';
import { Target, Plus, Trash2, TrendingUp, PiggyBank, Coins } from 'lucide-react';

// CARTE PROJET INDIVIDUELLE
const ProjectCard = ({ project, onFund, onRemove }) => {
  const [fundAmount, setFundAmount] = useState('');
  const progress = Math.min((project.current / project.target) * 100, 100);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-5">
        <div className="flex justify-between items-start mb-4">
           <div>
             <h3 className="font-black text-lg text-slate-800 leading-tight">{project.label}</h3>
             <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded mt-1 inline-block ${project.accountId === 'ldd' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
               Sur {project.accountId === 'ldd' ? 'LDD Véro' : 'CASDEN'}
             </span>
           </div>
           <button onClick={() => {if(confirm("Supprimer ce projet ?")) onRemove(project.id)}} className="text-slate-300 hover:text-red-500 transition-colors">
             <Trash2 size={18}/>
           </button>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1 font-medium">
            <span className="font-black text-emerald-600">{Math.round(project.current).toLocaleString()} €</span>
            <span className="text-slate-400">Objectif : {project.target.toLocaleString()} €</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 shadow-sm" style={{ width: `${progress}%` }}></div>
          </div>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl">
           <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Ajouter de l'argent (Depuis Courant)</label>
           <div className="flex gap-2">
             <input 
               type="number" 
               placeholder="Montant" 
               value={fundAmount} 
               onChange={e => setFundAmount(e.target.value)}
               className="w-full p-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 bg-white font-bold"
             />
             <button 
               onClick={() => { if(fundAmount) { onFund(project.id, fundAmount); setFundAmount(''); }}}
               disabled={!fundAmount}
               className="bg-slate-900 text-white px-3 rounded-lg hover:bg-black disabled:opacity-50 transition-colors"
             >
               <Plus size={18}/>
             </button>
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
  const [newInitial, setNewInitial] = useState(''); // <-- NOUVEAU CHAMP
  const [newAccount, setNewAccount] = useState('ldd');

  const handleCreate = () => {
    if(newLabel && newTarget) {
      addProject(newLabel, newTarget, newAccount, newInitial);
      setNewLabel(''); setNewTarget(''); setNewInitial(''); setIsCreating(false);
    }
  };

  // Calculs totaux
  const totalLDD = config.comptes.find(c=>c.id==='ldd')?.initial || 0;
  const totalCasden = config.comptes.find(c=>c.id==='casden')?.initial || 0;
  
  const assignedLDD = (config.projects || []).filter(p=>p.accountId==='ldd').reduce((sum, p)=>sum+p.current, 0);
  const assignedCasden = (config.projects || []).filter(p=>p.accountId==='casden').reduce((sum, p)=>sum+p.current, 0);

  return (
    <div className="max-w-6xl mx-auto p-4 pb-20 space-y-8">
      
      {/* HEADER */}
      <div className="bg-gradient-to-r from-indigo-900 to-purple-800 text-white p-8 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-3xl font-black flex items-center gap-3">
            <Target className="text-pink-400" size={32} /> 
            Grands Projets
          </h2>
          <p className="text-indigo-200 text-sm mt-1 font-medium">Épargne ciblée sur LDD & CASDEN</p>
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

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Compte support</label>
                <select value={newAccount} onChange={e=>setNewAccount(e.target.value)} className="w-full p-3 border rounded-xl outline-none bg-white font-bold cursor-pointer">
                  <option value="ldd">LDD Véro (Solde: {Math.round(totalLDD)}€)</option>
                  <option value="casden">Compte CASDEN (Solde: {Math.round(totalCasden)}€)</option>
                </select>
              </div>
              <div>
                 <label className="text-xs font-bold text-emerald-600 uppercase ml-1">Déjà épargné (Allocation initiale)</label>
                 <div className="flex items-center border border-emerald-200 rounded-xl px-3 bg-emerald-50 focus-within:border-emerald-500">
                   <input type="number" value={newInitial} onChange={e=>setNewInitial(e.target.value)} placeholder="0" className="w-full p-3 outline-none bg-transparent font-bold text-emerald-800" />
                   <span className="text-emerald-600 font-bold">€</span>
                 </div>
                 <p className="text-[10px] text-slate-400 mt-1 italic">Ce montant sera attribué au projet depuis le solde existant, sans débit du compte courant.</p>
              </div>
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
                <span className="block text-xs font-bold uppercase text-purple-400">Non affecté</span>
                <span className="font-black text-xl text-purple-700">{(totalLDD - assignedLDD).toLocaleString()} €</span>
              </div>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
               <div className="h-full bg-purple-500" style={{ width: `${Math.min((assignedLDD/totalLDD)*100, 100)}%` }}></div>
            </div>
            <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-1">
               <span>Affecté aux projets: {assignedLDD.toLocaleString()} €</span>
               <span>Total: {Math.round(totalLDD).toLocaleString()} €</span>
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
                <span className="block text-xs font-bold uppercase text-blue-400">Non affecté</span>
                <span className="font-black text-xl text-blue-700">{(totalCasden - assignedCasden).toLocaleString()} €</span>
              </div>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
               <div className="h-full bg-blue-500" style={{ width: `${Math.min((assignedCasden/totalCasden)*100, 100)}%` }}></div>
            </div>
            <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-1">
               <span>Affecté aux projets: {assignedCasden.toLocaleString()} €</span>
               <span>Total: {Math.round(totalCasden).toLocaleString()} €</span>
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