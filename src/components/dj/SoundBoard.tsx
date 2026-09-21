import { useBoard } from '../../contexts/BoardContext';
import { SoundPad } from './SoundPad';

/**
 * Zeilen-Layout: jede Zeile teilt ihre Breite gleichmaessig unter ihren Buttons auf.
 * Eine Zeile mit einem Button ergibt einen Button ueber die volle Breite.
 * Leere Zeilen werden im Spiel nicht angezeigt.
 */
export function SoundBoard({ onOpenPanel }: { onOpenPanel: (padId: string) => void }) {
  const { board } = useBoard();
  const rows = board.rows.filter(r => r.pads.length > 0);

  if (rows.length === 0) {
    return <p className="text-vsg-ice/70 text-sm p-4">Keine Buttons – in der Dev-Ansicht anlegen.</p>;
  }

  return (
    <div className="board-rows flex flex-col gap-2">
      {rows.map(row => (
        <div key={row.id} className="board-row">
          {row.pads.map(pad => (
            <SoundPad key={pad.id} pad={pad} onOpenPanel={onOpenPanel} />
          ))}
        </div>
      ))}
    </div>
  );
}
