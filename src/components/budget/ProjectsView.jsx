import React, { useState } from 'react';
import { useBudget } from '../../hooks/useBudget';
import { Target, Plus, Trash2, PiggyBank, Coins } from 'lucide-react';
import { Card, CardHeader, CardContent, CardFooter } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import ConfirmTransferModal from './ConfirmTransferModal';

const ACCOUNT_ACCENTS = [
  'bg-purple-50 text-purple-600 border-purple-100',
  'bg-blue-50 text-blue-600 border-blue-100',
  'bg-amber-50 text-amber-600 border-amber-100',
  'bg-teal-50 text-teal-600 border-teal-100',
];

const ProjectCard = ({ project, accounts, onRequestFund, onRemove }) => {
  const [fundAmount, setFundAmount] = useState('');
  const [targetAccount, setTargetAccount] = useState(accounts[0]?.id || '');

  const allocations = project.allocations || {};
  const currentTotal = accounts.reduce((sum, a) => sum + (allocations[a.id] || 0), 0);
  const progress = project.target > 0 ? Math.min((currentTotal / project.target) * 100, 100) : 0;

  return (
    <Card className="flex flex-col h-full hover:shadow-md transition-shadow">
      <CardContent className="flex-1">
        <div className="flex justify-between items-start mb-4">
           <h3 className="font-black text-lg text-slate-800 leading-tight">{project.label}</h3>
           <Button variant="ghost" size="icon" onClick={() => {if(confirm("Supprimer ce projet ?")) onRemove(project.id)}} className="text-slate-300 hover:text-red-500">
             <Trash2 size={18}/>
           </Button>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1 font-medium">
            <span className="font-black text-emerald-600">{Math.round(currentTotal).toLocaleString()} €</span>
            <span className="text-slate-400 text-xs">Objectif : {project.target.toLocaleString()} €</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-3">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 shadow-sm" style={{ width: `${progress}%` }}></div>
          </div>
          
          <div className="flex flex-wrap gap-2 text-[10px]">
            {accounts.map((a, i) => (
              <span key={a.id} className={`px-2 py-1 rounded-lg font-bold border ${ACCOUNT_ACCENTS[i % ACCOUNT_ACCENTS.length]}`}>
                {a.label} : {(allocations[a.id] || 0).toLocaleString()}€
              </span>
            ))}
          </div>
        </div>
      </CardContent>

      <CardFooter className="bg-slate-50/80 border-t border-slate-100 p-4">
           <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Alimenter (Depuis Courant)</label>
           <div className="flex flex-col gap-2">
             <div className="flex gap-2">
                <Input 
                  type="number" 
                  placeholder="0.00" 
                  value={fundAmount} 
                  onChange={e => setFundAmount(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={() => { if(fundAmount && targetAccount) { onRequestFund(project, fundAmount, targetAccount); setFundAmount(''); }}}
                  disabled={!fundAmount || !targetAccount}
                  variant="dark"
                  icon={Plus}
                  size="icon"
                />
             </div>
             <Select 
               value={targetAccount} 
               onChange={(e) => setTargetAccount(e.target.value)}
               options={accounts.map(a => ({ value: a.id, label: `Vers ${a.label}` }))}
               className="h-8 py-1 px-2 text-[10px]"
             />
           </div>
      </CardFooter>
    </Card>
  );
};

export default function ProjectsView() {
  const { config, addProject, removeProject, fundProject } = useBudget();
  const [isCreating, setIsCreating] = useState(false);
  
  const [newLabel, setNewLabel] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [initAlloc, setInitAlloc] = useState({});
  // Pop-up de confirmation : le virement d'alimentation a-t-il réellement été effectué ?
  const [pending, setPending] = useState(null);

  // Comptes cibles issus de la configuration (plus d'identifiants codés en dur)
  const projectAccounts = (config.comptes || []).filter(c => c.type === 'epargne');

  const handleCreate = () => {
    if(newLabel && newTarget) {
      const allocations = projectAccounts.reduce(
        (acc, a) => ({ ...acc, [a.id]: parseFloat(initAlloc[a.id]) || 0 }),
        {}
      );
      addProject(newLabel, newTarget, allocations);
      setNewLabel(''); setNewTarget(''); setInitAlloc({}); setIsCreating(false);
    }
  };

  const requestFund = (project, amount, targetAccountId) => {
    const account = projectAccounts.find(a => a.id === targetAccountId);
    setPending({
      from: 'Compte Courant',
      to: `${project.label} — ${account?.label || 'Compte cible'}`,
      amount,
      note: `Alimentation du projet « ${project.label} »`,
      confirmLabel: 'Oui, le virement est fait',
      onConfirm: (date) => fundProject(project.id, amount, targetAccountId, undefined, date)
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-4 pb-20 space-y-8">

      <ConfirmTransferModal transfer={pending} onConfirm={(date) => pending?.onConfirm(date)} onClose={() => setPending(null)} />

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

      {isCreating && (
        <Card className="animate-in fade-in slide-in-from-top-4 border-indigo-100 shadow-xl">
          <CardHeader>
            <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase tracking-widest text-sm"><Target size={20} className="text-indigo-500"/> Nouveau Projet</h3>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Input label="Nom du projet" value={newLabel} onChange={e=>setNewLabel(e.target.value)} placeholder="Ex: Piscine, Voyage..." />
                <Input label="Objectif total (€)" type="number" value={newTarget} onChange={e=>setNewTarget(e.target.value)} placeholder="0" />
              </div>

              <div className="space-y-4 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Allocations Initiales</label>
                <div className="space-y-3">
                  {projectAccounts.map((a, i) => (
                    <div key={a.id} className="flex items-center gap-3">
                       <div className={`w-24 text-xs font-black uppercase tracking-tighter ${ACCOUNT_ACCENTS[i % ACCOUNT_ACCENTS.length].split(' ')[1]}`}>{a.label}</div>
                       <Input type="number" value={initAlloc[a.id] || ''} onChange={e=>setInitAlloc({ ...initAlloc, [a.id]: e.target.value })} placeholder="0" className="flex-1" />
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 italic text-center mt-4 font-medium leading-relaxed">Ces montants seront réservés sur vos comptes sans virement bancaire.</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsCreating(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={!newLabel || !newTarget} className="bg-indigo-600 shadow-indigo-200">Créer le projet</Button>
          </CardFooter>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projectAccounts.map((account, i) => {
          const total = Math.round(account.initial || 0);
          const assigned = (config.projects || []).reduce((sum, p) => sum + (p.allocations?.[account.id] || 0), 0);
          const available = total - assigned;
          const pct = total > 0 ? Math.min((assigned / total) * 100, 100) : 0;
          const accent = ACCOUNT_ACCENTS[i % ACCOUNT_ACCENTS.length];
          return (
            <Card key={account.id} className="p-5 border-slate-100">
               <div className="flex justify-between items-center mb-4">
                 <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-2xl border ${accent}`}><PiggyBank size={24}/></div>
                    <div>
                      <span className="font-black text-slate-700 block tracking-tight leading-none mb-1">{account.label}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Solde réel : {total.toLocaleString()} €</span>
                    </div>
                 </div>
                 <div className="text-right">
                   <span className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Disponible</span>
                   <span className={`font-black text-2xl ${available < 0 ? 'text-red-600' : 'text-slate-800'}`}>{available.toLocaleString()} €</span>
                 </div>
               </div>
               <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-800 rounded-full" style={{ width: `${pct}%` }}></div>
               </div>
               <div className="flex justify-between text-[10px] font-black text-slate-400 mt-2 uppercase tracking-tighter">
                  <span>Affecté : {assigned.toLocaleString()} €</span>
               </div>
            </Card>
          );
        })}
      </div>

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
          <ProjectCard key={p.id} project={p} accounts={projectAccounts} onRequestFund={requestFund} onRemove={removeProject} />
        ))}
      </div>
    </div>
  );
}
