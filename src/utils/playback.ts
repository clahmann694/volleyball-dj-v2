import { SoundClip, SoundPad } from '../types';

/** Welcher Sound startet, wenn der Button gedrueckt wird? */
export function firstClip(pad: SoundPad): SoundClip | undefined {
  if (pad.clips.length === 0) return undefined;
  if (pad.playback === 'sequence') return pad.clips[0];
  return randomClip(pad.clips, null);
}

/** Welcher Sound folgt, wenn `currentId` von selbst zu Ende ist? undefined = Stille. */
export function nextClip(pad: SoundPad, currentId: string): SoundClip | undefined {
  if (pad.playback === 'single' || pad.clips.length === 0) return undefined;
  if (pad.playback === 'sequence') {
    const i = pad.clips.findIndex(c => c.id === currentId);
    return pad.clips[(i + 1) % pad.clips.length];
  }
  return randomClip(pad.clips, currentId);
}

/** Zufaellig, aber nie derselbe Sound zweimal hintereinander (wenn es mehr als einen gibt). */
export function randomClip(clips: SoundClip[], excludeId: string | null): SoundClip {
  const pool = clips.length > 1 && excludeId ? clips.filter(c => c.id !== excludeId) : clips;
  return pool[Math.floor(Math.random() * pool.length)];
}
