import React from 'react';
import { useBudget } from '../../hooks/useBudget';
import { Wallet, PlusCircle, Trash2, Coins, CreditCard } from 'lucide-react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

const SmartInput = ({ value, onChange, placeholder, isNumber, label, className = '' }) => {
  const handleFocus = (e) => {
    const val = e.target.value;
    if (val === '0' || (typeof val === 'string' && val.includes('Nouvelle'))) {
      onChange('');
    }
  };

  return (
    <Input
      type={isNumber ? "number" : "text"}
      value={value}
      label={label}
      onFocus={handleFocus}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
    />
  );
};

export default function EnvelopesConfigView() {
  const { config, updateEnvelopeConfig, addEnvelopeConfig, removeEnvelopeConfig, updateFlexibleBudget } = useBudget();
  const envelopes = config.envelopes || [];
  const budgetsFlexibles = config.budgetsFlexibles || [];

  const renderEnvelopeSection = (title, category, Icon) => {
    const filteredEnvelopes = envelopes.filter(e => e.category === category);
    return (
      <Card className="mb-8">
        <CardHeader className="p-4 bg-slate-50/50 flex flex-row justify-between items-center border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Icon size={18} className="text-slate-400" />
            <h3 className="font-black text-slate-600 uppercase tracking-widest text-xs">{title}</h3>
          </div>
          <Button size="sm" onClick={() => addEnvelopeConfig(category)} icon={PlusCircle}>
            Ajouter
          </Button>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-slate-100">
          {filteredEnvelopes.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs italic">Aucune enveloppe configurée ici.</div>
          ) : (
            filteredEnvelopes.map(env => (
              <div key={env.id} className="p-6 grid grid-cols-1 md:grid-cols-12 gap-8 items-center hover:bg-slate-50/50 transition-colors group">
                <div className="col-span-4">
                  <SmartInput label="Nom de l'enveloppe" value={env.label} onChange={(v) => updateEnvelopeConfig({ ...env, label: v })} />
                </div>
                <div className="col-span-3">
                   <div className="flex items-center gap-2">
                     <SmartInput label="Solde Actuel" isNumber value={env.currentBalance} onChange={(v) => updateEnvelopeConfig({ ...env, currentBalance: parseFloat(v) || 0 })} className="flex-1" />
                     <span className="text-slate-300 font-black text-sm pt-6">€</span>
                   </div>
                </div>
                <div className="col-span-3">
                   <div className="flex items-center gap-2">
                     <SmartInput label="Versement Mensuel" isNumber value={env.budgetMonthly} onChange={(v) => updateEnvelopeConfig({ ...env, budgetMonthly: parseFloat(v) || 0 })} className="flex-1" />
                     <span className="text-blue-500 font-black text-sm pt-6">€</span>
                   </div>
                </div>
                <div className="col-span-2 flex justify-end pt-5">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => { if(confirm("Supprimer ?")) removeEnvelopeConfig(env.id); }} 
                    className="text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100"
                    icon={Trash2}
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="max-w-5xl mx-auto p-4 pb-20 space-y-8">
      <div className="bg-gradient-to-r from-emerald-800 to-teal-700 text-white p-8 rounded-3xl shadow-xl flex items-center gap-6">
        <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md"><Wallet className="text-emerald-300" size={32} /></div>
        <div>
          <h2 className="text-3xl font-black leading-tight">Configuration Budgets</h2>
          <p className="text-emerald-100 font-medium opacity-80 uppercase text-[10px] tracking-widest mt-1">Définissez vos objectifs de dépenses et vos cagnottes.</p>
        </div>
      </div>

      {/* SECTION BUDGETS FLEXIBLES (4 COLONNES) */}
      <Card className="border-blue-100 overflow-hidden mb-8">
        <CardHeader className="p-4 bg-blue-50/50 border-b border-blue-100 flex flex-row items-center gap-2">
           <CreditCard size={18} className="text-blue-600"/>
           <h3 className="font-black text-blue-800 uppercase tracking-widest text-xs">Dépenses Courantes (Objectifs Mensuels)</h3>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-slate-100">
           {budgetsFlexibles.map(budget => (
             <div key={budget.id} className="p-4 px-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center hover:bg-blue-50/30 transition-colors">
                <div className="col-span-6 font-black text-slate-700 uppercase text-sm tracking-tight">{budget.label}</div>
                <div className="col-span-6 flex items-center justify-end gap-3">
                   <label className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Budget Cible :</label>
                   <SmartInput isNumber value={budget.budget} onChange={(v) => updateFlexibleBudget(budget.id, v)} className="w-32" />
                   <span className="text-slate-400 font-black">€</span>
                </div>
             </div>
           ))}
        </CardContent>
      </Card>

      {renderEnvelopeSection("Enveloppes Obligatoires", "courant", Wallet)}
      {renderEnvelopeSection("Enveloppes Secondaires", "secondaire", Coins)}

      <div className="text-center text-[11px] text-slate-400 italic">Modifications sauvegardées automatiquement.</div>
    </div>
  );
}