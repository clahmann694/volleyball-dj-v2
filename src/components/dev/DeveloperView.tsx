import { FormEvent, useState } from 'react';
import { allPads, TeamId } from '../../types';
import { useBoard } from '../../contexts/BoardContext';
import { PAD_COLORS } from '../../config/defaultBoard';
import { ALL_TEAM_IDS, TEAMS } from '../../config/teams';
import { BundleControls } from './BundleControls';
import { DevLockSettings } from './DevLockSettings';
import { LayoutEditor } from './LayoutEditor';
import { PadCard } from './PadCard';
import { CuePointEditor } from './CuePointEditor';
import { ColorSwatches } from './ColorSwatches';
import { EmptyState } from './EmptyState';

interface Props {
  editingClipId: string | null;
  onEditClip: (clipId: string) => void;
  onCloseEditor: () => void;
}

/**
 * Einrichtungs-Ansicht: oben die Anordnung (Ziehen mit der Maus),
 * darunter je Button die Einstellungen (Name, Farbe, Sounds, Cue-Points).
 */
export function DeveloperView({ editingClipId, onEditClip, onCloseEditor }: Props) {
  const { board, clipIndex } = useBoard();
  const editing = editingClipId ? clipIndex.get(editingClipId) : undefined;
  // null = beide Mannschaften zeigen
  const [filter, setFilter] = useState<TeamId | null>(null);
  // Ohne einen einzigen Sound waeren 23 leere Buttons nur verwirrend
  const [showBoard, setShowBoard] = useState(false);
  const hasAnySound = allPads(board).some(p => p.clips.length > 0);

  if (!hasAnySound && !showBoard) return <EmptyState onShowBoard={() => setShowBoard(true)} />;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 pt-4 space-y-3">
        <BundleControls />
        <DevLockSettings />
      </div>

      {/* volle Breite, damit der Umbruch genauso aussieht wie im Spiel */}
      <section className="px-2 py-4" aria-label="Anordnung">
        <TeamFilter value={filter} onChange={setFilter} />
        <LayoutEditor teamFilter={filter} />
      </section>

      <div className="max-w-4xl mx-auto px-4 pb-4 space-y-3">
        <h2 className="text-[11px] uppercase tracking-[0.12em] text-vsg-ice/70 px-1">Buttons</h2>
        {board.rows.map((row, rowIndex) =>
          row.pads
            .filter(pad => !filter || pad.teams.includes(filter))
            .map(pad => <PadCard key={pad.id} pad={pad} rowIndex={rowIndex} onEditClip={onEditClip} />)
        )}
        <AddPadRow teamFilter={filter} />
      </div>

      {editing && <CuePointEditor key={editing.clip.id} clipRef={editing} onClose={onCloseEditor} />}
    </div>
  );
}

/** Umschalter: Anordnung für eine Mannschaft oder beide zeigen. */
function TeamFilter({ value, onChange }: { value: TeamId | null; onChange: (t: TeamId | null) => void }) {
  const options: Array<{ id: TeamId | null; label: string }> = [{ id: null, label: 'Beide' }, ...TEAMS.map(t => ({ id: t.id, label: t.name }))];
  return (
    <div className="flex items-center gap-2 mb-3 px-1">
      <span className="text-[11px] uppercase tracking-[0.12em] text-vsg-ice/70">Ansicht</span>
      <div className="flex rounded-lg bg-white/10 p-1 text-sm font-medium">
        {options.map(o => (
          <button
            key={o.label}
            onClick={() => onChange(o.id)}
            aria-pressed={value === o.id}
            className={`px-3 py-1.5 rounded-md transition-colors ${value === o.id ? 'bg-vsg-cyan text-white shadow' : 'text-vsg-ice hover:text-white'}`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <span className="text-xs text-white/40 hidden sm:inline">
        {value ? 'Zeigt, was diese Mannschaft sieht – Ziehen funktioniert auch hier.' : 'Zeigt alle Buttons mit ihrer Zuordnung.'}
      </span>
    </div>
  );
}

/** Neuer Button landet in der letzten Zeile und wird dann an seinen Platz gezogen. */
function AddPadRow({ teamFilter }: { teamFilter: TeamId | null }) {
  const { board, addPad } = useBoard();
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(PAD_COLORS[0].hex);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    // In einer Mannschafts-Ansicht gehoert der neue Button zunaechst nur dorthin
    addPad(board.rows[board.rows.length - 1].id, name, color, teamFilter ? [teamFilter] : [...ALL_TEAM_IDS]);
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
