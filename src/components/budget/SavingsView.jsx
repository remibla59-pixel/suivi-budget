import React, { useState } from 'react';
import { useBudget } from '../../hooks/useBudget';
import { ShieldCheck, ArrowRight, ArrowLeft, TrendingUp } from 'lucide-react';

export default function SavingsView() {
  const { config, transferToSavings, retrieveFromSavings } = useBudget();
  const [amount, setAmount] = useState('');

  // Trouver le compte Epargne Précaution (Véro)
  const savingsAccount = config.comptes.find(c => c.id === config.savingsAccountId) || { initial: 0 };
  const currentAccount = config.comptes.find(c => c.type === 'courant') || { initial: 0 };

  const handleTransfer = () => {
    if(!amount || amount <= 0) return;
    if(confirm(`Virer ${amount}€ du Compte Courant vers Livret Véro ?`)) {
      transferToSavings(amount);
      setAmount('');
    }
  };

  const handleRetrieve = () => {
    if(!amount || amount <= 0) return;
    if(confirm(`Récupérer ${amount}€ du Livret Véro vers Compte Courant ?`)) {
      retrieveFromSavings(amount);
      setAmount('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 pb-20 space-y-8">
      
      {/* HEADER */}
      <div className="bg-gradient-to-r from-teal-800 to-emerald-700 text-white p-6 rounded-2xl shadow-xl flex items-center gap-4">
        <div className="p-3 bg-white/20 rounded-full">
           <ShieldCheck size={40} className="text-teal-100" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Épargne de Précaution</h2>
          <p className="text-teal-100 text-sm">Livret A Véro • Fonds d'urgence</p>
        </div>
      </div>

      {/* SOLDES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center">
           <span className="text-slate-400 text-sm font-bold uppercase mb-2">Compte Courant (Source)</span>
           <span className="text-4xl font-bold text-slate-800">{Math.round(currentAccount.initial).toLocaleString()} €</span>
        </div>
        <div className="bg-emerald-50 p-6 rounded-xl shadow-sm border border-emerald-200 flex flex-col items-center">
           <span className="text-emerald-600 text-sm font-bold uppercase mb-2">Livret A Véro (Cible)</span>
           <span className="text-4xl font-bold text-emerald-700">{Math.round(savingsAccount.initial).toLocaleString()} €</span>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <h3 className="text-lg font-bold text-slate-700 mb-6 text-center">Effectuer un virement</h3>
        
        <div className="flex flex-col items-center gap-6 max-w-md mx-auto">
          <div className="w-full relative">
            <input 
              type="number" 
              value={amount} 
              onChange={e => setAmount(e.target.value)} 
              placeholder="Montant (Ex: 500)"
              className="w-full text-center text-3xl font-bold p-4 border-b-2 border-slate-200 outline-none focus:border-blue-500 text-slate-700"
            />
            <span className="absolute right-2 top-6 text-slate-400 font-bold">€</span>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full">
            <button 
              onClick={handleTransfer}
              disabled={!amount}
              className="flex flex-col items-center justify-center p-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition shadow-lg disabled:opacity-50"
            >
              <ArrowRight size={24} className="mb-2"/>
              <span className="font-bold">Mettre de côté</span>
              <span className="text-xs opacity-80">Courant ➔ Livret Véro</span>
            </button>

            <button 
              onClick={handleRetrieve}
              disabled={!amount}
              className="flex flex-col items-center justify-center p-4 bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition disabled:opacity-50"
            >
              <ArrowLeft size={24} className="mb-2"/>
              <span className="font-bold">Récupérer</span>
              <span className="text-xs opacity-80">Livret Véro ➔ Courant</span>
            </button>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="flex items-start gap-3 bg-blue-50 p-4 rounded-lg text-blue-800 text-sm">
         <TrendingUp className="shrink-0 mt-0.5" size={18}/>
         <p>
           L'argent placé ici est sécurisé pour les coups durs. Utilisez le bouton "Récupérer" uniquement en cas d'urgence pour re-créditer votre compte courant instantanément.
         </p>
      </div>

    </div>
  );
}