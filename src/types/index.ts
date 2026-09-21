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

/** Das Board ist ein flaches Raster von Buttons in Lesereihenfolge. */
export interface BoardConfig {
  version: 2;
  pads: SoundPad[];
}

export type ViewMode = 'dj' | 'dev';

export interface PlayingClip {
  padId: string;
  clipId: string;
}
