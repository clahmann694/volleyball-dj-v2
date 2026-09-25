import { ChangeEvent, useRef, useState } from 'react';
import { useBoard } from '../contexts/BoardContext';
import { allPads } from '../types';

interface Props {
  label?: string;
  className?: string;
  /** Kleiner Textlink statt Knopf (Startfrage) */
  subtle?: boolean;
}

/**
 * "Einrichtung laden (.vbdj)" – bewusst OHNE Passwort erreichbar: Wer nur den
 * Link und die Bundle-Datei bekommt, soll die App nutzen koennen, ohne in die
 * gesperrte Dev-Ansicht zu muessen (2026-09-25). Erscheint im DJ-Banner ohne
 * Sounds, auf der Startfrage und in der Startansicht der Dev-Ansicht.
 *
 * Kein `accept`-Attribut: iOS wuerde .vbdj im Dateidialog ausgrauen (CLAUDE.md).
 * Ersetzt das Bundle eine vorhandene Einrichtung, wird vorher gefragt.
 */
export function ImportBundleButton({ label = '⬆ Einrichtung laden (.vbdj)', className, subtle = false }: Props) {
  const { board, importBoard, busy } = useBoard();
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const hasAnySound = allPads(board).some(p => p.clips.length > 0);

  const doImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (hasAnySound && !window.confirm('Die aktuelle Einrichtung auf diesem Gerät wird durch die Datei ersetzt. Fortfahren?')) return;
    setWorking(true);
    setMessage(null);
    try {
      await importBoard(file);
      setMessage('Einrichtung geladen.');
      setTimeout(() => setMessage(null), 5000);
    } catch (err) {
      console.error(err);
      const isBundleName = /\.(vbdj|zip)$/i.test(file.name);
      setMessage(
        isBundleName && err instanceof Error && !/central directory|zip/i.test(err.message)
          ? err.message
          : `„${file.name}“ ist keine VB-DJ-Datei. Wähle die exportierte .vbdj-Datei.`
      );
    } finally {
      setWorking(false);
    }
  };

  const base = subtle
    ? 'text-sm text-vsg-ice/80 hover:text-white underline underline-offset-4 disabled:opacity-50'
    : 'rounded-lg bg-vsg-blue hover:bg-vsg-cyan disabled:opacity-50 font-semibold';

  return (
    <span className="inline-flex flex-col items-center gap-2">
      <input ref={fileInput} type="file" hidden onChange={doImport} data-role="import-bundle" />
      <button type="button" onClick={() => fileInput.current?.click()} disabled={busy || working} className={`${base} ${className ?? ''}`}>
        {working ? 'Lade…' : label}
      </button>
      {message && (
        <span role="status" className={`text-sm ${message.startsWith('Einrichtung geladen') ? 'text-vsg-ice' : 'text-amber-300'}`}>
          {message}
        </span>
      )}
    </span>
  );
}
