import { CSSProperties, FormEvent, useState } from 'react';
import { SoundGroup } from '../../types';
import { useBoard } from '../../contexts/BoardContext';
import { PadCard } from './PadCard';

interface Props {
  group: SoundGroup;
  onEditClip: (clipId: string) => void;
}

export function GroupEditor({ group, onEditClip }: Props) {
  const style = { '--g': group.color } as CSSProperties;
  return (
    <section className="group-card rounded-2xl p-4" style={style}>
      <h3 className="group-title flex items-center gap-2 text-lg font-bold mb-3">
        <span>{group.icon}</span>
        <span>{group.name}</span>
        <span className="ml-auto text-xs font-normal text-white/40">{group.pads.length} Buttons</span>
      </h3>
      <div className="space-y-3">
        {group.pads.map(pad => (
          <PadCard key={pad.id} pad={pad} onEditClip={onEditClip} />
        ))}
      </div>
      <AddPadRow groupId={group.id} />
    </section>
  );
}

function AddPadRow({ groupId }: { groupId: string }) {
  const { addPad } = useBoard();
  const [icon, setIcon] = useState('🎵');
  const [name, setName] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addPad(groupId, name, icon);
    setName('');
  };

  return (
    <form onSubmit={submit} className="mt-3 flex items-center gap-2">
      <input
        value={icon}
        onChange={e => setIcon(e.target.value)}
        maxLength={4}
        aria-label="Emoji"
        className="w-11 h-10 text-center text-lg rounded-lg bg-white/5 border border-white/10 focus:border-white/30 outline-none"
      />
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Neuer Button…"
        className="flex-1 h-10 px-3 rounded-lg bg-white/5 border border-white/10 focus:border-white/30 outline-none text-sm"
      />
      <button type="submit" disabled={!name.trim()} className="h-10 px-4 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 text-sm font-medium">
        ＋ Button
      </button>
    </form>
  );
}
