import { FormEvent, useEffect, useRef, useState } from 'react';
import { lockHint, removePassword, verifyPassword } from '../utils/devLock';

interface Props {
  onUnlock: () => void;
  onCancel: () => void;
}

/** Sperrbildschirm vor der Dev-Ansicht. Ersetzt dort die einfache Rückfrage. */
export function DevLockDialog({ onUnlock, onCancel }: Props) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [resetting, setResetting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const hint = lockHint();

  useEffect(() => inputRef.current?.focus(), []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (await verifyPassword(password)) {
      onUnlock();
      return;
    }
    setAttempts(a => a + 1);
    setError('Passwort stimmt nicht.');
    setPassword('');
    inputRef.current?.focus();
  };

  const doReset = () => {
    removePassword();
    onUnlock();
  };

  return (
    <div className="anim-fade fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onCancel} role="presentation">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dev-lock-title"
        className="anim-dialog w-full max-w-md rounded-2xl bg-vsg-navy-900 border border-white/15 shadow-2xl p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="text-3xl leading-none">🔒</span>
          <div className="min-w-0">
            <h2 id="dev-lock-title" className="text-lg font-bold">Entwickler-Ansicht ist gesperrt</h2>
            <p className="mt-2 text-sm text-vsg-ice">
              Dort lässt sich <strong className="text-white">alles ändern und löschen</strong>. Im Spiel brauchst du sie nicht.
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="mt-5">
          <label className="block text-sm text-vsg-ice" htmlFor="dev-pw">
            Passwort
          </label>
          <input
            id="dev-pw"
            ref={inputRef}
            type="password"
            value={password}
            onChange={e => {
              setPassword(e.target.value);
              setError(null);
            }}
            autoComplete="current-password"
            className="mt-1 w-full h-11 px-3 rounded-lg bg-black/40 border border-white/15 focus:border-vsg-cyan outline-none text-white"
          />
          {hint && <p className="mt-2 text-xs text-white/40">Merkhilfe: {hint}</p>}
          {error && <p className="mt-2 text-sm text-amber-300">{error}</p>}

          <div className="mt-5 flex gap-2">
            <button type="button" onClick={onCancel} className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/15 font-semibold">
              Abbrechen
            </button>
            <button type="submit" disabled={!password} className="flex-1 py-3 rounded-xl bg-vsg-blue hover:bg-vsg-cyan disabled:opacity-40 font-bold">
              Entsperren
            </button>
          </div>
        </form>

        {/* Nach mehreren Fehlversuchen ein Ausweg - sonst waere man auf dem
            Geraet dauerhaft ausgesperrt. Sounds bleiben dabei erhalten. */}
        {attempts >= 3 && !resetting && (
          <button onClick={() => setResetting(true)} className="mt-4 text-xs text-white/40 hover:text-white/70 underline">
            Passwort vergessen?
          </button>
        )}
        {resetting && (
          <div className="mt-4 rounded-xl bg-amber-400/10 border border-amber-400/30 p-3">
            <p className="text-sm text-amber-200">
              Sperre entfernen? Deine Buttons und Sounds bleiben vollständig erhalten – nur das Passwort wird gelöscht.
            </p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => setResetting(false)} className="flex-1 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm font-medium">
                Doch nicht
              </button>
              <button onClick={doReset} className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold">
                Sperre entfernen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
