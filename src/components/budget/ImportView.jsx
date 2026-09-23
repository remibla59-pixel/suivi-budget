import React, { useMemo, useState } from 'react';
import { useBudget } from '../../hooks/useBudget';
import { FileUp, Landmark, CheckCircle2, TriangleAlert, Lock, EyeOff, Sparkles, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { parseOfx, transactionsPeriod } from '../../lib/ofxParser';
import { buildImportCandidates, decodeTarget } from '../../lib/bankImport';
import { formatShortDate } from '../../lib/budgetMeta';

// Motifs d'abandon renvoyés par applyBankImport, en clair pour l'utilisateur.
const SKIP_REASONS = {
  closed: 'mois clôturé',
  alreadyPaid: 'déjà payée',
  date: 'date illisible',
  target: 'cible inconnue',
};

const ReasonBadge = ({ reason }) => (
  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5">
    <TriangleAlert size={10} /> {SKIP_REASONS[reason] || reason}
  </span>
);

export default function ImportView() {
  const {
    config,
    monthlyData,
    currentMonth,
    importBankTransactions,
    forgetBankImportRule,
    clearBankImportRules,
  } = useBudget();

  const [rows, setRows] = useState([]);
  const [duplicates, setDuplicates] = useState([]);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [hideIgnored, setHideIgnored] = useState(true);
  const [learn, setLearn] = useState(true);

  const currentYear = currentMonth.split('-')[0];

  // Cibles possibles pour chaque ligne : elles viennent uniquement de la config actuelle.
  const targetOptions = useMemo(() => {
    const options = [
      { value: 'none', label: 'Ignorer cette ligne' },
      { value: 'income', label: "Entrée d'argent (revenu)" },
    ];
    (config.postes || [])
      .filter((p) => p.type === 'fixe')
      .forEach((p) => options.push({ value: `fixed:${p.id}`, label: `Charge fixe — ${p.label}` }));
    (config.budgetsFlexibles || [])
      .forEach((b) => options.push({ value: `flexible:${b.id}`, label: `Dépense courante — ${b.label}` }));
    (config.envelopes || [])
      .forEach((e) => options.push({ value: `envelope:${e.id}`, label: `Enveloppe — ${e.label}` }));
    (((config.provisionsByYear || {})[currentYear]) || [])
      .forEach((p) => options.push({ value: `provision:${p.id}`, label: `Facture provisionnée — ${p.label}` }));
    return options;
  }, [config, currentYear]);

  // Libellé lisible d'une cible mémorisée (elle peut pointer vers un élément supprimé depuis).
  const targetLabels = useMemo(
    () => new Map(targetOptions.map((o) => [o.value, o.label])),
    [targetOptions]
  );
  const rules = config.bankImportRules || [];

  const visibleRows = hideIgnored
    ? rows.filter((r) => r.include && decodeTarget(r.target).kind !== 'none')
    : rows;
  const selectedCount = rows.filter((r) => r.include && decodeTarget(r.target).kind !== 'none').length;

  const updateRow = (key, patch) => setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const reset = () => {
    setRows([]);
    setDuplicates([]);
    setMeta(null);
    setError('');
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // permet de re-sélectionner le même fichier
    if (!file) return;
    setResult(null);
    try {
      const parsed = parseOfx(await file.text());
      if (parsed.transactions.length === 0) {
        reset();
        setError("Aucune opération lisible. Vérifiez que le fichier est bien un relevé OFX (.ofx/.qfx).");
        return;
      }
      const { rows: candidates, duplicates: alreadyImported } = buildImportCandidates(parsed.transactions, {
        importedKeys: config.bankImportKeys || [],
        config,
      });
      setRows(candidates);
      setDuplicates(alreadyImported);
      setError('');
      setMeta({
        fileName: file.name,
        format: parsed.format,
        currency: parsed.currency,
        accounts: parsed.accounts,
        total: parsed.transactions.length,
        period: transactionsPeriod(parsed.transactions),
      });
    } catch {
      reset();
      setError("Lecture impossible : le fichier n'a pas pu être ouvert.");
    }
  };

  const handleApply = () => {
    const applied = importBankTransactions(rows, { learn });
    if (!applied) return;
    setResult(applied);
    reset();
  };

  return (
    <div className="max-w-5xl mx-auto p-2 sm:p-4 space-y-6 pb-24">
      <div className="px-2">
        <h2 className="text-3xl font-black text-slate-800">Importer un relevé</h2>
        <p className="text-slate-500 font-medium">
          Rapprochez les opérations de votre compte bancaire avec vos charges fixes, vos enveloppes et vos provisions.
        </p>
      </div>

      {/* 1. CHOIX DU FICHIER */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <Landmark className="text-slate-400" size={24} />
          <h3 className="text-lg font-bold text-slate-700 uppercase tracking-wider">Fichier OFX</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <label className="flex-1 cursor-pointer">
              <input type="file" accept=".ofx,.qfx,text/plain" onChange={handleFile} className="hidden" />
              <span className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition-colors rounded-2xl py-6 text-sm font-bold text-slate-500">
                <FileUp size={18} /> Choisir un relevé OFX
              </span>
            </label>
          </div>
          <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
            Banque Populaire : espace client → « Comptes » → « Télécharger les opérations » → format <b>OFX (Money)</b>.
            Les opérations déjà importées sont automatiquement écartées.
          </p>
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-600 rounded-2xl p-4 text-xs font-bold">
              <TriangleAlert size={16} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. RÉCAPITULATIF DU RELEVÉ */}
      {meta && (
        <Card className="bg-blue-50/50 border-blue-100">
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Format</div>
              <div className="font-black text-blue-900">{meta.format}</div>
            </div>
            <div>
              <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Période</div>
              <div className="font-black text-blue-900">
                {meta.period.from ? `${formatShortDate(meta.period.from)} → ${formatShortDate(meta.period.to)}` : '—'}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Opérations</div>
              <div className="font-black text-blue-900">
                {selectedCount} / {rows.length}
                {duplicates.length > 0 && <span className="text-blue-400 font-bold"> (+{duplicates.length} déjà importées)</span>}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Compte</div>
              <div className="font-black text-blue-900 truncate" title={meta.accounts.map((a) => a.acctId).join(', ')}>
                {meta.accounts.length ? `•••• ${meta.accounts[0].acctId.slice(-4)}` : meta.fileName}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. LIGNES À RAPPROCHER */}
      {rows.length > 0 && (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-slate-700 uppercase tracking-wider">Rapprochement</h3>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                icon={EyeOff}
                onClick={() => setHideIgnored((v) => !v)}
              >
                {hideIgnored ? 'Afficher tout' : 'Masquer les lignes ignorées'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRows((prev) => prev.map((r) => ({ ...r, include: true })))}
              >
                Tout inclure
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-2 sm:p-4 space-y-2">
            {visibleRows.length === 0 && (
              <div className="text-center text-xs italic text-slate-400 py-8">
                Aucune ligne à importer : tout est déjà rapproché ou ignoré.
              </div>
            )}
            {visibleRows.map((row) => {
              const closedMonth = Boolean(monthlyData[row.monthKey]?.isClosed);
              const isIgnored = decodeTarget(row.target).kind === 'none';
              return (
                <div
                  key={row.key}
                  className={`flex flex-col lg:flex-row lg:items-center gap-3 p-3 rounded-2xl border transition-colors ${
                    row.include && !isIgnored ? 'bg-white border-slate-100' : 'bg-slate-50/60 border-slate-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={row.include}
                    onChange={(e) => updateRow(row.key, { include: e.target.checked })}
                    className="w-4 h-4 accent-blue-600 shrink-0 self-start lg:self-center mt-1 lg:mt-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {formatShortDate(row.date)}
                      </span>
                      {closedMonth && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">
                          <Lock size={10} /> mois clôturé
                        </span>
                      )}
                      {row.targetSource === 'memory' && !isIgnored && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5">
                          <Sparkles size={10} /> mémorisé
                        </span>
                      )}
                      {row.targetSource === 'auto' && !isIgnored && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">auto</span>
                      )}
                    </div>
                    <div className="text-sm font-bold text-slate-800 truncate" title={row.label}>
                      {row.label}
                    </div>
                    {row.name && row.name !== row.label && (
                      <div className="text-[10px] font-bold text-slate-400 truncate">{row.name}</div>
                    )}
                  </div>
                  <div className={`text-right font-black shrink-0 ${row.amount < 0 ? 'text-slate-900' : 'text-emerald-600'}`}>
                    {row.amount < 0 ? '' : '+'}{row.amount.toLocaleString()} €
                  </div>
                  <select
                    value={row.target}
                    onChange={(e) => updateRow(row.key, { target: e.target.value, targetSource: 'manual' })}
                    className="w-full lg:w-72 shrink-0 bg-slate-50 border border-slate-200 rounded-2xl py-2 px-3 text-xs font-bold outline-none focus:border-blue-500 focus:bg-white"
                  >
                    {targetOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* 4. VALIDATION */}
      {rows.length > 0 && (
        <div className="flex flex-col items-center gap-3">
          <Button variant="dark" size="lg" className="px-12 py-6 rounded-full border-4 border-slate-100" onClick={handleApply} icon={CheckCircle2}>
            Importer {selectedCount} opération{selectedCount > 1 ? 's' : ''}
          </Button>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-500 cursor-pointer">
            <input
              type="checkbox"
              checked={learn}
              onChange={(e) => setLearn(e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
            Mémoriser mes classements pour les prochains imports
          </label>
          <p className="text-[11px] text-slate-400 font-medium text-center max-w-xl">
            Les charges fixes sont marquées payées et le compte courant est débité ; les enveloppes et les provisions sont
            impactées comme lors d'une saisie manuelle. Les mois clôturés sont ignorés.
          </p>
        </div>
      )}

      {/* 5. CLASSEMENTS MÉMORISÉS */}
      {rules.length > 0 && (
        <Card className="bg-slate-50/60">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Sparkles className="text-blue-400" size={24} />
              <h3 className="text-lg font-bold text-slate-700 uppercase tracking-wider">
                Classements mémorisés ({rules.length})
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              icon={Trash2}
              onClick={() => {
                if (window.confirm('Oublier tous les classements mémorisés ? Les prochains imports reviendront à la détection automatique.')) {
                  clearBankImportRules();
                }
              }}
            >
              Tout oublier
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
              Ces libellés sont reconnus automatiquement au prochain import. Modifiez la cible d&apos;une ligne
              ci-dessus puis importez pour mettre à jour son rappel.
            </p>
            {rules.map((rule) => (
              <div
                key={rule.match}
                className="flex items-center justify-between gap-3 bg-white border border-slate-100 rounded-2xl px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-700 truncate" title={rule.label || rule.match}>
                    {rule.label || rule.match}
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 truncate">
                    {targetLabels.get(rule.target) || (
                      <span className="text-amber-600">cible supprimée — règle inutilisée</span>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => forgetBankImportRule(rule.match)}>
                  Oublier
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 6. RÉSULTAT */}
      {result && (
        <Card className={result.summary.count > 0 ? 'border-emerald-100 bg-emerald-50/40' : 'border-amber-100 bg-amber-50/40'}>
          <CardContent className="space-y-3">
            <h3 className={`font-black flex items-center gap-2 ${result.summary.count > 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
              {result.summary.count > 0 ? <CheckCircle2 size={20} /> : <TriangleAlert size={20} />}
              {result.summary.count > 0
                ? `${result.summary.count} opération${result.summary.count > 1 ? 's' : ''} importée${result.summary.count > 1 ? 's' : ''}`
                : "Aucune opération importée"}
            </h3>
            {result.summary.count > 0 && (
              <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-600">
                <span>Dépenses : {result.summary.totalOut.toLocaleString()} €</span>
                <span>Entrées : {result.summary.totalIn.toLocaleString()} €</span>
                <span>Mois : {result.summary.months.map((m) => m).join(', ')}</span>
              </div>
            )}
            {result.skipped.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-white/60">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {result.skipped.length} ligne{result.skipped.length > 1 ? 's' : ''} non importée{result.skipped.length > 1 ? 's' : ''}
                </div>
                {result.skipped.slice(0, 8).map((row) => (
                  <div key={`${row.key}-${row.reason}`} className="flex items-center justify-between gap-3 text-[11px]">
                    <span className="font-bold text-slate-600 truncate">{row.label || row.name || 'Opération'}</span>
                    <ReasonBadge reason={row.reason} />
                  </div>
                ))}
                {result.skipped.length > 8 && (
                  <div className="text-[10px] font-bold text-slate-400">… et {result.skipped.length - 8} autres</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
