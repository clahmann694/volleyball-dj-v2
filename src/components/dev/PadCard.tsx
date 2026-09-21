import { ChangeEvent, DragEvent, useRef, useState } from 'react';
import { SoundPad } from '../../types';
import { useBoard } from '../../contexts/BoardContext';
import { ClipRow } from './ClipRow';

interface Props {
  pad: SoundPad;
  onEditClip: (clipId: string) => void;
}

const ACCEPT = 'audio/*,.mp3,.m4a,.wav,.ogg,.aac,.flac,.aiff';

/** Ein Button in der Dev-Ansicht: umbenennen, Sounds hinzufuegen, Clips bearbeiten. */
export function PadCard({ pad, onEditClip }: Props) {
  const { updatePad, deletePad, addClipsFromFiles, busy } = useBoard();
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

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
    const msg = pad.clips.length
      ? `„${pad.name}“ mit ${pad.clips.length} Sound(s) wirklich löschen?`
      : `„${pad.name}“ wirklich löschen?`;
    if (window.confirm(msg)) void deletePad(pad.id);
  };

  return (
    <div
      onDragOver={e => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      className={`rounded-xl p-3 bg-black/30 border transition-colors ${dragOver ? 'border-white/60 bg-white/5' : 'border-transparent'}`}
    >
      <div className="flex items-center gap-2 pb-2 mb-2 border-b border-white/10">
        <input
          value={pad.icon}
          onChange={e => updatePad(pad.id, { icon: e.target.value })}
          maxLength={4}
          aria-label="Emoji"
          className="w-10 h-9 text-center text-lg rounded-lg bg-white/5 hover:bg-white/10 focus:bg-white/10 outline-none"
        />
        <input
          value={pad.name}
          onChange={e => updatePad(pad.id, { name: e.target.value })}
          aria-label="Name des Buttons"
          className="flex-1 min-w-0 h-9 px-2 rounded-lg bg-transparent hover:bg-white/5 focus:bg-white/10 outline-none font-semibold"
        />
        <span className="text-xs text-white/40 whitespace-nowrap">
          {pad.clips.length} Sound{pad.clips.length === 1 ? '' : 's'}
        </span>
        <button onClick={remove} title="Button löschen" className="w-9 h-9 rounded-lg hover:bg-red-500/20 text-white/50 hover:text-red-400">
          🗑
        </button>
      </div>

      <div className="space-y-1.5">
        {pad.clips.map((clip, i) => (
          <ClipRow key={clip.id} clip={clip} padId={pad.id} index={i} onEdit={() => onEditClip(clip.id)} />
        ))}
        {pad.clips.length === 0 && <p className="text-xs text-white/40 px-1">Noch keine Sounds – Dateien hinzufügen oder hierher ziehen.</p>}
      </div>

      <div className="mt-2 flex items-center gap-3 text-xs">
        <input ref={fileInput} type="file" accept={ACCEPT} multiple hidden onChange={onFileChange} />
        <button
          onClick={() => fileInput.current?.click()}
          disabled={busy || importing}
          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 font-medium"
        >
          {importing ? 'Importiere…' : '＋ Dateien hinzufügen'}
        </button>
        <span className="text-white/40 hidden sm:inline">oder MP3s hierher ziehen</span>
        {notice && <span className="ml-auto text-green-400">{notice}</span>}
      </div>
    </div>
  );
}
