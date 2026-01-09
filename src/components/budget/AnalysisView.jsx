import React, { useState } from 'react';
import { useBudget } from '../../hooks/useBudget';
import { BarChart3, Plus, X, PiggyBank, Target } from 'lucide-react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar, Legend
} from 'recharts';

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
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200 border-none">
        <CardHeader className="bg-slate-900 text-white flex flex-row justify-between items-center p-4">
          <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2">
            {type === 'savings' ? <PiggyBank size={18}/> : <Target size={18}/>}
            {type === 'savings' ? 'Épargne' : 'Projet'}
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white/60 hover:text-white hover:bg-white/10" icon={X} />
        </CardHeader>
        
        <CardContent className="p-6 space-y-6">
          <div className="relative">
            <input 
              type="number" 
              autoFocus
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full text-5xl font-black p-4 text-center bg-transparent outline-none text-slate-800 placeholder:text-slate-100"
              placeholder="0"
            />
            <span className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-300 text-2xl font-black">€</span>
          </div>

          {type === 'savings' && (
            <Input 
              label="Note (Optionnel)"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Ex: Prime, Reste mois..."
            />
          )}

          {type === 'project' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Choisir le Projet</label>
                <select 
                  value={selectedProject}
                  onChange={e => setSelectedProject(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-black transition-all outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-50"
                >
                  <option value="">-- Sélectionner --</option>
                  {(config.projects || []).map(p => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Compte Cible</label>
                <select 
                  value={targetAccount}
                  onChange={e => setTargetAccount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-black transition-all outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-50"
                >
                  <option value="ldd">LDD Véro</option>
                  <option value="casden">Compte CASDEN</option>
                </select>
              </div>
            </div>
          )}

          <div className="pt-4 space-y-3">
            <Button 
              onClick={handleConfirm}
              disabled={!amount || (type === 'project' && !selectedProject)}
              className="w-full py-6 rounded-2xl text-lg"
            >
              Valider le virement
            </Button>
            <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest">
              Débit du compte courant
            </p>
          </div>
        </CardContent>
      </Card>
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
    // On ne compte que les charges fixes validées (cochées) dans la vue mensuelle
    const totalFixeValide = round(config.postes
      .filter(p => p.type === 'fixe' && mData.fixedStatus?.[p.id])
      .reduce((sum, p) => sum + (mData.depenses?.[p.id] ?? p.montant), 0));
    
    const totalEpargneFixe = round(config.epargneCibles.reduce((sum, e) => sum + e.mensuel, 0));
    const totalChargesFixes = totalFixeValide + totalEpargneFixe;
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

      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-8 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm"><BarChart3 className="text-blue-400" size={32} /></div>
          <div>
            <h2 className="text-3xl font-black">Vue Annuelle</h2>
            <p className="text-slate-400 font-medium uppercase text-[10px] tracking-widest mt-1">Pilotage Trésorerie & Reports</p>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-white/10 p-3 rounded-2xl border border-white/10">
           <span className="font-black text-xs uppercase tracking-widest opacity-60">Année</span>
           <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-transparent border-none font-black text-2xl text-white cursor-pointer rounded outline-none focus:ring-0">
             {[2025, 2026, 2027, 2028].map(y => <option key={y} value={y} className="text-black">{y}</option>)}
           </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <CardHeader className="px-0 pt-0 mb-6 bg-transparent border-none">
            <h3 className="font-black text-xs uppercase tracking-widest text-slate-400">Évolution de la Trésorerie</h3>
          </CardHeader>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={annualData}>
                <defs>
                  <linearGradient id="colorSolde" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="label" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }}
                  tickFormatter={(val) => `${val}€`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(val) => [`${val.toLocaleString()} €`, 'Solde Final']}
                />
                <Area 
                  type="monotone" 
                  dataKey="soldeFinal" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorSolde)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <CardHeader className="px-0 pt-0 mb-6 bg-transparent border-none">
            <h3 className="font-black text-xs uppercase tracking-widest text-slate-400">Revenus vs Dépenses</h3>
          </CardHeader>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={annualData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="label" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }}
                  tickFormatter={(val) => `${val}€`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                <Bar dataKey="totalRevenus" name="Revenus" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="totalSorties" name="Dépenses" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-slate-50/80 text-slate-400 font-black uppercase text-[10px] tracking-widest border-b border-slate-200">
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
              <tr className="bg-slate-100/50 font-black text-slate-900 border-y border-slate-200"><td className="p-4 sticky left-0 bg-slate-100">Total Disponible</td>{annualData.map((d, i) => { const prev = i === 0 ? initialBalance : annualData[i-1].soldeFinal; return <td key={d.monthKey} className="p-4 text-right">{round(prev + d.totalRevenus).toLocaleString()} €</td>})}</tr>
              <tr><td className="p-4 sticky left-0 bg-white">Charges Fixes (Val.) (-)</td>{annualData.map(d => <td key={d.monthKey} className="p-4 text-right text-red-400">{d.totalChargesFixes.toLocaleString()} €</td>)}</tr>
              <tr><td className="p-4 sticky left-0 bg-white">Dépenses Courantes (-)</td>{annualData.map(d => <td key={d.monthKey} className="p-4 text-right text-orange-500">{d.totalFlexibleSpent.toLocaleString()} €</td>)}</tr>
              <tr><td className="p-4 sticky left-0 bg-white">Env. Obligatoires (-)</td>{annualData.map(d => <td key={d.monthKey} className="p-4 text-right text-slate-500">{d.totalEnvObligatoires.toLocaleString()} €</td>)}</tr>
              <tr><td className="p-4 sticky left-0 bg-white">Env. Secondaires (-)</td>{annualData.map(d => <td key={d.monthKey} className="p-4 text-right text-slate-500">{d.totalEnvSecondaires.toLocaleString()} €</td>)}</tr>
              <tr><td className="p-4 sticky left-0 bg-white">Provisions N+1 (-)</td>{annualData.map(d => <td key={d.monthKey} className="p-4 text-right text-blue-500">{d.totalProvisionVirement.toLocaleString()} €</td>)}</tr>
              <tr className="bg-slate-50 font-black text-slate-800 border-t-2 border-slate-200"><td className="p-4 sticky left-0 bg-slate-50">Surplus / Déficit (Avant Alloc.)</td>{annualData.map(d => <td key={d.monthKey} className={`p-4 text-right ${d.soldeAvantAlloc >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{d.soldeAvantAlloc.toLocaleString()} €</td>)}</tr>
              
              {/* LIGNES AVEC BOUTONS D'ACTION */}
              <tr className="bg-purple-50/30">
                <td className="p-4 sticky left-0 bg-purple-50/30 text-purple-700 font-bold text-xs uppercase tracking-widest">Vers Épargne</td>
                {annualData.map(d => (
                  <td key={d.monthKey} className="p-4 text-right relative group">
                    <span className="font-black text-purple-800">{d.allocSavings > 0 ? d.allocSavings.toLocaleString() + ' €' : '-'}</span>
                    {!monthlyData[d.monthKey]?.isClosed && (
                      <button onClick={() => openModal('savings', d.monthKey)} className="absolute top-1/2 -translate-y-1/2 right-2 opacity-0 group-hover:opacity-100 bg-purple-600 text-white rounded-lg p-1 hover:scale-110 transition-all shadow-lg shadow-purple-200"><Plus size={14}/></button>
                    )}
                  </td>
                ))}
              </tr>
              <tr className="bg-indigo-50/30">
                <td className="p-4 sticky left-0 bg-indigo-50/30 text-indigo-700 font-bold text-xs uppercase tracking-widest">Vers Projets</td>
                {annualData.map(d => (
                  <td key={d.monthKey} className="p-4 text-right relative group">
                    <span className="font-black text-indigo-800">{d.allocProjects > 0 ? d.allocProjects.toLocaleString() + ' €' : '-'}</span>
                    {!monthlyData[d.monthKey]?.isClosed && (
                      <button onClick={() => openModal('project', d.monthKey)} className="absolute top-1/2 -translate-y-1/2 right-2 opacity-0 group-hover:opacity-100 bg-indigo-600 text-white rounded-lg p-1 hover:scale-110 transition-all shadow-lg shadow-indigo-200"><Plus size={14}/></button>
                    )}
                  </td>
                ))}
              </tr>

              <tr className="bg-emerald-50 border-t-2 border-emerald-100 font-black text-lg"><td className="p-4 sticky left-0 bg-emerald-50 text-emerald-800">RESTE (Report N+1)</td>{annualData.map(d => <td key={d.monthKey} className="p-4 text-right text-emerald-700">{d.soldeFinal.toLocaleString()} €</td>)}</tr>
              <tr><td className="p-4 sticky left-0 bg-white font-black text-[10px] text-slate-400 uppercase tracking-widest">Notes & Observations</td>{annualData.map(d => <td key={d.monthKey} className="p-2 min-w-[150px]"><textarea value={d.note} onChange={(e) => updateAnalysisData(d.monthKey, 'analysis_note', e.target.value)} placeholder="Ajouter une note..." rows="2" className="w-full text-[10px] p-2 rounded-xl border border-slate-100 bg-slate-50 resize-none focus:bg-white focus:border-blue-200 outline-none transition-all font-medium"/></td>)}</tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
