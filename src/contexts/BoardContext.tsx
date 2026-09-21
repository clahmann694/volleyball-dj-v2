import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { allPads, BoardConfig, BoardRow, PlaybackMode, SoundClip, SoundPad, TeamId } from '../types';
import { loadBoard, markChanged, markExported, saveBoard } from '../storage/boardStore';
import { deleteFile, putFile, requestPersistence } from '../storage/audioStore';
import { DEFAULT_BOARD } from '../config/defaultBoard';
import { newId } from '../utils/id';
import { cleanClipName, isAudioFile, readDuration } from '../utils/audioFormat';
import { remuxAudioTrack, shouldCompress, transcodeToAac } from '../utils/audioTranscode';
import { createBundle, deleteOrphanFiles, readBundle } from '../utils/bundle';

/**
 * Verwaltet das Board: Zeilen -> Pads -> Clips.
 * Die Konfiguration liegt in localStorage, die Audiodateien in IndexedDB.
 */

export interface ClipRef {
  clip: SoundClip;
  pad: SoundPad;
}

export interface PadPosition {
  pad: SoundPad;
  row: BoardRow;
  rowIndex: number;
  index: number;
}

export type MoveDirection = 'left' | 'right' | 'up' | 'down';

interface BoardContextType {
  board: BoardConfig;
  padIndex: Map<string, PadPosition>;
  clipIndex: Map<string, ClipRef>;
  busy: boolean;
  addRow: () => void;
  /** Loescht eine Zeile; ihre Pads wandern in die vorherige (oder naechste) Zeile */
  deleteRow: (rowId: string) => void;
  moveRow: (rowId: string, delta: number) => void;
  addPad: (rowId: string, name: string, color: string, teams: TeamId[]) => void;
  /** Mannschaften eines Buttons setzen (leere Liste wird ignoriert) */
  setPadTeams: (padId: string, teams: TeamId[]) => void;
  updatePad: (padId: string, patch: Partial<Pick<SoundPad, 'name' | 'description' | 'color' | 'playback'>>) => void;
  /** left/right: innerhalb der Zeile; up/down: ans Ende der Nachbarzeile (down in letzter Zeile = neue Zeile) */
  movePad: (padId: string, direction: MoveDirection) => void;
  /** Setzt ein Pad an eine genaue Position (Ziehen mit der Maus). rowId NEW_ROW = neue Zeile am Ende. */
  movePadTo: (padId: string, rowId: string, index: number) => void;
  deletePad: (padId: string) => Promise<void>;
  addClipsFromFiles: (padId: string, files: Iterable<File>) => Promise<number>;
  updateClip: (clipId: string, patch: Partial<Pick<SoundClip, 'name' | 'cue' | 'duration' | 'gain'>>) => void;
  /** Reihenfolge innerhalb des Buttons aendern */
  moveClip: (clipId: string, delta: number) => void;
  /** Sound in einen anderen Button verschieben (ans Ende) */
  moveClipToPad: (clipId: string, targetPadId: string) => void;
  deleteClip: (clipId: string) => Promise<void>;
  exportBoard: () => Promise<Blob>;
  importBoard: (file: File) => Promise<void>;
  resetBoard: () => Promise<void>;
}

/** Pseudo-Zeile: Ablegen hier erzeugt eine neue Zeile am Ende */
export const NEW_ROW = '__neue_zeile__';

const BoardCtx = createContext<BoardContextType | undefined>(undefined);

function mapPads(board: BoardConfig, fn: (pad: SoundPad) => SoundPad | null): BoardConfig {
  return {
    ...board,
    rows: board.rows.map(row => ({ ...row, pads: row.pads.map(fn).filter((p): p is SoundPad => p !== null) })),
  };
}

function locate(board: BoardConfig, padId: string): { rowIndex: number; index: number } | null {
  for (let r = 0; r < board.rows.length; r++) {
    const i = board.rows[r].pads.findIndex(p => p.id === padId);
    if (i >= 0) return { rowIndex: r, index: i };
  }
  return null;
}

