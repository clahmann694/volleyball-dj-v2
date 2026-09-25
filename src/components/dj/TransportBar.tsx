import { CSSProperties, useEffect } from 'react';
import { useAudio } from '../../contexts/AudioContext';
import { useBoard } from '../../contexts/BoardContext';
import { formatTime } from '../../utils/formatTime';

/** Untere Leiste: was laeuft, Fortschritt, Fade-out, STOP, Lautstaerke. */
export function TransportBar() {
  const { playing, clipName, isPlaying, isPaused, position, cue, fileDuration, volume, setVolume, stopAll, fadeOut, isFading, error, clearError, pause, resume } = useAudio();
  const { padIndex } = useBoard();

  // Fehlermeldungen verschwinden von selbst
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(clearError, 7000);
    return () => clearTimeout(t);
  }, [error, clearError]);

  const pad = playing ? padIndex.get(playing.padId)?.pad : undefined;
  const start = cue?.start ?? 0;
  const end = cue?.end ?? fileDuration ?? null;
  const total = end != null && end > start ? end - start : null;
  const elapsed = Math.max(0, position - start);
  const progress = total ? Math.min(100, (elapsed / total) * 100) : 0;
  const remaining = total != null ? Math.max(0, total - elapsed) : null;
  const style = { '--c': pad?.color ?? '#ffffff' } as CSSProperties;

  return (
    <footer className="safe-bottom safe-x relative shrink-0 border-t border-white/10 bg-vsg-navy-900/90 backdrop-blur-xl px-4 py-2 flex items-center gap-4" style={style}>
      {error && (
        <div className="anim-toast absolute left-4 right-4 -top-12 flex items-center gap-2 rounded-lg bg-vsg-red/95 px-3 py-2 text-sm shadow-lg">
          <span className="flex-1">{error}</span>
          <button onClick={clearError} aria-label="Meldung schließen" className="px-1">✕</button>
        </div>
      )}

      {/* Now playing */}
      <div className="flex-1 min-w-0">
        {playing ? (
          <>
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: 'var(--c)', boxShadow: '0 0 10px var(--c)' }} />
              <span className="font-semibold truncate">{pad?.name ?? '…'}</span>
              <span className="text-white/40">·</span>
              <span className="text-white/70 truncate">{clipName}</span>
              {!isPlaying && !isPaused && <span className="text-xs text-white/40">lädt…</span>}
              {isPaused && <span className="text-xs text-amber-300 font-medium">pausiert</span>}
              {isFading && <span className="text-xs text-vsg-ice animate-pulse">Fade…</span>}
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full transition-[width] duration-100" style={{ width: `${progress}%`, background: 'var(--c)' }} />
            </div>
            <div className="mt-1 flex justify-between text-[11px] font-mono text-white/50">
              <span>{formatTime(elapsed)}</span>
              <span>{remaining != null ? `-${formatTime(remaining)}` : ''}</span>
            </div>
          </>
        ) : (
          <div className="text-vsg-ice/70 text-sm">Bereit – tippe einen Button.</div>
        )}
      </div>

      {/* Fade out */}
      <button
        onClick={() => fadeOut(1500)}
        disabled={!isPlaying || isFading}
        className="hidden sm:flex items-center gap-2 px-4 py-3 rounded-xl border border-vsg-cyan/70 text-vsg-cyan hover:bg-vsg-cyan/15 disabled:opacity-40 disabled:hover:bg-transparent font-semibold text-sm"
      >
        <span>↘</span>
        <span>Fade out</span>
      </button>

      {/* Pause / Weiter */}
      <button
        onClick={isPaused ? resume : pause}
        disabled={!playing || (!isPlaying && !isPaused) || isFading}
        aria-label={isPaused ? 'Weiter' : 'Pause'}
        className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:hover:bg-white/10 font-semibold text-sm min-w-[104px] justify-center"
      >
        <span>{isPaused ? '▶' : '⏸'}</span>
        <span>{isPaused ? 'Weiter' : 'Pause'}</span>
      </button>

      {/* STOP */}
      <button
        onClick={stopAll}
        disabled={!playing}
        aria-label="Alles stoppen"
        className="btn-stop w-14 h-14 rounded-full font-extrabold text-sm tracking-wide text-white flex flex-col items-center justify-center transition-transform disabled:opacity-50"
      >
        STOP
        <span className="hidden md:block text-[9px] font-normal opacity-70">Leertaste</span>
      </button>

      {/* Volume */}
      <div className="hidden sm:flex items-center gap-2 w-40">
        <span className="text-vsg-ice">{volume === 0 ? '🔇' : '🔊'}</span>
        <input
          type="range"
          className="slider flex-1"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={e => setVolume(parseFloat(e.target.value))}
          aria-label="Lautstärke"
        />
      </div>
    </footer>
  );
}
