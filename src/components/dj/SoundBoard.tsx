import { useBoard } from '../../contexts/BoardContext';
import { SoundPad } from './SoundPad';

/** Flaches Raster aller Buttons in Lesereihenfolge. */
export function SoundBoard({ onOpenPanel }: { onOpenPanel: (padId: string) => void }) {
  const { board } = useBoard();

  if (board.pads.length === 0) {
    return <p className="text-vsg-ice/70 text-sm p-4">Keine Buttons – in der Dev-Ansicht anlegen.</p>;
  }

  return (
    <div className="board-grid grid gap-3 grid-cols-[repeat(auto-fill,minmax(150px,1fr))]">
      {board.pads.map(pad => (
        <SoundPad key={pad.id} pad={pad} onOpenPanel={onOpenPanel} />
      ))}
    </div>
  );
}
