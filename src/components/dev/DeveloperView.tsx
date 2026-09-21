import { useBoard } from '../../contexts/BoardContext';
import { BundleControls } from './BundleControls';
import { GroupEditor } from './GroupEditor';
import { CuePointEditor } from './CuePointEditor';

interface Props {
  editingClipId: string | null;
  onEditClip: (clipId: string) => void;
  onCloseEditor: () => void;
}

/** Einrichtungs-Ansicht: Buttons anlegen, Sounds importieren, Cue-Points setzen. */
export function DeveloperView({ editingClipId, onEditClip, onCloseEditor }: Props) {
  const { board, clipIndex } = useBoard();
  const editing = editingClipId ? clipIndex.get(editingClipId) : undefined;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        <BundleControls />
        {board.groups.map(group => (
          <GroupEditor key={group.id} group={group} onEditClip={onEditClip} />
        ))}
      </div>
      {editing && <CuePointEditor key={editing.clip.id} clipRef={editing} onClose={onCloseEditor} />}
    </div>
  );
}
