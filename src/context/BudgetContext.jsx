import React, { createContext, useState, useEffect } from 'react';
import { auth, db, googleProvider } from '../lib/firebase';
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, setDoc, onSnapshot } from "firebase/firestore";

export const BudgetContext = createContext();

const DEFAULT_CONFIG = {
  comptes: [
    { id: 'livretA', label: 'Livret A', initial: 17000, type: 'epargne' },
    { id: 'ldd', label: 'LDD Véro', initial: 11600, type: 'epargne' },
    { id: 'livretRemi', label: 'Livret A Rémi (Provisions)', initial: 0, type: 'provision' }, // Spécial Provisions
    { id: 'courant', label: 'Compte Courant', initial: 500, type: 'courant' },
  ],
  postes: [
    { id: 'p1', label: 'Prêt Immo', type: 'fixe', montant: 880 },
    // Les provisions annualisées
    { id: 'ann1', label: 'Taxe Foncière', type: 'annualise', montant: 100 }, 
    { id: 'ann2', label: 'Assurance Voiture', type: 'annualise', montant: 50 },
    // Courant
    { id: 'e_courses', label: 'Courses', type: 'obligatoire', montant: 400 },
    { id: 's_plaisir', label: 'Loisirs', type: 'secondaire', montant: 200 },
  ],
  epargneCibles: [
    { id: 'ep1', label: 'Camping Car', objectif: 30000, mensuel: 1000 }
  ],
  // Nouveau : Compte utilisé pour le tampon annualisé
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
    // Note: On garde la collection budget_2026 pour l'instant, mais la structure JSON gère toutes les années via les clés "YYYY-MM"
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
  const setProvisionAccount = (accountId) => {
    const newConfig = { ...config, provisionAccountId: accountId };
    setConfig(newConfig); saveData(newConfig, monthlyData);
  };

  // --- ACTIONS MENSUELLES ---
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

  const addVariableExpense = (monthKey, posteId, label, amount) => {
    const mData = monthlyData[monthKey] || {};
    if (mData.isClosed) return;
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

  // Gestion spécifique PROVISION (Virement Mensuel vers le Livret Rémi)
  const toggleProvisionDone = (monthKey, posteId) => {
    const mData = monthlyData[monthKey] || {};
    if (mData.isClosed) return;
    const current = mData.provisionStatus?.[posteId] || false; // false = pas fait, true = virement fait
    const newStatus = { ...(mData.provisionStatus || {}), [posteId]: !current };
    saveData(config, { ...monthlyData, [monthKey]: { ...mData, provisionStatus: newStatus } });
  };

  const validateMonth = (monthKey) => {
    const mData = monthlyData[monthKey] || {};
    if (mData.isClosed) return;

    // Calcul date mois suivant
    let [year, month] = monthKey.split('-').map(Number);
    month += 1;
    if (month > 12) { month = 1; year += 1; }
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
      updateConfigPoste, addConfigPoste, removeConfigPoste, updateAccountInitial, setProvisionAccount,
      addIncomeLine, updateIncomeLine, removeIncomeLine, 
      updateFixedExpense, toggleFixedCheck, 
      addVariableExpense, removeVariableExpense,
      toggleProvisionDone, // Nouveau pour les annualisés
      validateMonth
    }}>
      {children}
    </BudgetContext.Provider>
  );
};