import { CSSProperties } from 'react';
import { SoundPad } from '../../types';
import { useAudio } from '../../contexts/AudioContext';
import { formatTime } from '../../utils/formatTime';
import { randomClip } from '../../utils/playback';

interface Props {
  pad: SoundPad;
  onClose: () => void;
}

/** Seitenleiste: alle Clips eines Buttons einzeln anwaehlbar. */
export function ClipPanel({ pad, onClose }: Props) {
  const { playing, play, stopAll } = useAudio();
  const style = { '--c': pad.color } as CSSProperties;

  const playRandom = () => play(pad.id, randomClip(pad.clips, playing?.clipId ?? null));

  return (
    <aside className="w-72 shrink-0 flex flex-col bg-vsg-navy-900/95 backdrop-blur-xl border-l border-white/10" style={style}>
      <div className="flex items-center gap-3 p-4 border-b border-white/10">
        <span className="w-4 h-4 rounded-full shrink-0" style={{ background: 'var(--c)', boxShadow: '0 0 10px var(--c)' }} />
        <h3 className="flex-1 text-lg font-bold truncate">{pad.name}</h3>
        <button onClick={onClose} aria-label="Schließen" className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white/70">
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {pad.clips.map((clip, i) => {
          const active = playing?.clipId === clip.id;
          const len = (clip.cue.end ?? clip.duration ?? 0) - clip.cue.start;
          return (
            <button
              key={clip.id}
              onClick={() => (active ? stopAll() : play(pad.id, clip))}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                active ? 'bg-white/15 border-white/30' : 'bg-white/5 border-white/5 hover:bg-white/10'
              }`}
            >
              <span className="badge-num w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0">{i + 1}</span>
              <span className="flex-1 min-w-0">
                <span className="block font-medium truncate">{clip.name}</span>
                <span className="block text-xs text-white/50">{len > 0 ? formatTime(len) : '–'}</span>
              </span>
              <span className="text-lg">{active ? '■' : '▶'}</span>
            </button>
          );
        })}
      </div>

      <div className="p-3 border-t border-white/10">
        <button onClick={playRandom} className="w-full py-3 rounded-xl bg-vsg-blue hover:bg-vsg-cyan text-white font-bold">
          🎲 Zufällig abspielen
        </button>
      </div>
    </aside>
  );
}
