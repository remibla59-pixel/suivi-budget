import React, { useState } from 'react';
import { useBudget } from '../../hooks/useBudget';
import { Target, Plus, Trash2, TrendingUp, PiggyBank } from 'lucide-react';

const ProjectCard = ({ project, onFund, onRemove }) => {
  const [fundAmount, setFundAmount] = useState('');
  const progress = Math.min((project.current / project.target) * 100, 100);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
           <div>
             <h3 className="font-black text-lg text-slate-800">{project.label}</h3>
             <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-1 rounded">
               Compte : {project.accountId === 'ldd' ? 'LDD Véro' : 'CASDEN'}
             </span>
           </div>
           <button onClick={() => {if(confirm("Supprimer ce projet ?")) onRemove(project.id)}} className="text-slate-300 hover:text-red-500">
             <Trash2 size={18}/>
           </button>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="font-bold text-emerald-600">{project.current.toLocaleString()} €</span>
            <span className="text-slate-500">Obj: {project.target.toLocaleString()} €</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500" style={{ width: `${progress}%` }}></div>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
           <input 
             type="number" 
             placeholder="Montant" 
             value={fundAmount} 
             onChange={e => setFundAmount(e.target.value)}
             className="w-full p-2 text-sm border rounded-lg outline-none focus:border-blue-400"
           />
           <button 
             onClick={() => { if(fundAmount) { onFund(project.id, fundAmount); setFundAmount(''); }}}
             disabled={!fundAmount}
             className="bg-slate-900 text-white px-3 rounded-lg hover:bg-black disabled:opacity-50"
           >
             <Plus size={18}/>
           </button>
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
  const [newAccount, setNewAccount] = useState('ldd');

  const handleCreate = () => {
    if(newLabel && newTarget) {
      addProject(newLabel, newTarget, newAccount);
      setNewLabel(''); setNewTarget(''); setIsCreating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 pb-20 space-y-8">
      
      {/* HEADER */}
      <div className="bg-gradient-to-r from-indigo-900 to-purple-800 text-white p-8 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-3xl font-black flex items-center gap-3">
            <Target className="text-pink-400" size={32} /> 
            Grands Projets
          </h2>
          <p className="text-indigo-200 text-sm mt-1">Épargne ciblée sur LDD & CASDEN</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)} 
          className="bg-white/10 backdrop-blur-md border border-white/20 px-6 py-3 rounded-xl font-bold hover:bg-white hover:text-indigo-900 transition-all flex items-center gap-2"
        >
          <Plus size={20}/> Nouveau Projet
        </button>
      </div>

      {/* FORMULAIRE DE CREATION */}
      {isCreating && (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-indigo-100 animate-in fade-in slide-in-from-top-4">
          <h3 className="font-bold text-slate-800 mb-4">Créer un nouvel objectif</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <input value={newLabel} onChange={e=>setNewLabel(e.target.value)} placeholder="Nom du projet (ex: Piscine)" className="p-3 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-200" />
            <div className="flex items-center border rounded-xl px-3 bg-white">
               <input type="number" value={newTarget} onChange={e=>setNewTarget(e.target.value)} placeholder="Objectif (€)" className="w-full p-3 outline-none" />
               <span className="text-slate-400 font-bold">€</span>
            </div>
            <select value={newAccount} onChange={e=>setNewAccount(e.target.value)} className="p-3 border rounded-xl outline-none bg-white">
              <option value="ldd">LDD Véro</option>
              <option value="casden">Compte CASDEN</option>
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setIsCreating(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg">Annuler</button>
            <button onClick={handleCreate} disabled={!newLabel || !newTarget} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50">Créer le projet</button>
          </div>
        </div>
      )}

      {/* LISTE DES PROJETS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(config.projects || []).length === 0 && !isCreating && (
          <div className="col-span-full text-center py-12 text-slate-400 italic">
            Aucun projet en cours. Lancez-vous !
          </div>
        )}
        {(config.projects || []).map(p => (
          <ProjectCard key={p.id} project={p} onFund={fundProject} onRemove={removeProject} />
        ))}
      </div>

      {/* COMPTES SUPPORTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 pt-8 border-t border-slate-200">
         <div className="bg-white p-4 rounded-xl flex items-center justify-between border border-slate-100">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-purple-50 rounded-lg"><PiggyBank size={20} className="text-purple-600"/></div>
               <span className="font-bold text-slate-700">LDD Véro</span>
            </div>
            <span className="font-mono font-bold text-purple-700">{config.comptes.find(c=>c.id==='ldd')?.initial.toLocaleString()} €</span>
         </div>
         <div className="bg-white p-4 rounded-xl flex items-center justify-between border border-slate-100">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-blue-50 rounded-lg"><TrendingUp size={20} className="text-blue-600"/></div>
               <span className="font-bold text-slate-700">CASDEN</span>
            </div>
            <span className="font-mono font-bold text-blue-700">{config.comptes.find(c=>c.id==='casden')?.initial.toLocaleString()} €</span>
         </div>
      </div>
    </div>
  );
}