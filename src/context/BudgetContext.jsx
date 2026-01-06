import React, { createContext, useState, useEffect } from 'react';
import { auth, db, googleProvider } from '../lib/firebase';
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, setDoc, onSnapshot } from "firebase/firestore";

export const BudgetContext = createContext();

const DEFAULT_CONFIG = {
  // NOUVEAU : Les comptes avec solde de départ
  comptes: [
    { id: 'livretA', label: 'Livret A', initial: 17000, type: 'epargne' },
    { id: 'ldd', label: 'LDD Véro', initial: 11600, type: 'epargne' },
    { id: 'env_imprevus', label: 'Enveloppe Imprévus', initial: 2300, type: 'enveloppe' },
  ],
  postes: [
    { id: 'p1', label: 'Prêt Immo', type: 'fixe', montant: 880 },
    { id: 'p2', label: 'Charges Copro', type: 'fixe', montant: 150 },
    { id: 'e1', label: 'Courses / Alim', type: 'obligatoire', montant: 400 },
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

  // Auth & Sync Firebase (Identique à avant)
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
        // Fusionner avec default pour éviter bugs si nouveaux champs
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

  // --- ACTIONS DE CONFIGURATION ---

  // Gestion des postes de dépense
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

  // NOUVEAU : Gestion des comptes (Soldes initiaux)
  const updateAccountInitial = (id, montant) => {
    const newConfig = {
      ...config,
      comptes: config.comptes.map(c => c.id === id ? { ...c, initial: parseFloat(montant) } : c)
    };
    setConfig(newConfig); saveData(newConfig, monthlyData);
  };

  // --- ACTIONS MENSUELLES ---

  // NOUVEAU : Gestion des revenus multiples
  const addIncomeLine = (monthKey) => {
    const mData = monthlyData[monthKey] || { revenusList: [], depenses: {} };
    // Si pas de liste (ancien format), on initialise
    const currentList = mData.revenusList || [];
    
    const newList = [...currentList, { id: Date.now(), label: 'Nouveau revenu', montant: 0 }];
    const newMData = { ...monthlyData, [monthKey]: { ...mData, revenusList: newList } };
    setMonthlyData(newMData); saveData(config, newMData);
  };

  const updateIncomeLine = (monthKey, id, field, value) => {
    const mData = monthlyData[monthKey];
    const newList = mData.revenusList.map(item => 
      item.id === id ? { ...item, [field]: field === 'montant' ? parseFloat(value) : value } : item
    );
    const newMData = { ...monthlyData, [monthKey]: { ...mData, revenusList: newList } };
    setMonthlyData(newMData); saveData(config, newMData);
  };

  const removeIncomeLine = (monthKey, id) => {
    const mData = monthlyData[monthKey];
    const newList = mData.revenusList.filter(item => item.id !== id);
    const newMData = { ...monthlyData, [monthKey]: { ...mData, revenusList: newList } };
    setMonthlyData(newMData); saveData(config, newMData);
  };

  // Gestion des dépenses (inchangé)
  const updateMonthEntry = (monthKey, subId, value) => {
    const mData = monthlyData[monthKey] || { revenusList: [], depenses: {} };
    const newMData = {
      ...monthlyData,
      [monthKey]: {
        ...mData,
        depenses: { ...mData.depenses, [subId]: parseFloat(value) }
      }
    };
    setMonthlyData(newMData); saveData(config, newMData);
  };

  return (
    <BudgetContext.Provider value={{ 
      user, loading, login, logout,
      config, monthlyData, 
      updateConfigPoste, addConfigPoste, removeConfigPoste, 
      updateAccountInitial, // Nouveau
      addIncomeLine, updateIncomeLine, removeIncomeLine, // Nouveaux
      updateMonthEntry 
    }}>
      {children}
    </BudgetContext.Provider>
  );
};