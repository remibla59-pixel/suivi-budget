import React, { useState } from 'react';
import { useBudget } from '../../hooks/useBudget';
import { BarChart3, Plus, X, PiggyBank, Target, Scale } from 'lucide-react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import ConfirmTransferModal from './ConfirmTransferModal';
import BalanceAdjustModal from './BalanceAdjustModal';
import { LABELS } from '../../lib/budgetMeta';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar, Legend
} from 'recharts';

const round = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

// CARTE « SOLDE RÉEL » : le solde suivi peut être rapproché du relevé bancaire (daté + confirmé)
const SoldeReelCard = ({ account, onAdjust, accent }) => {
  if (!account) return null;
  const solde = round(account.initial || 0);
  return (
    <div className={`flex-1 min-w-[220px] bg-white border rounded-2xl p-4 shadow-sm ${accent.border}`}>
      <div className={`text-[10px] font-black uppercase tracking-widest ${accent.label}`}>
        {LABELS.realBalance} — {account.label}
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className={`text-2xl font-black ${accent.value}`}>{solde.toLocaleString('fr-FR')} €</div>
        <button
          onClick={() => onAdjust(account.id)}
          title="Rapprocher avec mon relevé bancaire"
          className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 border border-slate-200 hover:border-blue-200 rounded-lg px-2 py-1 transition-colors"
        >
          <Scale size={12} /> Ajuster
        </button>
      </div>
    </div>
  );
};

