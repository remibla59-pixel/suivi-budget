import React, { createContext, useState, useEffect } from 'react';
import { auth, db, googleProvider } from '../lib/firebase';
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, setDoc, onSnapshot } from "firebase/firestore";

export const BudgetContext = createContext();

const DEFAULT_CONFIG = {
  comptes: [
    { id: 'livretA', label: 'Livret A Véro (Précaution)', initial: 17000, type: 'epargne' },
    { id: 'ldd', label: 'LDD Véro', initial: 11600, type: 'epargne' },
    { id: 'livretRemi', label: 'Livret A Rémi (Provisions)', initial: 2000, type: 'provision' },
    { id: 'courant', label: 'Compte Courant', initial: 500, type: 'courant' },
  ],
  envelopes: [
    { id: 'env_courses', label: 'Courses', category: 'courant', budgetMonthly: 400, currentBalance: 0 },
    { id: 'env_animaux', label: 'Animaux', category: 'courant', budgetMonthly: 100, currentBalance: 0 },
    { id: 'env_carbu', label: 'Carburant / Péage', category: 'courant', budgetMonthly: 150, currentBalance: 0 },
    { id: 'env_autres', label: 'Autres Achats', category: 'courant', budgetMonthly: 100, currentBalance: 0 },
  ],
  provisionsByYear: { 
    "2026": [] 
  },
  postes: [
    { id: 'p1', label: 'Prêt Immo', type: 'fixe', montant: 880 },
  ],
  epargneCibles: [
    { id: 'ep1', label: 'Camping Car', objectif: 30000, mensuel: 1000 }
  ],
  provisionAccountId: 'livretRemi', // Rémi = Provisions annualisées
  savingsAccountId: 'livretA'      // Véro = Epargne précaution
};

