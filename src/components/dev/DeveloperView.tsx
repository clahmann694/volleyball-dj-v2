import { CSSProperties, FormEvent, useState } from 'react';
import { BoardRow } from '../../types';
import { useBoard } from '../../contexts/BoardContext';
import { PAD_COLORS } from '../../config/defaultBoard';
import { BundleControls } from './BundleControls';
import { PadCard } from './PadCard';
import { CuePointEditor } from './CuePointEditor';
import { ColorSwatches } from './ColorSwatches';

interface Props {
  editingClipId: string | null;
  onEditClip: (clipId: string) => void;
  onCloseEditor: () => void;
}

/** Einrichtungs-Ansicht: Zeilen und Buttons anordnen, Sounds importieren, Cue-Points setzen. */
export function DeveloperView({ editingClipId, onEditClip, onCloseEditor }: Props) {
  const { board, clipIndex, addRow } = useBoard();
  const editing = editingClipId ? clipIndex.get(editingClipId) : undefined;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        <BundleControls />
        <LayoutPreview />
        {board.rows.map((row, i) => (
          <RowSection key={row.id} row={row} index={i} total={board.rows.length} onEditClip={onEditClip} />
        ))}
        <button onClick={addRow} className="w-full py-3 rounded-2xl border border-dashed border-white/25 text-vsg-ice hover:bg-white/5 text-sm font-medium">
          ＋ Neue Zeile
        </button>
      </div>
      {editing && <CuePointEditor key={editing.clip.id} clipRef={editing} onClose={onCloseEditor} />}
    </div>
  );
}

/** Miniatur des Dashboards: zeigt sofort, wie sich Verschieben auswirkt. */
function LayoutPreview() {
  const { board } = useBoard();
  const rows = board.rows.filter(r => r.pads.length > 0);
  if (rows.length === 0) return null;
  return (
    <div className="rounded-2xl bg-black/30 border border-white/10 p-3">
      <p className="text-[11px] uppercase tracking-[0.12em] text-vsg-ice/70 mb-2">Vorschau des Dashboards</p>
      <div className="flex flex-col gap-1.5">
        {rows.map(row => (
          <div key={row.id} className="flex gap-1.5 h-9">
            {row.pads.map(pad => (
              <div
                key={pad.id}
                className="flex-1 min-w-0 rounded-md flex items-center justify-center text-[11px] font-bold px-1 truncate"
                style={{ background: pad.color, color: '#fff', textShadow: '0 1px 1px rgba(0,0,0,.5)', opacity: pad.clips.length ? 1 : 0.45 } as CSSProperties}
                title={pad.name}
              >
                <span className="truncate">{pad.name}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function RowSection({ row, index, total, onEditClip }: { row: BoardRow; index: number; total: number; onEditClip: (id: string) => void }) {
  const { moveRow, deleteRow } = useBoard();
  return (
    <section className="rounded-2xl bg-vsg-navy-900/50 border border-white/10 p-3 space-y-3" aria-label={`Zeile ${index + 1}`}>
      <header className="flex items-center gap-2 px-1">
        <h3 className="font-bold">Zeile {index + 1}</h3>
        <span className="text-xs text-white/40">
          {row.pads.length === 0 ? 'leer – wird im Spiel ausgeblendet' : `${row.pads.length} Button${row.pads.length === 1 ? ' (volle Breite)' : 's'}`}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => moveRow(row.id, -1)} disabled={index === 0} title="Zeile nach oben" className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30">⇡</button>
          <button onClick={() => moveRow(row.id, 1)} disabled={index === total - 1} title="Zeile nach unten" className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30">⇣</button>
          <button
            onClick={() => deleteRow(row.id)}
            disabled={total === 1}
            title={row.pads.length ? 'Zeile auflösen – Buttons wandern in die Zeile darüber' : 'Leere Zeile entfernen'}
            className="h-9 px-3 rounded-lg hover:bg-red-500/20 text-white/50 hover:text-red-400 disabled:opacity-30 text-xs"
          >
            Zeile auflösen
          </button>
        </div>
      </header>

      {row.pads.map((pad, i) => (
        <PadCard key={pad.id} pad={pad} rowIndex={index} rowCount={total} index={i} padsInRow={row.pads.length} onEditClip={onEditClip} />
      ))}

      <AddPadRow rowId={row.id} />
    </section>
  );
}

function AddPadRow({ rowId }: { rowId: string }) {
  const { addPad } = useBoard();
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(PAD_COLORS[0].hex);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addPad(rowId, name, color);
    setName('');
  };

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-3 px-1">
      <ColorSwatches value={color} onChange={setColor} />
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Neuer Button in dieser Zeile…"
        className="flex-1 min-w-[180px] h-10 px-3 rounded-lg bg-white/5 border border-white/10 focus:border-vsg-cyan outline-none text-sm"
      />
      <button type="submit" disabled={!name.trim()} className="h-10 px-4 rounded-lg bg-vsg-blue hover:bg-vsg-cyan disabled:opacity-40 text-sm font-medium">
        ＋ Button
      </button>
    </form>
  );
}
