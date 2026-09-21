import { CSSProperties, ChangeEvent, DragEvent, useRef, useState } from 'react';
import { PlaybackMode, SoundPad, TeamId } from '../../types';
import { useBoard } from '../../contexts/BoardContext';
import { TEAMS } from '../../config/teams';
import { ClipRow } from './ClipRow';
import { ColorSwatches } from './ColorSwatches';

interface Props {
  pad: SoundPad;
  /** Nur zur Orientierung - verschoben wird oben in der Anordnung */
  rowIndex: number;
  onEditClip: (clipId: string) => void;
}

// Video ist erlaubt (Instagram-Reels o. ae.) - es wird nur die Tonspur verwendet.
// video/* sorgt auf dem iPad dafuer, dass auch die Fotos-Mediathek als Quelle angeboten wird.
const ACCEPT = 'audio/*,video/mp4,video/quicktime,video/x-m4v,.mp3,.m4a,.wav,.ogg,.aac,.flac,.aiff,.mp4,.m4v,.mov';

/** Ein Button in der Dev-Ansicht: Farbe, Name, Position, Sounds. */
const MODES: Array<{ id: PlaybackMode; label: string; hint: string }> = [
  { id: 'single', label: 'Einzeln', hint: 'Ein Sound (bei mehreren zufällig), danach Stille – für Jingles' },
  { id: 'sequence', label: 'Der Reihe nach', hint: 'Alle Sounds nacheinander, dann von vorn – für Playlists' },
  { id: 'shuffle', label: 'Zufällig endlos', hint: 'Alle Sounds in zufälliger Reihenfolge, ohne direkte Wiederholung' },
];

function PlaybackSwitch({ value, onChange }: { value: PlaybackMode; onChange: (m: PlaybackMode) => void }) {
  return (
    <div className="flex rounded-lg bg-white/10 p-0.5" role="radiogroup" aria-label="Wiedergabe">
      {MODES.map(m => (
        <button
          key={m.id}
          role="radio"
          aria-checked={value === m.id}
          title={m.hint}
          onClick={() => onChange(m.id)}
          className={`px-2.5 py-1 rounded-md font-medium transition-colors ${value === m.id ? 'bg-vsg-cyan text-white' : 'text-vsg-ice hover:text-white'}`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

/** Zwei Schalter: bei welchen Mannschaften erscheint dieser Button? */
function TeamChips({ pad, onChange }: { pad: SoundPad; onChange: (teams: TeamId[]) => void }) {
  const toggle = (id: TeamId) => {
    const next = pad.teams.includes(id) ? pad.teams.filter(t => t !== id) : [...pad.teams, id];
    if (next.length === 0) return; // mindestens eine Mannschaft muss bleiben
    onChange(next);
  };
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Mannschaften">
      {TEAMS.map(t => {
        const on = pad.teams.includes(t.id);
        return (
          <button
            key={t.id}
            onClick={() => toggle(t.id)}
            aria-pressed={on}
            title={on ? `${t.name}: wird angezeigt` : `${t.name}: ausgeblendet`}
            className={`h-7 px-2.5 rounded-full text-xs font-bold transition-colors ${on ? 'text-white' : 'bg-white/5 text-white/35 hover:text-white/60'}`}
            style={on ? { background: t.color } : undefined}
          >
            {t.name}
          </button>
        );
      })}
    </div>
  );
}

export function PadCard({ pad, rowIndex, onEditClip }: Props) {
  const { updatePad, setPadTeams, deletePad, addClipsFromFiles, busy } = useBoard();
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const style = { '--c': pad.color } as CSSProperties;

  const importFiles = async (files: FileList | File[]) => {
    setImporting(true);
    try {
      const count = await addClipsFromFiles(pad.id, Array.from(files));
      setNotice(count > 0 ? `${count} Datei${count === 1 ? '' : 'en'} hinzugefügt` : 'Keine Audiodateien erkannt');
    } catch (e) {
      console.error(e);
      setNotice('Import fehlgeschlagen');
    } finally {
      setImporting(false);
      setTimeout(() => setNotice(null), 3000);
    }
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) void importFiles(e.target.files);
    e.target.value = '';
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) void importFiles(e.dataTransfer.files);
  };

  const remove = () => {
    const msg = pad.clips.length ? `„${pad.name}“ mit ${pad.clips.length} Sound(s) wirklich löschen?` : `„${pad.name}“ wirklich löschen?`;
    if (window.confirm(msg)) void deletePad(pad.id);
  };

  return (
    <div
      style={style}
      onDragOver={e => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      className={`rounded-2xl p-3 bg-vsg-navy-900/70 border-l-4 border transition-colors ${
        dragOver ? 'border-vsg-cyan bg-vsg-cyan/10' : 'border-white/10'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2 pb-2 mb-2 border-b border-white/10">
        <span className="px-2 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white/60 bg-white/10 shrink-0" title="Zeile auf dem Dashboard">
          Zeile {rowIndex + 1}
        </span>
        <input
          value={pad.name}
          onChange={e => updatePad(pad.id, { name: e.target.value })}
          aria-label="Beschriftung des Buttons"
          className="flex-1 min-w-[140px] h-9 px-2 rounded-lg bg-transparent hover:bg-white/5 focus:bg-white/10 outline-none font-semibold"
        />
        <ColorSwatches value={pad.color} onChange={hex => updatePad(pad.id, { color: hex })} />
        <TeamChips pad={pad} onChange={teams => setPadTeams(pad.id, teams)} />
        <button onClick={remove} title="Button löschen" className="w-9 h-9 rounded-lg hover:bg-red-500/20 text-white/50 hover:text-red-400 ml-auto">🗑</button>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <input
          value={pad.description}
          onChange={e => updatePad(pad.id, { description: e.target.value })}
          maxLength={80}
          placeholder="Kleingedruckt unter dem Namen, z. B. „z.B. kurzer Aufschlag, Lob“ (optional)"
          aria-label="Beschreibung des Buttons"
          className="flex-1 min-w-0 h-8 px-2 rounded-lg bg-transparent hover:bg-white/5 focus:bg-white/10 outline-none text-sm text-vsg-ice placeholder:text-white/25"
        />
      </div>

      {pad.clips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-2 text-xs">
          <span className="text-white/50">Beim Drücken:</span>
          <PlaybackSwitch value={pad.playback} onChange={playback => updatePad(pad.id, { playback })} />
        </div>
      )}

      <div className="space-y-1.5">
        {pad.clips.map((clip, i) => (
          <ClipRow key={clip.id} clip={clip} padId={pad.id} index={i} total={pad.clips.length} onEdit={() => onEditClip(clip.id)} />
        ))}
        {pad.clips.length === 0 && <p className="text-xs text-white/40 px-1">Noch keine Sounds – Audio- oder Videodateien hinzufügen oder hierher ziehen.</p>}
      </div>

      <div className="mt-2 flex items-center gap-3 text-xs">
        <input ref={fileInput} type="file" accept={ACCEPT} multiple hidden onChange={onFileChange} />
        <button onClick={() => fileInput.current?.click()} disabled={busy || importing} className="px-3 py-1.5 rounded-lg bg-vsg-blue hover:bg-vsg-cyan disabled:opacity-50 font-medium">
          {importing ? 'Importiere… (Ton wird extrahiert)' : '＋ Dateien hinzufügen'}
        </button>
        <span className="text-white/40 hidden sm:inline">oder MP3/MP4 hierher ziehen – aus Videos wird nur der Ton gespeichert</span>
        {notice && <span className="ml-auto text-vsg-green font-medium">{notice}</span>}
      </div>
    </div>
  );
}
