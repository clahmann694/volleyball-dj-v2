import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { BoardConfig, SoundClip, SoundGroup, SoundPad } from '../types';
import { loadBoard, saveBoard } from '../storage/boardStore';
import { deleteFile, putFile, requestPersistence } from '../storage/audioStore';
import { DEFAULT_BOARD } from '../config/defaultBoard';
import { newId } from '../utils/id';
import { cleanClipName, isAudioFile, readDuration } from '../utils/audioFormat';
import { createBundle, deleteOrphanFiles, readBundle } from '../utils/bundle';

/**
 * Verwaltet die Board-Konfiguration (Gruppen -> Pads -> Clips).
 * Die Konfiguration liegt in localStorage, die Audiodateien in IndexedDB.
 */

export interface PadRef {
  pad: SoundPad;
  group: SoundGroup;
}

export interface ClipRef extends PadRef {
  clip: SoundClip;
}

interface BoardContextType {
  board: BoardConfig;
  padIndex: Map<string, PadRef>;
  clipIndex: Map<string, ClipRef>;
  busy: boolean;
  addPad: (groupId: string, name: string, icon: string) => void;
  updatePad: (padId: string, patch: Partial<Pick<SoundPad, 'name' | 'icon'>>) => void;
  deletePad: (padId: string) => Promise<void>;
  addClipsFromFiles: (padId: string, files: Iterable<File>) => Promise<number>;
  updateClip: (clipId: string, patch: Partial<Pick<SoundClip, 'name' | 'cue' | 'duration'>>) => void;
  deleteClip: (clipId: string) => Promise<void>;
  exportBoard: () => Promise<Blob>;
  importBoard: (file: File) => Promise<void>;
  resetBoard: () => Promise<void>;
}

const BoardCtx = createContext<BoardContextType | undefined>(undefined);

function mapPads(board: BoardConfig, fn: (pad: SoundPad, group: SoundGroup) => SoundPad | null): BoardConfig {
  return {
    ...board,
    groups: board.groups.map(group => ({
      ...group,
      pads: group.pads.map(pad => fn(pad, group)).filter((p): p is SoundPad => p !== null),
    })),
  };
}

export function BoardProvider({ children }: { children: React.ReactNode }) {
  const [board, setBoard] = useState<BoardConfig>(loadBoard);
  const [busy, setBusy] = useState(false);

  useEffect(() => saveBoard(board), [board]);

  const { padIndex, clipIndex } = useMemo(() => {
    const padIndex = new Map<string, PadRef>();
    const clipIndex = new Map<string, ClipRef>();
    for (const group of board.groups) {
      for (const pad of group.pads) {
        padIndex.set(pad.id, { pad, group });
        for (const clip of pad.clips) clipIndex.set(clip.id, { clip, pad, group });
      }
    }
    return { padIndex, clipIndex };
  }, [board]);

  const addPad = useCallback((groupId: string, name: string, icon: string) => {
    setBoard(b => ({
      ...b,
      groups: b.groups.map(g =>
        g.id === groupId ? { ...g, pads: [...g.pads, { id: newId(), name: name.trim() || 'Neuer Button', icon: icon.trim() || '🎵', clips: [] }] } : g
      ),
    }));
  }, []);

  const updatePad = useCallback((padId: string, patch: Partial<Pick<SoundPad, 'name' | 'icon'>>) => {
    setBoard(b => mapPads(b, pad => (pad.id === padId ? { ...pad, ...patch } : pad)));
  }, []);

  const deletePad = useCallback(
    async (padId: string) => {
      const ref = padIndex.get(padId);
      if (!ref) return;
      setBoard(b => mapPads(b, pad => (pad.id === padId ? null : pad)));
      for (const clip of ref.pad.clips) await deleteFile(clip.fileId).catch(() => undefined);
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
        pad.clips.some(c => c.id === clipId)
          ? { ...pad, clips: pad.clips.map(c => (c.id === clipId ? { ...c, ...patch } : c)) }
          : pad
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
    () => ({
      board,
      padIndex,
      clipIndex,
      busy,
      addPad,
      updatePad,
      deletePad,
      addClipsFromFiles,
      updateClip,
      deleteClip,
      exportBoard,
      importBoard,
      resetBoard,
    }),
    [board, padIndex, clipIndex, busy, addPad, updatePad, deletePad, addClipsFromFiles, updateClip, deleteClip, exportBoard, importBoard, resetBoard]
  );

  return <BoardCtx.Provider value={value}>{children}</BoardCtx.Provider>;
}

export function useBoard(): BoardContextType {
  const ctx = useContext(BoardCtx);
  if (!ctx) throw new Error('useBoard muss innerhalb von BoardProvider verwendet werden');
  return ctx;
}
