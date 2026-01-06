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
    { id: 'p1', label: 'Prêt Immo', type: 'fixe', montant: 880 },
    { id: 'ann1', label: 'Taxe Foncière (Prov.)', type: 'annualise', montant: 100 },
    { id: 'e1', label: 'Courses / Alim', type: 'obligatoire', montant: 400 },
    { id: 's1', label: 'Loisirs', type: 'secondaire', montant: 200 },
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

  // --- FIREBASE SYNC (Inchangé) ---
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

  // --- ACTIONS CONFIGURATION ---
  const updateConfigPoste = (poste) => {
    const newConfig = { ...config, postes: config.postes.map(p => p.id === poste.id ? poste : p) };
    setConfig(newConfig); saveData(newConfig, monthlyData);
  };
  const addConfigPoste = (type) => {
    // Label par défaut vide pour faciliter la saisie via placeholder
    const newPoste = { id: Date.now().toString(), label: 'Nouveau poste', type, montant: 0 };
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
  const addIncomeLine = (monthKey) => {
    const mData = monthlyData[monthKey] || { revenusList: [], depenses: {} };
    const newList = [...(mData.revenusList || []), { id: Date.now(), label: 'Nouveau revenu', montant: 0 }];
    const newMData = { ...monthlyData, [monthKey]: { ...mData, revenusList: newList } };
    setMonthlyData(newMData); saveData(config, newMData);
  };

  const updateIncomeLine = (monthKey, id, field, value) => {
    const mData = monthlyData[monthKey];
    const newList = mData.revenusList.map(item => item.id === id ? { ...item, [field]: field === 'montant' ? parseFloat(value) : value } : item);
    const newMData = { ...monthlyData, [monthKey]: { ...mData, revenusList: newList } };
    setMonthlyData(newMData); saveData(config, newMData);
  };

  const removeIncomeLine = (monthKey, id) => {
    const mData = monthlyData[monthKey];
    const newList = mData.revenusList.filter(item => item.id !== id);
    const newMData = { ...monthlyData, [monthKey]: { ...mData, revenusList: newList } };
    setMonthlyData(newMData); saveData(config, newMData);
  };

  const updateMonthEntry = (monthKey, subId, value) => {
    const mData = monthlyData[monthKey] || {};
    if (mData.isClosed) return; // Sécurité : impossible de modifier si clos
    
    const newMData = {
      ...monthlyData,
      [monthKey]: {
        ...mData,
        depenses: { ...(mData.depenses || {}), [subId]: parseFloat(value) }
      }
    };
    setMonthlyData(newMData); saveData(config, newMData);
  };

  // --- VALIDATION DU MOIS (CLÔTURE) ---
  const validateMonth = (monthKey) => {
    const mData = monthlyData[monthKey] || { depenses: {} };
    if (mData.isClosed) return;

    // 1. Calculer le mois suivant (Ex: "2026-01" -> "2026-02")
    const dateObj = new Date(monthKey + "-01");
    dateObj.setMonth(dateObj.getMonth() + 1);
    const nextMonthKey = dateObj.toISOString().slice(0, 7);

    // 2. Calculer les reports (Ce qui reste dans les enveloppes)
    // On ne reporte que les enveloppes (obligatoire/secondaire), pas le fixe.
    const reports = {};
    config.postes.forEach(p => {
      if (p.type === 'obligatoire' || p.type === 'secondaire') {
        const budget = p.montant;
        const depense = mData.depenses && mData.depenses[p.id] !== undefined ? mData.depenses[p.id] : 0;
        // Le report peut être positif (économie) ou négatif (dette)
        reports[p.id] = budget - depense; 
      }
    });

    // 3. Mise à jour des données
    const newMData = {
      ...monthlyData,
      [monthKey]: { ...mData, isClosed: true }, // On fige le mois actuel
      [nextMonthKey]: { 
        ...(monthlyData[nextMonthKey] || {}),
        reports: reports // On injecte les reports dans le mois suivant
      }
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
      addIncomeLine, updateIncomeLine, removeIncomeLine, updateMonthEntry,
      validateMonth // Nouvelle fonction
    }}>
      {children}
    </BudgetContext.Provider>
  );
};