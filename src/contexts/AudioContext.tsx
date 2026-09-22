import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { Howl } from 'howler';
import { CuePoint, PlayingClip, SoundClip } from '../types';
import { getFile } from '../storage/audioStore';
import { howlerFormat } from '../utils/audioFormat';

/**
 * Audio-Engine der App. Es laeuft immer nur ein Sound (exklusiv):
 * ein neuer Klick stoppt den vorherigen. Cue-Points werden als Howler-Sprite
 * abgespielt, so dass der Sound exakt am Endpunkt aufhoert.
 */

interface AudioState {
  /** Was gerade laeuft oder geladen wird */
  playing: PlayingClip | null;
  clipName: string | null;
  isPlaying: boolean;
  /** Angehalten - laesst sich an derselben Stelle fortsetzen */
  isPaused: boolean;
  /** Absolute Position in der Datei (Sekunden) */
  position: number;
  /** Aktiver Abspielbereich */
  cue: CuePoint | null;
  fileDuration: number | null;
  volume: number;
  isFading: boolean;
  error: string | null;
}

type AudioAction =
  | { type: 'START'; playing: PlayingClip; clipName: string; cue: CuePoint; fileDuration: number | null }
  | { type: 'PLAYING'; isPlaying: boolean }
  | { type: 'PAUSED'; isPaused: boolean }
  | { type: 'POSITION'; position: number }
  | { type: 'STOPPED' }
  | { type: 'VOLUME'; volume: number }
  | { type: 'FADING'; isFading: boolean }
  | { type: 'ERROR'; error: string }
  | { type: 'CLEAR_ERROR' };

interface AudioContextType extends AudioState {
  play: (padId: string, clip: SoundClip, cueOverride?: CuePoint, gainOverride?: number, loop?: boolean) => void;
  pause: () => void;
  resume: () => void;
  stopAll: () => void;
  /** Wird aufgerufen, wenn ein Sound von selbst zu Ende geht (nicht bei Stop/Fade) */
  subscribeEnded: (cb: (info: PlayingClip) => void) => () => void;
  fadeOut: (ms?: number) => void;
  setVolume: (volume: number) => void;
  clearError: () => void;
}

const VOLUME_KEY = 'vbdj-v2-volume';

function loadVolume(): number {
  const v = parseFloat(localStorage.getItem(VOLUME_KEY) ?? '');
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.8;
}

const initialState: AudioState = {
  playing: null,
  clipName: null,
  isPlaying: false,
  isPaused: false,
  position: 0,
  cue: null,
  fileDuration: null,
  volume: loadVolume(),
  isFading: false,
  error: null,
};

