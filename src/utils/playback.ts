import { SoundClip, SoundPad } from '../types';

/**
 * Wie viele der zuletzt gespielten Sounds eines Buttons werden bei der
 * naechsten Zufallswahl ausgeschlossen? Die letzte Haelfte (aufgerundet),
 * mindestens einer, hoechstens alle bis auf einen.
 *
 *   2 Sounds → 1 (immer abwechselnd)      3 → 2 (alle drei reihum)
 *   4 → 2    6 → 3    10 → 5    20 → 10 (ein Lied fruehestens nach 10 anderen)
 *
 * Nur den letzten auszuschliessen reichte nicht: bei drei Liedern kam A B A,
 * bei zwanzig Liedern dasselbe nach drei, vier Druecken (Beschwerde 2026-09-25).
 */
export function excludeCount(clipCount: number): number {
  if (clipCount <= 1) return 0;
  return Math.min(clipCount - 1, Math.ceil(clipCount / 2));
}

/**
 * Welcher Sound startet, wenn der Button gedrueckt wird?
 * `recent` sind die zuletzt gespielten Sounds dieses Buttons (aelteste zuerst);
 * die juengsten davon werden uebersprungen, damit es wirklich abwechselt.
 */
export function firstClip(pad: SoundPad, recent: readonly string[] = []): SoundClip | undefined {
  if (pad.clips.length === 0) return undefined;
  if (pad.playback === 'sequence') return pad.clips[0];
  return randomClip(pad.clips, recent);
}

/** Wiederholt der Audio-Motor den Sound selbst (nahtlos)? */
export function isLooping(pad: SoundPad): boolean {
  return pad.playback === 'loop';
}

/** Welcher Sound folgt, wenn `currentId` von selbst zu Ende ist? undefined = Stille. */
export function nextClip(pad: SoundPad, currentId: string, recent: readonly string[] = []): SoundClip | undefined {
  // Bei 'loop' wiederholt Howler selbst - hier gibt es nichts nachzustarten
  if (pad.playback === 'single' || pad.playback === 'loop' || pad.clips.length === 0) return undefined;
  if (pad.playback === 'sequence') {
    const i = pad.clips.findIndex(c => c.id === currentId);
    return pad.clips[(i + 1) % pad.clips.length];
  }
  // currentId ist normalerweise schon der juengste Eintrag in recent - sicherheitshalber anhaengen
  return randomClip(pad.clips, recent[recent.length - 1] === currentId ? recent : [...recent, currentId]);
}

/**
 * Zufaellig aus den Sounds, die nicht zu den juengsten `excludeCount` gespielten
 * gehoeren. Faellt auf alle zurueck, falls der Verlauf Sounds nennt, die es
 * nicht mehr gibt und der Pool dadurch leer waere.
 */
export function randomClip(clips: SoundClip[], recent: readonly string[] = []): SoundClip {
  const n = excludeCount(clips.length);
  const blocked = new Set(recent.slice(-n));
  const pool = n > 0 ? clips.filter(c => !blocked.has(c.id)) : clips;
  const source = pool.length > 0 ? pool : clips;
  return source[Math.floor(Math.random() * source.length)];
}
