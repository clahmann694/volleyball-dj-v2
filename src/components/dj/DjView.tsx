import { useEffect } from 'react';
import { useBoard } from '../../contexts/BoardContext';
import { useAudio } from '../../contexts/AudioContext';
import { nextClip } from '../../utils/playback';
import { ImportBundleButton } from '../ImportBundleButton';
import { allPads } from '../../types';
import { SoundBoard } from './SoundBoard';
import { ClipPanel } from './ClipPanel';
import { TransportBar } from './TransportBar';

interface DjViewProps {
  panelPadId: string | null;
  onOpenPanel: (padId: string) => void;
  onClosePanel: () => void;
  onGoToDev: () => void;
}

/** Produktiv-Ansicht: Dashboard mit Pads, Seitenleiste fuer Mehrfach-Pads, Transportleiste. */
export function DjView({ panelPadId, onOpenPanel, onClosePanel, onGoToDev }: DjViewProps) {
  const { board, padIndex } = useBoard();
  // Kein einziger Sound auf diesem Geraet: entweder ganz neu oder ein zweites Geraet,
  // auf das die Einrichtung noch nicht uebertragen wurde
  const hasAnySound = allPads(board).some(p => p.clips.length > 0);
  const { play, subscribeEnded, recentClipsOf } = useAudio();
  const pad = panelPadId ? padIndex.get(panelPadId)?.pad : undefined;

  // Auto-Weiterspielen: Ist ein Sound von selbst zu Ende, entscheidet der
  // Wiedergabemodus des Buttons, ob und womit es weitergeht.
  useEffect(
    () =>
      subscribeEnded(({ padId, clipId }) => {
        const p = padIndex.get(padId)?.pad;
        if (!p) return;
        const next = nextClip(p, clipId, recentClipsOf(p.id));
        if (next) play(padId, next);
      }),
    [subscribeEnded, padIndex, play, recentClipsOf]
  );

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="safe-x flex-1 min-h-0 flex">
        <main className="flex-1 min-h-0 overflow-y-auto p-2">
          {!hasAnySound && (
            <div className="mb-3 rounded-2xl border border-vsg-cyan/50 bg-vsg-cyan/10 p-4 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[260px]">
                <p className="font-bold">Auf diesem Gerät sind noch keine Sounds.</p>
                <p className="text-sm text-vsg-ice mt-1">
                  Die Sounds liegen immer nur auf dem Gerät, auf dem sie importiert wurden – der Link zur App bringt sie nicht mit.
                  Hast du eine <strong>.vbdj-Datei</strong> bekommen (per AirDrop, Mail …)? Dann lade sie direkt hier – dafür braucht es
                  kein Passwort. Erstellt wird sie auf dem eingerichteten Gerät unter <strong>Dev → Exportieren</strong>.
                </p>
              </div>
              <ImportBundleButton className="h-10 px-4 text-sm" />
              <button onClick={onGoToDev} className="h-10 px-3 rounded-lg bg-white/10 hover:bg-white/20 font-medium text-sm">
                Selbst einrichten (Dev)
              </button>
            </div>
          )}
          <SoundBoard onOpenPanel={onOpenPanel} />
        </main>
        {pad && <ClipPanel pad={pad} onClose={onClosePanel} />}
      </div>
      <TransportBar />
    </div>
  );
}
