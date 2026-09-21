import { BoardConfig, SoundClip, SoundPad } from '../types';
import { DEFAULT_BOARD, PAD_COLORS } from '../config/defaultBoard';

const KEY = 'vbdj-v2-board';

// Version 1 hatte Gruppen (Scoring, Momentum, ...) mit eigener Farbe
interface LegacyPad { id: string; name: string; clips?: SoundClip[] }
interface LegacyGroup { id: string; color?: string; pads?: LegacyPad[] }
interface LegacyBoard { version: 1; groups: LegacyGroup[] }

const LEGACY_GROUP_COLOR: Record<string, string> = {
  scoring: PAD_COLORS[0].hex,
  momentum: PAD_COLORS[1].hex,
  timeouts: PAD_COLORS[3].hex,
  fun: PAD_COLORS[5].hex,
  events: PAD_COLORS[4].hex,
};

/** Akzeptiert v1 und v2, liefert immer ein v2-Board oder null. */
export function migrateBoard(raw: unknown): BoardConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const b = raw as { version?: number };
  if (b.version === 2 && Array.isArray((b as BoardConfig).pads)) return b as BoardConfig;
  if (b.version === 1 && Array.isArray((b as LegacyBoard).groups)) {
    const pads: SoundPad[] = [];
    for (const g of (b as LegacyBoard).groups) {
      const color = LEGACY_GROUP_COLOR[g.id] ?? g.color ?? PAD_COLORS[4].hex;
      for (const p of g.pads ?? []) pads.push({ id: p.id, name: p.name, color, clips: p.clips ?? [] });
    }
    return { version: 2, pads };
  }
  return null;
}

export function loadBoard(): BoardConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const migrated = migrateBoard(JSON.parse(raw));
      if (migrated) return migrated;
    }
  } catch {
    /* kaputte Daten -> Standard */
  }
  return DEFAULT_BOARD;
}

export function saveBoard(board: BoardConfig): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(board));
  } catch (e) {
    console.warn('Board konnte nicht gespeichert werden', e);
  }
}
