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

/** Ein Button auf dem Dashboard. Mehrere Clips = Zufallsauswahl beim Klick. */
export interface SoundPad {
  id: string;
  name: string;
  /** Tastenfarbe (Hex), siehe PAD_COLORS */
  color: string;
  clips: SoundClip[];
}

/** Eine Zeile des Dashboards; ihre Buttons teilen sich die Breite gleichmaessig. */
export interface BoardRow {
  id: string;
  pads: SoundPad[];
}

/** Das Board besteht aus frei belegbaren Zeilen (1 Button = volle Breite, 4 Buttons = Viertel). */
export interface BoardConfig {
  version: 3;
  rows: BoardRow[];
}

/** Alle Buttons in Lesereihenfolge */
export function allPads(board: BoardConfig): SoundPad[] {
  return board.rows.flatMap(r => r.pads);
}

export type ViewMode = 'dj' | 'dev';

export interface PlayingClip {
  padId: string;
  clipId: string;
}
