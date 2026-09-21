import { allPads, SoundClip } from '../../types';
import { useBoard } from '../../contexts/BoardContext';
import { useAudio } from '../../contexts/AudioContext';
import { formatTime } from '../../utils/formatTime';
import { formatBytes } from '../../utils/audioFormat';

interface Props {
  clip: SoundClip;
  padId: string;
  index: number;
  total: number;
  onEdit: () => void;
}

export function ClipRow({ clip, padId, index, total, onEdit }: Props) {
  const { board, updateClip, moveClip, moveClipToPad, deleteClip } = useBoard();
  const otherPads = allPads(board).filter(p => p.id !== padId);
  const { playing, play, stopAll } = useAudio();
  const isPlaying = playing?.clipId === clip.id;
  const hasCue = clip.cue.start > 0 || clip.cue.end != null;
  const clipLength = (clip.cue.end ?? clip.duration ?? 0) - clip.cue.start;

  const remove = () => {
    if (window.confirm(`„${clip.name}“ löschen? Die Audiodatei wird ebenfalls entfernt.`)) void deleteClip(clip.id);
  };

  return (
    <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${isPlaying ? 'bg-white/15' : 'bg-white/5'}`}>
      <span className="badge-num w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0">{index + 1}</span>

      <input
        value={clip.name}
        onChange={e => updateClip(clip.id, { name: e.target.value })}
        aria-label="Name des Sounds"
        className="flex-1 min-w-0 h-8 px-2 rounded bg-transparent hover:bg-white/5 focus:bg-white/10 outline-none text-sm"
      />

      <span className="hidden md:inline text-[11px] text-white/40 font-mono whitespace-nowrap" title={clip.fileName}>
        {clip.duration != null ? formatTime(clip.duration) : '?:??'} · {formatBytes(clip.size)}
      </span>

      {clip.gain < 1 && (
        <span className="px-2 py-0.5 rounded-md bg-amber-400/15 text-amber-300 text-[11px] font-medium whitespace-nowrap" title="Lautstärke dieses Sounds">
          🔉 {Math.round(clip.gain * 100)} %
        </span>
      )}

      {hasCue && (
        <span className="px-2 py-0.5 rounded-md bg-green-500/20 text-green-400 text-[11px] font-medium whitespace-nowrap">
          {formatTime(clip.cue.start)} – {clip.cue.end != null ? formatTime(clip.cue.end) : 'Ende'}
          {clipLength > 0 && <span className="text-green-400/60"> ({formatTime(clipLength)})</span>}
        </span>
      )}

      <button
        onClick={() => (isPlaying ? stopAll() : play(padId, clip))}
        title={isPlaying ? 'Stopp' : 'Anhören'}
        className="w-8 h-8 rounded-md bg-white/10 hover:bg-white/20 text-sm"
      >
        {isPlaying ? '■' : '▶'}
      </button>
      <button onClick={onEdit} className="h-8 px-2.5 rounded-md bg-vsg-blue hover:bg-vsg-cyan text-xs font-medium whitespace-nowrap" title="Start/Ende und Lautstärke einstellen">
        ✂ Cue
      </button>
      <button onClick={() => moveClip(clip.id, -1)} disabled={index === 0} title="Nach oben" className="w-8 h-8 rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-25 text-xs">↑</button>
      <button onClick={() => moveClip(clip.id, 1)} disabled={index === total - 1} title="Nach unten" className="w-8 h-8 rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-25 text-xs">↓</button>
      <select
        value=""
        onChange={e => e.target.value && moveClipToPad(clip.id, e.target.value)}
        title="In einen anderen Button verschieben"
        aria-label="In einen anderen Button verschieben"
        className="h-8 max-w-[34px] px-1 rounded-md bg-white/10 hover:bg-white/20 text-xs text-white/80 outline-none cursor-pointer"
      >
        <option value="">⇢</option>
        {otherPads.map(p => (
          <option key={p.id} value={p.id}>
            → {p.name}
          </option>
        ))}
      </select>
      <button onClick={remove} title="Sound löschen" className="w-8 h-8 rounded-md hover:bg-red-500/20 text-white/50 hover:text-red-400 text-sm">
        🗑
      </button>
    </div>
  );
}
