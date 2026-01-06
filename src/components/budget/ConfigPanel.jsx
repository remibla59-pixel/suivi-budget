import React from 'react';
import { useBudget } from '../../hooks/useBudget';
import { Trash2, PlusCircle, Save } from 'lucide-react';

const SectionConfig = ({ title, type, data, onUpdate, onRemove, onAdd }) => (
  <div className="mb-8 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-lg font-bold text-slate-700">{title}</h3>
      <button onClick={() => onAdd(type)} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-medium">
        <PlusCircle size={16} /> Ajouter
      </button>
    </div>
    <div className="space-y-3">
      {data.filter(p => p.type === type).map(poste => (
        <div key={poste.id} className="flex gap-3 items-center">
          <input 
            type="text" 
            value={poste.label} 
            onChange={(e) => onUpdate({ ...poste, label: e.target.value })}
            className="flex-1 p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <div className="relative w-32">
            <input 
              type="number" 
              value={poste.montant} 
              onChange={(e) => onUpdate({ ...poste, montant: parseFloat(e.target.value) || 0 })}
              className="w-full p-2 border rounded text-right pr-8 font-mono"
            />
            <span className="absolute right-3 top-2 text-slate-400">€</span>
          </div>
          <button onClick={() => onRemove(poste.id)} className="text-red-400 hover:text-red-600 p-2">
            <Trash2 size={18} />
          </button>
        </div>
      ))}
      {data.filter(p => p.type === type).length === 0 && (
        <p className="text-slate-400 italic text-sm">Aucun poste défini.</p>
      )}
    </div>
  </div>
);

export default function ConfigPanel() {
  const { config, updateConfigPoste, addConfigPoste, removeConfigPoste } = useBudget();

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6 text-slate-800">🛠️ Configuration du Budget</h2>
      <p className="mb-6 text-slate-600">Définissez ici vos charges récurrentes et vos budgets cibles.</p>
      
      <SectionConfig 
        title="Dépenses Fixes (Abonnements, Crédits...)" 
        type="fixe" 
        data={config.postes} 
        onUpdate={updateConfigPoste} 
        onRemove={removeConfigPoste} 
        onAdd={addConfigPoste}
      />
      
      <SectionConfig 
        title="Enveloppes Obligatoires (Courses, Santé...)" 
        type="obligatoire" 
        data={config.postes} 
        onUpdate={updateConfigPoste} 
        onRemove={removeConfigPoste} 
        onAdd={addConfigPoste}
      />

      <SectionConfig 
        title="Enveloppes Secondaires (Loisirs, Cadeaux...)" 
        type="secondaire" 
        data={config.postes} 
        onUpdate={updateConfigPoste} 
        onRemove={removeConfigPoste} 
        onAdd={addConfigPoste}
      />
    </div>
  );
}