import { CSSProperties, PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent, useEffect, useRef, useState } from 'react';
import { ClipRef, useBoard } from '../../contexts/BoardContext';
import { useAudio } from '../../contexts/AudioContext';
import { getFile } from '../../storage/audioStore';
import { computePeaks } from '../../utils/waveform';
import { formatTimePrecise } from '../../utils/formatTime';
import { Waveform } from './Waveform';

interface Props {
  clipRef: ClipRef;
  onClose: () => void;
}

const MIN_GAP = 0.1; // Sekunden zwischen Start und Ende

/**
 * Modal zum Setzen von Start/Ende eines Sounds.
 * Klick = Start, Shift+Klick = Ende, Marker sind ziehbar, Zahlenfelder fuer Feinarbeit.
 */
export function CuePointEditor({ clipRef, onClose }: Props) {
  const { clip, pad, group } = clipRef;
  const { updateClip } = useBoard();
  const audio = useAudio();

  const [duration, setDuration] = useState(clip.duration ?? 0);
  const [start, setStart] = useState(clip.cue.start);
  const [end, setEnd] = useState(clip.cue.end ?? clip.duration ?? 0);
  const [peaks, setPeaks] = useState<Float32Array | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dragging, setDragging] = useState<'start' | 'end' | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const suppressClick = useRef(false);

  const isPreviewing = audio.playing?.clipId === clip.id;
  const previewingRef = useRef(false);
  previewingRef.current = isPreviewing;
  const stopAllRef = useRef(audio.stopAll);
  stopAllRef.current = audio.stopAll;

  // Audiodatei laden, Wellenform berechnen, echte Dauer uebernehmen
  useEffect(() => {
    let alive = true;
    (async () => {
      const stored = await getFile(clip.fileId).catch(() => undefined);
      if (!alive) return;
      if (!stored) {
        setLoadError('Audiodatei fehlt – bitte neu importieren.');
        return;
      }
      try {
        const result = await computePeaks(stored.blob);
        if (!alive) return;
        setPeaks(result.peaks);
        setDuration(result.duration);
        setEnd(prev => (clip.cue.end == null ? result.duration : Math.min(prev, result.duration)));
      } catch (e) {
        console.warn(e);
        if (alive) setLoadError('Wellenform konnte nicht berechnet werden – Zeiten lassen sich trotzdem setzen.');
      }
    })();
    return () => {
      alive = false;
    };
  }, [clip.fileId, clip.cue.end]);

  // Vorschau stoppen, wenn der Editor geschlossen wird
  useEffect(() => () => {
    if (previewingRef.current) stopAllRef.current();
  }, []);

  const clamp = (t: number) => Math.min(duration, Math.max(0, t));
  const xToTime = (clientX: number) => {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect || !duration) return 0;
    return clamp(((clientX - rect.left) / rect.width) * duration);
  };
  const pct = (t: number) => (duration ? `${(t / duration) * 100}%` : '0%');

  const setStartSafe = (t: number) => setStart(Math.min(clamp(t), end - MIN_GAP));
  const setEndSafe = (t: number) => setEnd(Math.max(clamp(t), start + MIN_GAP));

  const onTimelineClick = (e: ReactMouseEvent) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    const t = xToTime(e.clientX);
    if (e.shiftKey) setEndSafe(t);
    else setStartSafe(t);
  };

  const onMarkerDown = (which: 'start' | 'end') => (e: ReactPointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(which);
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    if (!dragging) return;
    const t = xToTime(e.clientX);
    if (dragging === 'start') setStartSafe(t);
    else setEndSafe(t);
  };
  const onPointerUp = () => {
    if (dragging) {
      suppressClick.current = true;
      setDragging(null);
    }
  };

  const effectiveEnd = () => (end >= duration - 0.05 ? null : round1(end));

  const togglePreview = () => {
    if (isPreviewing) audio.stopAll();
    else audio.play(pad.id, clip, { start: round1(start), end: effectiveEnd() });
  };

  const save = () => {
    updateClip(clip.id, {
      cue: { start: round1(start), end: effectiveEnd() },
      duration: duration || clip.duration,
    });
    onClose();
  };

  const reset = () => {
    setStart(0);
    setEnd(duration);
  };

  const style = { '--g': group.color } as CSSProperties;
  const playhead = isPreviewing ? audio.position : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-xl rounded-2xl bg-surface-1 shadow-2xl" style={style} onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 p-4 border-b border-white/10">
          <h3 className="text-lg font-bold">Cue-Points setzen</h3>
          <span className="flex-1 text-right text-sm text-white/50 truncate">
            {pad.icon} {pad.name} · {clip.name}
          </span>
          <button onClick={onClose} aria-label="Schließen" className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/70">
            ✕
          </button>
        </div>

        <div className="p-4">
          {loadError && <p className="mb-3 text-sm text-orange-300">{loadError}</p>}

          {/* Timeline */}
          <div
            ref={timelineRef}
            onClick={onTimelineClick}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="relative h-28 rounded-xl bg-black/50 overflow-hidden cursor-crosshair select-none touch-none"
          >
            <Waveform peaks={peaks} color={group.color} />
            {/* abgedunkelte Bereiche ausserhalb des Clips */}
            <div className="absolute inset-y-0 left-0 bg-black/65 pointer-events-none" style={{ width: pct(start) }} />
            <div className="absolute inset-y-0 right-0 bg-black/65 pointer-events-none" style={{ width: pct(duration - end) }} />
            {/* aktiver Bereich */}
            <div
              className="absolute inset-y-0 border-l-2 border-r-2 border-green-400 bg-green-400/10 pointer-events-none"
              style={{ left: pct(start), width: pct(end - start) }}
            />
            {/* Playhead */}
            {playhead != null && (
              <div className="absolute inset-y-0 w-0.5 bg-yellow-300 shadow-[0_0_8px_#fde047] pointer-events-none" style={{ left: pct(playhead) }} />
            )}
            {/* Marker (ziehbar) */}
            <Marker side="start" pos={pct(start)} onPointerDown={onMarkerDown('start')} active={dragging === 'start'} />
            <Marker side="end" pos={pct(end)} onPointerDown={onMarkerDown('end')} active={dragging === 'end'} />
          </div>

          <div className="mt-2 flex justify-between text-sm text-white/60">
            <span>
              Start <strong className="text-white font-mono">{formatTimePrecise(start)}</strong>
            </span>
            <span>
              Dauer <strong className="text-white font-mono">{formatTimePrecise(end - start)}</strong>
            </span>
            <span>
              Ende <strong className="text-white font-mono">{formatTimePrecise(end)}</strong>
            </span>
          </div>
          <p className="mt-1 text-center text-xs text-white/40">Klick = Start · Shift+Klick = Ende · Marker ziehen</p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <NumberField label="Start (Sekunden)" value={start} max={duration} onChange={setStartSafe} />
            <NumberField label="Ende (Sekunden)" value={end} max={duration} onChange={setEndSafe} />
          </div>
        </div>

        <div className="flex gap-2 p-4 border-t border-white/10">
          <button onClick={reset} className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/15 font-semibold">
            Zurücksetzen
          </button>
          <button onClick={togglePreview} disabled={!!loadError && !clip.duration} className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold disabled:opacity-40">
            {isPreviewing ? '■ Stopp' : '▶ Vorschau'}
          </button>
          <button onClick={save} className="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-400 text-black font-bold">
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
}

function Marker({ side, pos, onPointerDown, active }: { side: 'start' | 'end'; pos: string; onPointerDown: (e: ReactPointerEvent) => void; active: boolean }) {
  const color = side === 'start' ? 'bg-green-400' : 'bg-red-400';
  return (
    <div
      onPointerDown={onPointerDown}
      role="slider"
      aria-label={side === 'start' ? 'Startmarker' : 'Endmarker'}
      className="absolute inset-y-0 w-6 -ml-3 cursor-ew-resize flex justify-center"
      style={{ left: pos }}
    >
      <div className={`w-1 h-full ${color} ${active ? 'shadow-[0_0_10px_currentColor]' : ''}`} />
      <div className={`absolute top-1 w-4 h-4 rounded-full ${color} border-2 border-black`} />
    </div>
  );
}

function NumberField({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-white/60">
      {label}
      <input
        type="number"
        min={0}
        max={max || undefined}
        step={0.1}
        value={round1(value)}
        onChange={e => {
          const v = parseFloat(e.target.value);
          if (Number.isFinite(v)) onChange(v);
        }}
        className="h-10 px-3 rounded-lg bg-black/40 border border-white/15 focus:border-blue-500 outline-none text-white font-mono"
      />
    </label>
  );
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}
