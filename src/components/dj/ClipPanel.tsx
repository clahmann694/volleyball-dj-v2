import { CSSProperties } from 'react';
import { SoundPad } from '../../types';
import { useAudio } from '../../contexts/AudioContext';
import { formatTime } from '../../utils/formatTime';
import { isLooping, randomClip } from '../../utils/playback';

interface Props {
  pad: SoundPad;
  onClose: () => void;
}

/** Seitenleiste: alle Clips eines Buttons einzeln anwaehlbar. */
export function ClipPanel({ pad, onClose }: Props) {
  const { playing, play, stopAll, recentClipsOf, queued, queueClip, clearQueue } = useAudio();
  const style = { '--c': pad.color } as CSSProperties;

  const loop = isLooping(pad);
  const playRandom = () => play(pad.id, randomClip(pad.clips, recentClipsOf(pad.id)), undefined, undefined, loop);

  // Im Dauerschleifen-Modus endet der Sound nie von selbst - eine Vormerkung
  // koennte also gar nicht greifen und wird deshalb nicht angeboten.
  const canQueue = !loop;
  const queuedHere = queued?.padId === pad.id ? queued.clipId : null;

  return (
    <aside className="anim-panel w-72 shrink-0 flex flex-col bg-vsg-navy-900/95 backdrop-blur-xl border-l border-white/10" style={style}>
      <div className="flex items-center gap-3 p-4 border-b border-white/10">
        <span className="w-4 h-4 rounded-full shrink-0" style={{ background: 'var(--c)', boxShadow: '0 0 10px var(--c)' }} />
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold truncate">{pad.name}</h3>
          {pad.description && <p className="text-xs text-vsg-ice truncate">{pad.description}</p>}
        </div>
        <button onClick={onClose} aria-label="Schließen" className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white/70">
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {pad.clips.map((clip, i) => {
          const active = playing?.clipId === clip.id;
          const isQueued = queuedHere === clip.id;
          const len = (clip.cue.end ?? clip.duration ?? 0) - clip.cue.start;
          return (
            <div
              key={clip.id}
              className={`flex items-stretch gap-1 rounded-xl border transition-colors ${
                active ? 'bg-white/15 border-white/30' : isQueued ? 'bg-vsg-cyan/10 border-vsg-cyan/40' : 'bg-white/5 border-white/5'
              }`}
            >
              <button
                onClick={() => (active ? stopAll() : play(pad.id, clip, undefined, undefined, loop))}
                className="flex-1 min-w-0 flex items-center gap-3 p-3 rounded-l-xl text-left hover:bg-white/10"
              >
                <span className="badge-num w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0">{i + 1}</span>
                <span className="flex-1 min-w-0">
                  <span className="block font-medium truncate">{clip.name}</span>
                  <span className="block text-xs text-white/50">
                    {isQueued ? <span className="text-vsg-cyan font-medium">als Nächstes</span> : len > 0 ? formatTime(len) : '–'}
                  </span>
                </span>
                <span className="text-lg">{active ? '■' : '▶'}</span>
              </button>

              {canQueue && (
                <button
                  onClick={() => (isQueued ? clearQueue() : queueClip(pad.id, clip.id))}
                  aria-pressed={isQueued}
                  aria-label={isQueued ? `„${clip.name}“ nicht mehr als Nächstes` : `„${clip.name}“ als Nächstes abspielen`}
                  title={isQueued ? 'Vormerkung aufheben' : 'Als Nächstes abspielen'}
                  className={`w-11 shrink-0 rounded-r-xl text-lg font-bold transition-colors ${
                    isQueued ? 'bg-vsg-cyan text-vsg-navy-950' : 'text-white/40 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  ⏭
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-3 border-t border-white/10 space-y-2">
        {canQueue && (
          <p className="text-[11px] leading-snug text-white/40">
            ⏭ merkt ein Lied vor: Es läuft, sobald das aktuelle Lied dieses Buttons von selbst zu Ende ist. STOP löscht die Vormerkung.
          </p>
        )}
        {loop && <p className="text-[11px] leading-snug text-white/40">Dauerschleife: Das Lied läuft bis STOP – deshalb gibt es hier kein „als Nächstes“.</p>}
        <button onClick={playRandom} className="w-full py-3 rounded-xl bg-vsg-blue hover:bg-vsg-cyan text-white font-bold">
          🎲 Zufällig abspielen
        </button>
      </div>
    </aside>
  );
}
