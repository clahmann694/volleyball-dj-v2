import { FormEvent, useEffect, useRef, useState } from 'react';
import { lockHint, rememberUnlock, verifyPassword } from '../utils/devLock';

interface Props {
  onUnlock: () => void;
  onCancel: () => void;
}

/** Sperrbildschirm vor der Dev-Ansicht. Ersetzt dort die einfache Rückfrage. */
export function DevLockDialog({ onUnlock, onCancel }: Props) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const hint = lockHint();

  useEffect(() => inputRef.current?.focus(), []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (await verifyPassword(password)) {
      rememberUnlock();
      onUnlock();
      return;
    }
    setAttempts(a => a + 1);
    setError('Passwort stimmt nicht.');
    setPassword('');
    inputRef.current?.focus();
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

        {/* Bewusst KEIN Ausweg im Dialog - sonst koennte jeder Besucher die
            Sperre einfach wegklicken. Geaendert wird das Passwort nur im Projekt. */}
        {attempts >= 3 && (
          <p className="mt-4 text-xs text-white/40">
            Das Passwort lässt sich nur beim Veröffentlichen der App ändern, nicht hier.
          </p>
        )}
      </div>
    </div>
  );
}
