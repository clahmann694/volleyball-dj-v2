import { useEffect } from 'react';

/**
 * Haelt den Bildschirm wach, solange `active` gilt (Spielbetrieb).
 * Ohne das sperrt sich das iPad mitten im Satz. Nach einem Tab-Wechsel
 * verliert man die Sperre - deshalb beim Sichtbarwerden neu anfordern.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let released = false;

    const acquire = async () => {
      if (released) return;
      try {
        sentinel = await navigator.wakeLock.request('screen');
      } catch {
        /* z. B. Energiesparmodus - dann eben nicht */
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') void acquire();
    };

    void acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      released = true;
      document.removeEventListener('visibilitychange', onVisible);
      void sentinel?.release().catch(() => undefined);
    };
  }, [active]);
}
