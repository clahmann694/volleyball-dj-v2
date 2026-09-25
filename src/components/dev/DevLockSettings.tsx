import { useState } from 'react';
import { forgetUnlock, isLocked, isUnlockedHere } from '../../utils/devLock';

/** Zeigt den Zustand der eingebauten Sperre und erlaubt, dieses Gerät wieder zu sperren. */
export function DevLockSettings() {
  const [unlockedHere, setUnlockedHere] = useState(isUnlockedHere);
  const locked = isLocked();

  const lockThisDevice = () => {
    forgetUnlock();
    setUnlockedHere(false);
  };

  return (
    <section className="rounded-2xl bg-vsg-navy-900/70 border border-white/10 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-bold mr-auto">🔒 Zugang zu dieser Ansicht</h2>
        {locked && unlockedHere && (
          <button onClick={lockThisDevice} className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-medium">
            Dieses Gerät wieder sperren
          </button>
        )}
      </div>

      {locked ? (
        <p className="mt-2 text-sm text-vsg-ice">
          Die Dev-Ansicht ist mit einem festen Passwort geschützt – auf <strong className="text-white">jedem Gerät</strong>, das die App öffnet, auch bei
          jemandem, der nur den Link bekommen hat.{' '}
          {unlockedHere
            ? 'Dieses Gerät ist entsperrt; beim Wechsel aus der DJ-Ansicht kommt nur noch die kurze Rückfrage.'
            : 'Dieses Gerät ist gesperrt – beim nächsten Wechsel aus der DJ-Ansicht wird nach dem Passwort gefragt.'}
        </p>
      ) : (
        <p className="mt-2 text-sm text-amber-300">Kein Passwort eingebaut – die Dev-Ansicht ist für jeden offen.</p>
      )}

      <p className="mt-3 text-xs text-white/40">
        Ändern oder entfernen: im Projekt <code className="text-white/60">npm run set-password</code>, dann veröffentlichen. Ein neues Passwort sperrt
        alle Geräte automatisch wieder.
      </p>
      <p className="mt-1 text-xs text-white/30">
        Hinweis: Das ist eine Zugangssperre, kein echter Schutz – die App läuft ohne Server, technisch Versierte können sie umgehen. Deine Sounds kann
        ohnehin niemand von außen verändern: Sie liegen nur in deinem eigenen Browser.
      </p>
    </section>
  );
}
