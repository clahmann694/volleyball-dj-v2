import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { useBoard } from '../../contexts/BoardContext';
import { storageInfo } from '../../storage/audioStore';
import { downloadBlob } from '../../utils/bundle';
import { formatBytes } from '../../utils/audioFormat';

/** Export/Import der kompletten Einrichtung (Konfiguration + Audiodateien) und Speicherstatus. */
export function BundleControls() {
  const { board, exportBoard, importBoard, resetBoard, busy } = useBoard();
  const [working, setWorking] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [info, setInfo] = useState<{ usage: number; quota: number; persisted: boolean | null } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const clipCount = board.pads.reduce((n, p) => n + p.clips.length, 0);

  useEffect(() => {
    let alive = true;
    void storageInfo().then(i => alive && setInfo(i));
    return () => {
      alive = false;
    };
  }, [board]);

  const flash = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(null), 5000);
  };

  const doExport = async () => {
    setWorking('Exportiere…');
    try {
      const blob = await exportBoard();
      const date = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, `vb-dj-${date}.vbdj`);
      flash(`Export fertig (${formatBytes(blob.size)})`);
    } catch (e) {
      console.error(e);
      flash('Export fehlgeschlagen');
    } finally {
      setWorking(null);
    }
  };

  const doImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!window.confirm('Die aktuelle Einrichtung wird durch das Bundle ersetzt. Fortfahren?')) return;
    setWorking('Importiere…');
    try {
      await importBoard(file);
      flash('Bundle importiert');
    } catch (err) {
      console.error(err);
      flash(err instanceof Error ? err.message : 'Import fehlgeschlagen');
    } finally {
      setWorking(null);
    }
  };

  const doReset = async () => {
    if (!window.confirm('Alle Buttons auf die Startbelegung zurücksetzen und ALLE importierten Sounds löschen?')) return;
    setWorking('Setze zurück…');
    try {
      await resetBoard();
      flash('Zurückgesetzt');
    } finally {
      setWorking(null);
    }
  };

  const disabled = busy || working !== null;

  return (
    <section className="rounded-2xl bg-vsg-navy-900/70 border border-white/10 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-bold mr-auto">Einrichtung</h2>
        <button onClick={doExport} disabled={disabled || clipCount === 0} className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 text-sm font-medium">
          ⬇ Exportieren (.vbdj)
        </button>
        <input ref={fileInput} type="file" accept=".vbdj,.zip,application/zip" hidden onChange={doImport} />
        <button onClick={() => fileInput.current?.click()} disabled={disabled} className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 text-sm font-medium">
          ⬆ Importieren
        </button>
        <button onClick={doReset} disabled={disabled} className="px-3 py-2 rounded-lg hover:bg-red-500/20 text-red-400 disabled:opacity-40 text-sm font-medium">
          Zurücksetzen
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/50">
        <span>{clipCount} Sound{clipCount === 1 ? '' : 's'} importiert</span>
        {info && info.quota > 0 && (
          <span>
            Speicher: {formatBytes(info.usage)} von {formatBytes(info.quota)} belegt
          </span>
        )}
        {info && (
          <span title="Wenn „nein“: Auf dem iPad die App zum Home-Bildschirm hinzufügen, sonst kann Safari die Sounds nach 7 Tagen Nichtbenutzung löschen.">
            Dauerhaft gespeichert: {info.persisted === null ? 'unbekannt' : info.persisted ? 'ja' : 'nein'}
          </span>
        )}
        {(working || message) && <span className="ml-auto text-white/80">{working ?? message}</span>}
      </div>
      <p className="mt-2 text-xs text-white/40">
        Ein Bundle enthält alle Buttons, Cue-Points und Audiodateien – damit ziehst du die Einrichtung vom Mac aufs iPad oder legst ein Backup an.
      </p>
    </section>
  );
}