// MODALE POUR AJOUTER UNE ALLOCATION (EPARGNE OU PROJET)
const AllocationModal = ({ isOpen, onClose, type, monthKey, onRequestTransfer }) => {
  const { config } = useBudget();
  const projectAccounts = (config.comptes || []).filter(c => c.type === 'epargne');
  const currentAccount = (config.comptes || []).find(c => c.type === 'courant') || { initial: 0 };
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState(''); // Pour épargne
  const [selectedProject, setSelectedProject] = useState(''); // Pour projets
  const [targetAccount, setTargetAccount] = useState(projectAccounts[0]?.id || ''); // Pour projets

  if (!isOpen) return null;

  // Étape 1 : on prépare le virement. L'étape 2 (pop-up) confirme que l'opération est réellement passée en banque.
  const handleConfirm = () => {
    if (!amount) return;
    if (type === 'project' && !selectedProject) return;

    onRequestTransfer({ type, amount, note, monthKey, projectId: selectedProject, targetAccountId: targetAccount });

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
                  {projectAccounts.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="pt-4 space-y-3">
            <div className="text-[10px] text-center font-bold text-slate-400 uppercase tracking-widest">
              Solde du compte courant : <span className="text-slate-600">{Math.round(currentAccount.initial || 0).toLocaleString()} €</span>
            </div>
            <Button 
              onClick={handleConfirm}
              disabled={!amount || (type === 'project' && !selectedProject)}
              className="w-full py-6 rounded-2xl text-lg"
            >
              Valider le virement
            </Button>
            <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest">
              Une confirmation « virement effectué » vous sera demandée
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default function AnalysisView() {
  const { config, monthlyData, updateAnalysisData, transferToSavings, fundProject, setOpeningBalance, adjustRealBalance } = useBudget();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  // Solde de départ persisté (il était auparavant perdu à chaque rechargement)
  const initialBalance = config.openingBalances?.[selectedYear] || 0;
  
  // State pour la modale
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('savings'); // 'savings' or 'project'
  const [modalMonth, setModalMonth] = useState('');
  const [pending, setPending] = useState(null);
  const [balanceTarget, setBalanceTarget] = useState(null);

  const compteCourant = (config.comptes || []).find(c => c.type === 'courant');
  const compteProv = (config.comptes || []).find(c => c.id === config.provisionAccountId);
  const compteEpargne = (config.comptes || []).find(c => c.id === config.savingsAccountId);

  const openBalanceAdjust = (accountId) => {
    const account = (config.comptes || []).find(c => c.id === accountId);
    // `openedAt` sert de clé de remontage : le formulaire repart d'un état propre à chaque ouverture
    if (account) setBalanceTarget({ ...account, openedAt: Date.now() });
  };

  const openModal = (type, monthKey) => {
    setModalType(type);
    setModalMonth(monthKey);
    setModalOpen(true);
  };

  // Pop-up de confirmation : le virement a-t-il réellement été effectué ?
  const requestTransfer = ({ type, amount, note, monthKey, projectId, targetAccountId }) => {
    const project = (config.projects || []).find(p => p.id === projectId);
    const to = type === 'savings' ? (compteEpargne?.label || LABELS.savings) : (project?.label || 'Projet');
    setPending({
      from: 'Compte Courant', to, amount,
      note: note || `Virement ${monthKey}`,
      confirmLabel: 'Oui, le virement est fait',
      onConfirm: (date) => type === 'savings'
        ? transferToSavings(amount, note, monthKey, date)
        : fundProject(projectId, amount, targetAccountId, monthKey, date)
    });
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

    // DÉPENSES : uniquement les charges fixes réellement payées (cochées dans la vue mensuelle).
    // Correction du bug des 1 000 € : plus aucune cible d'épargne fantôme n'est ajoutée ici.
    const totalFixeValide = round(config.postes
      .filter(p => p.type === 'fixe' && mData.fixedStatus?.[p.id])
      .reduce((sum, p) => sum + (mData.depenses?.[p.id] ?? p.montant), 0));
    const totalChargesFixes = totalFixeValide;
    const totalFlexibleSpent = round((mData.flexibleExpenses || []).reduce((sum, e) => sum + e.amount, 0));
    const totalEnvObligatoires = config.envelopes.filter(e => e.category === 'courant').reduce((sum, env) => sum + (mData[`funded_${env.id}`] ? env.budgetMonthly : 0), 0);
    const totalEnvSecondaires = config.envelopes.filter(e => e.category === 'secondaire').reduce((sum, env) => sum + (mData[`funded_${env.id}`] ? env.budgetMonthly : 0), 0);
    
    const nextYear = String(parseInt(selectedYear) + 1);
    const provisionsNextYear = config.provisionsByYear?.[nextYear] || [];
    const monthlyProvisionAmount = Math.round(round(provisionsNextYear.reduce((sum, p) => sum + (p.amount || 0), 0)) / 12);
    const totalProvisionVirement = mData.provisionDone ? (mData.provisionAmount ?? monthlyProvisionAmount) : 0;

    const totalSorties = round(totalChargesFixes + totalFlexibleSpent + totalEnvObligatoires + totalEnvSecondaires + totalProvisionVirement);
    const soldeAvantAlloc = round(carryOver + totalRevenus - totalSorties);

    // ALLOCATIONS CALCULÉES (SOMME DES TRANSACTIONS ENREGISTRÉES CE MOIS)
    const allocationsList = mData.allocationsList || [];
    // Net des dépôts et des retraits d'épargne du mois
    const allocSavings = round(
      allocationsList.filter(a => a.type === 'savings').reduce((sum, a) => sum + a.amount, 0) -
      allocationsList.filter(a => a.type === 'savings_out').reduce((sum, a) => sum + a.amount, 0)
    );
    const allocProjects = round(allocationsList.filter(a => a.type === 'project').reduce((sum, a) => sum + a.amount, 0));

    // AJUSTEMENTS DU SOLDE RÉEL : écarts de rapprochement bancaire du mois (datés)
    const totalAdjustments = round((mData.balanceAdjustments || []).reduce((sum, a) => sum + (a.delta || 0), 0));

    const note = mData.analysis_note || '';
    const soldeFinal = round(soldeAvantAlloc - allocSavings - allocProjects + totalAdjustments);
    carryOver = soldeFinal;

    return {
      monthKey, label: m.label,
      totalRevenus, totalChargesFixes, totalFlexibleSpent, totalEnvObligatoires, totalEnvSecondaires, totalProvisionVirement, totalSorties,
      soldeAvantAlloc, allocSavings, allocProjects, totalAdjustments, soldeFinal, note
    };
  });

  return (
    <div className="max-w-full mx-auto p-4 pb-20 space-y-8 overflow-x-hidden">
      <AllocationModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        type={modalType} 
        monthKey={modalMonth}
        onRequestTransfer={requestTransfer}
      />

      <ConfirmTransferModal transfer={pending} onConfirm={(date) => pending?.onConfirm(date)} onClose={() => setPending(null)} />

      <BalanceAdjustModal
        key={balanceTarget?.openedAt}
        account={balanceTarget}
        history={(config.balanceAdjustments || []).filter(a => a.accountId === balanceTarget?.id)}
        onConfirm={(value, date, note) => adjustRealBalance(balanceTarget.id, value, date, note)}
        onClose={() => setBalanceTarget(null)}
      />

      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-8 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm"><BarChart3 className="text-blue-400" size={32} /></div>
          <div>
            <h2 className="text-3xl font-black">{LABELS.annual}</h2>
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

      {/* SOLDES RÉELS (comptes) — rapprochables avec le relevé bancaire */}
      <div className="flex flex-wrap gap-3">
        <SoldeReelCard account={compteCourant} onAdjust={openBalanceAdjust} accent={{ border: 'border-slate-200', label: 'text-slate-400', value: 'text-slate-800' }} />
        <SoldeReelCard account={compteProv} onAdjust={openBalanceAdjust} accent={{ border: 'border-blue-100', label: 'text-blue-400', value: 'text-blue-800' }} />
        <SoldeReelCard account={compteEpargne} onAdjust={openBalanceAdjust} accent={{ border: 'border-emerald-100', label: 'text-emerald-500', value: 'text-emerald-700' }} />
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
                {annualData.map((d, i) => <td key={d.monthKey} className="p-4 text-right font-bold text-blue-600">{i === 0 ? <div className="flex items-center justify-end gap-1" title="Enregistré automatiquement"><input type="number" value={initialBalance} onChange={(e) => setOpeningBalance(selectedYear, e.target.value)} className="w-16 bg-white border border-blue-200 rounded px-1 text-right text-xs" /><span>€</span></div> : <span>{round(annualData[i-1].soldeFinal).toLocaleString()} €</span>}</td>)}
              </tr>
              <tr><td className="p-4 sticky left-0 bg-white font-bold">Total Revenus (+)</td>{annualData.map(d => <td key={d.monthKey} className="p-4 text-right text-emerald-600 font-bold">{d.totalRevenus.toLocaleString()} €</td>)}</tr>
              <tr className="bg-slate-100/50 font-black text-slate-900 border-y border-slate-200"><td className="p-4 sticky left-0 bg-slate-100">Total Disponible</td>{annualData.map((d, i) => { const prev = i === 0 ? initialBalance : annualData[i-1].soldeFinal; return <td key={d.monthKey} className="p-4 text-right">{round(prev + d.totalRevenus).toLocaleString()} €</td>})}</tr>
              <tr><td className="p-4 sticky left-0 bg-white">{LABELS.fixed} payées (-)</td>{annualData.map(d => <td key={d.monthKey} className="p-4 text-right text-red-400">{d.totalChargesFixes.toLocaleString()} €</td>)}</tr>
              <tr><td className="p-4 sticky left-0 bg-white">{LABELS.flexible} (-)</td>{annualData.map(d => <td key={d.monthKey} className="p-4 text-right text-orange-500">{d.totalFlexibleSpent.toLocaleString()} €</td>)}</tr>
              <tr><td className="p-4 sticky left-0 bg-white">{LABELS.envelopesObligatoires} (-)</td>{annualData.map(d => <td key={d.monthKey} className="p-4 text-right text-slate-500">{d.totalEnvObligatoires.toLocaleString()} €</td>)}</tr>
              <tr><td className="p-4 sticky left-0 bg-white">{LABELS.envelopesSecondaires} (-)</td>{annualData.map(d => <td key={d.monthKey} className="p-4 text-right text-slate-500">{d.totalEnvSecondaires.toLocaleString()} €</td>)}</tr>
              <tr><td className="p-4 sticky left-0 bg-white">{LABELS.provisions} (-)</td>{annualData.map(d => <td key={d.monthKey} className="p-4 text-right text-blue-500">{d.totalProvisionVirement.toLocaleString()} €</td>)}</tr>
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

              <tr className="bg-amber-50/50">
                <td className="p-4 sticky left-0 bg-amber-50/50 text-amber-700 font-bold text-xs uppercase tracking-widest">Ajustements {LABELS.realBalance} (±)</td>
                {annualData.map(d => (
                  <td key={d.monthKey} className="p-4 text-right">
                    <span className={`font-black ${d.totalAdjustments > 0 ? 'text-emerald-600' : d.totalAdjustments < 0 ? 'text-red-500' : 'text-slate-300'}`}>
                      {d.totalAdjustments ? `${d.totalAdjustments > 0 ? '+' : ''}${d.totalAdjustments.toLocaleString()} €` : '-'}
                    </span>
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
