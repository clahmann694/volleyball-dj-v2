import { useEffect, useRef } from 'react';

interface Props {
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Sicherheitsabfrage vor dem Wechsel in die Dev-Ansicht: Dort laesst sich
 * alles aendern und loeschen - im Spielbetrieb soll niemand aus Versehen
 * dort landen.
 */
export function ConfirmDevDialog({ onConfirm, onCancel }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  // Fokus auf "Abbrechen", damit Enter nicht versehentlich bestaetigt
  useEffect(() => cancelRef.current?.focus(), []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onCancel} role="presentation">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dev-dialog-title"
        className="w-full max-w-md rounded-2xl bg-vsg-navy-900 border border-amber-400/40 shadow-2xl p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="text-3xl leading-none">⚠️</span>
          <div>
            <h2 id="dev-dialog-title" className="text-lg font-bold">Wirklich zur Entwickler-Ansicht?</h2>
            <p className="mt-2 text-sm text-vsg-ice">
              Dort kannst du <strong className="text-white">alles ändern und auch löschen</strong> – Buttons, Sounds, Cue-Points, die
              ganze Einrichtung. Änderungen wirken sofort; Gelöschtes lässt sich nur aus einem Export wiederherstellen.
            </p>
            <p className="mt-2 text-sm text-vsg-ice">Im Spiel brauchst du diese Ansicht nicht.</p>
          </div>
        </div>
        <div className="mt-6 flex gap-2">
          <button ref={cancelRef} onClick={onCancel} className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/15 font-semibold">
            Abbrechen
          </button>
          <button onClick={onConfirm} className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold">
            Ja, zur Dev-Ansicht
          </button>
        </div>
      </div>
    </div>
  );
}
