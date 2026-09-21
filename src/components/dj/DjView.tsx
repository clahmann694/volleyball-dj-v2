import { useEffect } from 'react';
import { useBoard } from '../../contexts/BoardContext';
import { useAudio } from '../../contexts/AudioContext';
import { nextClip } from '../../utils/playback';
import { SoundBoard } from './SoundBoard';
import { ClipPanel } from './ClipPanel';
import { TransportBar } from './TransportBar';

interface DjViewProps {
  panelPadId: string | null;
  onOpenPanel: (padId: string) => void;
  onClosePanel: () => void;
}

/** Produktiv-Ansicht: Dashboard mit Pads, Seitenleiste fuer Mehrfach-Pads, Transportleiste. */
export function DjView({ panelPadId, onOpenPanel, onClosePanel }: DjViewProps) {
  const { padIndex } = useBoard();
  const { play, subscribeEnded } = useAudio();
  const pad = panelPadId ? padIndex.get(panelPadId)?.pad : undefined;

  // Auto-Weiterspielen: Ist ein Sound von selbst zu Ende, entscheidet der
  // Wiedergabemodus des Buttons, ob und womit es weitergeht.
  useEffect(
    () =>
      subscribeEnded(({ padId, clipId }) => {
        const p = padIndex.get(padId)?.pad;
        if (!p) return;
        const next = nextClip(p, clipId);
        if (next) play(padId, next);
      }),
    [subscribeEnded, padIndex, play]
  );

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex-1 min-h-0 flex">
        <main className="flex-1 min-h-0 overflow-y-auto p-2">
          <SoundBoard onOpenPanel={onOpenPanel} />
        </main>
        {pad && <ClipPanel pad={pad} onClose={onClosePanel} />}
      </div>
      <TransportBar />
    </div>
  );
}
