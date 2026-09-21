import { CSSProperties } from 'react';
import { SoundGroup } from '../../types';
import { SoundPad } from './SoundPad';

interface Props {
  group: SoundGroup;
  onOpenPanel: (padId: string) => void;
}

export function SoundGroupSection({ group, onOpenPanel }: Props) {
  const style = { '--g': group.color } as CSSProperties;
  return (
    <section className="group-card rounded-2xl px-3 py-1.5 flex flex-col flex-1 min-h-[96px]" style={style} aria-label={group.name}>
      <header className="flex items-center gap-2 mb-1.5 shrink-0">
        <span className="text-sm">{group.icon}</span>
        <h2 className="group-title text-xs font-bold uppercase tracking-[0.12em]">{group.name}</h2>
      </header>
      <div className="flex-1 min-h-0 grid gap-1.5 grid-cols-[repeat(auto-fit,minmax(120px,1fr))] auto-rows-fr">
        {group.pads.map(pad => (
          <SoundPad key={pad.id} pad={pad} onOpenPanel={onOpenPanel} />
        ))}
        {group.pads.length === 0 && (
          <p className="text-xs text-white/40 self-center">Keine Buttons – in der Dev-Ansicht anlegen.</p>
        )}
      </div>
    </section>
  );
}
