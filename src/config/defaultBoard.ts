import { BoardConfig, SoundPad } from '../types';
import { ALL_TEAM_IDS } from './teams';

/** Die sechs Tastenfarben (aus den Referenzbildern gesampelt). */
export const PAD_COLORS = [
  { id: 'red', hex: '#e00000', label: 'Rot' },
  { id: 'orange', hex: '#fb6203', label: 'Orange' },
  { id: 'yellow', hex: '#fedc05', label: 'Gelb' },
  { id: 'green', hex: '#10cc1c', label: 'Grün' },
  { id: 'blue', hex: '#0a45f8', label: 'Blau' },
  { id: 'purple', hex: '#8f0af0', label: 'Lila' },
] as const;

/** Beschriftungsfarbe: dunkel auf hellen Tasten (Gelb), sonst weiss. */
export function padTextColor(hex: string): string {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return '#ffffff';
  const [r, g, b] = [m[1], m[2], m[3]].map(h => parseInt(h, 16) / 255);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.6 ? '#0b1a27' : '#ffffff';
}

// Neue Buttons gelten zunaechst fuer beide Mannschaften
const pad = (id: string, name: string, color: string): SoundPad => ({ id, name, color, teams: [...ALL_TEAM_IDS], playback: 'single', clips: [] });
const C = Object.fromEntries(PAD_COLORS.map(c => [c.id, c.hex])) as Record<(typeof PAD_COLORS)[number]['id'], string>;

// Startbelegung: die Buttons aus der V1 (ohne Audiodateien), eine Zeile je frueherer Kategorie
export const DEFAULT_BOARD: BoardConfig = {
  version: 5,
  rows: [
    { id: 'row-scoring', pads: [pad('ace', 'Ass!', C.red), pad('block', 'Block!', C.red), pad('kill', 'Angriff!', C.red), pad('point', 'Punkt!', C.red), pad('set-point', 'Satzball', C.red)] },
    { id: 'row-momentum', pads: [pad('lets-go', "Los geht's!", C.orange), pad('air-horn', 'Tröte', C.orange), pad('drum-roll', 'Trommelwirbel', C.orange), pad('crowd-cheer', 'Jubel', C.orange), pad('siren', 'Sirene', C.orange)] },
    { id: 'row-timeouts', pads: [pad('timeout-beat', 'Timeout-Beat', C.green), pad('hype-track', 'Hype-Track', C.green), pad('walk-on', 'Einlauf', C.green), pad('halftime', 'Halbzeit', C.green)] },
    { id: 'row-fun', pads: [pad('buzzer', 'Buzzer', C.purple), pad('fail', 'Wah Wah', C.purple), pad('applause', 'Applaus', C.purple), pad('defense', 'Abwehr!', C.purple), pad('boo', 'Buh!', C.purple)] },
    { id: 'row-events', pads: [pad('whistle', 'Pfiff', C.blue), pad('substitution', 'Wechsel', C.blue), pad('challenge', 'Challenge', C.blue), pad('game-start', 'Spielstart', C.blue)] },
  ],
};