export function BoardProvider({ children }: { children: React.ReactNode }) {
  const [board, setBoard] = useState<BoardConfig>(loadBoard);
  const [busy, setBusy] = useState(false);

  // Das beim Start geladene Objekt zaehlt nicht als Aenderung (identitaetsbasiert,
  // damit auch Reacts doppelte Effekt-Ausfuehrung im Dev-Modus nicht faelschlich markiert)
  const loadedBoard = React.useRef(board);
  useEffect(() => {
    saveBoard(board);
    if (board !== loadedBoard.current) markChanged();
  }, [board]);

  const { padIndex, clipIndex } = useMemo(() => {
    const padIndex = new Map<string, PadPosition>();
    const clipIndex = new Map<string, ClipRef>();
    board.rows.forEach((row, rowIndex) => {
      row.pads.forEach((pad, index) => {
        padIndex.set(pad.id, { pad, row, rowIndex, index });
        for (const clip of pad.clips) clipIndex.set(clip.id, { clip, pad });
      });
    });
    return { padIndex, clipIndex };
  }, [board]);

  // ----- Zeilen -----
  const addRow = useCallback(() => {
    setBoard(b => ({ ...b, rows: [...b.rows, { id: newId(), pads: [] }] }));
  }, []);

  const deleteRow = useCallback((rowId: string) => {
    setBoard(b => {
      const idx = b.rows.findIndex(r => r.id === rowId);
      if (idx < 0 || b.rows.length === 1) return b;
      const rows = b.rows.map(r => ({ ...r, pads: [...r.pads] }));
      const [removed] = rows.splice(idx, 1);
      const target = rows[Math.max(0, idx - 1)];
      target.pads.push(...removed.pads);
      return { ...b, rows };
    });
  }, []);

  const moveRow = useCallback((rowId: string, delta: number) => {
    setBoard(b => {
      const from = b.rows.findIndex(r => r.id === rowId);
      const to = from + delta;
      if (from < 0 || to < 0 || to >= b.rows.length) return b;
      const rows = [...b.rows];
      const [row] = rows.splice(from, 1);
      rows.splice(to, 0, row);
      return { ...b, rows };
    });
  }, []);

  // ----- Pads -----
  const addPad = useCallback((rowId: string, name: string, color: string, teams: TeamId[]) => {
    setBoard(b => ({
      ...b,
      rows: b.rows.map(r =>
        r.id === rowId ? { ...r, pads: [...r.pads, { id: newId(), name: name.trim() || 'Neuer Button', description: '', color, teams, playback: 'single' as PlaybackMode, clips: [] }] } : r
      ),
    }));
  }, []);

  const setPadTeams = useCallback((padId: string, teams: TeamId[]) => {
    // Ohne Mannschaft waere der Button nirgends sichtbar - dann lieber nichts aendern
    if (teams.length === 0) return;
    setBoard(b => mapPads(b, pad => (pad.id === padId ? { ...pad, teams } : pad)));
  }, []);

  const updatePad = useCallback((padId: string, patch: Partial<Pick<SoundPad, 'name' | 'description' | 'color' | 'playback'>>) => {
    setBoard(b => mapPads(b, pad => (pad.id === padId ? { ...pad, ...patch } : pad)));
  }, []);

  const movePad = useCallback((padId: string, direction: MoveDirection) => {
    setBoard(b => {
      const pos = locate(b, padId);
      if (!pos) return b;
      const rows = b.rows.map(r => ({ ...r, pads: [...r.pads] }));
      const row = rows[pos.rowIndex];

      if (direction === 'left' || direction === 'right') {
        const to = pos.index + (direction === 'left' ? -1 : 1);
        if (to < 0 || to >= row.pads.length) return b;
        [row.pads[pos.index], row.pads[to]] = [row.pads[to], row.pads[pos.index]];
        return { ...b, rows };
      }

      const [pad] = row.pads.splice(pos.index, 1);
      if (direction === 'up') {
        if (pos.rowIndex === 0) return b;
        rows[pos.rowIndex - 1].pads.push(pad);
      } else {
        if (pos.rowIndex === rows.length - 1) rows.push({ id: newId(), pads: [pad] });
        else rows[pos.rowIndex + 1].pads.push(pad);
      }
      // Eine durch den Umzug leer gewordene Zeile verschwindet (ausser es ist die einzige)
      const cleaned = rows.filter((r, i) => !(i === pos.rowIndex && r.pads.length === 0) || rows.length === 1);
      return { ...b, rows: cleaned };
    });
  }, []);

  const movePadTo = useCallback((padId: string, rowId: string, index: number) => {
    setBoard(b => {
      const pos = locate(b, padId);
      if (!pos) return b;
      const rows = b.rows.map(r => ({ ...r, pads: [...r.pads] }));
      const [pad] = rows[pos.rowIndex].pads.splice(pos.index, 1);

      if (rowId === NEW_ROW) {
        rows.push({ id: newId(), pads: [pad] });
      } else {
        const target = rows.findIndex(r => r.id === rowId);
        if (target < 0) return b;
        // Beim Verschieben innerhalb derselben Zeile ruecken die Positionen hinter
        // der Entnahmestelle um eins nach vorne
        const i = target === pos.rowIndex && index > pos.index ? index - 1 : index;
        rows[target].pads.splice(Math.max(0, Math.min(rows[target].pads.length, i)), 0, pad);
      }

      // Durch den Umzug leer gewordene Zeile entfernen (ausser es bleibt keine uebrig)
      const cleaned = rows.filter(r => r.pads.length > 0);
      return { ...b, rows: cleaned.length ? cleaned : [{ id: newId(), pads: [] }] };
    });
  }, []);

  const deletePad = useCallback(
    async (padId: string) => {
      const pos = padIndex.get(padId);
      if (!pos) return;
      setBoard(b => mapPads(b, p => (p.id === padId ? null : p)));
      for (const clip of pos.pad.clips) await deleteFile(clip.fileId).catch(() => undefined);
    },
    [padIndex]
  );

  // ----- Clips -----
  const addClipsFromFiles = useCallback(async (padId: string, files: Iterable<File>) => {
    setBusy(true);
    try {
      const clips: SoundClip[] = [];
      for (const file of files) {
        if (!isAudioFile(file)) continue;
        let blob: Blob = file;
        let fileName = file.name;
        let mimeType = file.type || 'audio/mpeg';
        let duration = await readDuration(file);

        // Videos und unkomprimierte Dateien: nur die Tonspur behalten (AAC/M4A).
        // Schlaegt das fehl, wird die Originaldatei unveraendert gespeichert.
        if (shouldCompress(file, duration)) {
          try {
            // Erst versuchen, die vorhandene AAC-Tonspur unveraendert zu uebernehmen
            // (Reels) - nur wenn das nicht geht, wird neu kodiert (WAV/FLAC, exotische Videos)
            const result = (await remuxAudioTrack(file)) ?? (await transcodeToAac(file));
            if (result) {
              blob = result.blob;
              fileName = file.name.replace(/\.[^./]+$/, '') + '.m4a';
              mimeType = 'audio/mp4';
              duration = result.duration;
            }
          } catch (e) {
            console.warn('Tonspur-Extraktion fehlgeschlagen, speichere Original', e);
          }
        }

        const fileId = newId();
        await putFile({ id: fileId, blob, name: fileName, type: mimeType });
        clips.push({
          id: newId(),
          name: cleanClipName(file.name),
          fileId,
          fileName,
          mimeType,
          size: blob.size,
          duration,
          cue: { start: 0, end: null },
          gain: 1,
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

  const updateClip = useCallback((clipId: string, patch: Partial<Pick<SoundClip, 'name' | 'cue' | 'duration' | 'gain'>>) => {
    setBoard(b =>
      mapPads(b, pad =>
        pad.clips.some(c => c.id === clipId) ? { ...pad, clips: pad.clips.map(c => (c.id === clipId ? { ...c, ...patch } : c)) } : pad
      )
    );
  }, []);

  const moveClip = useCallback((clipId: string, delta: number) => {
    setBoard(b =>
      mapPads(b, pad => {
        const from = pad.clips.findIndex(c => c.id === clipId);
        if (from < 0) return pad;
        const to = Math.max(0, Math.min(pad.clips.length - 1, from + delta));
        if (to === from) return pad;
        const clips = [...pad.clips];
        const [c] = clips.splice(from, 1);
        clips.splice(to, 0, c);
        return { ...pad, clips };
      })
    );
  }, []);

  const moveClipToPad = useCallback((clipId: string, targetPadId: string) => {
    setBoard(b => {
      const ref = allPads(b).flatMap(p => p.clips.map(c => ({ c, p }))).find(x => x.c.id === clipId);
      if (!ref || ref.p.id === targetPadId) return b;
      return mapPads(b, pad => {
        if (pad.id === ref.p.id) return { ...pad, clips: pad.clips.filter(c => c.id !== clipId) };
        if (pad.id === targetPadId) return { ...pad, clips: [...pad.clips, ref.c] };
        return pad;
      });
    });
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

  // ----- Bundle -----
  const exportBoard = useCallback(async () => {
    const blob = await createBundle(board);
    markExported();
    return blob;
  }, [board]);

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
    () => ({ board, padIndex, clipIndex, busy, addRow, deleteRow, moveRow, addPad, setPadTeams, updatePad, movePad, movePadTo, deletePad, addClipsFromFiles, updateClip, moveClip, moveClipToPad, deleteClip, exportBoard, importBoard, resetBoard }),
    [board, padIndex, clipIndex, busy, addRow, deleteRow, moveRow, addPad, setPadTeams, updatePad, movePad, movePadTo, deletePad, addClipsFromFiles, updateClip, moveClip, moveClipToPad, deleteClip, exportBoard, importBoard, resetBoard]
  );

  return <BoardCtx.Provider value={value}>{children}</BoardCtx.Provider>;
}

export function useBoard(): BoardContextType {
  const ctx = useContext(BoardCtx);
  if (!ctx) throw new Error('useBoard muss innerhalb von BoardProvider verwendet werden');
  return ctx;
}

/** Hilfsfunktion fuer Komponenten, die nur die Pads brauchen */
export function useAllPads(): SoundPad[] {
  const { board } = useBoard();
  return useMemo(() => allPads(board), [board]);
}
