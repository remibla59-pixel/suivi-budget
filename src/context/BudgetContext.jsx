import React, { createContext, useState, useEffect } from 'react';
import { auth, db, googleProvider } from '../lib/firebase';
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, setDoc, onSnapshot } from "firebase/firestore";

export const BudgetContext = createContext();

const DEFAULT_CONFIG = {
  revenusPrevus: 4000,
  postes: [
    { id: 'p1', label: 'Prêt Immo', type: 'fixe', montant: 880 },
    { id: 'p2', label: 'Charges Copro', type: 'fixe', montant: 150 },
    { id: 'e1', label: 'Courses', type: 'obligatoire', montant: 400 },
  ],
  epargneCibles: [
    { id: 'ep1', label: 'Camping Car', objectif: 30000, mensuel: 1000 }
  ]
};

export const BudgetProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // États de données
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [monthlyData, setMonthlyData] = useState({});

  // 1. Gérer l'authentification
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Écouter la base de données (Temps réel)
  useEffect(() => {
    if (!user) return;

    // On écoute le document "budget_data" dans la collection "users"
    // Chaque utilisateur a son propre document basé sur son UID
    const docRef = doc(db, "users", user.uid);

    const unsubDoc = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setConfig(data.config || DEFAULT_CONFIG);
        setMonthlyData(data.monthlyData || {});
      } else {
        // Création du profil s'il n'existe pas
        saveData(DEFAULT_CONFIG, {});
      }
    });

    return () => unsubDoc();
  }, [user]);

  // Fonction centrale de sauvegarde
  const saveData = async (newConfig, newMonthlyData) => {
    if (!user) return;
    try {
      await setDoc(doc(db, "users", user.uid), {
        config: newConfig,
        monthlyData: newMonthlyData,
        lastUpdated: new Date()
      }, { merge: true });
    } catch (e) {
      console.error("Erreur sauvegarde:", e);
    }
  };

  // --- ACTIONS (Identiques à avant, mais appellent saveData) ---
  
  const login = () => signInWithPopup(auth, googleProvider);
  const logout = () => signOut(auth);

  const updateConfigPoste = (poste) => {
    const newConfig = {
      ...config,
      postes: config.postes.map(p => p.id === poste.id ? poste : p)
    };
    setConfig(newConfig);
    saveData(newConfig, monthlyData);
  };

  const addConfigPoste = (type) => {
    const newPoste = { id: Date.now().toString(), label: 'Nouveau', type, montant: 0 };
    const newConfig = { ...config, postes: [...config.postes, newPoste] };
    setConfig(newConfig);
    saveData(newConfig, monthlyData);
  };

  const removeConfigPoste = (id) => {
    const newConfig = { ...config, postes: config.postes.filter(p => p.id !== id) };
    setConfig(newConfig);
    saveData(newConfig, monthlyData);
  };

  const updateMonthEntry = (monthKey, field, value, subId = null) => {
    const monthData = monthlyData[monthKey] || { revenus: config.revenusPrevus, depenses: {} };
    let newMonthDataObj;

    if (field === 'revenus') {
      newMonthDataObj = { ...monthData, revenus: parseFloat(value) };
    } else if (field === 'depense' && subId) {
      newMonthDataObj = {
        ...monthData,
        depenses: { ...monthData.depenses, [subId]: parseFloat(value) }
      };
    }
    
    const newMonthlyData = { ...monthlyData, [monthKey]: newMonthDataObj };
    setMonthlyData(newMonthlyData);
    saveData(config, newMonthlyData);
  };

  return (
    <BudgetContext.Provider value={{ 
      user, loading, login, logout,
      config, monthlyData, 
      updateConfigPoste, addConfigPoste, removeConfigPoste, updateMonthEntry 
    }}>
      {children}
    </BudgetContext.Provider>
  );
};