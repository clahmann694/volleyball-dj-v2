import { BoardConfig } from '../types';
import { DEFAULT_BOARD } from '../config/defaultBoard';

const KEY = 'vbdj-v2-board';

export function loadBoard(): BoardConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as BoardConfig;
      if (parsed && parsed.version === 1 && Array.isArray(parsed.groups)) return parsed;
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
