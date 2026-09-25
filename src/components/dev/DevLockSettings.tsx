import { FormEvent, useState } from 'react';
import { isLocked, lockHint, removePassword, setPassword, verifyPassword } from '../../utils/devLock';

/** Passwort für die Dev-Ansicht setzen, ändern oder entfernen. */
export function DevLockSettings() {
  const [locked, setLocked] = useState(isLocked);
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [hint, setHint] = useState(lockHint);
  const [message, setMessage] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removePw, setRemovePw] = useState('');

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (pw.length < 4) return setMessage('Mindestens 4 Zeichen.');
    if (pw !== pw2) return setMessage('Die beiden Eingaben stimmen nicht überein.');
    await setPassword(pw, hint);
    setLocked(true);
    setOpen(false);
    setPw('');
    setPw2('');
    setMessage('Passwort gespeichert – gilt ab dem nächsten Wechsel in diese Ansicht.');
    setTimeout(() => setMessage(null), 6000);
  };

  const remove = async (e: FormEvent) => {
    e.preventDefault();
    if (!(await verifyPassword(removePw))) {
      setMessage('Passwort stimmt nicht – Sperre bleibt.');
      return;
    }
    removePassword();
    setLocked(false);
    setHint('');
    setRemoving(false);
    setRemovePw('');
    setMessage('Sperre entfernt.');
    setTimeout(() => setMessage(null), 5000);
  };

  return (
    <section className="rounded-2xl bg-vsg-navy-900/70 border border-white/10 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-bold mr-auto">Zugang zu dieser Ansicht</h2>
        {locked ? (
          <>
            <button onClick={() => setOpen(o => !o)} className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-medium">
              Passwort ändern
            </button>
            <button onClick={() => { setRemoving(r => !r); setOpen(false); }} className="px-3 py-2 rounded-lg hover:bg-red-500/20 text-red-400 text-sm font-medium">
              Sperre entfernen
            </button>
          </>
        ) : (
          <button onClick={() => setOpen(o => !o)} className="px-3 py-2 rounded-lg bg-vsg-blue hover:bg-vsg-cyan text-sm font-medium">
            🔒 Mit Passwort schützen
          </button>
        )}
      </div>

      <p className="mt-2 text-xs text-white/40">
        {locked
          ? 'Beim Wechsel aus der DJ-Ansicht wird nach dem Passwort gefragt. Gilt nur auf diesem Gerät.'
          : 'Verhindert, dass jemand am Kampfgericht versehentlich hier landet und etwas löscht. Gilt nur auf diesem Gerät.'}
      </p>

      {removing && (
        <form onSubmit={remove} className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="password"
            value={removePw}
            onChange={e => setRemovePw(e.target.value)}
            placeholder="Aktuelles Passwort"
            autoComplete="current-password"
            aria-label="Aktuelles Passwort zum Entfernen"
            className="flex-1 min-w-[180px] h-10 px-3 rounded-lg bg-black/40 border border-white/15 focus:border-vsg-cyan outline-none text-sm"
          />
          <button type="submit" disabled={!removePw} className="h-10 px-4 rounded-lg bg-red-500/80 hover:bg-red-500 disabled:opacity-40 text-sm font-semibold">
            Entfernen
          </button>
        </form>
      )}

      {open && (
        <form onSubmit={save} className="mt-3 grid gap-2 sm:grid-cols-2">
          <input
            type="password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            placeholder="Neues Passwort"
            autoComplete="new-password"
            className="h-10 px-3 rounded-lg bg-black/40 border border-white/15 focus:border-vsg-cyan outline-none text-sm"
          />
          <input
            type="password"
            value={pw2}
            onChange={e => setPw2(e.target.value)}
            placeholder="Noch einmal"
            autoComplete="new-password"
            className="h-10 px-3 rounded-lg bg-black/40 border border-white/15 focus:border-vsg-cyan outline-none text-sm"
          />
          <input
            value={hint}
            onChange={e => setHint(e.target.value)}
            placeholder="Merkhilfe (optional, wird beim Entsperren angezeigt)"
            maxLength={80}
            className="sm:col-span-2 h-10 px-3 rounded-lg bg-white/5 border border-white/10 focus:border-vsg-cyan outline-none text-sm"
          />
          <button type="submit" className="sm:col-span-2 h-10 rounded-lg bg-vsg-blue hover:bg-vsg-cyan font-semibold text-sm">
            Speichern
          </button>
        </form>
      )}

      {message && <p className="mt-2 text-sm text-vsg-ice">{message}</p>}

      <p className="mt-3 text-xs text-white/30">
        Hinweis: Das ist eine Zugangssperre, kein echter Schutz – die App läuft ohne Server, technisch Versierte können sie umgehen.
      </p>
    </section>
  );
}
