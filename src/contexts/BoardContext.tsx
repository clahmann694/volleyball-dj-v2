import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { BoardConfig, SoundClip, SoundPad } from '../types';
import { loadBoard, saveBoard } from '../storage/boardStore';
import { deleteFile, putFile, requestPersistence } from '../storage/audioStore';
import { DEFAULT_BOARD } from '../config/defaultBoard';
import { newId } from '../utils/id';
import { cleanClipName, isAudioFile, readDuration } from '../utils/audioFormat';
import { createBundle, deleteOrphanFiles, readBundle } from '../utils/bundle';

/**
 * Verwaltet das Board (flache Liste von Pads mit Clips).
 * Die Konfiguration liegt in localStorage, die Audiodateien in IndexedDB.
 */

export interface ClipRef {
  clip: SoundClip;
  pad: SoundPad;
}

interface BoardContextType {
  board: BoardConfig;
  padIndex: Map<string, SoundPad>;
  clipIndex: Map<string, ClipRef>;
  busy: boolean;
  addPad: (name: string, color: string) => void;
  updatePad: (padId: string, patch: Partial<Pick<SoundPad, 'name' | 'color'>>) => void;
  /** Verschiebt ein Pad um `delta` Positionen in der Lesereihenfolge */
  movePad: (padId: string, delta: number) => void;
  deletePad: (padId: string) => Promise<void>;
  addClipsFromFiles: (padId: string, files: Iterable<File>) => Promise<number>;
  updateClip: (clipId: string, patch: Partial<Pick<SoundClip, 'name' | 'cue' | 'duration'>>) => void;
  deleteClip: (clipId: string) => Promise<void>;
  exportBoard: () => Promise<Blob>;
  importBoard: (file: File) => Promise<void>;
  resetBoard: () => Promise<void>;
}

const BoardCtx = createContext<BoardContextType | undefined>(undefined);

function mapPads(board: BoardConfig, fn: (pad: SoundPad) => SoundPad | null): BoardConfig {
  return { ...board, pads: board.pads.map(fn).filter((p): p is SoundPad => p !== null) };
}

export function BoardProvider({ children }: { children: React.ReactNode }) {
  const [board, setBoard] = useState<BoardConfig>(loadBoard);
  const [busy, setBusy] = useState(false);

  useEffect(() => saveBoard(board), [board]);

  const { padIndex, clipIndex } = useMemo(() => {
    const padIndex = new Map<string, SoundPad>();
    const clipIndex = new Map<string, ClipRef>();
    for (const pad of board.pads) {
      padIndex.set(pad.id, pad);
      for (const clip of pad.clips) clipIndex.set(clip.id, { clip, pad });
    }
    return { padIndex, clipIndex };
  }, [board]);

  const addPad = useCallback((name: string, color: string) => {
    setBoard(b => ({ ...b, pads: [...b.pads, { id: newId(), name: name.trim() || 'Neuer Button', color, clips: [] }] }));
  }, []);

  const updatePad = useCallback((padId: string, patch: Partial<Pick<SoundPad, 'name' | 'color'>>) => {
    setBoard(b => mapPads(b, pad => (pad.id === padId ? { ...pad, ...patch } : pad)));
  }, []);

  const movePad = useCallback((padId: string, delta: number) => {
    setBoard(b => {
      const from = b.pads.findIndex(p => p.id === padId);
      if (from < 0) return b;
      const to = Math.max(0, Math.min(b.pads.length - 1, from + delta));
      if (to === from) return b;
      const pads = [...b.pads];
      const [moved] = pads.splice(from, 1);
      pads.splice(to, 0, moved);
      return { ...b, pads };
    });
  }, []);

  const deletePad = useCallback(
    async (padId: string) => {
      const pad = padIndex.get(padId);
      if (!pad) return;
      setBoard(b => mapPads(b, p => (p.id === padId ? null : p)));
      for (const clip of pad.clips) await deleteFile(clip.fileId).catch(() => undefined);
    },
    [padIndex]
  );

  const addClipsFromFiles = useCallback(async (padId: string, files: Iterable<File>) => {
    setBusy(true);
    try {
      const clips: SoundClip[] = [];
      for (const file of files) {
        if (!isAudioFile(file)) continue;
        const fileId = newId();
        await putFile({ id: fileId, blob: file, name: file.name, type: file.type });
        const duration = await readDuration(file);
        clips.push({
          id: newId(),
          name: cleanClipName(file.name),
          fileId,
          fileName: file.name,
          mimeType: file.type || 'audio/mpeg',
          size: file.size,
          duration,
          cue: { start: 0, end: null },
        });
      }
      if (clips.length > 0) {
        setBoard(b => mapPads(b, pad => (pad.id === padId ? { ...pad, clips: [...pad.clips, ...clips] } : pad)));
        void requestPersistence();
      }
      return clips.length;
    } finally {
      setBusy(false);
    }
  }, []);

  const updateClip = useCallback((clipId: string, patch: Partial<Pick<SoundClip, 'name' | 'cue' | 'duration'>>) => {
    setBoard(b =>
      mapPads(b, pad =>
        pad.clips.some(c => c.id === clipId) ? { ...pad, clips: pad.clips.map(c => (c.id === clipId ? { ...c, ...patch } : c)) } : pad
      )
    );
  }, []);

  const deleteClip = useCallback(
    async (clipId: string) => {
      const ref = clipIndex.get(clipId);
      if (!ref) return;
      setBoard(b => mapPads(b, pad => (pad.id === ref.pad.id ? { ...pad, clips: pad.clips.filter(c => c.id !== clipId) } : pad)));
      await deleteFile(ref.clip.fileId).catch(() => undefined);
    },
    [clipIndex]
  );

  const exportBoard = useCallback(() => createBundle(board), [board]);

  const importBoard = useCallback(async (file: File) => {
    setBusy(true);
    try {
      const imported = await readBundle(file);
      setBoard(imported);
      await deleteOrphanFiles(imported);
      void requestPersistence();
    } finally {
      setBusy(false);
    }
  }, []);

  const resetBoard = useCallback(async () => {
    setBusy(true);
    try {
      setBoard(DEFAULT_BOARD);
      await deleteOrphanFiles(DEFAULT_BOARD);
    } finally {
      setBusy(false);
    }
  }, []);

  const value = useMemo<BoardContextType>(
    () => ({ board, padIndex, clipIndex, busy, addPad, updatePad, movePad, deletePad, addClipsFromFiles, updateClip, deleteClip, exportBoard, importBoard, resetBoard }),
    [board, padIndex, clipIndex, busy, addPad, updatePad, movePad, deletePad, addClipsFromFiles, updateClip, deleteClip, exportBoard, importBoard, resetBoard]
  );

  return <BoardCtx.Provider value={value}>{children}</BoardCtx.Provider>;
}

export function useBoard(): BoardContextType {
  const ctx = useContext(BoardCtx);
  if (!ctx) throw new Error('useBoard muss innerhalb von BoardProvider verwendet werden');
  return ctx;
}
