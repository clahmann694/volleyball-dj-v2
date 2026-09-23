import { CSSProperties } from 'react';
import { SoundPad as SoundPadModel } from '../../types';
import { useAudio } from '../../contexts/AudioContext';
import { padTextColor } from '../../config/defaultBoard';
import { firstClip, isLooping } from '../../utils/playback';

interface Props {
  pad: SoundPadModel;
  onOpenPanel: (padId: string) => void;
}

/**
 * Eine 3D-Taste (Sockel + glaenzende Kappe, rein CSS).
 * Klick: spielt einen (bei mehreren: zufaelligen) Clip, erneuter Klick stoppt.
 * Die Ecke oben rechts oeffnet die Liste aller Clips.
 */
export function SoundPad({ pad, onOpenPanel }: Props) {
  const { playing, isPaused, play, stopAll, lastClipOf } = useAudio();
  const isActive = playing?.padId === pad.id;
  const hasClips = pad.clips.length > 0;
  const style = { '--c': pad.color, '--t': padTextColor(pad.color) } as CSSProperties;

  const handleClick = () => {
    if (!hasClips) return;
    if (isActive) {
      stopAll();
      return;
    }
    const clip = firstClip(pad, lastClipOf(pad.id));
    if (clip) play(pad.id, clip, undefined, undefined, isLooping(pad));
  };
  const modeHint = pad.playback === 'loop' ? '∞' : pad.playback === 'sequence' ? '⟳' : pad.playback === 'shuffle' ? '⤮' : '';

  return (
    <div className="pad-wrap" style={style}>
      <button
        onClick={handleClick}
        disabled={!hasClips}
        aria-pressed={isActive}
        title={hasClips ? pad.name : `${pad.name} – noch keine Sounds zugewiesen`}
        className={`pad3d ${isActive ? 'pad3d--active' : ''} ${isActive && isPaused ? 'pad3d--paused' : ''} ${!hasClips ? 'pad3d--empty' : ''}`}
      >
        <span className="pad3d__cap">
          <span className="pad3d__label">{pad.name}</span>
          {pad.description ? (
            <span className="pad3d__desc">{pad.description}</span>
          ) : (
            !hasClips && <span className="pad3d__hint">keine Sounds</span>
          )}
        </span>
      </button>

      {modeHint && hasClips && (
        <span className="absolute top-1 left-1.5 text-[13px] text-white/80 drop-shadow z-10" title={pad.playback === 'loop' ? 'Läuft in Dauerschleife, bis gestoppt wird' : pad.playback === 'sequence' ? 'Spielt alle Sounds der Reihe nach' : 'Spielt alle Sounds in zufälliger Reihenfolge'}>
          {modeHint}
        </span>
      )}
      {pad.clips.length > 1 && (
        <button
          onClick={e => {
            e.stopPropagation();
            onOpenPanel(pad.id);
          }}
          title="Alle Sounds dieses Buttons anzeigen"
          className="absolute top-1 right-1 min-w-[26px] h-6 px-1.5 rounded-md bg-black/60 backdrop-blur text-[11px] font-bold text-white hover:bg-black/80 z-10"
        >
          {pad.clips.length} ≡
        </button>
      )}
    </div>
  );
}
