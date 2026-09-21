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
  icon: string;
  clips: SoundClip[];
}

/** Eine farbige Kategorie (Scoring, Momentum, ...). */
export interface SoundGroup {
  id: string;
  name: string;
  icon: string;
  color: string;
  pads: SoundPad[];
}

export interface BoardConfig {
  version: 1;
  groups: SoundGroup[];
}

export type ViewMode = 'dj' | 'dev';

export interface PlayingClip {
  padId: string;
  clipId: string;
}
