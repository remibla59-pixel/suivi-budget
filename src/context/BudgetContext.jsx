import React, { createContext, useState, useEffect } from 'react';
import { auth, db, googleProvider } from '../lib/firebase';
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, setDoc, onSnapshot, deleteDoc } from "firebase/firestore";

export const BudgetContext = createContext();

const DEFAULT_CONFIG = {
  comptes: [
    { id: 'livretA', label: 'Livret A Véro (Précaution)', initial: 17000, type: 'epargne' },
    { id: 'ldd', label: 'LDD Véro', initial: 11600, type: 'epargne' },
    { id: 'casden', label: 'Compte CASDEN', initial: 0, type: 'epargne' },
    { id: 'livretRemi', label: 'Livret A Rémi (Provisions)', initial: 2000, type: 'provision' },
    { id: 'courant', label: 'Compte Courant', initial: 500, type: 'courant' },
  ],
  // NOUVEAU : Les 4 colonnes flexibles (Débit direct compte courant)
  budgetsFlexibles: [
    { id: 'flex_courses', label: 'Courses', budget: 900 },
    { id: 'flex_animaux', label: 'Animaux', budget: 100 },
    { id: 'flex_carbu', label: 'Carburant / Péage', budget: 150 },
    { id: 'flex_autres', label: 'Autres Achats', budget: 100 },
  ],
  // Enveloppes classiques (Cagnottes)
  envelopes: [
    { id: 'env_loisirs', label: 'Loisirs / Resto', category: 'secondaire', budgetMonthly: 100, currentBalance: 0 },
    { id: 'env_cadeaux', label: 'Cadeaux', category: 'secondaire', budgetMonthly: 50, currentBalance: 0 },
  ],
  projects: [], 
  provisionsByYear: { "2026": [] },
  postes: [{ id: 'p1', label: 'Prêt Immo', type: 'fixe', montant: 880 }],
  epargneCibles: [{ id: 'ep1', label: 'Camping Car', objectif: 30000, mensuel: 1000 }],
  provisionAccountId: 'livretRemi',
  savingsAccountId: 'livretA',
  savingsHistory: [] 
};

