import { CSSProperties, PointerEvent as ReactPointerEvent, useCallback, useRef, useState } from 'react';
import { BoardRow, padsForTeam, SoundPad, TeamId } from '../../types';
import { NEW_ROW, useBoard } from '../../contexts/BoardContext';
import { padTextColor } from '../../config/defaultBoard';
import { TEAMS } from '../../config/teams';

/**
 * Anordnung des Dashboards: Buttons werden mit der Maus (oder dem Finger)
 * an ihre Position gezogen. Nutzt Pointer-Events, damit es auf Mac und iPad
 * gleichermassen funktioniert - die HTML5-Drag-API tut das auf iOS nicht.
 *
 * Die Kacheln haben dieselbe Breite wie die echten Buttons (--pad-w), damit
 * der Umbruch hier genauso aussieht wie im Spiel.
 */

interface DragState {
  padId: string;
  /** Zeigerposition */
  x: number;
  y: number;
  /** Griffpunkt innerhalb der Kachel */
  dx: number;
  dy: number;
  w: number;
  h: number;
  moved: boolean;
}

interface Target {
  rowId: string;
  index: number;
}

/**
 * Rechnet eine Einfuegestelle der SICHTBAREN Liste in die echte Position um.
 * Noetig, weil in einer Mannschafts-Ansicht Buttons der anderen ausgeblendet sind.
 */
function realIndex(row: BoardRow, visibleIndex: number, team: TeamId | null): number {
  if (!team) return visibleIndex;
  let seen = 0;
  for (let i = 0; i < row.pads.length; i++) {
    if (seen === visibleIndex) return i;
    if (row.pads[i].teams.includes(team)) seen++;
  }
  return row.pads.length;
}

export function LayoutEditor({ teamFilter = null }: { teamFilter?: TeamId | null }) {
  const { board, movePadTo, movePad, moveRow } = useBoard();
  const [drag, setDrag] = useState<DragState | null>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /** Ermittelt aus der Zeigerposition Zeile und Einfuegestelle. */
  const hitTest = useCallback((x: number, y: number): Target | null => {
    const root = containerRef.current;
    if (!root) return null;
    const zones = [...root.querySelectorAll<HTMLElement>('[data-row-id]')];
    if (zones.length === 0) return null;

    // Zeile: die unter dem Zeiger, sonst die vertikal naechste
    let zone = zones.find(z => {
      const r = z.getBoundingClientRect();
      return y >= r.top && y <= r.bottom;
    });
    if (!zone) {
      zone = zones.reduce((best, z) => {
        const d = (r: DOMRect) => (y < r.top ? r.top - y : y - r.bottom);
        return d(z.getBoundingClientRect()) < d(best.getBoundingClientRect()) ? z : best;
      });
    }

    const rowId = zone.dataset.rowId!;
    const tiles = [...zone.querySelectorAll<HTMLElement>('[data-pad-id]')];
    // Einfuegestelle: wie viele Kachelmitten liegen vor dem Zeiger?
    // Zeilenweise vergleichen, damit es auch bei umgebrochenen Zeilen stimmt.
    let index = 0;
    for (const t of tiles) {
      const r = t.getBoundingClientRect();
      const beforeInRow = y >= r.top && y <= r.bottom && x > r.left + r.width / 2;
      const aboveRow = y > r.bottom;
      if (beforeInRow || aboveRow) index++;
    }
    return { rowId, index };
  }, []);

  const onPointerDown = (padId: string) => (e: ReactPointerEvent<HTMLElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const tile = e.currentTarget as HTMLElement;
    const r = tile.getBoundingClientRect();
    tile.setPointerCapture(e.pointerId);
    setDrag({ padId, x: e.clientX, y: e.clientY, dx: e.clientX - r.left, dy: e.clientY - r.top, w: r.width, h: r.height, moved: false });
    setTarget(null);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    if (!drag) return;
    e.preventDefault();
    const moved = drag.moved || Math.abs(e.clientX - drag.x) > 4 || Math.abs(e.clientY - drag.y) > 4;
    setDrag({ ...drag, x: e.clientX, y: e.clientY, moved });
    if (moved) setTarget(hitTest(e.clientX, e.clientY));
  };

  const endDrag = () => {
    if (drag?.moved && target) {
      const row = board.rows.find(r => r.id === target.rowId);
      const index = row ? realIndex(row, target.index, teamFilter) : target.index;
      movePadTo(drag.padId, target.rowId, index);
    }
    setDrag(null);
    setTarget(null);
  };

  const visible = (row: BoardRow) => padsForTeam(row, teamFilter);
  const dragged = drag ? board.rows.flatMap(r => r.pads).find(p => p.id === drag.padId) : undefined;

  return (
    <div className="board-rows" ref={containerRef} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
      <p className="text-[11px] uppercase tracking-[0.12em] text-vsg-ice/70 mb-2 px-1">
        Anordnung – Buttons mit der Maus an ihren Platz ziehen
      </p>

      <div className="flex flex-col gap-2">
        {board.rows.map((row, rowIndex) => (
          <div key={row.id} className="flex items-stretch gap-2">
            <div className="flex flex-col justify-center gap-1 shrink-0">
              <button onClick={() => moveRow(row.id, -1)} disabled={rowIndex === 0} title="Zeile nach oben" className="w-7 h-7 rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-25 text-xs">⇡</button>
              <button onClick={() => moveRow(row.id, 1)} disabled={rowIndex === board.rows.length - 1} title="Zeile nach unten" className="w-7 h-7 rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-25 text-xs">⇣</button>
            </div>
            <div
              data-row-id={row.id}
              className={`board-row flex-1 min-h-[64px] rounded-xl p-1.5 border border-dashed transition-colors ${
                target?.rowId === row.id ? 'border-vsg-cyan bg-vsg-cyan/10' : 'border-white/10'
              }`}
            >
              {visible(row).length === 0 && (
                <span className="self-center text-xs text-white/35 px-2">
                  {teamFilter ? 'in dieser Ansicht leer' : 'leere Zeile – wird im Spiel ausgeblendet'}
                </span>
              )}
              {visible(row).map((pad, i) => (
                <Tile
                  key={pad.id}
                  pad={pad}
                  showTeams={!teamFilter}
                  dragging={drag?.moved === true && drag.padId === pad.id}
                  insertBefore={target?.rowId === row.id && target.index === i}
                  onPointerDown={onPointerDown(pad.id)}
                  onKeyMove={dir => movePad(pad.id, dir)}
                />
              ))}
              {target?.rowId === row.id && target.index >= visible(row).length && <Caret />}
            </div>
          </div>
        ))}

        {/* Ablegen hier erzeugt eine neue Zeile */}
        <div className="flex items-stretch gap-2">
          <div className="w-7 shrink-0" />
          <div
            data-row-id={NEW_ROW}
            className={`board-row flex-1 min-h-[52px] rounded-xl p-1.5 border border-dashed items-center transition-colors ${
              target?.rowId === NEW_ROW ? 'border-vsg-cyan bg-vsg-cyan/10' : 'border-white/15'
            }`}
          >
            <span className="text-xs text-white/40 px-2">Button hierher ziehen = neue Zeile</span>
          </div>
        </div>
      </div>

      {/* Kachel am Zeiger */}
      {drag?.moved && dragged && (
        <div
          className="fixed z-50 pointer-events-none rounded-lg flex items-center justify-center px-2 text-sm font-bold shadow-2xl opacity-90"
          style={{
            left: drag.x - drag.dx,
            top: drag.y - drag.dy,
            width: drag.w,
            height: drag.h,
            background: dragged.color,
            color: padTextColor(dragged.color),
            transform: 'scale(1.05)',
          }}
        >
          <span className="truncate">{dragged.name}</span>
        </div>
      )}
    </div>
  );
}

