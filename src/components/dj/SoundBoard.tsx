import { useBoard } from '../../contexts/BoardContext';
import { useTeam } from '../../contexts/TeamContext';
import { padsForTeam } from '../../types';
import { SoundPad } from './SoundPad';

/**
 * Zeilen-Layout: jede Zeile teilt ihre Breite gleichmaessig unter ihren Buttons auf.
 * Eine Zeile mit einem Button ergibt einen Button ueber die volle Breite.
 * Leere Zeilen werden im Spiel nicht angezeigt.
 */
export function SoundBoard({ onOpenPanel }: { onOpenPanel: (padId: string) => void }) {
  const { board } = useBoard();
  const { team } = useTeam();
  // Zeilen ohne Buttons dieser Mannschaft werden ausgeblendet
  const rows = board.rows.map(r => ({ id: r.id, pads: padsForTeam(r, team) })).filter(r => r.pads.length > 0);

  if (rows.length === 0) {
    return <p className="text-vsg-ice/70 text-sm p-4">Für diese Mannschaft sind noch keine Buttons zugeordnet – in der Dev-Ansicht einrichten.</p>;
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
