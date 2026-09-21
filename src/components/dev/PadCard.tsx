import { CSSProperties, ChangeEvent, DragEvent, useRef, useState } from 'react';
import { SoundPad } from '../../types';
import { useBoard } from '../../contexts/BoardContext';
import { ClipRow } from './ClipRow';
import { ColorSwatches } from './ColorSwatches';

interface Props {
  pad: SoundPad;
  rowIndex: number;
  rowCount: number;
  /** Position innerhalb der Zeile */
  index: number;
  padsInRow: number;
  onEditClip: (clipId: string) => void;
}

// Video ist erlaubt (Instagram-Reels o. ae.) - es wird nur die Tonspur verwendet.
// video/* sorgt auf dem iPad dafuer, dass auch die Fotos-Mediathek als Quelle angeboten wird.
const ACCEPT = 'audio/*,video/mp4,video/quicktime,video/x-m4v,.mp3,.m4a,.wav,.ogg,.aac,.flac,.aiff,.mp4,.m4v,.mov';

/** Ein Button in der Dev-Ansicht: Farbe, Name, Position, Sounds. */
export function PadCard({ pad, rowIndex, rowCount, index, padsInRow, onEditClip }: Props) {
  const { updatePad, movePad, deletePad, addClipsFromFiles, busy } = useBoard();
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
        <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white/70 bg-white/10 shrink-0">{index + 1}</span>
        <input
          value={pad.name}
          onChange={e => updatePad(pad.id, { name: e.target.value })}
          aria-label="Beschriftung des Buttons"
          className="flex-1 min-w-[140px] h-9 px-2 rounded-lg bg-transparent hover:bg-white/5 focus:bg-white/10 outline-none font-semibold"
        />
        <ColorSwatches value={pad.color} onChange={hex => updatePad(pad.id, { color: hex })} />
        <div className="flex items-center gap-1 ml-auto">
          <button onClick={() => movePad(pad.id, 'left')} disabled={index === 0} title="In der Zeile nach links" className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30">←</button>
          <button onClick={() => movePad(pad.id, 'right')} disabled={index === padsInRow - 1} title="In der Zeile nach rechts" className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30">→</button>
          <button onClick={() => movePad(pad.id, 'up')} disabled={rowIndex === 0} title="In die Zeile darüber" className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30">↑</button>
          <button onClick={() => movePad(pad.id, 'down')} title={rowIndex === rowCount - 1 ? 'In eine neue Zeile darunter' : 'In die Zeile darunter'} className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20">↓</button>
          <button onClick={remove} title="Button löschen" className="w-9 h-9 rounded-lg hover:bg-red-500/20 text-white/50 hover:text-red-400 ml-1">🗑</button>
        </div>
      </div>

      <div className="space-y-1.5">
        {pad.clips.map((clip, i) => (
          <ClipRow key={clip.id} clip={clip} padId={pad.id} index={i} onEdit={() => onEditClip(clip.id)} />
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
