import React, { createContext, useState, useEffect } from 'react';
import { auth, db, googleProvider } from '../lib/firebase';
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, setDoc, onSnapshot } from "firebase/firestore";

export const BudgetContext = createContext();

const DEFAULT_CONFIG = {
  comptes: [
    { id: 'livretA', label: 'Livret A', initial: 17000, type: 'epargne' },
    { id: 'ldd', label: 'LDD Véro', initial: 11600, type: 'epargne' },
    { id: 'livretRemi', label: 'Livret A Rémi (Tampon)', initial: 2000, type: 'provision' },
    { id: 'courant', label: 'Compte Courant', initial: 500, type: 'courant' },
  ],
  // NOUVEAU : Les Enveloppes persistantes
  envelopes: [
    { id: 'env_courses', label: 'Courses', category: 'courant', budgetMonthly: 400, currentBalance: 0 },
    { id: 'env_animaux', label: 'Animaux', category: 'courant', budgetMonthly: 100, currentBalance: 0 },
    { id: 'env_carbu', label: 'Carburant / Péage', category: 'courant', budgetMonthly: 150, currentBalance: 0 },
    { id: 'env_autres', label: 'Autres Achats', category: 'courant', budgetMonthly: 100, currentBalance: 0 },
    { id: 'env_plaisir', label: 'Loisirs Perso', category: 'secondaire', budgetMonthly: 200, currentBalance: 0 },
  ],
  provisionsByYear: { "2026": [] },
  postes: [
    { id: 'p1', label: 'Prêt Immo', type: 'fixe', montant: 880 },
  ],
  epargneCibles: [
    { id: 'ep1', label: 'Camping Car', objectif: 30000, mensuel: 1000 }
  ],
  provisionAccountId: 'livretRemi' 
};

