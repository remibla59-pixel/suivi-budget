import React, { useState, useEffect, useCallback } from 'react';
import { auth, db, googleProvider } from '../lib/firebase';
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, setDoc, onSnapshot, deleteDoc, runTransaction } from "firebase/firestore";
import { todayISO } from '../lib/budgetMeta';
import { BudgetContext } from './budgetContextObject';
import {
  nextMonthKey,
  monthlyProvisionTarget as computeMonthlyProvisionTarget,
  releaseEnvelopeLeftovers,
  buildBalanceAdjustment,
  closingBlockers,
} from '../lib/budgetMath';

const DEFAULT_CONFIG = {
  comptes: [
    { id: 'livretA', label: 'Livret A Véro (Précaution)', initial: 17000, type: 'epargne' },
    { id: 'ldd', label: 'LDD Véro', initial: 11600, type: 'epargne' },
    { id: 'casden', label: 'Compte CASDEN', initial: 0, type: 'epargne' },
    { id: 'livretRemi', label: 'Livret A Rémi (Provisions)', initial: 2000, type: 'provision' },
    { id: 'courant', label: 'Compte Courant', initial: 500, type: 'courant' },
  ],
  budgetsFlexibles: [
    { id: 'flex_courses', label: 'Courses', budget: 900, priority: 'obligatoire' },
    { id: 'flex_animaux', label: 'Animaux', budget: 100, priority: 'important' },
    { id: 'flex_carbu', label: 'Carburant / Péage', budget: 150, priority: 'important' },
    { id: 'flex_autres', label: 'Autres Achats', budget: 100, priority: 'futile' },
  ],
  envelopes: [
    { id: 'env_loisirs', label: 'Loisirs / Resto', category: 'secondaire', budgetMonthly: 100, currentBalance: 0, priority: 'futile' },
    { id: 'env_cadeaux', label: 'Cadeaux', category: 'secondaire', budgetMonthly: 50, currentBalance: 0, priority: 'important' },
  ],
  projects: [], 
  provisionsByYear: { "2026": [] },
  postes: [{ id: 'p1', label: 'Prêt Immo', type: 'fixe', montant: 880, priority: 'obligatoire' }],
  // NOTE : "epargneCibles" a été supprimé (reliquat invisible qui gonflait les charges de 1 000 €/mois).
  provisionAccountId: 'livretRemi',
  savingsAccountId: 'livretA',
  savingsHistory: [],
  openingBalances: {}, // Solde de départ par exercice (persisté au lieu d'un état local non sauvegardé)
  balanceAdjustments: [] // Rapprochements bancaires (solde réel) datés et confirmés
};

