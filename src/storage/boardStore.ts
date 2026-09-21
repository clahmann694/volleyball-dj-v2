import { BoardConfig, SoundClip, SoundPad } from '../types';
import { DEFAULT_BOARD, PAD_COLORS } from '../config/defaultBoard';
import { newId } from '../utils/id';

const KEY = 'vbdj-v2-board';

// Version 1 hatte Gruppen (Scoring, Momentum, ...) mit eigener Farbe,
// Version 2 eine flache Liste von Pads mit eigener Farbe.
interface LegacyPad { id: string; name: string; clips?: SoundClip[] }
interface LegacyGroup { id: string; color?: string; pads?: LegacyPad[] }
interface LegacyBoardV1 { version: 1; groups: LegacyGroup[] }
interface LegacyBoardV2 { version: 2; pads: SoundPad[] }

/** Spalten des iPad-Rasters vor v3 - so bleibt die gewohnte Anordnung erhalten */
const V2_ROW_LENGTH = 6;

function rowsFromFlat(pads: SoundPad[]): BoardConfig {
  const rows = [];
  for (let i = 0; i < pads.length; i += V2_ROW_LENGTH) rows.push({ id: newId(), pads: pads.slice(i, i + V2_ROW_LENGTH) });
  if (rows.length === 0) rows.push({ id: newId(), pads: [] });
  return { version: 3, rows };
}

const LEGACY_GROUP_COLOR: Record<string, string> = {
  scoring: PAD_COLORS[0].hex,
  momentum: PAD_COLORS[1].hex,
  timeouts: PAD_COLORS[3].hex,
  fun: PAD_COLORS[5].hex,
  events: PAD_COLORS[4].hex,
};

/** Akzeptiert v1, v2 und v3, liefert immer ein v3-Board oder null. */
export function migrateBoard(raw: unknown): BoardConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const b = raw as { version?: number };
  if (b.version === 3 && Array.isArray((b as BoardConfig).rows)) return b as BoardConfig;
  if (b.version === 2 && Array.isArray((b as LegacyBoardV2).pads)) return rowsFromFlat((b as LegacyBoardV2).pads);
  if (b.version === 1 && Array.isArray((b as LegacyBoardV1).groups)) {
    const pads: SoundPad[] = [];
    for (const g of (b as LegacyBoardV1).groups) {
      const color = LEGACY_GROUP_COLOR[g.id] ?? g.color ?? PAD_COLORS[4].hex;
      for (const p of g.pads ?? []) pads.push({ id: p.id, name: p.name, color, clips: p.clips ?? [] });
    }
    return rowsFromFlat(pads);
  }
  return null;
}

const LAST_EXPORT_KEY = 'vbdj-v2-last-export';
const LAST_CHANGE_KEY = 'vbdj-v2-last-change';

export function loadBoard(): BoardConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { version?: number };
      const migrated = migrateBoard(parsed);
      if (migrated) {
        // Sicherheitskopie des alten Formats, falls eine Migration je etwas verliert
        if (parsed.version !== migrated.version) {
          localStorage.setItem(`${KEY}.backup-v${parsed.version ?? 0}-${new Date().toISOString().slice(0, 10)}`, raw);
        }
        return migrated;
      }
    }
  } catch {
    /* kaputte Daten -> Standard */
  }
  return DEFAULT_BOARD;
}

/** Zeitpunkt des letzten Exports (ms) oder null */
export function getLastExport(): number | null {
  const v = Number(localStorage.getItem(LAST_EXPORT_KEY));
  return v > 0 ? v : null;
}
export function markExported(): void {
  localStorage.setItem(LAST_EXPORT_KEY, String(Date.now()));
}
/** Zeitpunkt der letzten inhaltlichen Aenderung (ms) oder null */
export function getLastChange(): number | null {
  const v = Number(localStorage.getItem(LAST_CHANGE_KEY));
  return v > 0 ? v : null;
}
export function markChanged(): void {
  localStorage.setItem(LAST_CHANGE_KEY, String(Date.now()));
}

export function saveBoard(board: BoardConfig): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(board));
  } catch (e) {
    console.warn('Board konnte nicht gespeichert werden', e);
  }
}
