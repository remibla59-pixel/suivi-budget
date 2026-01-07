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
  envelopes: [
    { id: 'env_courses', label: 'Courses', category: 'courant', budgetMonthly: 400, currentBalance: 0 },
    { id: 'env_animaux', label: 'Animaux', category: 'courant', budgetMonthly: 100, currentBalance: 0 },
    { id: 'env_carbu', label: 'Carburant / Péage', category: 'courant', budgetMonthly: 150, currentBalance: 0 },
    { id: 'env_autres', label: 'Autres Achats', category: 'courant', budgetMonthly: 100, currentBalance: 0 },
  ],
  projects: [], // NOUVEAU : Grands Projets
  provisionsByYear: { "2026": [] },
  postes: [
    { id: 'p1', label: 'Prêt Immo', type: 'fixe', montant: 880 },
  ],
  epargneCibles: [
    { id: 'ep1', label: 'Camping Car', objectif: 30000, mensuel: 1000 }
  ],
  provisionAccountId: 'livretRemi',
  savingsAccountId: 'livretA',
  savingsHistory: [] // Historique épargne précaution
};

export const BudgetProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [monthlyData, setMonthlyData] = useState({});

  // --- AUTH & SYNC ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const docRef = doc(db, "budget_2026", user.uid);
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setConfig({ ...DEFAULT_CONFIG, ...d.config });
        setMonthlyData(d.monthlyData || {});
      } else {
        saveData(DEFAULT_CONFIG, {});
      }
    });
    return () => unsub();
  }, [user]);

  const saveData = async (newConfig, newMonthlyData) => {
    if (!user) return;
    await setDoc(doc(db, "budget_2026", user.uid), { config: newConfig, monthlyData: newMonthlyData }, { merge: true });
  };

  const login = () => signInWithPopup(auth, googleProvider);
  const logout = () => signOut(auth);
  
  const resetAllData = async () => {
    if (!user) return;
    if (window.confirm("⚠️ ATTENTION : Tout effacer ? Action irréversible.")) {
      await deleteDoc(doc(db, "budget_2026", user.uid));
      window.location.reload();
    }
  };

  // --- GESTION DES PROJETS (LDD/CASDEN) ---
  const addProject = (label, target, accountId) => {
    const newProject = { id: Date.now().toString(), label, target: parseFloat(target), current: 0, accountId };
    const n = { ...config, projects: [...(config.projects || []), newProject] };
    setConfig(n); saveData(n, monthlyData);
  };

  const removeProject = (id) => {
    const n = { ...config, projects: (config.projects || []).filter(p => p.id !== id) };
    setConfig(n); saveData(n, monthlyData);
  };

  const fundProject = (projectId, amount) => {
    const val = parseFloat(amount) || 0;
    const project = (config.projects || []).find(p => p.id === projectId);
    if (!project) return;

    // Mouvement : Courant -> Compte Cible (LDD ou CASDEN)
    const updatedComptes = config.comptes.map(c => {
      if (c.type === 'courant') return { ...c, initial: c.initial - val };
      if (c.id === project.accountId) return { ...c, initial: c.initial + val };
      return c;
    });

    const updatedProjects = config.projects.map(p => 
      p.id === projectId ? { ...p, current: p.current + val } : p
    );
    
    const n = { ...config, comptes: updatedComptes, projects: updatedProjects };
    setConfig(n); saveData(n, monthlyData);
  };

  // --- EPARGNE PRECAUTION (Virement Véro avec Note) ---
  const transferToSavings = (amount, note) => {
    const val = parseFloat(amount) || 0;
    const updatedComptes = config.comptes.map(c => {
      if (c.type === 'courant') return { ...c, initial: c.initial - val };
      if (c.id === config.savingsAccountId) return { ...c, initial: c.initial + val };
      return c;
    });
    const historyItem = { id: Date.now(), date: new Date().toLocaleDateString(), type: 'depot', amount: val, note: note || 'Virement' };
    const n = { ...config, comptes: updatedComptes, savingsHistory: [historyItem, ...(config.savingsHistory || [])].slice(0, 50) };
    setConfig(n); saveData(n, monthlyData);
  };

  const retrieveFromSavings = (amount, note) => {
    const val = parseFloat(amount) || 0;
    const updatedComptes = config.comptes.map(c => {
      if (c.type === 'courant') return { ...c, initial: c.initial + val };
      if (c.id === config.savingsAccountId) return { ...c, initial: c.initial - val };
      return c;
    });
    const historyItem = { id: Date.now(), date: new Date().toLocaleDateString(), type: 'retrait', amount: val, note: note || 'Retrait' };
    const n = { ...config, comptes: updatedComptes, savingsHistory: [historyItem, ...(config.savingsHistory || [])].slice(0, 50) };
    setConfig(n); saveData(n, monthlyData);
  };

  // --- CONFIG ---
  const updateAccountInitial = (id, v) => { const n={...config, comptes:config.comptes.map(c=>c.id===id?{...c, initial:parseFloat(v)||0}:c)}; setConfig(n); saveData(n, monthlyData); };
  const updateConfigPoste = (p) => { const n={...config, postes:config.postes.map(x=>x.id===p.id?p:x)}; setConfig(n); saveData(n, monthlyData); };
  const addConfigPoste = (t) => { const n={...config, postes:[...config.postes, {id:Date.now().toString(), label:'Nouveau', type:t, montant:0}]}; setConfig(n); saveData(n, monthlyData); };
  const removeConfigPoste = (id) => { const n={...config, postes:config.postes.filter(x=>x.id!==id)}; setConfig(n); saveData(n, monthlyData); };
  const setProvisionAccount = (id) => { const n={...config, provisionAccountId:id}; setConfig(n); saveData(n, monthlyData); };

  // --- ENVELOPPES ---
  const updateEnvelopeConfig = (e) => { const n={...config, envelopes:config.envelopes.map(x=>x.id===e.id?e:x)}; setConfig(n); saveData(n, monthlyData); };
  const addEnvelopeConfig = (c) => { const n={...config, envelopes:[...config.envelopes, {id:Date.now().toString(), label:'Nouvelle', category:c, budgetMonthly:0, currentBalance:0}]}; setConfig(n); saveData(n, monthlyData); };
  const removeEnvelopeConfig = (id) => { const n={...config, envelopes:config.envelopes.filter(x=>x.id!==id)}; setConfig(n); saveData(n, monthlyData); };
  
  const fundEnvelope = (mk, eid) => {
    const mData = monthlyData[mk] || {};
    if (mData.isClosed || mData[`funded_${eid}`]) return;
    const env = config.envelopes.find(e => e.id === eid);
    if (!env) return;
    const updC = config.comptes.map(c => c.type === 'courant' ? { ...c, initial: c.initial - env.budgetMonthly } : c);
    const updE = config.envelopes.map(e => e.id === eid ? { ...e, currentBalance: e.currentBalance + env.budgetMonthly } : e);
    const nM = { ...monthlyData, [mk]: { ...mData, [`funded_${eid}`]: true } };
    const nC = { ...config, comptes: updC, envelopes: updE };
    setConfig(nC); setMonthlyData(nM); saveData(nC, nM);
  };

  const spendEnvelope = (mk, eid, l, a) => {
    const mData = monthlyData[mk] || {};
    if (mData.isClosed) return;
    const val = parseFloat(a) || 0;
    const item = { id: Date.now(), envId: eid, label: l, amount: val };
    const updE = config.envelopes.map(e => e.id === eid ? { ...e, currentBalance: e.currentBalance - val } : e);
    const nM = { ...monthlyData, [mk]: { ...mData, envelopeExpenses: [...(mData.envelopeExpenses || []), item] } };
    const nC = { ...config, envelopes: updE };
    setConfig(nC); setMonthlyData(nM); saveData(nC, nM);
  };

  const removeEnvelopeExpense = (mk, xid, eid, a) => {
    const mData = monthlyData[mk];
    if (mData.isClosed) return;
    const val = parseFloat(a) || 0;
    const updE = config.envelopes.map(e => e.id === eid ? { ...e, currentBalance: e.currentBalance + val } : e);
    const nM = { ...monthlyData, [mk]: { ...mData, envelopeExpenses: (mData.envelopeExpenses || []).filter(e => e.id !== xid) } };
    const nC = { ...config, envelopes: updE };
    setConfig(nC); setMonthlyData(nM); saveData(nC, nM);
  };

  // --- PROVISIONS ---
  const addProvisionItem = (y) => { const n={...config, provisionsByYear:{...config.provisionsByYear, [y]:[...(config.provisionsByYear[y]||[]), {id:Date.now().toString(), label:'Nouvelle', amount:0, spent:0, history:[]}]}}; setConfig(n); saveData(n, monthlyData); };
  const updateProvisionItem = (y, i) => { const n={...config, provisionsByYear:{...config.provisionsByYear, [y]:(config.provisionsByYear[y]||[]).map(p=>p.id===i.id?i:p)}}; setConfig(n); saveData(n, monthlyData); };
  const removeProvisionItem = (y, id) => { const n={...config, provisionsByYear:{...config.provisionsByYear, [y]:(config.provisionsByYear[y]||[]).filter(p=>p.id!==id)}}; setConfig(n); saveData(n, monthlyData); };
  
  const toggleMonthlyProvision = (mk, amount) => {
    const mData = monthlyData[mk] || {};
    if (mData.isClosed) return;
    const s = !mData.provisionDone;
    const updC = config.comptes.map(c => c.id === config.provisionAccountId ? { ...c, initial: s ? c.initial + amount : c.initial - amount } : c);
    const nM = { ...monthlyData, [mk]: { ...mData, provisionDone: s } };
    const nC = { ...config, comptes: updC };
    setConfig(nC); setMonthlyData(nM); saveData(nC, nM);
  };

  const addProvisionExpense = (mk, pid, l, a) => {
    const mData = monthlyData[mk] || {};
    if (mData.isClosed) return;
    const val = parseFloat(a) || 0;
    const item = { id: Date.now(), provisionId: pid, label: l, amount: val, date: mk };
    const updC = config.comptes.map(c => c.id === config.provisionAccountId ? { ...c, initial: c.initial - val } : c);
    const y = mk.split('-')[0];
    const updP = (config.provisionsByYear[y] || []).map(p => p.id === pid ? { ...p, spent: (p.spent || 0) + val, history: [...(p.history || []), item] } : p);
    const nM = { ...monthlyData, [mk]: { ...mData, provisionExpenses: [...(mData.provisionExpenses || []), item] } };
    const nC = { ...config, comptes: updC, provisionsByYear: { ...config.provisionsByYear, [y]: updP } };
    setConfig(nC); setMonthlyData(nM); saveData(nC, nM);
  };

  const removeProvisionExpense = (mk, eid, a, pid) => {
    const mData = monthlyData[mk];
    if (mData.isClosed) return;
    const val = parseFloat(a) || 0;
    const updC = config.comptes.map(c => c.id === config.provisionAccountId ? { ...c, initial: c.initial + val } : c);
    const y = mk.split('-')[0];
    const updP = (config.provisionsByYear[y] || []).map(p => p.id === pid ? { ...p, spent: (p.spent || 0) - val, history: (p.history || []).filter(h => h.id !== eid) } : p);
    const nM = { ...monthlyData, [mk]: { ...mData, provisionExpenses: (mData.provisionExpenses || []).filter(e => e.id !== eid) } };
    const nC = { ...config, comptes: updC, provisionsByYear: { ...config.provisionsByYear, [y]: updP } };
    setConfig(nC); setMonthlyData(nM); saveData(nC, nM);
  };

  // --- MENSUEL ---
  const addIncomeLine = (mk) => { const mD={...monthlyData,[mk]:{...(monthlyData[mk]||{}), revenusList:[...(monthlyData[mk]?.revenusList||[]),{id:Date.now(),label:'Nouveau',montant:0}]}}; setMonthlyData(mD); saveData(config, mD); };
  const updateIncomeLine = (mk, id, f, v) => { const mD={...monthlyData,[mk]:{...monthlyData[mk], revenusList:monthlyData[mk].revenusList.map(i=>i.id===id?{...i,[f]:f==='montant'?parseFloat(v)||0:v}:i)}}; setMonthlyData(mD); saveData(config, mD); };
  const removeIncomeLine = (mk, id) => { const mD={...monthlyData,[mk]:{...monthlyData[mk], revenusList:monthlyData[mk].revenusList.filter(i=>i.id!==id)}}; setMonthlyData(mD); saveData(config, mD); };
  const updateFixedExpense = (mk, pid, v) => { if(monthlyData[mk]?.isClosed)return; const mD={...monthlyData,[mk]:{...(monthlyData[mk]||{}), depenses:{...(monthlyData[mk]?.depenses||{}),[pid]:parseFloat(v)||0}}}; setMonthlyData(mD); saveData(config, mD); };
  const toggleFixedCheck = (mk, pid) => { if(monthlyData[mk]?.isClosed)return; const mD={...monthlyData,[mk]:{...monthlyData[mk], fixedStatus:{...(monthlyData[mk]?.fixedStatus||{}),[pid]:!monthlyData[mk]?.fixedStatus?.[pid]}}}; setMonthlyData(mD); saveData(config, mD); };
  
  const reopenMonth = (mk) => { const mD={...monthlyData,[mk]:{...monthlyData[mk], isClosed:false}}; setMonthlyData(mD); saveData(config, mD); };
  
  const validateMonth = (monthKey) => {
    const mData = monthlyData[monthKey] || {};
    if (mData.isClosed) return;
    
    let newConfig = { ...config };
    const [year, month] = monthKey.split('-').map(Number);

    // RESET DECEMBRE POUR ENVELOPPES
    if (month === 12) {
      newConfig.envelopes = config.envelopes.map(e => ({ ...e, currentBalance: 0 }));
    }

    const newMonthlyData = { ...monthlyData, [monthKey]: { ...mData, isClosed: true } };
    setMonthlyData(newMonthlyData);
    setConfig(newConfig);
    saveData(newConfig, newMonthlyData);
    
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
      addProject, removeProject, fundProject
    }}>
      {children}
    </BudgetContext.Provider>
  );
};