export const BudgetProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [monthlyData, setMonthlyData] = useState({});

  // --- SYNCHRONISATION FIREBASE ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
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
    await setDoc(doc(db, "budget_2026", user.uid), {
      config: newConfig,
      monthlyData: newMonthlyData
    }, { merge: true });
  };

  const login = () => signInWithPopup(auth, googleProvider);
  const logout = () => signOut(auth);

  // --- ACTIONS DE CONFIGURATION GENERALE ---
  const updateConfigPoste = (poste) => {
    const newConfig = {
      ...config,
      postes: config.postes.map(p => p.id === poste.id ? poste : p)
    };
    setConfig(newConfig);
    saveData(newConfig, monthlyData);
  };

  const addConfigPoste = (type) => {
    const newPoste = { id: Date.now().toString(), label: 'Nouveau Poste', type, montant: 0 };
    const newConfig = { ...config, postes: [...config.postes, newPoste] };
    setConfig(newConfig);
    saveData(newConfig, monthlyData);
  };

  const removeConfigPoste = (id) => {
    const newConfig = { ...config, postes: config.postes.filter(p => p.id !== id) };
    setConfig(newConfig);
    saveData(newConfig, monthlyData);
  };

  const updateAccountInitial = (id, amount) => {
    const newConfig = {
      ...config,
      comptes: config.comptes.map(c => c.id === id ? { ...c, initial: parseFloat(amount) || 0 } : c)
    };
    setConfig(newConfig);
    saveData(newConfig, monthlyData);
  };

  const setProvisionAccount = (id) => {
    const newConfig = { ...config, provisionAccountId: id };
    setConfig(newConfig);
    saveData(newConfig, monthlyData);
  };

  // --- ACTIONS ENVELOPPES ---
  const updateEnvelopeConfig = (env) => {
    const newConfig = {
      ...config,
      envelopes: config.envelopes.map(e => e.id === env.id ? env : e)
    };
    setConfig(newConfig);
    saveData(newConfig, monthlyData);
  };

  const addEnvelopeConfig = (category) => {
    const newEnv = { id: Date.now().toString(), label: 'Nouvelle Enveloppe', category, budgetMonthly: 0, currentBalance: 0 };
    const newConfig = { ...config, envelopes: [...config.envelopes, newEnv] };
    setConfig(newConfig);
    saveData(newConfig, monthlyData);
  };

  const removeEnvelopeConfig = (id) => {
    const newConfig = { ...config, envelopes: config.envelopes.filter(e => e.id !== id) };
    setConfig(newConfig);
    saveData(newConfig, monthlyData);
  };

  const fundEnvelope = (monthKey, envId) => {
    const mData = monthlyData[monthKey] || {};
    if (mData.isClosed || mData[`funded_${envId}`]) return;

    const env = config.envelopes.find(e => e.id === envId);
    if (!env) return;

    const updatedComptes = config.comptes.map(c => 
      c.type === 'courant' ? { ...c, initial: c.initial - env.budgetMonthly } : c
    );
    const updatedEnvelopes = config.envelopes.map(e => 
      e.id === envId ? { ...e, currentBalance: e.currentBalance + env.budgetMonthly } : e
    );

    const newMData = { ...monthlyData, [monthKey]: { ...mData, [`funded_${envId}`]: true } };
    const newConfig = { ...config, comptes: updatedComptes, envelopes: updatedEnvelopes };
    setConfig(newConfig);
    setMonthlyData(newMData);
    saveData(newConfig, newMData);
  };

  const spendEnvelope = (monthKey, envId, label, amount) => {
    const mData = monthlyData[monthKey] || {};
    if (mData.isClosed) return;

    const expenseItem = { id: Date.now(), envId, label, amount: parseFloat(amount) || 0 };
    const updatedEnvelopes = config.envelopes.map(e => 
      e.id === envId ? { ...e, currentBalance: e.currentBalance - expenseItem.amount } : e
    );

    const newMData = { 
      ...monthlyData, 
      [monthKey]: { 
        ...mData, 
        envelopeExpenses: [...(mData.envelopeExpenses || []), expenseItem] 
      } 
    };
    const newConfig = { ...config, envelopes: updatedEnvelopes };
    setConfig(newConfig);
    setMonthlyData(newMData);
    saveData(newConfig, newMData);
  };

  const removeEnvelopeExpense = (monthKey, expenseId, envId, amount) => {
    const mData = monthlyData[monthKey];
    if (mData.isClosed) return;

    const updatedEnvelopes = config.envelopes.map(e => 
      e.id === envId ? { ...e, currentBalance: e.currentBalance + parseFloat(amount) } : e
    );
    const newMData = { 
      ...monthlyData, 
      [monthKey]: { 
        ...mData, 
        envelopeExpenses: (mData.envelopeExpenses || []).filter(e => e.id !== expenseId) 
      } 
    };
    const newConfig = { ...config, envelopes: updatedEnvelopes };
    setConfig(newConfig);
    setMonthlyData(newMData);
    saveData(newConfig, newMData);
  };

  // --- ACTIONS PROVISIONS (VUE ANNUELLE) ---
  const addProvisionItem = (year) => {
    const list = config.provisionsByYear?.[year] || [];
    const newItem = { id: Date.now().toString(), label: 'Nouvelle Charge', amount: 0, spent: 0, history: [] };
    const newConfig = {
      ...config,
      provisionsByYear: { ...config.provisionsByYear, [year]: [...list, newItem] }
    };
    setConfig(newConfig);
    saveData(newConfig, monthlyData);
  };

  const updateProvisionItem = (year, item) => {
    const list = config.provisionsByYear?.[year] || [];
    const newConfig = {
      ...config,
      provisionsByYear: { ...config.provisionsByYear, [year]: list.map(p => p.id === item.id ? item : p) }
    };
    setConfig(newConfig);
    saveData(newConfig, monthlyData);
  };

  const removeProvisionItem = (year, id) => {
    const list = config.provisionsByYear?.[year] || [];
    const newConfig = {
      ...config,
      provisionsByYear: { ...config.provisionsByYear, [year]: list.filter(p => p.id !== id) }
    };
    setConfig(newConfig);
    saveData(newConfig, monthlyData);
  };

  const toggleMonthlyProvision = (monthKey, amount) => {
    const mData = monthlyData[monthKey] || {};
    if (mData.isClosed) return;

    const isDone = !mData.provisionDone;
    const updatedComptes = config.comptes.map(c => 
      c.id === config.provisionAccountId ? { ...c, initial: isDone ? c.initial + amount : c.initial - amount } : c
    );

    const newMData = { ...monthlyData, [monthKey]: { ...mData, provisionDone: isDone } };
    const newConfig = { ...config, comptes: updatedComptes };
    setConfig(newConfig);
    setMonthlyData(newMData);
    saveData(newConfig, newMData);
  };

  const addProvisionExpense = (monthKey, provisionId, label, amount) => {
    const mData = monthlyData[monthKey] || {};
    if (mData.isClosed) return;

    const val = parseFloat(amount) || 0;
    const expenseItem = { id: Date.now(), provisionId, label, amount: val, date: monthKey };

    const updatedComptes = config.comptes.map(c => 
      c.id === config.provisionAccountId ? { ...c, initial: c.initial - val } : c
    );

    const year = monthKey.split('-')[0];
    const updatedProvisions = (config.provisionsByYear[year] || []).map(p => {
      if (p.id === provisionId) {
        return { 
          ...p, 
          spent: (p.spent || 0) + val,
          history: [...(p.history || []), expenseItem]
        };
      }
      return p;
    });

    const newMData = { 
      ...monthlyData, 
      [monthKey]: { 
        ...mData, 
        provisionExpenses: [...(mData.provisionExpenses || []), expenseItem] 
      } 
    };
    const newConfig = { ...config, comptes: updatedComptes, provisionsByYear: { ...config.provisionsByYear, [year]: updatedProvisions } };
    setConfig(newConfig);
    setMonthlyData(newMData);
    saveData(newConfig, newMData);
  };

  const removeProvisionExpense = (monthKey, expenseId, amount, provisionId) => {
    const mData = monthlyData[monthKey];
    if (mData.isClosed) return;

    const val = parseFloat(amount) || 0;
    const updatedComptes = config.comptes.map(c => 
      c.id === config.provisionAccountId ? { ...c, initial: c.initial + val } : c
    );

    const year = monthKey.split('-')[0];
    const updatedProvisions = (config.provisionsByYear[year] || []).map(p => {
      if (p.id === provisionId) {
        return { 
          ...p, 
          spent: (p.spent || 0) - val,
          history: (p.history || []).filter(h => h.id !== expenseId)
        };
      }
      return p;
    });

    const newMData = { 
      ...monthlyData, 
      [monthKey]: { 
        ...mData, 
        provisionExpenses: (mData.provisionExpenses || []).filter(e => e.id !== expenseId) 
      } 
    };
    const newConfig = { ...config, comptes: updatedComptes, provisionsByYear: { ...config.provisionsByYear, [year]: updatedProvisions } };
    setConfig(newConfig);
    setMonthlyData(newMData);
    saveData(newConfig, newMData);
  };

  // --- ACTIONS EPARGNE PRECAUTION ---
  const transferToSavings = (amount) => {
    const val = parseFloat(amount) || 0;
    const updatedComptes = config.comptes.map(c => {
      if (c.type === 'courant') return { ...c, initial: c.initial - val };
      if (c.id === config.savingsAccountId) return { ...c, initial: c.initial + val };
      return c;
    });
    const newConfig = { ...config, comptes: updatedComptes };
    setConfig(newConfig);
    saveData(newConfig, monthlyData);
  };

  const retrieveFromSavings = (amount) => {
    const val = parseFloat(amount) || 0;
    const updatedComptes = config.comptes.map(c => {
      if (c.type === 'courant') return { ...c, initial: c.initial + val };
      if (c.id === config.savingsAccountId) return { ...c, initial: c.initial - val };
      return c;
    });
    const newConfig = { ...config, comptes: updatedComptes };
    setConfig(newConfig);
    saveData(newConfig, monthlyData);
  };

  // --- ACTIONS MENSUELLES (REVENUS / FIXES / CLOTURE) ---
  const addIncomeLine = (monthKey) => {
    const mData = monthlyData[monthKey] || {};
    const newMData = {
      ...monthlyData,
      [monthKey]: {
        ...mData,
        revenusList: [...(mData.revenusList || []), { id: Date.now(), label: 'Nouveau Revenu', montant: 0 }]
      }
    };
    setMonthlyData(newMData);
    saveData(config, newMData);
  };

  const updateIncomeLine = (monthKey, id, field, value) => {
    const mData = monthlyData[monthKey];
    const newMData = {
      ...monthlyData,
      [monthKey]: {
        ...mData,
        revenusList: mData.revenusList.map(i => i.id === id ? { ...i, [field]: field === 'montant' ? parseFloat(value) || 0 : value } : i)
      }
    };
    setMonthlyData(newMData);
    saveData(config, newMData);
  };

  const removeIncomeLine = (monthKey, id) => {
    const mData = monthlyData[monthKey];
    const newMData = {
      ...monthlyData,
      [monthKey]: {
        ...mData,
        revenusList: mData.revenusList.filter(i => i.id !== id)
      }
    };
    setMonthlyData(newMData);
    saveData(config, newMData);
  };

  const updateFixedExpense = (monthKey, posteId, value) => {
    const mData = monthlyData[monthKey] || {};
    if (mData.isClosed) return;
    const newMData = {
      ...monthlyData,
      [monthKey]: {
        ...mData,
        depenses: { ...(mData.depenses || {}), [posteId]: parseFloat(value) || 0 }
      }
    };
    setMonthlyData(newMData);
    saveData(config, newMData);
  };

  const toggleFixedCheck = (monthKey, posteId) => {
    const mData = monthlyData[monthKey] || {};
    if (mData.isClosed) return;
    const status = mData.fixedStatus || {};
    const newMData = {
      ...monthlyData,
      [monthKey]: {
        ...mData,
        fixedStatus: { ...status, [posteId]: !status[posteId] }
      }
    };
    setMonthlyData(newMData);
    saveData(config, newMData);
  };

  const reopenMonth = (monthKey) => {
    const mData = monthlyData[monthKey];
    if (!mData) return;
    const newMData = { ...monthlyData, [monthKey]: { ...mData, isClosed: false } };
    setMonthlyData(newMData);
    saveData(config, newMData);
  };

  const validateMonth = (monthKey) => {
    const mData = monthlyData[monthKey] || {};
    if (mData.isClosed) return;
    const newMData = { ...monthlyData, [monthKey]: { ...mData, isClosed: true } };
    setMonthlyData(newMData);
    saveData(config, newMData);
    
    // Calcul mois suivant
    let [year, month] = monthKey.split('-').map(Number);
    month += 1;
    if (month > 12) { month = 1; year += 1; }
    return `${year}-${String(month).padStart(2, '0')}`;
  };

  return (
    <BudgetContext.Provider value={{ 
      user, loading, login, logout,
      config, monthlyData, 
      updateConfigPoste, addConfigPoste, removeConfigPoste, updateAccountInitial, setProvisionAccount,
      addIncomeLine, updateIncomeLine, removeIncomeLine, updateFixedExpense, toggleFixedCheck,
      validateMonth, reopenMonth,
      addProvisionItem, updateProvisionItem, removeProvisionItem, toggleMonthlyProvision, addProvisionExpense, removeProvisionExpense,
      updateEnvelopeConfig, addEnvelopeConfig, removeEnvelopeConfig, fundEnvelope, spendEnvelope, removeEnvelopeExpense,
      transferToSavings, retrieveFromSavings
    }}>
      {children}
    </BudgetContext.Provider>
  );
};