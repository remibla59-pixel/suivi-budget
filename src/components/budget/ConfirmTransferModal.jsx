import React from 'react';
import { X, CheckCircle2, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { todayISO } from '../../lib/budgetMeta';

/**
 * Pop-up de confirmation d'un mouvement d'argent.
 * `transfer` = { from, to, amount, note, confirmLabel } | null
 * onConfirm(dateISO) n'est appelé que si l'utilisateur confirme que l'opération est faite.
 */
export default function ConfirmTransferModal({ transfer, onConfirm, onClose }) {
  if (!transfer) return null;
  const amount = parseFloat(transfer.amount) || 0;

  // Pas d'état ni d'effet : la date du champ repart de la date du jour à chaque
  // ouverture (la modale est démontée dès que `transfer` repasse à null).
  const handleSubmit = (event) => {
    event.preventDefault();
    const date = new FormData(event.currentTarget).get('operationDate');
    onConfirm(date || todayISO());
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        <Card className="w-full shadow-2xl border-none animate-in fade-in zoom-in-95 duration-200">
          <CardHeader className="bg-slate-900 text-white flex flex-row justify-between items-center p-4">
            <h3 className="font-black text-xs uppercase tracking-widest">Confirmation du mouvement</h3>
            <Button type="button" variant="ghost" size="icon" onClick={onClose} className="text-white/60 hover:text-white hover:bg-white/10" icon={X} />
          </CardHeader>

          <CardContent className="p-6 space-y-5">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                <span>{transfer.from}</span>
                <ArrowRight size={12} className="text-slate-300" />
                <span>{transfer.to}</span>
              </div>
              <div className="text-4xl font-black text-slate-800">{amount.toLocaleString('fr-FR')} €</div>
              {transfer.note && <div className="text-xs font-bold text-slate-400 mt-2 italic">{transfer.note}</div>}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date de l'opération</label>
              <input
                type="date"
                name="operationDate"
                defaultValue={todayISO()}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-50"
              />
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed font-medium bg-amber-50 border border-amber-100 rounded-2xl p-3">
              Vérifiez dans votre banque que l'opération a bien été effectuée avant de valider. Le montant sera débité du solde réel uniquement après confirmation.
            </p>

            <div className="space-y-2">
              <Button type="submit" className="w-full py-4 rounded-2xl" icon={CheckCircle2}>
                {transfer.confirmLabel || "Oui, l'opération est faite"}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={onClose}>
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
