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
}

/** Mannschaft, für die aufgelegt wird. */
export type TeamId = 'herren' | 'damen';

/** Ein Button auf dem Dashboard. Mehrere Clips = Zufallsauswahl beim Klick. */
export interface SoundPad {
  id: string;
  name: string;
  /** Tastenfarbe (Hex), siehe PAD_COLORS */
  color: string;
  /** Mannschaften, bei denen dieser Button erscheint (mindestens eine) */
  teams: TeamId[];
  clips: SoundClip[];
}

/** Eine Zeile des Dashboards; ihre Buttons teilen sich die Breite gleichmaessig. */
export interface BoardRow {
  id: string;
  pads: SoundPad[];
}

/** Das Board besteht aus frei belegbaren Zeilen; alle Buttons sind gleich breit. */
export interface BoardConfig {
  version: 4;
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
