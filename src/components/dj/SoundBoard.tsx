import { useBoard } from '../../contexts/BoardContext';
import { SoundGroupSection } from './SoundGroupSection';

export function SoundBoard({ onOpenPanel }: { onOpenPanel: (padId: string) => void }) {
  const { board } = useBoard();
  return (
    <div className="min-h-full flex flex-col gap-1.5">
      {board.groups.map(group => (
        <SoundGroupSection key={group.id} group={group} onOpenPanel={onOpenPanel} />
      ))}
    </div>
  );
}
