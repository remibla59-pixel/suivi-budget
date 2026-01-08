import React, { useState } from 'react';
import { useBudget } from '../../hooks/useBudget';
import { ShieldCheck, ArrowRight, ArrowLeft, History } from 'lucide-react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

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
      
      <div className="bg-gradient-to-r from-teal-800 to-emerald-700 text-white p-8 rounded-3xl shadow-xl flex items-center gap-6">
        <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm"><ShieldCheck size={40} className="text-teal-100" /></div>
        <div>
          <h2 className="text-3xl font-black">Épargne de Précaution</h2>
          <p className="text-teal-100 font-medium opacity-80 uppercase text-xs tracking-widest mt-1">Fonds d'urgence & Sécurité (Livret Véro)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 flex flex-col items-center text-center">
           <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Compte Courant (Source)</span>
           <span className="text-3xl font-black text-slate-800">{Math.round(currentAccount.initial).toLocaleString()} €</span>
        </Card>
        <Card className="p-6 flex flex-col items-center text-center border-emerald-200 bg-emerald-50/30">
           <span className="text-emerald-600 text-[10px] font-black uppercase tracking-widest mb-2">Livret A Véro (Cible)</span>
           <span className="text-4xl font-black text-emerald-700">{Math.round(savingsAccount.initial).toLocaleString()} €</span>
        </Card>
      </div>

      <Card className="p-8">
        <div className="max-w-md mx-auto space-y-8">
          <div className="space-y-6">
            <div className="relative">
               <input 
                 type="number" 
                 value={amount} 
                 onChange={e => setAmount(e.target.value)} 
                 placeholder="0" 
                 className="w-full text-center text-5xl font-black p-4 bg-transparent outline-none text-slate-800 placeholder:text-slate-100"
               />
               <span className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-300 text-2xl font-black">€</span>
            </div>
            <Input 
              value={note} 
              onChange={e => setNote(e.target.value)} 
              placeholder="Ajouter une note (ex: Prime, Cadeau...)" 
              className="text-center"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Button size="lg" onClick={handleTransfer} disabled={!amount} icon={ArrowRight} className="flex-col h-24 rounded-3xl">
              Déposer
            </Button>
            <Button size="lg" variant="secondary" onClick={handleRetrieve} disabled={!amount} icon={ArrowLeft} className="flex-col h-24 rounded-3xl">
              Retirer
            </Button>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="p-4 bg-slate-50 flex flex-row items-center gap-2">
          <History size={16} className="text-slate-400"/>
          <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest">Derniers mouvements</h3>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-slate-100">
           {history.length === 0 ? (
             <div className="p-8 text-center text-sm text-slate-400 italic">Aucun historique.</div>
           ) : (
             history.map(h => (
               <div key={h.id} className="p-4 flex justify-between items-center hover:bg-slate-50/50 transition-colors">
                  <div>
                    <div className="font-bold text-slate-700">{h.note}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{h.date}</div>
                  </div>
                  <div className={`font-mono font-black text-lg ${h.type === 'depot' ? 'text-emerald-600' : 'text-orange-500'}`}>
                    {h.type === 'depot' ? '+' : '-'}{h.amount} €
                  </div>
               </div>
             ))
           )}
        </CardContent>
      </Card>
    </div>
  );
}