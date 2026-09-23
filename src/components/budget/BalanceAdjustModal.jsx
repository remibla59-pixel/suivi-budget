import React, { useState } from 'react';
import { X, CheckCircle2, Scale } from 'lucide-react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { todayISO, formatShortDate } from '../../lib/budgetMeta';

const round = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

/**
 * Pop-up d'ajustement du solde réel d'un compte (rapprochement bancaire).
 * `account` = compte concerné | null
 * `history` = derniers ajustements de ce compte
 * onConfirm(nouveauSolde, dateISO, motif) n'est appelé qu'après confirmation explicite.
 */
export default function BalanceAdjustModal({ account, history = [], onConfirm, onClose }) {
  // Les valeurs de départ sont figées à l'ouverture (le parent remonte le composant via `key`)
  const [value, setValue] = useState(() => String(round(account?.initial || 0)));
  const [date, setDate] = useState(() => todayISO());
  const [note, setNote] = useState('');

  if (!account) return null;

  const current = round(account.initial || 0);
  const target = round(parseFloat(value) || 0);
  const delta = round(target - current);

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <Card className="w-full max-w-sm shadow-2xl border-none animate-in fade-in zoom-in-95 duration-200">
        <CardHeader className="bg-slate-900 text-white flex flex-row justify-between items-center p-4">
          <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2">
            <Scale size={16} /> Ajuster le solde réel
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white/60 hover:text-white hover:bg-white/10" icon={X} />
        </CardHeader>

        <CardContent className="p-6 space-y-5">
          <div className="text-center">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{account.label}</div>
            <div className="text-xs font-bold text-slate-400">
              Solde suivi par l'app : <span className="text-slate-700">{current.toLocaleString('fr-FR')} €</span>
            </div>
          </div>

          <Input
            label="Solde réel sur mon relevé"
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">Date de l'opération</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-50"
            />
          </div>

          <Input
            label="Motif (optionnel)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex: régul, oubli de dépense..."
          />

          <div className={`flex items-center justify-between rounded-2xl px-4 py-3 border font-black ${
            delta === 0 ? 'bg-slate-50 border-slate-200 text-slate-400'
              : delta > 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
              : 'bg-red-50 border-red-100 text-red-600'
          }`}>
            <span className="text-[10px] uppercase tracking-widest">Écart constaté</span>
            <span className="text-sm">{delta > 0 ? '+' : ''}{delta.toLocaleString('fr-FR')} €</span>
          </div>

          <p className="text-[11px] text-slate-600 leading-relaxed font-medium bg-amber-50 border border-amber-100 rounded-2xl p-3">
            Vérifiez votre relevé bancaire avant de confirmer : l'écart est enregistré comme une opération à la date choisie et le solde réel du compte est mis à jour.
          </p>

          {history.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Derniers ajustements</div>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {history.slice(0, 4).map((h) => (
                  <div key={h.id} className="flex justify-between text-[10px] font-bold text-slate-500 bg-slate-50 rounded-lg px-2 py-1">
                    <span>{formatShortDate(h.date)}</span>
                    <span className={h.delta > 0 ? 'text-emerald-600' : 'text-red-500'}>
                      {h.delta > 0 ? '+' : ''}{h.delta} €
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Button
              className="w-full py-4 rounded-2xl"
              icon={CheckCircle2}
              disabled={delta === 0}
              onClick={() => { onConfirm(target, date, note); onClose(); }}
            >
              Confirmer l'ajustement
            </Button>
            <Button variant="ghost" className="w-full" onClick={onClose}>Annuler</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
