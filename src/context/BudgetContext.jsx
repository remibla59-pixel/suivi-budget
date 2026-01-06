import React, { createContext, useState, useEffect } from 'react';
import { auth, db, googleProvider } from '../lib/firebase';
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, setDoc, onSnapshot } from "firebase/firestore";

export const BudgetContext = createContext();

const DEFAULT_CONFIG = {
  comptes: [
    { id: 'livretA', label: 'Livret A', initial: 17000, type: 'epargne' },
    { id: 'ldd', label: 'LDD Véro', initial: 11600, type: 'epargne' },
    { id: 'courant', label: 'Compte Courant', initial: 500, type: 'courant' },
  ],
  postes: [
    // FIXES
    { id: 'p1', label: 'Prêt Immo', type: 'fixe', montant: 880 },
    { id: 'ann1', label: 'Taxe Foncière (Mensualisée)', type: 'annualise', montant: 100 },
    // COURANTES (Enveloppes Obligatoires)
    { id: 'e_courses', label: 'Courses / Alim', type: 'obligatoire', montant: 400 },
    { id: 'e_animaux', label: 'Animaux', type: 'obligatoire', montant: 100 },
    { id: 'e_carbu', label: 'Carburant / Péages', type: 'obligatoire', montant: 150 },
    { id: 'e_autres', label: 'Autres Achats', type: 'obligatoire', montant: 100 },
    // SECONDAIRES
    { id: 's_plaisir', label: 'Loisirs / Restos', type: 'secondaire', montant: 200 },
  ],
  epargneCibles: [
    { id: 'ep1', label: 'Camping Car', objectif: 30000, mensuel: 1000 }
  ]
};

export const BudgetProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [monthlyData, setMonthlyData] = useState({});

  // --- FIREBASE SYNC ---
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
  const updateConfigPoste = (poste) => {
    const newConfig = { ...config, postes: config.postes.map(p => p.id === poste.id ? poste : p) };
    setConfig(newConfig); saveData(newConfig, monthlyData);
  };
  const addConfigPoste = (type) => {
    const newPoste = { id: Date.now().toString(), label: 'Nouveau', type, montant: 0 };
    const newConfig = { ...config, postes: [...config.postes, newPoste] };
    setConfig(newConfig); saveData(newConfig, monthlyData);
  };
  const removeConfigPoste = (id) => {
    const newConfig = { ...config, postes: config.postes.filter(p => p.id !== id) };
    setConfig(newConfig); saveData(newConfig, monthlyData);
  };
  const updateAccountInitial = (id, montant) => {
    const newConfig = { ...config, comptes: config.comptes.map(c => c.id === id ? { ...c, initial: parseFloat(montant) } : c) };
    setConfig(newConfig); saveData(newConfig, monthlyData);
  };

  // --- ACTIONS MENSUELLES ---

  // REVENUS
  const addIncomeLine = (monthKey) => {
    const mData = monthlyData[monthKey] || {};
    const newList = [...(mData.revenusList || []), { id: Date.now(), label: 'Nouveau revenu', montant: 0 }];
    saveData(config, { ...monthlyData, [monthKey]: { ...mData, revenusList: newList } });
  };
  const updateIncomeLine = (monthKey, id, field, value) => {
    const mData = monthlyData[monthKey];
    const newList = mData.revenusList.map(item => item.id === id ? { ...item, [field]: field === 'montant' ? parseFloat(value) : value } : item);
    saveData(config, { ...monthlyData, [monthKey]: { ...mData, revenusList: newList } });
  };
  const removeIncomeLine = (monthKey, id) => {
    const mData = monthlyData[monthKey];
    const newList = mData.revenusList.filter(item => item.id !== id);
    saveData(config, { ...monthlyData, [monthKey]: { ...mData, revenusList: newList } });
  };

  // DEPENSES FIXES (Montant + Checkbox)
  const updateFixedExpense = (monthKey, posteId, amount) => {
    const mData = monthlyData[monthKey] || {};
    if (mData.isClosed) return;
    const newDepenses = { ...(mData.depenses || {}), [posteId]: parseFloat(amount) };
    saveData(config, { ...monthlyData, [monthKey]: { ...mData, depenses: newDepenses } });
  };
  
  const toggleFixedCheck = (monthKey, posteId) => {
    const mData = monthlyData[monthKey] || {};
    if (mData.isClosed) return;
    const currentStatus = mData.fixedStatus?.[posteId] || false;
    const newStatus = { ...(mData.fixedStatus || {}), [posteId]: !currentStatus };
    saveData(config, { ...monthlyData, [monthKey]: { ...mData, fixedStatus: newStatus } });
  };

  // DEPENSES VARIABLES (ENVELOPPES) - LISTE DETAILLEE
  const addVariableExpense = (monthKey, posteId, label, amount) => {
    const mData = monthlyData[monthKey] || {};
    if (mData.isClosed) return;
    
    // On stocke tout dans une liste unique "variableExpenses"
    const currentList = mData.variableExpenses || [];
    const newItem = { id: Date.now(), posteId, label, amount: parseFloat(amount) };
    
    saveData(config, { ...monthlyData, [monthKey]: { ...mData, variableExpenses: [...currentList, newItem] } });
  };

  const removeVariableExpense = (monthKey, itemId) => {
    const mData = monthlyData[monthKey] || {};
    if (mData.isClosed) return;
    const newList = (mData.variableExpenses || []).filter(item => item.id !== itemId);
    saveData(config, { ...monthlyData, [monthKey]: { ...mData, variableExpenses: newList } });
  };

  // CLOTURE
  const validateMonth = (monthKey) => {
    const mData = monthlyData[monthKey] || {};
    if (mData.isClosed) return;

    const dateObj = new Date(monthKey + "-01");
    dateObj.setMonth(dateObj.getMonth() + 1);
    const nextMonthKey = dateObj.toISOString().slice(0, 7);

    // Calcul des reports (Budget - Total Dépenses de la liste)
    const reports = {};
    const varExpenses = mData.variableExpenses || [];
    
    config.postes.forEach(p => {
      if (p.type === 'obligatoire' || p.type === 'secondaire') {
        const budget = p.montant;
        // Somme des dépenses pour ce poste précis
        const realSpent = varExpenses.filter(v => v.posteId === p.id).reduce((sum, v) => sum + v.amount, 0);
        reports[p.id] = budget - realSpent; 
      }
    });

    const newMData = {
      ...monthlyData,
      [monthKey]: { ...mData, isClosed: true },
      [nextMonthKey]: { ...(monthlyData[nextMonthKey] || {}), reports }
    };

    setMonthlyData(newMData);
    saveData(config, newMData);
    return nextMonthKey;
  };

  return (
    <BudgetContext.Provider value={{ 
      user, loading, login, logout,
      config, monthlyData, 
      updateConfigPoste, addConfigPoste, removeConfigPoste, updateAccountInitial,
      addIncomeLine, updateIncomeLine, removeIncomeLine, 
      updateFixedExpense, toggleFixedCheck, // Fixe
      addVariableExpense, removeVariableExpense, // Variable
      validateMonth
    }}>
      {children}
    </BudgetContext.Provider>
  );
};