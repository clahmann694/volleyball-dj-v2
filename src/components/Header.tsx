import { ViewMode } from '../types';
import { useTeam } from '../contexts/TeamContext';
import { TEAMS } from '../config/teams';

interface HeaderProps {
  view: ViewMode;
  onChangeView: (view: ViewMode) => void;
}

export function Header({ view, onChangeView }: HeaderProps) {
  const { team, clearTeam } = useTeam();
  const active = TEAMS.find(t => t.id === team);
  return (
    <header className="safe-top safe-x shrink-0 min-h-14 px-4 flex items-center justify-between bg-vsg-navy-900/80 backdrop-blur-xl border-b border-white/10">
      <h1 className="flex items-center gap-3 min-w-0">
        <span className="w-9 h-9 rounded-lg bg-white p-1 shrink-0 shadow">
          <img src={`${import.meta.env.BASE_URL}brand/vsg-logo-96.png`} alt="VSG Kleinsteinbach" className="w-full h-full object-contain" />
        </span>
        <span className="flex flex-col leading-tight min-w-0">
          <span className="text-base font-bold tracking-tight">VB DJ</span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-vsg-ice truncate">VSG Kleinsteinbach</span>
        </span>
      </h1>

      <div className="flex items-center gap-2">
        {/* aktuelle Mannschaft, Klick = wechseln */}
        {active && (
          <button
            onClick={clearTeam}
            title="Mannschaft wechseln"
            className="hidden sm:flex items-center gap-2 h-9 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-semibold"
          >
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: active.color, boxShadow: `0 0 8px ${active.color}` }} />
            {active.name}
            <span className="text-white/40 text-xs">wechseln</span>
          </button>
        )}

      {/* Umschalter DJ / Dev */}
      <div className="flex rounded-lg bg-white/10 p-1 text-sm font-medium">
        <ViewButton active={view === 'dj'} onClick={() => onChangeView('dj')} label="DJ" icon="🎧" />
        <ViewButton active={view === 'dev'} onClick={() => onChangeView('dev')} label="Dev" icon="🛠️" />
      </div>
      </div>
    </header>
  );
}

function ViewButton({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
        active ? 'bg-vsg-cyan text-white shadow' : 'text-vsg-ice hover:text-white'
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
