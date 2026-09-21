import { ViewMode } from '../types';

interface HeaderProps {
  view: ViewMode;
  onChangeView: (view: ViewMode) => void;
}

export function Header({ view, onChangeView }: HeaderProps) {
  return (
    <header className="shrink-0 h-14 px-4 flex items-center justify-between bg-surface-1/80 backdrop-blur-xl border-b border-white/10">
      <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
        <span>🏐</span>
        <span className="bg-gradient-to-r from-yellow-300 to-orange-400 bg-clip-text text-transparent">VB DJ</span>
      </h1>

      {/* Umschalter DJ / Dev */}
      <div className="flex rounded-lg bg-white/10 p-1 text-sm font-medium">
        <ViewButton active={view === 'dj'} onClick={() => onChangeView('dj')} label="DJ" icon="🎧" />
        <ViewButton active={view === 'dev'} onClick={() => onChangeView('dev')} label="Dev" icon="🛠️" />
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
        active ? 'bg-blue-600 text-white shadow' : 'text-white/60 hover:text-white'
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