function Caret() {
  return <div className="w-1 self-stretch rounded-full bg-vsg-cyan shadow-[0_0_8px_#009fe3]" aria-hidden />;
}

interface TileProps {
  pad: SoundPad;
  showTeams: boolean;
  dragging: boolean;
  insertBefore: boolean;
  onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
  onKeyMove: (dir: 'left' | 'right' | 'up' | 'down') => void;
}

function Tile({ pad, showTeams, dragging, insertBefore, onPointerDown, onKeyMove }: TileProps) {
  const style = { background: pad.color, color: padTextColor(pad.color) } as CSSProperties;
  // Kuerzel der Mannschaften, damit man in der Gesamtansicht die Zuordnung sieht
  const badge = TEAMS.filter(t => pad.teams.includes(t.id)).map(t => t.short).join('');
  return (
    <>
      {insertBefore && <Caret />}
      <button
        data-pad-id={pad.id}
        onPointerDown={onPointerDown}
        onKeyDown={e => {
          const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' } as const;
          const dir = map[e.key as keyof typeof map];
          if (dir) {
            e.preventDefault();
            onKeyMove(dir);
          }
        }}
        title={`${pad.name} – ziehen oder mit den Pfeiltasten verschieben`}
        className={`pad-tile relative rounded-lg flex flex-col items-center justify-center px-2 text-center cursor-grab active:cursor-grabbing select-none touch-none ${
          dragging ? 'opacity-25' : ''
        } ${pad.clips.length === 0 ? 'saturate-50 brightness-75' : ''}`}
        style={style}
      >
        <span className="text-sm font-bold leading-tight line-clamp-2">{pad.name}</span>
        {pad.clips.length > 0 && <span className="text-[10px] opacity-75">{pad.clips.length} Sound{pad.clips.length === 1 ? '' : 's'}</span>}
        {showTeams && (
          <span
            className="absolute top-1 right-1 px-1 rounded bg-black/35 text-[10px] font-bold tracking-wider"
            title={TEAMS.filter(t => pad.teams.includes(t.id)).map(t => t.name).join(' + ')}
          >
            {badge}
          </span>
        )}
      </button>
    </>
  );
}