export const BudgetProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [monthlyData, setMonthlyData] = useState({});

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

  const saveData = async (conf, data) => {
    if (!user) return;
    await setDoc(doc(db, "budget_2026", user.uid), { config: conf, monthlyData: data }, { merge: true });
  };

  const login = () => signInWithPopup(auth, googleProvider);
  const logout = () => signOut(auth);

  // --- ACTIONS CONFIG ---
  // (Je garde les versions abrégées pour les parties inchangées)
  const updateConfigPoste = (p) => { setConfig(prev => { const n = { ...prev, postes: prev.postes.map(x => x.id === p.id ? p : x) }; saveData(n, monthlyData); return n; }); };
  const addConfigPoste = (type) => { setConfig(prev => { const n = { ...prev, postes: [...prev.postes, { id: Date.now().toString(), label: 'Nouveau', type, montant: 0 }] }; saveData(n, monthlyData); return n; }); };
  const removeConfigPoste = (id) => { setConfig(prev => { const n = { ...prev, postes: prev.postes.filter(x => x.id !== id) }; saveData(n, monthlyData); return n; }); };
  const updateAccountInitial = (id, v) => { setConfig(prev => { const n = { ...prev, comptes: prev.comptes.map(c => c.id === id ? { ...c, initial: parseFloat(v) } : c) }; saveData(n, monthlyData); return n; }); };
  const setProvisionAccount = (id) => { setConfig(prev => { const n = { ...prev, provisionAccountId: id }; saveData(n, monthlyData); return n; }); };

  // --- ACTIONS PROVISIONS ---
  const addProvisionItem = (y) => { const n={...config, provisionsByYear:{...config.provisionsByYear, [y]:[...(config.provisionsByYear?.[y]||[]), {id:Date.now().toString(), label:'Nouvelle', amount:0, spent:0}]}}; setConfig(n); saveData(n, monthlyData); };
  const updateProvisionItem = (y, i) => { const n={...config, provisionsByYear:{...config.provisionsByYear, [y]:(config.provisionsByYear?.[y]||[]).map(p=>p.id===i.id?i:p)}}; setConfig(n); saveData(n, monthlyData); };
  const removeProvisionItem = (y, id) => { const n={...config, provisionsByYear:{...config.provisionsByYear, [y]:(config.provisionsByYear?.[y]||[]).filter(p=>p.id!==id)}}; setConfig(n); saveData(n, monthlyData); };

  // --- NOUVEAU : ACTIONS ENVELOPPES ---
  
  const updateEnvelopeConfig = (env) => {
    const newConfig = { ...config, envelopes: config.envelopes.map(e => e.id === env.id ? env : e) };
    setConfig(newConfig); saveData(newConfig, monthlyData);
  };
  
  const addEnvelopeConfig = (category) => {
    const newEnv = { id: Date.now().toString(), label: 'Nouvelle Env.', category, budgetMonthly: 0, currentBalance: 0 };
    const newConfig = { ...config, envelopes: [...config.envelopes, newEnv] };
    setConfig(newConfig); saveData(newConfig, monthlyData);
  };

  const removeEnvelopeConfig = (id) => {
    const newConfig = { ...config, envelopes: config.envelopes.filter(e => e.id !== id) };
    setConfig(newConfig); saveData(newConfig, monthlyData);
  };

  // 1. REMPLIR L'ENVELOPPE (Funding)
  // Débit Compte Courant -> Crédit Enveloppe
  const fundEnvelope = (monthKey, envId) => {
    const mData = monthlyData[monthKey] || {};
    if (mData.isClosed) return;
    
    // Vérifier si déjà financé ce mois-ci
    const fundKey = `funded_${envId}`;
    if (mData[fundKey]) return;

    const env = config.envelopes.find(e => e.id === envId);
    if (!env) return;

    // Mise à jour Compte Courant (Débit)
    const updatedComptes = config.comptes.map(c => 
      c.type === 'courant' ? { ...c, initial: c.initial - env.budgetMonthly } : c
    );

    // Mise à jour Enveloppe (Crédit)
    const updatedEnvelopes = config.envelopes.map(e => 
      e.id === envId ? { ...e, currentBalance: e.currentBalance + e.budgetMonthly } : e
    );

    const newMData = { ...monthlyData, [monthKey]: { ...mData, [fundKey]: true } };
    const newConfig = { ...config, comptes: updatedComptes, envelopes: updatedEnvelopes };
    
    setConfig(newConfig); setMonthlyData(newMData); saveData(newConfig, newMData);
  };

  // 2. DÉPENSER DANS L'ENVELOPPE
  const spendEnvelope = (monthKey, envId, label, amount) => {
    const mData = monthlyData[monthKey] || {};
    if (mData.isClosed) return;

    // Ajout historique dépense
    const currentList = mData.envelopeExpenses || [];
    const newItem = { id: Date.now(), envId, label, amount: parseFloat(amount) };

    // Mise à jour Solde Enveloppe (Débit)
    const updatedEnvelopes = config.envelopes.map(e => 
      e.id === envId ? { ...e, currentBalance: e.currentBalance - parseFloat(amount) } : e
    );

    const newMData = { ...monthlyData, [monthKey]: { ...mData, envelopeExpenses: [...currentList, newItem] } };
    const newConfig = { ...config, envelopes: updatedEnvelopes };

    setConfig(newConfig); setMonthlyData(newMData); saveData(newConfig, newMData);
  };

  const removeEnvelopeExpense = (monthKey, expenseId, envId, amount) => {
     const mData = monthlyData[monthKey] || {};
     if (mData.isClosed) return;

     // Retrait historique
     const currentList = mData.envelopeExpenses || [];
     const newList = currentList.filter(e => e.id !== expenseId);

     // Remboursement Enveloppe
     const updatedEnvelopes = config.envelopes.map(e => 
       e.id === envId ? { ...e, currentBalance: e.currentBalance + parseFloat(amount) } : e
     );

     const newMData = { ...monthlyData, [monthKey]: { ...mData, envelopeExpenses: newList } };
     const newConfig = { ...config, envelopes: updatedEnvelopes };

     setConfig(newConfig); setMonthlyData(newMData); saveData(newConfig, newMData);
  };

  // --- ACTIONS MENSUELLES ---
  const toggleMonthlyProvision = (mk, amount) => {
    const mData = monthlyData[mk] || {}; if (mData.isClosed) return;
    const s = !mData.provisionDone;
    const updC = config.comptes.map(c => c.id === config.provisionAccountId ? { ...c, initial: s ? c.initial + amount : c.initial - amount } : c);
    const nC = { ...config, comptes: updC }; const nM = { ...monthlyData, [mk]: { ...mData, provisionDone: s } };
    setConfig(nC); setMonthlyData(nM); saveData(nC, nM);
  };
  const addProvisionExpense = (mk, pid, l, a) => { /* Code identique, je l'abrége */ 
    const mData = monthlyData[mk] || {}; if (mData.isClosed) return;
    const newItem = { id: Date.now(), provisionId: pid, label: l, amount: parseFloat(a) };
    const updC = config.comptes.map(c => c.id === config.provisionAccountId ? { ...c, initial: c.initial - parseFloat(a) } : c);
    const y = mk.split('-')[0]; const updP = (config.provisionsByYear[y]||[]).map(p => p.id===pid?{...p, spent:(p.spent||0)+parseFloat(a)}:p);
    const nC={...config, comptes:updC, provisionsByYear:{...config.provisionsByYear, [y]:updP}}; const nM={...monthlyData, [mk]:{...mData, provisionExpenses:[...(mData.provisionExpenses||[]), newItem]}};
    setConfig(nC); setMonthlyData(nM); saveData(nC, nM);
  };
  const removeProvisionExpense = (mk, eid, a, pid) => { /* Code identique, je l'abrége */
    const mData = monthlyData[mk]; if (mData.isClosed) return;
    const updC = config.comptes.map(c => c.id === config.provisionAccountId ? { ...c, initial: c.initial + parseFloat(a) } : c);
    const y = mk.split('-')[0]; const updP = (config.provisionsByYear[y]||[]).map(p => p.id===pid?{...p, spent:(p.spent||0)-parseFloat(a)}:p);
    const nC={...config, comptes:updC, provisionsByYear:{...config.provisionsByYear, [y]:updP}}; const nM={...monthlyData, [mk]:{...mData, provisionExpenses:(mData.provisionExpenses||[]).filter(e=>e.id!==eid)}};
    setConfig(nC); setMonthlyData(nM); saveData(nC, nM);
  };

  const addIncomeLine = (mk) => { const mData = monthlyData[mk] || {}; saveData(config, { ...monthlyData, [mk]: { ...mData, revenusList: [...(mData.revenusList || []), { id: Date.now(), label: 'Nouveau', montant: 0 }] } }); };
  const updateIncomeLine = (mk, id, f, v) => { const mData = monthlyData[mk]; const l = mData.revenusList.map(i => i.id === id ? { ...i, [f]: f === 'montant' ? parseFloat(v) : v } : i); saveData(config, { ...monthlyData, [mk]: { ...mData, revenusList: l } }); };
  const removeIncomeLine = (mk, id) => { const mData = monthlyData[mk]; saveData(config, { ...monthlyData, [mk]: { ...mData, revenusList: mData.revenusList.filter(i => i.id !== id) } }); };
  const updateFixedExpense = (mk, pid, v) => { const mData = monthlyData[mk] || {}; if (mData.isClosed) return; saveData(config, { ...monthlyData, [mk]: { ...mData, depenses: { ...(mData.depenses || {}), [pid]: parseFloat(v) } } }); };
  const toggleFixedCheck = (mk, pid) => { const mData = monthlyData[mk] || {}; if (mData.isClosed) return; const s = mData.fixedStatus || {}; saveData(config, { ...monthlyData, [mk]: { ...mData, fixedStatus: { ...s, [pid]: !s[pid] } } }); };

  const validateMonth = (monthKey) => {
    const mData = monthlyData[monthKey] || {};
    if (mData.isClosed) return;
    let [year, month] = monthKey.split('-').map(Number);
    month += 1; if (month > 12) { month = 1; year += 1; }
    const nextMonthKey = `${year}-${String(month).padStart(2, '0')}`;
    // Plus besoin de calculer les reports ici car les Enveloppes sont persistantes dans 'config' !
    const newMData = { ...monthlyData, [monthKey]: { ...mData, isClosed: true } };
    setMonthlyData(newMData); saveData(config, newMData);
    return nextMonthKey;
  };

  return (
    <BudgetContext.Provider value={{ 
      user, loading, login, logout,
      config, monthlyData, 
      updateConfigPoste, addConfigPoste, removeConfigPoste, updateAccountInitial, setProvisionAccount,
      addIncomeLine, updateIncomeLine, removeIncomeLine, updateFixedExpense, toggleFixedCheck, validateMonth,
      addProvisionItem, updateProvisionItem, removeProvisionItem, toggleMonthlyProvision, addProvisionExpense, removeProvisionExpense,
      // EXPORTS ENVELOPPES
      updateEnvelopeConfig, addEnvelopeConfig, removeEnvelopeConfig, fundEnvelope, spendEnvelope, removeEnvelopeExpense
    }}>
      {children}
    </BudgetContext.Provider>
  );
};