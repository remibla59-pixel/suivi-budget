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
  // Structure : { "2026": [{ id, label, amount (prévu), spent (réel) }] }
  provisionsByYear: { "2026": [] },
  postes: [
    { id: 'p1', label: 'Prêt Immo', type: 'fixe', montant: 880 },
    { id: 'e_courses', label: 'Courses', type: 'obligatoire', montant: 400 },
    { id: 's_plaisir', label: 'Loisirs', type: 'secondaire', montant: 200 },
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
  const updateConfigPoste = (p) => { setConfig(prev => { const n = { ...prev, postes: prev.postes.map(x => x.id === p.id ? p : x) }; saveData(n, monthlyData); return n; }); };
  const addConfigPoste = (type) => { setConfig(prev => { const n = { ...prev, postes: [...prev.postes, { id: Date.now().toString(), label: 'Nouveau', type, montant: 0 }] }; saveData(n, monthlyData); return n; }); };
  const removeConfigPoste = (id) => { setConfig(prev => { const n = { ...prev, postes: prev.postes.filter(x => x.id !== id) }; saveData(n, monthlyData); return n; }); };
  const updateAccountInitial = (id, v) => { setConfig(prev => { const n = { ...prev, comptes: prev.comptes.map(c => c.id === id ? { ...c, initial: parseFloat(v) } : c) }; saveData(n, monthlyData); return n; }); };
  const setProvisionAccount = (id) => { setConfig(prev => { const n = { ...prev, provisionAccountId: id }; saveData(n, monthlyData); return n; }); };

  // --- GESTION PROVISIONS (Annual View) ---
  const addProvisionItem = (year) => {
    const list = config.provisionsByYear?.[year] || [];
    // On ajoute le champ 'spent' initialisé à 0
    const newItem = { id: Date.now().toString(), label: 'Nouvelle Charge', amount: 0, spent: 0 };
    const newConfig = { ...config, provisionsByYear: { ...config.provisionsByYear, [year]: [...list, newItem] } };
    setConfig(newConfig); saveData(newConfig, monthlyData);
  };

  const updateProvisionItem = (year, item) => {
    const list = config.provisionsByYear?.[year] || [];
    const newList = list.map(p => p.id === item.id ? item : p);
    const newConfig = { ...config, provisionsByYear: { ...config.provisionsByYear, [year]: newList } };
    setConfig(newConfig); saveData(newConfig, monthlyData);
  };

  const removeProvisionItem = (year, id) => {
    const list = config.provisionsByYear?.[year] || [];
    const newList = list.filter(p => p.id !== id);
    const newConfig = { ...config, provisionsByYear: { ...config.provisionsByYear, [year]: newList } };
    setConfig(newConfig); saveData(newConfig, monthlyData);
  };

  // --- ACTIONS MENSUELLES ---
  
  // 1. VIREMENT EPARGNE MENSUEL
  const toggleMonthlyProvision = (monthKey, totalAmount) => {
    const mData = monthlyData[monthKey] || {};
    if (mData.isClosed) return;
    const currentStatus = mData.provisionDone || false;
    const newStatus = !currentStatus;

    // Crédit/Débit du compte tampon
    const updatedComptes = config.comptes.map(c => 
      c.id === config.provisionAccountId 
        ? { ...c, initial: newStatus ? c.initial + totalAmount : c.initial - totalAmount } 
        : c
    );

    const newMData = { ...monthlyData, [monthKey]: { ...mData, provisionDone: newStatus } };
    const newConfig = { ...config, comptes: updatedComptes };
    setConfig(newConfig); setMonthlyData(newMData); saveData(newConfig, newMData);
  };

  // 2. DEPENSE REELLE (Payer une facture)
  // Cette fonction met à jour le mois ET le cumul annuel
  const addProvisionExpense = (monthKey, provisionId, label, amount) => {
    const mData = monthlyData[monthKey] || {};
    if (mData.isClosed) return;
    
    // A. Enregistrer dans l'historique du mois
    const currentList = mData.provisionExpenses || [];
    const newItem = { id: Date.now(), provisionId, label, amount: parseFloat(amount) };
    
    // B. Débiter le compte tampon
    const updatedComptes = config.comptes.map(c => 
        c.id === config.provisionAccountId ? { ...c, initial: c.initial - parseFloat(amount) } : c
    );

    // C. Mettre à jour le "Total Dépensé" dans la config annuelle
    const year = monthKey.split('-')[0];
    const provList = config.provisionsByYear?.[year] || [];
    const updatedProvList = provList.map(p => 
      p.id === provisionId ? { ...p, spent: (p.spent || 0) + parseFloat(amount) } : p
    );

    const newMData = { ...monthlyData, [monthKey]: { ...mData, provisionExpenses: [...currentList, newItem] } };
    const newConfig = { 
      ...config, 
      comptes: updatedComptes,
      provisionsByYear: { ...config.provisionsByYear, [year]: updatedProvList }
    };

    setConfig(newConfig); setMonthlyData(newMData); saveData(newConfig, newMData);
  };

  const removeProvisionExpense = (monthKey, expenseId, amount, provisionId) => {
     const mData = monthlyData[monthKey] || {};
     if (mData.isClosed) return;

     // A. Retirer du mois
     const currentList = mData.provisionExpenses || [];
     const newList = currentList.filter(e => e.id !== expenseId);

     // B. Rembourser le compte tampon
     const updatedComptes = config.comptes.map(c => 
        c.id === config.provisionAccountId ? { ...c, initial: c.initial + parseFloat(amount) } : c
     );

     // C. Corriger le "Total Dépensé" annuel
     const year = monthKey.split('-')[0];
     const provList = config.provisionsByYear?.[year] || [];
     const updatedProvList = provList.map(p => 
       p.id === provisionId ? { ...p, spent: (p.spent || 0) - parseFloat(amount) } : p
     );

     const newMData = { ...monthlyData, [monthKey]: { ...mData, provisionExpenses: newList } };
     const newConfig = { 
       ...config, 
       comptes: updatedComptes,
       provisionsByYear: { ...config.provisionsByYear, [year]: updatedProvList }
     };
     
     setConfig(newConfig); setMonthlyData(newMData); saveData(newConfig, newMData);
  };

  // --- ACTIONS CLASSIQUES (inchangées) ---
  const addIncomeLine = (mk) => { const mData = monthlyData[mk] || {}; saveData(config, { ...monthlyData, [mk]: { ...mData, revenusList: [...(mData.revenusList || []), { id: Date.now(), label: 'Nouveau', montant: 0 }] } }); };
  const updateIncomeLine = (mk, id, f, v) => { const mData = monthlyData[mk]; const l = mData.revenusList.map(i => i.id === id ? { ...i, [f]: f === 'montant' ? parseFloat(v) : v } : i); saveData(config, { ...monthlyData, [mk]: { ...mData, revenusList: l } }); };
  const removeIncomeLine = (mk, id) => { const mData = monthlyData[mk]; saveData(config, { ...monthlyData, [mk]: { ...mData, revenusList: mData.revenusList.filter(i => i.id !== id) } }); };
  const updateFixedExpense = (mk, pid, v) => { const mData = monthlyData[mk] || {}; if (mData.isClosed) return; saveData(config, { ...monthlyData, [mk]: { ...mData, depenses: { ...(mData.depenses || {}), [pid]: parseFloat(v) } } }); };
  const toggleFixedCheck = (mk, pid) => { const mData = monthlyData[mk] || {}; if (mData.isClosed) return; const s = mData.fixedStatus || {}; saveData(config, { ...monthlyData, [mk]: { ...mData, fixedStatus: { ...s, [pid]: !s[pid] } } }); };
  const addVariableExpense = (mk, pid, l, a) => { const mData = monthlyData[mk] || {}; if (mData.isClosed) return; saveData(config, { ...monthlyData, [mk]: { ...mData, variableExpenses: [...(mData.variableExpenses || []), { id: Date.now(), posteId: pid, label: l, amount: parseFloat(a) }] } }); };
  const removeVariableExpense = (mk, iid) => { const mData = monthlyData[mk] || {}; if (mData.isClosed) return; saveData(config, { ...monthlyData, [mk]: { ...mData, variableExpenses: (mData.variableExpenses || []).filter(x => x.id !== iid) } }); };
  const validateMonth = (monthKey) => {
    const mData = monthlyData[monthKey] || {};
    if (mData.isClosed) return;
    let [year, month] = monthKey.split('-').map(Number);
    month += 1; if (month > 12) { month = 1; year += 1; }
    const nextMonthKey = `${year}-${String(month).padStart(2, '0')}`;
    const reports = {};
    const varExpenses = mData.variableExpenses || [];
    config.postes.forEach(p => {
      if (p.type === 'obligatoire' || p.type === 'secondaire') {
        const budget = p.montant;
        const realSpent = varExpenses.filter(v => v.posteId === p.id).reduce((sum, v) => sum + v.amount, 0);
        reports[p.id] = budget - realSpent; 
      }
    });
    const newMData = { ...monthlyData, [monthKey]: { ...mData, isClosed: true }, [nextMonthKey]: { ...(monthlyData[nextMonthKey] || {}), reports } };
    setMonthlyData(newMData); saveData(config, newMData);
    return nextMonthKey;
  };

  return (
    <BudgetContext.Provider value={{ 
      user, loading, login, logout,
      config, monthlyData, 
      updateConfigPoste, addConfigPoste, removeConfigPoste, updateAccountInitial, setProvisionAccount,
      addIncomeLine, updateIncomeLine, removeIncomeLine, updateFixedExpense, toggleFixedCheck, addVariableExpense, removeVariableExpense, validateMonth,
      addProvisionItem, updateProvisionItem, removeProvisionItem, toggleMonthlyProvision, addProvisionExpense, removeProvisionExpense
    }}>
      {children}
    </BudgetContext.Provider>
  );
};