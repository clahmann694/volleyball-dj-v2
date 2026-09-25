import { useBoard } from '../contexts/BoardContext';
import { useTeam } from '../contexts/TeamContext';
import { TEAMS } from '../config/teams';
import { padsForTeam } from '../types';

/** Startfrage: für welche Mannschaft wird aufgelegt? */
export function TeamPicker() {
  const { setTeam, lastTeam } = useTeam();
  const { board } = useBoard();

  return (
    <div className="anim-fade fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-vsg-navy-950/95 backdrop-blur-sm">
      <div className="anim-rise flex flex-col items-center w-full">
      <img src={`${import.meta.env.BASE_URL}brand/vsg-logo-96.png`} alt="" className="w-16 h-16 object-contain mb-4 bg-white rounded-xl p-1.5" />
      <h1 className="text-2xl font-bold text-center">Für wen legst du auf?</h1>
      <p className="text-vsg-ice/70 text-sm mt-2 text-center">Danach siehst du nur die Buttons dieser Mannschaft.</p>

      <div className="mt-8 w-full max-w-lg flex flex-col sm:flex-row gap-4">
        {TEAMS.map(t => {
          const count = board.rows.reduce((n, r) => n + padsForTeam(r, t.id).filter(p => p.clips.length > 0).length, 0);
          return (
            <button
              key={t.id}
              onClick={() => setTeam(t.id)}
              autoFocus={lastTeam === t.id}
              className="flex-1 rounded-2xl px-6 py-8 font-bold text-xl text-white shadow-xl transition-transform hover:scale-[1.03] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              style={{ background: `linear-gradient(145deg, ${t.color}, color-mix(in srgb, ${t.color} 70%, black))` }}
            >
              <span className="block">{t.name}</span>
              <span className="block mt-1 text-sm font-medium opacity-80">
                {count} Button{count === 1 ? '' : 's'} mit Sounds
              </span>
              {lastTeam === t.id && <span className="block mt-2 text-xs font-medium opacity-70">zuletzt gewählt</span>}
            </button>
          );
        })}
      </div>
      </div>
    </div>
  );
}
