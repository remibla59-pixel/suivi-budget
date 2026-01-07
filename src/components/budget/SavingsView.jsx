import React, { useState } from 'react';
import { useBudget } from '../../hooks/useBudget';
import { ShieldCheck, ArrowRight, ArrowLeft, History } from 'lucide-react';

export default function SavingsView() {
  const { config, transferToSavings, retrieveFromSavings } = useBudget();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const savingsAccount = config.comptes.find(c => c.id === config.savingsAccountId) || { initial: 0 };
  const currentAccount = config.comptes.find(c => c.type === 'courant') || { initial: 0 };
  const history = config.savingsHistory || [];

  const handleTransfer = () => {
    if(!amount || amount <= 0) return;
    transferToSavings(amount, note || 'Virement ponctuel');
    setAmount(''); setNote('');
  };

  const handleRetrieve = () => {
    if(!amount || amount <= 0) return;
    if(confirm("Confirmer le retrait ?")) {
      retrieveFromSavings(amount, note || 'Retrait ponctuel');
      setAmount(''); setNote('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 pb-20 space-y-8">
      
      <div className="bg-gradient-to-r from-teal-800 to-emerald-700 text-white p-6 rounded-2xl shadow-xl flex items-center gap-4">
        <div className="p-3 bg-white/20 rounded-full"><ShieldCheck size={32} className="text-teal-100" /></div>
        <div><h2 className="text-2xl font-bold">Épargne de Précaution</h2><p className="text-teal-100 text-sm">Fonds d'urgence & Sécurité (Livret Véro)</p></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center">
           <span className="text-slate-400 text-xs font-bold uppercase mb-2">Compte Courant (Source)</span>
           <span className="text-3xl font-black text-slate-800">{Math.round(currentAccount.initial).toLocaleString()} €</span>
        </div>
        <div className="bg-emerald-50 p-6 rounded-xl shadow-sm border border-emerald-200 flex flex-col items-center transform scale-105">
           <span className="text-emerald-600 text-xs font-bold uppercase mb-2">Livret A Véro (Cible)</span>
           <span className="text-4xl font-black text-emerald-700">{Math.round(savingsAccount.initial).toLocaleString()} €</span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="max-w-md mx-auto space-y-6">
          <div className="space-y-4">
            <div className="relative">
               <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" className="w-full text-center text-4xl font-black p-4 border-b-2 border-slate-200 outline-none focus:border-emerald-500 text-slate-800 placeholder:text-slate-200"/>
               <span className="absolute right-4 top-6 text-slate-400 font-bold">€</span>
            </div>
            <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Ajouter une note (ex: Prime, Cadeau...)" className="w-full text-center text-sm p-3 bg-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-emerald-100"/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={handleTransfer} disabled={!amount} className="flex flex-col items-center justify-center p-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition shadow-lg disabled:opacity-50"><ArrowRight size={24} className="mb-2"/><span className="font-bold">Déposer</span></button>
            <button onClick={handleRetrieve} disabled={!amount} className="flex flex-col items-center justify-center p-4 bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition disabled:opacity-50"><ArrowLeft size={24} className="mb-2"/><span className="font-bold">Retirer</span></button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b flex items-center gap-2"><History size={16} className="text-slate-400"/><h3 className="text-xs font-bold uppercase text-slate-500">Derniers mouvements</h3></div>
        <div className="divide-y divide-slate-100">
           {history.length === 0 && <div className="p-4 text-center text-xs text-slate-400 italic">Aucun historique.</div>}
           {history.map(h => (
             <div key={h.id} className="p-3 flex justify-between items-center text-sm">
                <div><div className="font-bold text-slate-700">{h.note}</div><div className="text-xs text-slate-400">{h.date}</div></div>
                <div className={`font-mono font-bold ${h.type === 'depot' ? 'text-emerald-600' : 'text-orange-500'}`}>{h.type === 'depot' ? '+' : '-'}{h.amount} €</div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
}