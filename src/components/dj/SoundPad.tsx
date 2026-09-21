import { SoundPad as SoundPadModel } from '../../types';
import { useAudio } from '../../contexts/AudioContext';

interface Props {
  pad: SoundPadModel;
  onOpenPanel: (padId: string) => void;
}

/**
 * Ein Button auf dem Dashboard.
 * Klick: spielt einen (bei mehreren: zufaelligen) Clip, erneuter Klick stoppt.
 * Die kleine Ecke oben rechts oeffnet die Liste aller Clips.
 */
export function SoundPad({ pad, onOpenPanel }: Props) {
  const { playing, play, stopAll } = useAudio();
  const isActive = playing?.padId === pad.id;
  const hasClips = pad.clips.length > 0;

  const handleClick = () => {
    if (!hasClips) return;
    if (isActive) {
      stopAll();
      return;
    }
    const clip = pad.clips[Math.floor(Math.random() * pad.clips.length)];
    play(pad.id, clip);
  };

  return (
    <div className="pad-wrap relative min-h-[64px]">
      <button
        onClick={handleClick}
        disabled={!hasClips}
        aria-pressed={isActive}
        title={hasClips ? pad.name : `${pad.name} – noch keine Sounds zugewiesen`}
        className={`pad w-full h-full rounded-xl flex flex-col items-center justify-center gap-1 px-2 py-2 text-white ${
          isActive ? 'pad--playing' : ''
        } ${!hasClips ? 'pad--empty' : ''}`}
      >
        <span className="pad-icon">{pad.icon}</span>
        <span className="text-xs font-semibold truncate max-w-full">{pad.name}</span>
        {!hasClips && <span className="text-[10px] text-white/70">keine Sounds</span>}
      </button>

      {pad.clips.length > 1 && (
        <button
          onClick={e => {
            e.stopPropagation();
            onOpenPanel(pad.id);
          }}
          title="Alle Sounds dieses Buttons anzeigen"
          className="absolute top-1.5 right-1.5 min-w-[28px] h-6 px-1.5 rounded-md bg-black/55 backdrop-blur text-[11px] font-bold text-white/90 hover:bg-black/80"
        >
          {pad.clips.length} ≡
        </button>
      )}
    </div>
  );
}
