import React, { useState } from 'react';
import { useBudget } from '../../hooks/useBudget';
import { BarChart3, ArrowRight, Save } from 'lucide-react';

const round = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

export default function AnalysisView() {
  const { config, monthlyData, updateAnalysisData } = useBudget();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [initialBalance, setInitialBalance] = useState(0); // Solde de départ (ex: fin décembre précédent)

  // Noms des mois
  const months = [
    { idx: '01', label: 'Janvier' }, { idx: '02', label: 'Février' }, { idx: '03', label: 'Mars' },
    { idx: '04', label: 'Avril' }, { idx: '05', label: 'Mai' }, { idx: '06', label: 'Juin' },
    { idx: '07', label: 'Juillet' }, { idx: '08', label: 'Août' }, { idx: '09', label: 'Septembre' },
    { idx: '10', label: 'Octobre' }, { idx: '11', label: 'Novembre' }, { idx: '12', label: 'Décembre' }
  ];

  // CALCULS DU TABLEAU
  // On calcule mois par mois en reportant le solde
  let carryOver = initialBalance;
  
  const annualData = months.map(m => {
    const monthKey = `${selectedYear}-${m.idx}`;
    const mData = monthlyData[monthKey] || {};

    // 1. REVENUS
    const totalRevenus = round((mData.revenusList || []).reduce((sum, r) => sum + (r.montant || 0), 0));

    // 2. DEPENSES
    // A. Fixes
    const totalFixe = round(config.postes.filter(p => p.type === 'fixe').reduce((sum, p) => sum + (mData.depenses?.[p.id] ?? p.montant), 0));
    const totalEpargneFixe = round(config.epargneCibles.reduce((sum, e) => sum + e.mensuel, 0)); // Camping car etc
    const totalChargesFixes = totalFixe + totalEpargneFixe;

    // B. Dépenses Courantes (4 colonnes) - Ce qui est DÉPENSÉ (Flexible)
    const totalFlexibleSpent = round((mData.flexibleExpenses || []).reduce((sum, e) => sum + e.amount, 0));

    // C. Enveloppes Obligatoires - Ce qui est VERSÉ (Budget Monthly si funded)
    const totalEnvObligatoires = config.envelopes
      .filter(e => e.category === 'courant')
      .reduce((sum, env) => sum + (mData[`funded_${env.id}`] ? env.budgetMonthly : 0), 0);

    // D. Enveloppes Secondaires - Ce qui est VERSÉ
    const totalEnvSecondaires = config.envelopes
      .filter(e => e.category === 'secondaire')
      .reduce((sum, env) => sum + (mData[`funded_${env.id}`] ? env.budgetMonthly : 0), 0);

    // E. Provisions (Virement pour N+1) - Ce qui est VERSÉ
    const nextYear = String(parseInt(selectedYear) + 1);
    const provisionsNextYear = config.provisionsByYear?.[nextYear] || [];
    const monthlyProvisionAmount = Math.round(round(provisionsNextYear.reduce((sum, p) => sum + (p.amount || 0), 0)) / 12);
    const totalProvisionVirement = mData.provisionDone ? monthlyProvisionAmount : 0;

    // TOTAL SORTIES
    const totalSorties = round(totalChargesFixes + totalFlexibleSpent + totalEnvObligatoires + totalEnvSecondaires + totalProvisionVirement);

    // 3. RESULTAT AVANT ALLOCATION
    // Solde théorique = Report Mois Précédent + Revenus - Sorties
    const soldeAvantAlloc = round(carryOver + totalRevenus - totalSorties);

    // 4. ALLOCATIONS MANUELLES (Ce que l'utilisateur décide de faire du surplus)
    const allocSavings = mData.alloc_savings || 0;
    const allocProjects = mData.alloc_projects || 0;
    const note = mData.analysis_note || '';

    // 5. SOLDE FINAL (REPORT A NOUVEAU)
    // C'est ce qui reste après avoir mis de côté
    const soldeFinal = round(soldeAvantAlloc - allocSavings - allocProjects);
    
    // Mise à jour du carryOver pour le prochain tour de boucle
    carryOver = soldeFinal;

    return {
      monthKey,
      label: m.label,
      totalRevenus,
      totalChargesFixes,
      totalFlexibleSpent,
      totalEnvObligatoires,
      totalEnvSecondaires,
      totalProvisionVirement,
      totalSorties,
      soldeAvantAlloc,
      allocSavings,
      allocProjects,
      soldeFinal,
      note
    };
  });

  return (
    <div className="max-w-full mx-auto p-4 pb-20 space-y-8 overflow-x-hidden">
      
      {/* HEADER */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-3">
            <BarChart3 className="text-blue-400" size={32} /> 
            Vue Annuelle & Trésorerie
          </h2>
          <p className="text-slate-400 text-sm mt-1">Pilotage du Reste à Vivre et des reports mensuels.</p>
        </div>
        <div className="flex items-center gap-4 bg-white/10 p-2 rounded-xl">
           <span className="font-bold text-sm">Année :</span>
           <select 
             value={selectedYear} 
             onChange={(e) => setSelectedYear(e.target.value)} 
             className="bg-slate-800 border-none font-black text-xl text-white cursor-pointer rounded outline-none"
           >
             {[2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>{y}</option>)}
           </select>
        </div>
      </div>

      {/* TABLEAU */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-4 sticky left-0 bg-slate-50 z-10 min-w-[150px]">Rubriques</th>
                {annualData.map(d => (
                  <th key={d.monthKey} className="p-4 text-right min-w-[120px]">{d.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              
              {/* LIGNE 0 : Report (Solde précédent) */}
              <tr className="bg-blue-50/30">
                <td className="p-4 sticky left-0 bg-blue-50/30 font-bold text-blue-700">Solde Précédent</td>
                {annualData.map((d, i) => (
                  <td key={d.monthKey} className="p-4 text-right font-bold text-blue-600">
                    {i === 0 ? (
                       <div className="flex items-center justify-end gap-1">
                          <input 
                            type="number" 
                            value={initialBalance} 
                            onChange={(e) => setInitialBalance(parseFloat(e.target.value)||0)}
                            className="w-16 bg-white border border-blue-200 rounded px-1 text-right text-xs"
                          />
                          <span>€</span>
                       </div>
                    ) : (
                       <span>{round(annualData[i-1].soldeFinal).toLocaleString()} €</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* LIGNE 1 : Revenus */}
              <tr>
                <td className="p-4 sticky left-0 bg-white font-bold">Total Revenus (+)</td>
                {annualData.map(d => (
                  <td key={d.monthKey} className="p-4 text-right text-emerald-600 font-bold">
                    {d.totalRevenus.toLocaleString()} €
                  </td>
                ))}
              </tr>

              {/* SEPARATEUR DISPO */}
              <tr className="bg-slate-100/50 font-black">
                <td className="p-4 sticky left-0 bg-slate-100">Total Disponible</td>
                {annualData.map((d, i) => {
                  const prev = i === 0 ? initialBalance : annualData[i-1].soldeFinal;
                  return (
                    <td key={d.monthKey} className="p-4 text-right">
                      {round(prev + d.totalRevenus).toLocaleString()} €
                    </td>
                  );
                })}
              </tr>

              {/* DEPENSES */}
              <tr>
                <td className="p-4 sticky left-0 bg-white">Charges Fixes (-)</td>
                {annualData.map(d => <td key={d.monthKey} className="p-4 text-right text-red-400">{d.totalChargesFixes.toLocaleString()} €</td>)}
              </tr>
              <tr>
                <td className="p-4 sticky left-0 bg-white">Dépenses Courantes (Courses...) (-)</td>
                {annualData.map(d => <td key={d.monthKey} className="p-4 text-right text-orange-500">{d.totalFlexibleSpent.toLocaleString()} €</td>)}
              </tr>
              <tr>
                <td className="p-4 sticky left-0 bg-white">Env. Obligatoires (Versé) (-)</td>
                {annualData.map(d => <td key={d.monthKey} className="p-4 text-right text-slate-500">{d.totalEnvObligatoires.toLocaleString()} €</td>)}
              </tr>
              <tr>
                <td className="p-4 sticky left-0 bg-white">Env. Secondaires (Versé) (-)</td>
                {annualData.map(d => <td key={d.monthKey} className="p-4 text-right text-slate-500">{d.totalEnvSecondaires.toLocaleString()} €</td>)}
              </tr>
              <tr>
                <td className="p-4 sticky left-0 bg-white">Provisions N+1 (Versé) (-)</td>
                {annualData.map(d => <td key={d.monthKey} className="p-4 text-right text-blue-500">{d.totalProvisionVirement.toLocaleString()} €</td>)}
              </tr>

              {/* RESULTAT INTERMEDIAIRE */}
              <tr className="bg-slate-50 font-black text-slate-800 border-t-2 border-slate-200">
                <td className="p-4 sticky left-0 bg-slate-50">Surplus / Déficit (Avant Alloc.)</td>
                {annualData.map(d => (
                  <td key={d.monthKey} className={`p-4 text-right ${d.soldeAvantAlloc >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {d.soldeAvantAlloc.toLocaleString()} €
                  </td>
                ))}
              </tr>

              {/* ALLOCATIONS */}
              <tr className="bg-purple-50/30">
                <td className="p-4 sticky left-0 bg-purple-50/30 text-purple-700 font-bold text-xs">Vers Épargne (Précaution)</td>
                {annualData.map(d => (
                  <td key={d.monthKey} className="p-2 text-right">
                    <input 
                      type="number" 
                      value={d.allocSavings || ''} 
                      onChange={(e) => updateAnalysisData(d.monthKey, 'alloc_savings', e.target.value)}
                      placeholder="0"
                      className="w-20 text-right p-1 rounded border border-purple-100 text-xs bg-white focus:border-purple-400 outline-none"
                    />
                  </td>
                ))}
              </tr>
              <tr className="bg-indigo-50/30">
                <td className="p-4 sticky left-0 bg-indigo-50/30 text-indigo-700 font-bold text-xs">Vers Projets</td>
                {annualData.map(d => (
                  <td key={d.monthKey} className="p-2 text-right">
                    <input 
                      type="number" 
                      value={d.allocProjects || ''} 
                      onChange={(e) => updateAnalysisData(d.monthKey, 'alloc_projects', e.target.value)}
                      placeholder="0"
                      className="w-20 text-right p-1 rounded border border-indigo-100 text-xs bg-white focus:border-indigo-400 outline-none"
                    />
                  </td>
                ))}
              </tr>

              {/* REPORT A NOUVEAU FINAL */}
              <tr className="bg-emerald-50 border-t-2 border-emerald-100 font-black text-lg">
                <td className="p-4 sticky left-0 bg-emerald-50 text-emerald-800">RESTE (Report N+1)</td>
                {annualData.map(d => (
                  <td key={d.monthKey} className="p-4 text-right text-emerald-700">
                     {d.soldeFinal.toLocaleString()} €
                  </td>
                ))}
              </tr>

              {/* NOTES */}
              <tr>
                <td className="p-4 sticky left-0 bg-white font-bold text-xs text-slate-400">Notes</td>
                {annualData.map(d => (
                  <td key={d.monthKey} className="p-2 min-w-[150px]">
                    <textarea 
                      value={d.note} 
                      onChange={(e) => updateAnalysisData(d.monthKey, 'analysis_note', e.target.value)}
                      placeholder="Note..."
                      rows="2"
                      className="w-full text-[10px] p-1.5 rounded border border-slate-100 bg-slate-50 resize-none focus:bg-white outline-none"
                    />
                  </td>
                ))}
              </tr>

            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}