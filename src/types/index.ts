/** Start/Ende eines Sounds innerhalb der Audiodatei, in Sekunden. */
export interface CuePoint {
  start: number;
  /** null = bis zum Dateiende */
  end: number | null;
}

/** Ein einzelner abspielbarer Sound (eine Audiodatei mit Cue-Points). */
export interface SoundClip {
  id: string;
  name: string;
  /** Schluessel der Audiodatei im AudioStore (IndexedDB) */
  fileId: string;
  fileName: string;
  mimeType: string;
  size: number;
  /** Gesamtdauer der Datei in Sekunden, null wenn (noch) unbekannt */
  duration: number | null;
  cue: CuePoint;
  /** Lautstaerke dieses Sounds relativ zur Gesamtlautstaerke, 0..1 (1 = unveraendert) */
  gain: number;
}

/**
 * Was passiert, wenn ein Button gedrueckt wird:
 * single   - ein (zufaelliger) Sound, danach Stille (Jingles)
 * loop     - ein Sound laeuft nahtlos in Dauerschleife, bis gestoppt wird
 * sequence - alle Sounds der Reihe nach, dann von vorn (Warm-up-Playlist)
 * shuffle  - alle Sounds in zufaelliger Reihenfolge ohne direkte Wiederholung, endlos
 */
export type PlaybackMode = 'single' | 'loop' | 'sequence' | 'shuffle';

/** Mannschaft, für die aufgelegt wird. */
export type TeamId = 'herren' | 'damen';

/** Ein Button auf dem Dashboard. Mehrere Clips = Zufallsauswahl beim Klick. */
export interface SoundPad {
  id: string;
  name: string;
  /** Kleingedruckte Erklaerung unter der Beschriftung, z. B. "z.B. kurzer Aufschlag, Lob" (optional) */
  description: string;
  /** Tastenfarbe (Hex), siehe PAD_COLORS */
  color: string;
  /** Mannschaften, bei denen dieser Button erscheint (mindestens eine) */
  teams: TeamId[];
  playback: PlaybackMode;
  clips: SoundClip[];
}

/** Eine Zeile des Dashboards; ihre Buttons teilen sich die Breite gleichmaessig. */
export interface BoardRow {
  id: string;
  pads: SoundPad[];
}

/** Das Board besteht aus frei belegbaren Zeilen; alle Buttons sind gleich breit. */
export interface BoardConfig {
  version: 5;
  rows: BoardRow[];
}

/** Alle Buttons in Lesereihenfolge */
export function allPads(board: BoardConfig): SoundPad[] {
  return board.rows.flatMap(r => r.pads);
}

/** Buttons einer Zeile, die bei dieser Mannschaft erscheinen (team = null: alle) */
export function padsForTeam(row: BoardRow, team: TeamId | null): SoundPad[] {
  return team ? row.pads.filter(p => p.teams.includes(team)) : row.pads;
}

export type ViewMode = 'dj' | 'dev';

export interface PlayingClip {
  padId: string;
  clipId: string;
}