export const BudgetProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [monthlyData, setMonthlyData] = useState({});
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));

  // --- 1. AUTH & SYNC FIREBASE ---
  // `saveData` est déclaré avant les effets qui l'utilisent (sinon l'écriture du
  // document initial partirait avec une version obsolète de la fonction).
  const saveData = useCallback(async (newConfig, newMonthlyData) => {
    if (!user) return;
    await setDoc(doc(db, "budget_2026", user.uid), {
      config: newConfig,
      monthlyData: newMonthlyData
    }, { merge: true });
  }, [user]);

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
  }, [user, saveData]);

  const login = () => signInWithPopup(auth, googleProvider);
  const logout = () => signOut(auth);

  const resetAllData = async () => {
    if (!user) return;
    if (window.confirm("⚠️ ATTENTION : Vous êtes sur le point de TOUT effacer. Cette action est irréversible.")) {
      await deleteDoc(doc(db, "budget_2026", user.uid));
      window.location.reload();
    }
  };

  // --- 2. IMPORTATION DES DONNÉES (NOUVEAU) ---
  const importAllData = async (jsonData) => {
    if (!user) return;
    try {
      if (!jsonData.config || !jsonData.monthlyData) {
        alert("Format de fichier invalide. Il manque la config ou les données mensuelles.");
        return;
      }
      if (window.confirm("⚠️ ATTENTION : L'importation va ÉCRASER toutes les données actuelles par celles du fichier. Continuer ?")) {
        await setDoc(doc(db, "budget_2026", user.uid), { 
          config: jsonData.config, 
          monthlyData: jsonData.monthlyData 
        }, { merge: true });
        
        setConfig(jsonData.config);
        setMonthlyData(jsonData.monthlyData);
        alert("Importation réussie avec succès !");
      }
    } catch (error) {
      console.error("Erreur import:", error);
      alert("Erreur lors de l'importation.");
    }
  };

  // --- 3. HELPER COMPTES & ANALYSE ---
  const updateAccountInitial = (id, amount) => {
    const newConfig = {
      ...config,
      comptes: config.comptes.map(c => c.id === id ? { ...c, initial: parseFloat(amount) || 0 } : c)
    };
    setConfig(newConfig);
    saveData(newConfig, monthlyData);
  };

  const updateAnalysisData = (monthKey, field, value) => {
    const mData = monthlyData[monthKey] || {};
    const newMData = {
      ...monthlyData,
      [monthKey]: {
        ...mData,
        [field]: field.includes('note') ? value : (parseFloat(value) || 0)
      }
    };
    setMonthlyData(newMData);
    saveData(config, newMData);
  };

  // --- 3 bis. SOLDE RÉEL : rapprochement bancaire daté et confirmé ---
  // Enregistre l'écart entre le solde suivi et le solde réellement constaté sur le relevé.
  const adjustRealBalance = (accountId, realBalance, date, note) => {
    const account = (config.comptes || []).find(c => c.id === accountId);
    const operationDate = date || todayISO();
    const entry = buildBalanceAdjustment(account, realBalance, operationDate, note);
    if (!entry) return;
    const monthKey = operationDate.slice(0, 7);
    const newConfig = {
      ...config,
      comptes: config.comptes.map(c => c.id === accountId ? { ...c, initial: entry.newBalance } : c),
      balanceAdjustments: [entry, ...(config.balanceAdjustments || [])].slice(0, 60)
    };
    const mData = monthlyData[monthKey] || {};
    const newMonthlyData = {
      ...monthlyData,
      [monthKey]: { ...mData, balanceAdjustments: [...(mData.balanceAdjustments || []), entry] }
    };
    setConfig(newConfig); setMonthlyData(newMonthlyData); saveData(newConfig, newMonthlyData);
  };

  // --- 4. GESTION PROJETS (SÉCURISÉ & TRANSACTIONS) ---
  const addProject = (label, target, allocations) => {
    const safeAllocations = allocations || {};
    const newProject = { 
      id: Date.now().toString(), 
      label, 
      target: parseFloat(target), 
      allocations: safeAllocations 
    };
    const newConfig = { ...config, projects: [...(config.projects || []), newProject] };
    setConfig(newConfig);
    saveData(newConfig, monthlyData);
  };

  const removeProject = (id) => {
    const newConfig = { ...config, projects: (config.projects || []).filter(p => p.id !== id) };
    setConfig(newConfig);
    saveData(newConfig, monthlyData);
  };

  const fundProject = async (projectId, amount, targetAccountId, monthKey, date) => {
    if (!user) return;
    const val = parseFloat(amount) || 0;
    const targetMonth = monthKey || currentMonth;
    const operationDate = date || todayISO();
    const docRef = doc(db, "budget_2026", user.uid);

    try {
      await runTransaction(db, async (transaction) => {
        const sfDoc = await transaction.get(docRef);
        if (!sfDoc.exists()) return;

        const data = sfDoc.data();
        const currentConfig = data.config || DEFAULT_CONFIG;
        const currentMonthlyData = data.monthlyData || {};
        
        // 1. Mouvement Bancaire
        const updatedComptes = currentConfig.comptes.map(c => {
          if (c.type === 'courant') return { ...c, initial: (c.initial || 0) - val };
          if (c.id === targetAccountId) return { ...c, initial: (c.initial || 0) + val };
          return c;
        });

        // 2. Mise à jour du Projet
        const updatedProjects = (currentConfig.projects || []).map(p => {
          if (p.id === projectId) {
            const currentAllocations = p.allocations || {};
            return { 
              ...p, 
              allocations: { 
                ...currentAllocations, 
                [targetAccountId]: (currentAllocations[targetAccountId] || 0) + val 
              } 
            };
          }
          return p;
        });

        // 3. Historique Mensuel
        const mData = currentMonthlyData[targetMonth] || {};
        const logEntry = { id: Date.now(), type: 'project', projectId, amount: val, targetAccountId, date: operationDate };
        const updatedMonthlyData = {
          ...currentMonthlyData,
          [targetMonth]: {
            ...mData,
            allocationsList: [...(mData.allocationsList || []), logEntry]
          }
        };

        transaction.update(docRef, { 
          config: { ...currentConfig, comptes: updatedComptes, projects: updatedProjects },
          monthlyData: updatedMonthlyData 
        });
      });
    } catch (e) {
      console.error("Transaction failed: ", e);
      alert("Erreur lors du virement. Veuillez réessayer.");
    }
  };

  // --- 5. EPARGNE PRECAUTION (SÉCURISÉ & TRANSACTIONS) ---
  const transferToSavings = async (amount, note, monthKey, date) => {
    if (!user) return;
    const val = parseFloat(amount) || 0;
    const targetMonth = monthKey || currentMonth;
    const operationDate = date || todayISO();
    const docRef = doc(db, "budget_2026", user.uid);

    try {
      await runTransaction(db, async (transaction) => {
        const sfDoc = await transaction.get(docRef);
        if (!sfDoc.exists()) return;

        const data = sfDoc.data();
        const currentConfig = data.config || DEFAULT_CONFIG;
        const currentMonthlyData = data.monthlyData || {};

        const updatedComptes = currentConfig.comptes.map(c => {
          if (c.type === 'courant') return { ...c, initial: (c.initial || 0) - val };
          if (c.id === currentConfig.savingsAccountId) return { ...c, initial: (c.initial || 0) + val };
          return c;
        });

        const historyItem = { id: Date.now(), date: operationDate, type: 'depot', amount: val, note: note || 'Virement' };
        const mData = currentMonthlyData[targetMonth] || {};
        const logEntry = { id: Date.now(), type: 'savings', amount: val, note, date: operationDate };

        const updatedMonthlyData = {
          ...currentMonthlyData,
          [targetMonth]: {
            ...mData,
            allocationsList: [...(mData.allocationsList || []), logEntry]
          }
        };

        transaction.update(docRef, { 
          config: { 
            ...currentConfig, 
            comptes: updatedComptes, 
            savingsHistory: [historyItem, ...(currentConfig.savingsHistory || [])].slice(0, 50) 
          },
          monthlyData: updatedMonthlyData 
        });
      });
    } catch (e) {
      console.error("Transaction failed: ", e);
      alert("Erreur lors du virement épargne.");
    }
  };

  const retrieveFromSavings = async (amount, note, monthKey, date) => {
    if (!user) return;
    const val = parseFloat(amount) || 0;
    const targetMonth = monthKey || currentMonth;
    const operationDate = date || todayISO();
    const docRef = doc(db, "budget_2026", user.uid);

    try {
      await runTransaction(db, async (transaction) => {
        const sfDoc = await transaction.get(docRef);
        if (!sfDoc.exists()) return;

        const data = sfDoc.data();
        const currentConfig = data.config || DEFAULT_CONFIG;
        const currentMonthlyData = data.monthlyData || {};

        const updatedComptes = currentConfig.comptes.map(c => {
          if (c.type === 'courant') return { ...c, initial: (c.initial || 0) + val };
          if (c.id === currentConfig.savingsAccountId) return { ...c, initial: (c.initial || 0) - val };
          return c;
        });

        const historyItem = { id: Date.now(), date: operationDate, type: 'retrait', amount: val, note: note || 'Retrait' };
        const mData = currentMonthlyData[targetMonth] || {};
        const logEntry = { id: Date.now(), type: 'savings_out', amount: val, note, date: operationDate };

        const updatedMonthlyData = {
          ...currentMonthlyData,
          [targetMonth]: {
            ...mData,
            allocationsList: [...(mData.allocationsList || []), logEntry]
          }
        };

        transaction.update(docRef, {
          config: {
            ...currentConfig,
            comptes: updatedComptes,
            savingsHistory: [historyItem, ...(currentConfig.savingsHistory || [])].slice(0, 50)
          },
          monthlyData: updatedMonthlyData
        });
      });
    } catch (e) {
      console.error("Transaction failed: ", e);
      alert("Erreur lors du retrait épargne.");
    }
  };

  // --- 6. BUDGETS FLEXIBLES ---
  const updateFlexibleBudget = (id, newBudget) => {
    const newConfig = { ...config, budgetsFlexibles: config.budgetsFlexibles.map(b => b.id === id ? { ...b, budget: parseFloat(newBudget) || 0 } : b) };
    setConfig(newConfig);
    saveData(newConfig, monthlyData);
  };

  const updateFlexiblePriority = (id, priority) => {
    const newConfig = { ...config, budgetsFlexibles: config.budgetsFlexibles.map(b => b.id === id ? { ...b, priority } : b) };
    setConfig(newConfig);
    saveData(newConfig, monthlyData);
  };

  const addFlexibleExpense = (monthKey, catId, label, amount, date) => {
    const mData = monthlyData[monthKey] || {};
    if (mData.isClosed) return;
    const val = parseFloat(amount) || 0;
    const updatedComptes = config.comptes.map(c => c.type === 'courant' ? { ...c, initial: c.initial - val } : c);
    const newItem = { id: Date.now(), catId, label, amount: val, date: date || todayISO() };
    const newMData = { ...monthlyData, [monthKey]: { ...mData, flexibleExpenses: [...(mData.flexibleExpenses || []), newItem] } };
    const newConfig = { ...config, comptes: updatedComptes };
    setConfig(newConfig); setMonthlyData(newMData); saveData(newConfig, newMData);
  };

  const removeFlexibleExpense = (monthKey, expenseId, amount) => {
    const mData = monthlyData[monthKey];
    if (mData.isClosed) return;
    const val = parseFloat(amount) || 0;
    const updatedComptes = config.comptes.map(c => c.type === 'courant' ? { ...c, initial: c.initial + val } : c);
    const newMData = { ...monthlyData, [monthKey]: { ...mData, flexibleExpenses: (mData.flexibleExpenses || []).filter(e => e.id !== expenseId) } };
    const newConfig = { ...config, comptes: updatedComptes };
    setConfig(newConfig); setMonthlyData(newMData); saveData(newConfig, newMData);
  };

  // --- 7. CONFIG POSTES & ENVELOPPES ---
  const updateConfigPoste = (p) => { const n={...config, postes:config.postes.map(x=>x.id===p.id?p:x)}; setConfig(n); saveData(n, monthlyData); };
  const addConfigPoste = (t) => { const n={...config, postes:[...config.postes, {id:Date.now().toString(), label:'Nouveau', type:t, montant:0, priority:'important'}]}; setConfig(n); saveData(n, monthlyData); };
  const removeConfigPoste = (id) => { const n={...config, postes:config.postes.filter(x=>x.id!==id)}; setConfig(n); saveData(n, monthlyData); };
  const setProvisionAccount = (id) => { const n={...config, provisionAccountId:id}; setConfig(n); saveData(n, monthlyData); };
  const setSavingsAccount = (id) => { const n={...config, savingsAccountId:id}; setConfig(n); saveData(n, monthlyData); };
  const setOpeningBalance = (year, value) => {
    const n = { ...config, openingBalances: { ...(config.openingBalances || {}), [year]: parseFloat(value) || 0 } };
    setConfig(n); saveData(n, monthlyData);
  };
  
  const updateEnvelopeConfig=(e)=>{const n={...config, envelopes:config.envelopes.map(x=>x.id===e.id?e:x)};setConfig(n);saveData(n, monthlyData);};
  const addEnvelopeConfig=(c)=>{const n={...config, envelopes:[...config.envelopes, {id:Date.now().toString(), label:'Nouvelle', category:c, budgetMonthly:0, currentBalance:0, priority:'important'}]};setConfig(n);saveData(n, monthlyData);};
  const removeEnvelopeConfig=(id)=>{const n={...config, envelopes:config.envelopes.filter(x=>x.id!==id)};setConfig(n);saveData(n, monthlyData);};

  const fundEnvelope=(mk,eid,date)=>{const m=monthlyData[mk]||{}; if(m.isClosed||m[`funded_${eid}`])return; const env=config.envelopes.find(e=>e.id===eid); if(!env)return; const uC=config.comptes.map(c=>c.type==='courant'?{...c, initial:c.initial-env.budgetMonthly}:c); const uE=config.envelopes.map(e=>e.id===eid?{...e, currentBalance:e.currentBalance+env.budgetMonthly}:e); const nM={...monthlyData,[mk]:{...m,[`funded_${eid}`]:date||todayISO()}}; const nC={...config,comptes:uC,envelopes:uE}; setConfig(nC); setMonthlyData(nM); saveData(nC, nM);};

  // Retour en arrière sur un versement d'enveloppe : recrédite le compte courant
  const unfundEnvelope=(mk,eid)=>{const m=monthlyData[mk]||{}; if(m.isClosed||!m[`funded_${eid}`])return; const env=config.envelopes.find(e=>e.id===eid); if(!env)return; const uC=config.comptes.map(c=>c.type==='courant'?{...c, initial:c.initial+env.budgetMonthly}:c); const uE=config.envelopes.map(e=>e.id===eid?{...e, currentBalance:e.currentBalance-env.budgetMonthly}:e); const nM={...monthlyData,[mk]:{...m,[`funded_${eid}`]:false}}; const nC={...config,comptes:uC,envelopes:uE}; setConfig(nC); setMonthlyData(nM); saveData(nC, nM);};

  const spendEnvelope=(mk,eid,l,a,date)=>{const m=monthlyData[mk]||{}; if(m.isClosed)return; const v=parseFloat(a)||0; const i={id:Date.now(), envId:eid, label:l, amount:v, date:date||todayISO()}; const uE=config.envelopes.map(e=>e.id===eid?{...e, currentBalance:e.currentBalance-v}:e); const nM={...monthlyData,[mk]:{...m,envelopeExpenses:[...(m.envelopeExpenses||[]),i]}}; const nC={...config,envelopes:uE}; setConfig(nC); setMonthlyData(nM); saveData(nC, nM);};
  const removeEnvelopeExpense=(mk,xid,eid,a)=>{const m=monthlyData[mk]; if(m.isClosed)return; const v=parseFloat(a)||0; const uE=config.envelopes.map(e=>e.id===eid?{...e, currentBalance:e.currentBalance+v}:e); const nM={...monthlyData,[mk]:{...m,envelopeExpenses:(m.envelopeExpenses||[]).filter(e=>e.id!==xid)}}; const nC={...config,envelopes:uE}; setConfig(nC); setMonthlyData(nM); saveData(nC, nM);};

  // --- 8. PROVISIONS ---
  const addProvisionItem=(y)=>{const n={...config, provisionsByYear:{...config.provisionsByYear, [y]:[...(config.provisionsByYear[y]||[]), {id:Date.now().toString(), label:'Nouvelle', amount:0, spent:0, history:[]}]}}; setConfig(n); saveData(n, monthlyData);};
  const updateProvisionItem=(y,i)=>{const n={...config, provisionsByYear:{...config.provisionsByYear, [y]:(config.provisionsByYear[y]||[]).map(p=>p.id===i.id?i:p)}}; setConfig(n); saveData(n, monthlyData);};
  const removeProvisionItem=(y,id)=>{const n={...config, provisionsByYear:{...config.provisionsByYear, [y]:(config.provisionsByYear[y]||[]).filter(p=>p.id!==id)}}; setConfig(n); saveData(n, monthlyData);};
  
  // Virement mensuel lissé : calculé sur les provisions de N+1, débité réellement du compte courant
  const monthlyProvisionTarget=(mk)=>computeMonthlyProvisionTarget(config.provisionsByYear, mk);

  const confirmProvisionTransfer=(mk,date)=>{const m=monthlyData[mk]||{}; if(m.isClosed||m.provisionDone)return; const {monthly:amount, year}=monthlyProvisionTarget(mk); if(!amount)return; const uC=config.comptes.map(c=>{ if(c.type==='courant')return {...c, initial:c.initial-amount}; if(c.id===config.provisionAccountId)return {...c, initial:c.initial+amount}; return c;}); const nM={...monthlyData,[mk]:{...m, provisionDone:true, provisionAmount:amount, provisionDate:date||todayISO(), provisionYear:year}}; const nC={...config,comptes:uC}; setConfig(nC); setMonthlyData(nM); saveData(nC, nM);};

  // Retour en arrière sur le virement de provision
  const cancelProvisionTransfer=(mk)=>{const m=monthlyData[mk]||{}; if(m.isClosed||!m.provisionDone)return; const amount=m.provisionAmount!=null?m.provisionAmount:monthlyProvisionTarget(mk).monthly; const uC=config.comptes.map(c=>{ if(c.type==='courant')return {...c, initial:c.initial+amount}; if(c.id===config.provisionAccountId)return {...c, initial:c.initial-amount}; return c;}); const nM={...monthlyData,[mk]:{...m, provisionDone:false, provisionAmount:null, provisionDate:null}}; const nC={...config,comptes:uC}; setConfig(nC); setMonthlyData(nM); saveData(nC, nM);};
  
  const addProvisionExpense=(mk,pid,l,a,date)=>{const m=monthlyData[mk]||{}; if(m.isClosed)return; const v=parseFloat(a)||0; const i={id:Date.now(), provisionId:pid, label:l, amount:v, date:date||todayISO()}; const uC=config.comptes.map(c=>c.id===config.provisionAccountId?{...c, initial:c.initial-v}:c); const y=mk.split('-')[0]; const uP=(config.provisionsByYear[y]||[]).map(p=>p.id===pid?{...p, spent:(p.spent||0)+v, history:[...(p.history||[]), i]}:p); const nM={...monthlyData,[mk]:{...m, provisionExpenses:[...(m.provisionExpenses||[]), i]}}; const nC={...config, comptes:uC, provisionsByYear:{...config.provisionsByYear, [y]:uP}}; setConfig(nC); setMonthlyData(nM); saveData(nC, nM);};
  const removeProvisionExpense=(mk,eid,a,pid)=>{const m=monthlyData[mk]; if(m.isClosed)return; const v=parseFloat(a)||0; const uC=config.comptes.map(c=>c.id===config.provisionAccountId?{...c, initial:c.initial+v}:c); const y=mk.split('-')[0]; const uP=(config.provisionsByYear[y]||[]).map(p=>p.id===pid?{...p, spent:(p.spent||0)-v, history:(p.history||[]).filter(h=>h.id!==eid)}:p); const nM={...monthlyData,[mk]:{...m, provisionExpenses:(m.provisionExpenses||[]).filter(e=>e.id!==eid)}}; const nC={...config, comptes:uC, provisionsByYear:{...config.provisionsByYear, [y]:uP}}; setConfig(nC); setMonthlyData(nM); saveData(nC, nM);};

  // --- 9. TABLEAU MENSUEL (REVENUS/CHARGES) ---
  const addIncomeLine=(mk)=>{const m={...monthlyData,[mk]:{...(monthlyData[mk]||{}), revenusList:[...(monthlyData[mk]?.revenusList||[]),{id:Date.now(),label:'Nouveau',montant:0}]}}; setMonthlyData(m); saveData(config, m);};
  const updateIncomeLine=(mk,id,f,v)=>{const m={...monthlyData,[mk]:{...monthlyData[mk], revenusList:monthlyData[mk].revenusList.map(i=>i.id===id?{...i,[f]:f==='montant'?parseFloat(v)||0:v}:i)}}; setMonthlyData(m); saveData(config, m);};
  const removeIncomeLine=(mk,id)=>{const m={...monthlyData,[mk]:{...monthlyData[mk], revenusList:monthlyData[mk].revenusList.filter(i=>i.id!==id)}}; setMonthlyData(m); saveData(config, m);};
  
  // Modifier le montant d'une charge fixe déjà payée ajuste le solde du compte courant (delta)
  const updateFixedExpense=(mk,pid,v)=>{const m=monthlyData[mk]||{}; if(m.isClosed)return; const poste=config.postes.find(p=>p.id===pid); const oldAmount=parseFloat(m.depenses?.[pid]??poste?.montant??0)||0; const newAmount=parseFloat(v)||0; const isPaid=m.fixedStatus?.[pid]; let nC=config; if(isPaid){const delta=newAmount-oldAmount; nC={...config, comptes:config.comptes.map(c=>c.type==='courant'?{...c, initial:c.initial-delta}:c)};} const mD={...monthlyData,[mk]:{...m, depenses:{...(m.depenses||{}),[pid]:newAmount}}}; setConfig(nC); setMonthlyData(mD); saveData(nC, mD);};

  // Confirmer le paiement d'une charge fixe : débit réel du compte courant + date d'opération
  const payFixedCharge=(mk,pid,date)=>{const m=monthlyData[mk]||{}; if(m.isClosed||m.fixedStatus?.[pid])return; const poste=config.postes.find(p=>p.id===pid); if(!poste)return; const amount=parseFloat(m.depenses?.[pid]??poste.montant??0)||0; const uC=config.comptes.map(c=>c.type==='courant'?{...c, initial:c.initial-amount}:c); const nM={...monthlyData,[mk]:{...m, fixedStatus:{...(m.fixedStatus||{}),[pid]:true}, fixedDates:{...(m.fixedDates||{}),[pid]:date||todayISO()}}}; const nC={...config, comptes:uC}; setConfig(nC); setMonthlyData(nM); saveData(nC, nM);};

  // Retour en arrière : annule le paiement et recrédite le compte courant
  const unpayFixedCharge=(mk,pid)=>{const m=monthlyData[mk]||{}; if(m.isClosed||!m.fixedStatus?.[pid])return; const poste=config.postes.find(p=>p.id===pid); if(!poste)return; const amount=parseFloat(m.depenses?.[pid]??poste.montant??0)||0; const uC=config.comptes.map(c=>c.type==='courant'?{...c, initial:c.initial+amount}:c); const fixedDates={...(m.fixedDates||{})}; delete fixedDates[pid]; const nM={...monthlyData,[mk]:{...m, fixedStatus:{...(m.fixedStatus||{}),[pid]:false}, fixedDates}}; const nC={...config, comptes:uC}; setConfig(nC); setMonthlyData(nM); saveData(nC, nM);};

  const updateFixedDate=(mk,pid,date)=>{const m=monthlyData[mk]||{}; if(m.isClosed)return; const nM={...monthlyData,[mk]:{...m, fixedDates:{...(m.fixedDates||{}),[pid]:date}}}; setMonthlyData(nM); saveData(config, nM);};
  
  const reopenMonth=(mk)=>{const mD={...monthlyData,[mk]:{...monthlyData[mk], isClosed:false}}; setMonthlyData(mD); saveData(config, mD);};
  const validateMonth = (monthKey) => {
    const mData = monthlyData[monthKey] || {};
    if (mData.isClosed) return;
    // Garde-fou : on refuse de clôturer un mois dont les charges fixes, les
    // enveloppes ou le virement de provisions ne sont pas confirmés (l'UI affiche le détail).
    const blockers = closingBlockers(config.postes, mData, monthlyProvisionTarget(monthKey).monthly, config.envelopes);
    if (!blockers.canClose) return undefined;
    let newConfig = { ...config };
    const isYearEnd = Number(monthKey.split('-')[1]) === 12;
    if (isYearEnd) {
      // Fin d'exercice : les cagnottes non dépensées reviennent sur le compte courant (aucune somme perdue)
      const closed = releaseEnvelopeLeftovers(config.envelopes, config.comptes);
      newConfig.envelopes = closed.envelopes;
      newConfig.comptes = closed.comptes;
    }
    const newMonthlyData = { ...monthlyData, [monthKey]: { ...mData, isClosed: true } };
    setMonthlyData(newMonthlyData); setConfig(newConfig); saveData(newConfig, newMonthlyData);
    return nextMonthKey(monthKey);
  };

  return (
    <BudgetContext.Provider value={{ 
      user, loading, login, logout, config, monthlyData, currentMonth, setCurrentMonth,
      updateConfigPoste, addConfigPoste, removeConfigPoste, updateAccountInitial,
      setProvisionAccount, setSavingsAccount, setOpeningBalance, adjustRealBalance,
      addIncomeLine, updateIncomeLine, removeIncomeLine,
      updateFixedExpense, payFixedCharge, unpayFixedCharge, updateFixedDate,
      validateMonth, reopenMonth, resetAllData, importAllData,
      addProvisionItem, updateProvisionItem, removeProvisionItem,
      monthlyProvisionTarget, confirmProvisionTransfer, cancelProvisionTransfer,
      addProvisionExpense, removeProvisionExpense,
      updateEnvelopeConfig, addEnvelopeConfig, removeEnvelopeConfig,
      fundEnvelope, unfundEnvelope, spendEnvelope, removeEnvelopeExpense,
      transferToSavings, retrieveFromSavings,
      addProject, removeProject, fundProject,
      updateFlexibleBudget, updateFlexiblePriority, addFlexibleExpense, removeFlexibleExpense,
      updateAnalysisData
    }}>
      {children}
    </BudgetContext.Provider>
  );
};