function reducer(state: AudioState, action: AudioAction): AudioState {
  switch (action.type) {
    case 'START':
      return {
        ...state,
        playing: action.playing,
        clipName: action.clipName,
        cue: action.cue,
        fileDuration: action.fileDuration,
        position: action.cue.start,
        isPlaying: false,
        isPaused: false,
        isFading: false,
        error: null,
      };
    case 'PLAYING':
      return { ...state, isPlaying: action.isPlaying, isPaused: action.isPlaying ? false : state.isPaused };
    case 'PAUSED':
      return { ...state, isPaused: action.isPaused, isPlaying: action.isPaused ? false : state.isPlaying };
    case 'POSITION':
      return { ...state, position: action.position };
    case 'STOPPED':
      return { ...state, playing: null, clipName: null, isPlaying: false, isPaused: false, position: 0, cue: null, fileDuration: null, isFading: false };
    case 'VOLUME':
      return { ...state, volume: action.volume };
    case 'FADING':
      return { ...state, isFading: action.isFading };
    case 'ERROR':
      return { ...state, error: action.error };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

const AudioCtx = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const howlRef = useRef<Howl | null>(null);
  const urlRef = useRef<string | null>(null);
  const tickRef = useRef<number | null>(null);
  const volumeRef = useRef(state.volume);
  // Lautstaerke des aktuellen Sounds (0..1), wird mit der Gesamtlautstaerke multipliziert
  const gainRef = useRef(1);
  // Howler-Sound-ID des laufenden Sounds - noetig, um nach Pause an derselben Stelle fortzusetzen
  const soundIdRef = useRef<number | null>(null);
  const endedListeners = useRef(new Set<(info: PlayingClip) => void>());
  // Laufnummer: verhindert, dass ein langsam geladener Sound einen neueren ueberholt
  const tokenRef = useRef(0);

  const stopTicking = useCallback(() => {
    if (tickRef.current !== null) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const startTicking = useCallback(() => {
    stopTicking();
    tickRef.current = window.setInterval(() => {
      const howl = howlRef.current;
      if (howl && howl.playing()) {
        const pos = howl.seek();
        if (typeof pos === 'number') dispatch({ type: 'POSITION', position: pos });
      }
    }, 100);
  }, [stopTicking]);

  /** Alles abraeumen, ohne Events auszuloesen */
  const teardown = useCallback(() => {
    stopTicking();
    if (howlRef.current) {
      howlRef.current.off();
      howlRef.current.unload();
      howlRef.current = null;
    }
    soundIdRef.current = null;
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, [stopTicking]);

  useEffect(() => teardown, [teardown]);

  const stopAll = useCallback(() => {
    tokenRef.current++;
    teardown();
    dispatch({ type: 'STOPPED' });
  }, [teardown]);

  const play = useCallback(
    async (padId: string, clip: SoundClip, cueOverride?: CuePoint, gainOverride?: number, loop = false) => {
      const token = ++tokenRef.current;
      teardown();
      const cue = cueOverride ?? clip.cue;
      const gain = Math.min(1, Math.max(0, gainOverride ?? clip.gain ?? 1));
      gainRef.current = gain;
      const info: PlayingClip = { padId, clipId: clip.id };
      dispatch({ type: 'START', playing: info, clipName: clip.name, cue, fileDuration: clip.duration });

      let stored;
      try {
        stored = await getFile(clip.fileId);
      } catch {
        stored = undefined;
      }
      if (token !== tokenRef.current) return; // inzwischen wurde etwas anderes gestartet
      if (!stored) {
        dispatch({ type: 'ERROR', error: `Audiodatei für „${clip.name}“ fehlt – bitte in der Dev-Ansicht neu importieren.` });
        dispatch({ type: 'STOPPED' });
        return;
      }

      const url = URL.createObjectURL(stored.blob);
      const start = Math.max(0, cue.start || 0);
      const end = cue.end ?? clip.duration;
      const useSprite = end != null && end > start;

      const finish = () => {
        teardown();
        dispatch({ type: 'STOPPED' });
      };
      // Natuerliches Ende: erst aufraeumen, dann die Zuhoerer (Auto-Weiterspielen) informieren
      const ended = () => {
        finish();
        for (const cb of endedListeners.current) cb(info);
      };

      const howl = new Howl({
        src: [url],
        html5: true,
        format: [howlerFormat(clip.fileName, clip.mimeType)],
        volume: volumeRef.current * gain,
        // Dritter Wert im Sprite = Schleife; ohne Cue-Points loopt Howler die ganze Datei.
        // Das wiederholt derselbe Howl nahtlos - ein Neustart je Durchlauf haette eine hoerbare Luecke.
        loop: !useSprite && loop,
        sprite: useSprite ? { clip: [start * 1000, (end - start) * 1000, loop] } : undefined,
        onplay: () => {
          dispatch({ type: 'PLAYING', isPlaying: true });
          startTicking();
        },
        onpause: () => {
          dispatch({ type: 'PLAYING', isPlaying: false });
          stopTicking();
        },
        // Howler meldet das Ende auch bei jedem Schleifendurchlauf - dann laeuft es
        // von selbst weiter und es darf nichts abgeraeumt werden.
        onend: () => {
          if (loop) return;
          ended();
        },
        onstop: finish,
        onloaderror: (_id, err) => {
          console.warn('Audio konnte nicht geladen werden', err);
          dispatch({ type: 'ERROR', error: `„${clip.name}“ konnte nicht geladen werden (Format nicht unterstützt?).` });
          finish();
        },
        onplayerror: () => {
          // iOS: erst nach einer Nutzerinteraktion freigeschaltet
          howl.once('unlock', () => {
            if (howlRef.current === howl) howl.play(useSprite ? 'clip' : undefined);
          });
        },
      });

      howlRef.current = howl;
      urlRef.current = url;

      if (useSprite) {
        soundIdRef.current = howl.play('clip');
      } else {
        const id = howl.play();
        soundIdRef.current = id;
        if (start > 0) howl.seek(start, id);
      }
    },
    [teardown, startTicking, stopTicking]
  );

  const pause = useCallback(() => {
    const howl = howlRef.current;
    if (!howl || !howl.playing()) return;
    howl.pause(soundIdRef.current ?? undefined);
    dispatch({ type: 'PAUSED', isPaused: true });
  }, []);

  const resume = useCallback(() => {
    const howl = howlRef.current;
    if (!howl || soundIdRef.current === null) return;
    // play(id) setzt einen pausierten Sound an derselben Stelle fort - auch innerhalb eines Sprites
    howl.play(soundIdRef.current);
    dispatch({ type: 'PAUSED', isPaused: false });
  }, []);

  const subscribeEnded = useCallback((cb: (info: PlayingClip) => void) => {
    endedListeners.current.add(cb);
    return () => {
      endedListeners.current.delete(cb);
    };
  }, []);

  const fadeOut = useCallback(
    (ms = 1500) => {
      const howl = howlRef.current;
      if (!howl || !howl.playing()) return;
      dispatch({ type: 'FADING', isFading: true });
      const current = howl.volume();
      howl.fade(typeof current === 'number' ? current : volumeRef.current, 0, ms);
      howl.once('fade', () => stopAll());
    },
    [stopAll]
  );

  const setVolume = useCallback((volume: number) => {
    const v = Math.min(1, Math.max(0, volume));
    volumeRef.current = v;
    localStorage.setItem(VOLUME_KEY, String(v));
    dispatch({ type: 'VOLUME', volume: v });
    howlRef.current?.volume(v * gainRef.current);
  }, []);

  const clearError = useCallback(() => dispatch({ type: 'CLEAR_ERROR' }), []);

  const value = useMemo<AudioContextType>(
    () => ({ ...state, play, pause, resume, stopAll, fadeOut, setVolume, clearError, subscribeEnded }),
    [state, play, pause, resume, stopAll, fadeOut, setVolume, clearError, subscribeEnded]
  );

  return <AudioCtx.Provider value={value}>{children}</AudioCtx.Provider>;
}

export function useAudio(): AudioContextType {
  const ctx = useContext(AudioCtx);
  if (!ctx) throw new Error('useAudio muss innerhalb von AudioProvider verwendet werden');
  return ctx;
}
