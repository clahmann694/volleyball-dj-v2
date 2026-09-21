import { useBoard } from '../../contexts/BoardContext';
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
  const pad = panelPadId ? padIndex.get(panelPadId) : undefined;

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
