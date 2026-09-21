import { FormEvent, useState } from 'react';
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

/** Einrichtungs-Ansicht: Buttons anlegen, sortieren, Sounds importieren, Cue-Points setzen. */
export function DeveloperView({ editingClipId, onEditClip, onCloseEditor }: Props) {
  const { board, clipIndex } = useBoard();
  const editing = editingClipId ? clipIndex.get(editingClipId) : undefined;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-4 space-y-3">
        <BundleControls />
        <p className="text-xs text-vsg-ice/70 px-1">
          Reihenfolge = Reihenfolge auf dem Dashboard (zeilenweise von links nach rechts). Mit ← → verschieben.
        </p>
        {board.pads.map((pad, i) => (
          <PadCard key={pad.id} pad={pad} index={i} total={board.pads.length} onEditClip={onEditClip} />
        ))}
        <AddPadRow />
      </div>
      {editing && <CuePointEditor key={editing.clip.id} clipRef={editing} onClose={onCloseEditor} />}
    </div>
  );
}

function AddPadRow() {
  const { addPad } = useBoard();
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(PAD_COLORS[0].hex);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addPad(name, color);
    setName('');
  };

  return (
    <form onSubmit={submit} className="rounded-2xl bg-vsg-navy-900/70 border border-dashed border-white/20 p-4 flex flex-wrap items-center gap-3">
      <ColorSwatches value={color} onChange={setColor} />
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Neuer Button, z. B. „krasser Angriff“"
        className="flex-1 min-w-[180px] h-10 px-3 rounded-lg bg-white/5 border border-white/10 focus:border-vsg-cyan outline-none text-sm"
      />
      <button type="submit" disabled={!name.trim()} className="h-10 px-4 rounded-lg bg-vsg-blue hover:bg-vsg-cyan disabled:opacity-40 text-sm font-medium">
        ＋ Button anlegen
      </button>
    </form>
  );
}