export const BudgetProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [monthlyData, setMonthlyData] = useState({});

  // --- AUTH & SYNC ---
  useEffect(() => { const u = onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); }); return () => u(); }, []);
  useEffect(() => { if (!user) return; const unsub = onSnapshot(doc(db, "budget_2026", user.uid), (s) => { if(s.exists()) { const d=s.data(); setConfig({...DEFAULT_CONFIG, ...d.config}); setMonthlyData(d.monthlyData||{}); } else saveData(DEFAULT_CONFIG, {}); }); return () => unsub(); }, [user]);
  const saveData = async (c, d) => { if (!user) return; await setDoc(doc(db, "budget_2026", user.uid), { config: c, monthlyData: d }, { merge: true }); };
  const login = () => signInWithPopup(auth, googleProvider); const logout = () => signOut(auth);
  const resetAllData = async () => { if (user && window.confirm("Tout effacer ?")) await deleteDoc(doc(db, "budget_2026", user.uid)); window.location.reload(); };

  // --- HELPER COMPTES ---
  const updateAccountInitial = (id, v) => { const n={...config, comptes:config.comptes.map(c=>c.id===id?{...c, initial:parseFloat(v)||0}:c)}; setConfig(n); saveData(n, monthlyData); };

  // --- NOUVEAU : GESTION DES BUDGETS FLEXIBLES (COURSES, ETC.) ---
  const updateFlexibleBudget = (id, newBudget) => {
    const n = { ...config, budgetsFlexibles: config.budgetsFlexibles.map(b => b.id === id ? { ...b, budget: parseFloat(newBudget) || 0 } : b) };
    setConfig(n); saveData(n, monthlyData);
  };

  const addFlexibleExpense = (monthKey, catId, label, amount) => {
    const mData = monthlyData[monthKey] || {};
    if (mData.isClosed) return;
    const val = parseFloat(amount) || 0;
    
    // 1. Débit direct du Compte Courant
    const updatedComptes = config.comptes.map(c => c.type === 'courant' ? { ...c, initial: c.initial - val } : c);
    
    // 2. Ajout de la dépense dans l'historique mensuel
    const newItem = { id: Date.now(), catId, label, amount: val };
    const newMData = { 
      ...monthlyData, 
      [monthKey]: { 
        ...mData, 
        flexibleExpenses: [...(mData.flexibleExpenses || []), newItem] 
      } 
    };

    const newConfig = { ...config, comptes: updatedComptes };
    setConfig(newConfig); setMonthlyData(newMData); saveData(newConfig, newMData);
  };

  const removeFlexibleExpense = (monthKey, expenseId, amount) => {
    const mData = monthlyData[monthKey];
    if (mData.isClosed) return;
    const val = parseFloat(amount) || 0;

    // 1. Re-crédit du Compte Courant
    const updatedComptes = config.comptes.map(c => c.type === 'courant' ? { ...c, initial: c.initial + val } : c);

    // 2. Suppression de la dépense
    const newMData = { 
      ...monthlyData, 
      [monthKey]: { 
        ...mData, 
        flexibleExpenses: (mData.flexibleExpenses || []).filter(e => e.id !== expenseId) 
      } 
    };

    const newConfig = { ...config, comptes: updatedComptes };
    setConfig(newConfig); setMonthlyData(newMData); saveData(newConfig, newMData);
  };

  // --- GESTION PROJETS ---
  const addProject = (label, target, accountId, initialAllocation) => {
    const startAmount = parseFloat(initialAllocation) || 0;
    const newProject = { id: Date.now().toString(), label, target: parseFloat(target), current: startAmount, accountId };
    const n = { ...config, projects: [...(config.projects || []), newProject] };
    setConfig(n); saveData(n, monthlyData);
  };
  const removeProject = (id) => { const n = { ...config, projects: (config.projects || []).filter(p => p.id !== id) }; setConfig(n); saveData(n, monthlyData); };
  const fundProject = (projectId, amount) => {
    const val = parseFloat(amount) || 0;
    const project = (config.projects || []).find(p => p.id === projectId);
    if (!project) return;
    const updatedComptes = config.comptes.map(c => {
      if (c.type === 'courant') return { ...c, initial: c.initial - val };
      if (c.id === project.accountId) return { ...c, initial: c.initial + val };
      return c;
    });
    const updatedProjects = config.projects.map(p => p.id === projectId ? { ...p, current: p.current + val } : p);
    const n = { ...config, comptes: updatedComptes, projects: updatedProjects };
    setConfig(n); saveData(n, monthlyData);
  };

  // --- FONCTIONS EXISTANTES (EPARGNE, ENVELOPPES, PROVISIONS) ---
  const transferToSavings=(a,n)=>{const v=parseFloat(a)||0;const uC=config.comptes.map(c=>{if(c.type==='courant')return{...c,initial:c.initial-v};if(c.id===config.savingsAccountId)return{...c,initial:c.initial+v};return c;});const h={id:Date.now(),date:new Date().toLocaleDateString(),type:'depot',amount:v,note:n||'Virement'};const nc={...config,comptes:uC,savingsHistory:[h,...(config.savingsHistory||[])].slice(0,50)};setConfig(nc);saveData(nc,monthlyData);};
  const retrieveFromSavings=(a,n)=>{const v=parseFloat(a)||0;const uC=config.comptes.map(c=>{if(c.type==='courant')return{...c,initial:c.initial+v};if(c.id===config.savingsAccountId)return{...c,initial:c.initial-v};return c;});const h={id:Date.now(),date:new Date().toLocaleDateString(),type:'retrait',amount:v,note:n||'Retrait'};const nc={...config,comptes:uC,savingsHistory:[h,...(config.savingsHistory||[])].slice(0,50)};setConfig(nc);saveData(nc,monthlyData);};
  
  const updateConfigPoste = (p) => { const n={...config, postes:config.postes.map(x=>x.id===p.id?p:x)}; setConfig(n); saveData(n, monthlyData); };
  const addConfigPoste = (t) => { const n={...config, postes:[...config.postes, {id:Date.now().toString(), label:'Nouveau', type:t, montant:0}]}; setConfig(n); saveData(n, monthlyData); };
  const removeConfigPoste = (id) => { const n={...config, postes:config.postes.filter(x=>x.id!==id)}; setConfig(n); saveData(n, monthlyData); };
  const setProvisionAccount = (id) => { const n={...config, provisionAccountId:id}; setConfig(n); saveData(n, monthlyData); };
  
  const updateEnvelopeConfig=(e)=>{const n={...config, envelopes:config.envelopes.map(x=>x.id===e.id?e:x)};setConfig(n);saveData(n, monthlyData);};
  const addEnvelopeConfig=(c)=>{const n={...config, envelopes:[...config.envelopes, {id:Date.now().toString(), label:'Nouvelle', category:c, budgetMonthly:0, currentBalance:0}]};setConfig(n);saveData(n, monthlyData);};
  const removeEnvelopeConfig=(id)=>{const n={...config, envelopes:config.envelopes.filter(x=>x.id!==id)};setConfig(n);saveData(n, monthlyData);};
  const fundEnvelope=(mk,eid)=>{const m=monthlyData[mk]||{}; if(m.isClosed||m[`funded_${eid}`])return; const env=config.envelopes.find(e=>e.id===eid); if(!env)return; const uC=config.comptes.map(c=>c.type==='courant'?{...c, initial:c.initial-env.budgetMonthly}:c); const uE=config.envelopes.map(e=>e.id===eid?{...e, currentBalance:e.currentBalance+env.budgetMonthly}:e); const nM={...monthlyData,[mk]:{...m,[`funded_${eid}`]:true}}; const nC={...config,comptes:uC,envelopes:uE}; setConfig(nC); setMonthlyData(nM); saveData(nC, nM);};
  const spendEnvelope=(mk,eid,l,a)=>{const m=monthlyData[mk]||{}; if(m.isClosed)return; const v=parseFloat(a)||0; const i={id:Date.now(), envId:eid, label:l, amount:v}; const uE=config.envelopes.map(e=>e.id===eid?{...e, currentBalance:e.currentBalance-v}:e); const nM={...monthlyData,[mk]:{...m,envelopeExpenses:[...(m.envelopeExpenses||[]),i]}}; const nC={...config,envelopes:uE}; setConfig(nC); setMonthlyData(nM); saveData(nC, nM);};
  const removeEnvelopeExpense=(mk,xid,eid,a)=>{const m=monthlyData[mk]; if(m.isClosed)return; const v=parseFloat(a)||0; const uE=config.envelopes.map(e=>e.id===eid?{...e, currentBalance:e.currentBalance+v}:e); const nM={...monthlyData,[mk]:{...m,envelopeExpenses:(m.envelopeExpenses||[]).filter(e=>e.id!==xid)}}; const nC={...config,envelopes:uE}; setConfig(nC); setMonthlyData(nM); saveData(nC, nM);};
  
  const addProvisionItem=(y)=>{const n={...config, provisionsByYear:{...config.provisionsByYear, [y]:[...(config.provisionsByYear[y]||[]), {id:Date.now().toString(), label:'Nouvelle', amount:0, spent:0, history:[]}]}}; setConfig(n); saveData(n, monthlyData);};
  const updateProvisionItem=(y,i)=>{const n={...config, provisionsByYear:{...config.provisionsByYear, [y]:(config.provisionsByYear[y]||[]).map(p=>p.id===i.id?i:p)}}; setConfig(n); saveData(n, monthlyData);};
  const removeProvisionItem=(y,id)=>{const n={...config, provisionsByYear:{...config.provisionsByYear, [y]:(config.provisionsByYear[y]||[]).filter(p=>p.id!==id)}}; setConfig(n); saveData(n, monthlyData);};
  const toggleMonthlyProvision=(mk,a)=>{const m=monthlyData[mk]||{}; if(m.isClosed)return; const s=!m.provisionDone; const uC=config.comptes.map(c=>c.id===config.provisionAccountId?{...c, initial:s?c.initial+a:c.initial-a}:c); const nM={...monthlyData,[mk]:{...m,provisionDone:s}}; const nC={...config,comptes:uC}; setConfig(nC); setMonthlyData(nM); saveData(nC, nM);};
  const addProvisionExpense=(mk,pid,l,a)=>{const m=monthlyData[mk]||{}; if(m.isClosed)return; const v=parseFloat(a)||0; const i={id:Date.now(), provisionId:pid, label:l, amount:v, date:mk}; const uC=config.comptes.map(c=>c.id===config.provisionAccountId?{...c, initial:c.initial-v}:c); const y=mk.split('-')[0]; const uP=(config.provisionsByYear[y]||[]).map(p=>p.id===pid?{...p, spent:(p.spent||0)+v, history:[...(p.history||[]), i]}:p); const nM={...monthlyData,[mk]:{...m, provisionExpenses:[...(m.provisionExpenses||[]), i]}}; const nC={...config, comptes:uC, provisionsByYear:{...config.provisionsByYear, [y]:uP}}; setConfig(nC); setMonthlyData(nM); saveData(nC, nM);};
  const removeProvisionExpense=(mk,eid,a,pid)=>{const m=monthlyData[mk]; if(m.isClosed)return; const v=parseFloat(a)||0; const uC=config.comptes.map(c=>c.id===config.provisionAccountId?{...c, initial:c.initial+v}:c); const y=mk.split('-')[0]; const uP=(config.provisionsByYear[y]||[]).map(p=>p.id===pid?{...p, spent:(p.spent||0)-v, history:(p.history||[]).filter(h=>h.id!==eid)}:p); const nM={...monthlyData,[mk]:{...m, provisionExpenses:(m.provisionExpenses||[]).filter(e=>e.id!==eid)}}; const nC={...config, comptes:uC, provisionsByYear:{...config.provisionsByYear, [y]:uP}}; setConfig(nC); setMonthlyData(nM); saveData(nC, nM);};
  
  const addIncomeLine=(mk)=>{const m={...monthlyData,[mk]:{...(monthlyData[mk]||{}), revenusList:[...(monthlyData[mk]?.revenusList||[]),{id:Date.now(),label:'Nouveau',montant:0}]}}; setMonthlyData(m); saveData(config, m);};
  const updateIncomeLine=(mk,id,f,v)=>{const m={...monthlyData,[mk]:{...monthlyData[mk], revenusList:monthlyData[mk].revenusList.map(i=>i.id===id?{...i,[f]:f==='montant'?parseFloat(v)||0:v}:i)}}; setMonthlyData(m); saveData(config, m);};
  const removeIncomeLine=(mk,id)=>{const m={...monthlyData,[mk]:{...monthlyData[mk], revenusList:monthlyData[mk].revenusList.filter(i=>i.id!==id)}}; setMonthlyData(m); saveData(config, m);};
  const updateFixedExpense=(mk,pid,v)=>{if(monthlyData[mk]?.isClosed)return; const mD={...monthlyData,[mk]:{...(monthlyData[mk]||{}), depenses:{...(monthlyData[mk]?.depenses||{}),[pid]:parseFloat(v)||0}}}; setMonthlyData(mD); saveData(config, mD);};
  const toggleFixedCheck=(mk,pid)=>{if(monthlyData[mk]?.isClosed)return; const mD={...monthlyData,[mk]:{...monthlyData[mk], fixedStatus:{...(monthlyData[mk]?.fixedStatus||{}),[pid]:!monthlyData[mk]?.fixedStatus?.[pid]}}}; setMonthlyData(mD); saveData(config, mD);};
  
  const reopenMonth=(mk)=>{const mD={...monthlyData,[mk]:{...monthlyData[mk], isClosed:false}}; setMonthlyData(mD); saveData(config, mD);};
  const validateMonth = (monthKey) => {
    const mData = monthlyData[monthKey] || {};
    if (mData.isClosed) return;
    let newConfig = { ...config };
    const [year, month] = monthKey.split('-').map(Number);
    if (month === 12) { newConfig.envelopes = config.envelopes.map(e => ({ ...e, currentBalance: 0 })); }
    const newMonthlyData = { ...monthlyData, [monthKey]: { ...mData, isClosed: true } };
    setMonthlyData(newMonthlyData); setConfig(newConfig); saveData(newConfig, newMonthlyData);
    const nextMonth = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`;
    return nextMonth;
  };

  return (
    <BudgetContext.Provider value={{ 
      user, loading, login, logout, config, monthlyData, 
      updateConfigPoste, addConfigPoste, removeConfigPoste, updateAccountInitial, setProvisionAccount,
      addIncomeLine, updateIncomeLine, removeIncomeLine, updateFixedExpense, toggleFixedCheck,
      validateMonth, reopenMonth, resetAllData,
      addProvisionItem, updateProvisionItem, removeProvisionItem, toggleMonthlyProvision, addProvisionExpense, removeProvisionExpense,
      updateEnvelopeConfig, addEnvelopeConfig, removeEnvelopeConfig, fundEnvelope, spendEnvelope, removeEnvelopeExpense,
      transferToSavings, retrieveFromSavings,
      addProject, removeProject, fundProject,
      // Nouveaux exports pour les budgets flexibles
      updateFlexibleBudget, addFlexibleExpense, removeFlexibleExpense
    }}>
      {children}
    </BudgetContext.Provider>
  );
};