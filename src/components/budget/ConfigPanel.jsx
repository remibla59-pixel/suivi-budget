import React from 'react';
import { useBudget } from '../../hooks/useBudget';
import { 
  Trash2, PlusCircle, Wallet, PiggyBank, 
  ShieldCheck, CreditCard, AlertOctagon
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';

const SmartInput = ({ value, onChange, placeholder, isNumber, icon }) => {
  const handleFocus = (e) => {
    const val = e.target.value;
    if (val === '0' || (typeof val === 'string' && val.includes('Nouveau'))) {
      onChange('');
    }
  };
  return (
    <Input
      type={isNumber ? "number" : "text"}
      value={value}
      onFocus={handleFocus}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      icon={icon}
      className={isNumber ? 'w-32' : 'flex-1'}
    />
  );
};

export default function ConfigPanel() {
  const { 
    config, updateConfigPoste, addConfigPoste, removeConfigPoste, 
    updateAccountInitial, setProvisionAccount, resetAllData 
  } = useBudget();

  return (
    <div className="max-w-4xl mx-auto p-4 pb-20 space-y-4">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 px-2">
        <div>
          <h2 className="text-3xl font-black text-slate-800">Paramètres</h2>
          <p className="text-slate-500 font-medium">Structurez vos comptes et charges fixes</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <Wallet className="text-slate-400" size={24} />
          <h3 className="text-lg font-bold text-slate-700 uppercase tracking-wider">Mes Comptes & Soldes</h3>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {(config.comptes || []).map(compte => (
              <div key={compte.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 gap-4">
                <div className="flex items-center gap-4">
                   <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100"><CreditCard size={20} className="text-blue-500" /></div>
                   <div>
                     <span className="font-bold text-slate-700 block">{compte.label}</span>
                     <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">{compte.type}</span>
                   </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">Solde Actuel</span>
                    <div className="flex items-center gap-2">
                      <SmartInput isNumber value={compte.initial} onChange={(v) => updateAccountInitial(compte.id, v)} />
                      <span className="text-slate-400 font-bold">€</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-blue-50/50 border-blue-100">
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-blue-700 font-bold"><PiggyBank size={20} /><span>Cible des Provisions</span></div>
            <Select 
              value={config.provisionAccountId || ''} 
              onChange={(e) => setProvisionAccount(e.target.value)}
              options={[
                { value: '', label: 'Sélectionner un compte' },
                ...config.comptes.map(c => ({ value: c.id, label: c.label }))
              ]}
            />
          </CardContent>
        </Card>
        
        <Card className="bg-emerald-50/50 border-emerald-100">
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-700 font-bold"><ShieldCheck size={20} /><span>Cible Épargne Précaution</span></div>
            <div className="w-full p-3 rounded-2xl bg-white border border-emerald-100 shadow-sm font-bold text-emerald-900 text-sm">
              Livret A Véro (Précaution)
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <CreditCard className="text-slate-400" size={24} />
            <h3 className="text-lg font-bold text-slate-700 uppercase tracking-wider">Prélèvements Fixes</h3>
          </div>
          <Button size="sm" onClick={() => addConfigPoste('fixe')} icon={PlusCircle}>
            Ajouter
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {config.postes.filter(p => p.type === 'fixe').map(poste => (
              <div key={poste.id} className="flex gap-3 items-center group">
                <SmartInput value={poste.label} onChange={(v) => updateConfigPoste({ ...poste, label: v })} placeholder="Nom" />
                <div className="flex items-center gap-2">
                  <SmartInput isNumber value={poste.montant} onChange={(v) => updateConfigPoste({ ...poste, montant: parseFloat(v) || 0 })} />
                  <span className="text-slate-400 font-bold">€</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"
                  onClick={() => { if(confirm("Supprimer ?")) removeConfigPoste(poste.id); }}
                  icon={Trash2}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* DANGER ZONE */}
      <Card className="border-red-100 bg-red-50/30">
        <CardContent>
          <h3 className="text-red-600 font-bold flex items-center gap-2 mb-2"><AlertOctagon size={20}/> Zone de Danger</h3>
          <p className="text-xs text-red-500 mb-4 font-medium">La suppression des données est définitive. Sauvegardez vos chiffres importants ailleurs avant de continuer.</p>
          <Button variant="danger" onClick={resetAllData} icon={Trash2}>
            Réinitialiser toute l'application
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}