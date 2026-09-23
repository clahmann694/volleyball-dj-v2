import { ChangeEvent, useRef, useState } from 'react';
import { useBoard } from '../../contexts/BoardContext';

/**
 * Erster Blick in die Dev-Ansicht auf einem Geraet ohne Sounds.
 * Statt 23 leerer Buttons und aller Einstellmoeglichkeiten nur die zwei
 * Wege, die hier ueberhaupt sinnvoll sind: vorhandene Einrichtung laden
 * oder mit den Buttons anfangen.
 */
export function EmptyState({ onShowBoard }: { onShowBoard: () => void }) {
  const { importBoard, busy } = useBoard();
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const doImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setWorking(true);
    setMessage(null);
    try {
      await importBoard(file);
    } catch (err) {
      console.error(err);
      setMessage(`„${file.name}“ ist keine VB-DJ-Datei. Wähle die exportierte .vbdj-Datei.`);
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="max-w-xl mx-auto px-4 py-10 text-center">
        <h1 className="text-2xl font-bold">Noch keine Sounds auf diesem Gerät</h1>
        <p className="mt-3 text-vsg-ice">
          Sounds liegen immer nur auf dem Gerät, auf dem sie hinzugefügt wurden. Wie möchtest du anfangen?
        </p>

        {/* Zweitgeraet: fertige Einrichtung uebernehmen */}
        <div className="mt-8 rounded-2xl bg-vsg-navy-900/70 border border-vsg-cyan/40 p-5 text-left">
          <h2 className="font-bold">Einrichtung von einem anderen Gerät laden</h2>
          <p className="mt-1 text-sm text-vsg-ice">
            Du hast schon auf dem Mac (oder iPad) eingerichtet? Dort <strong>Exportieren</strong>, die .vbdj-Datei per AirDrop
            hierher schicken und hier laden – mit allen Buttons, Cue-Points und Sounds.
          </p>
          <input ref={fileInput} type="file" hidden onChange={doImport} data-role="import-bundle" />
          <button
            onClick={() => fileInput.current?.click()}
            disabled={busy || working}
            className="mt-4 w-full py-3 rounded-xl bg-vsg-blue hover:bg-vsg-cyan disabled:opacity-50 font-bold"
          >
            {working ? 'Lade…' : '⬆ Einrichtung laden (.vbdj)'}
          </button>
        </div>

        {/* Neu anfangen */}
        <div className="mt-4 rounded-2xl bg-vsg-navy-900/50 border border-white/10 p-5 text-left">
          <h2 className="font-bold">Neu anfangen</h2>
          <p className="mt-1 text-sm text-vsg-ice">
            Du siehst dann die Buttons und kannst bei jedem Musik hinzufügen.
          </p>
          <button onClick={onShowBoard} className="mt-4 w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 font-semibold">
            Buttons anzeigen
          </button>
        </div>

        {message && <p className="mt-4 text-sm text-amber-300">{message}</p>}
      </div>
    </div>
  );
}
