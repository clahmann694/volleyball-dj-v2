import JSZip from 'jszip';
import { BoardConfig } from '../types';
import { deleteFile, getFile, listFileIds, putFile } from '../storage/audioStore';

/**
 * Ein Bundle (.vbdj) ist ein ZIP mit board.json und allen Audiodateien.
 * Damit wandert die komplette Einrichtung vom Mac aufs iPad - oder ins Backup.
 */
export async function createBundle(board: BoardConfig): Promise<Blob> {
  const zip = new JSZip();
  zip.file('board.json', JSON.stringify(board, null, 2));
  const folder = zip.folder('files')!;
  for (const group of board.groups) {
    for (const pad of group.pads) {
      for (const clip of pad.clips) {
        const stored = await getFile(clip.fileId);
        if (stored) folder.file(clip.fileId, stored.blob);
      }
    }
  }
  // Audio ist schon komprimiert - STORE spart Zeit
  return zip.generateAsync({ type: 'blob', compression: 'STORE' });
}

export async function readBundle(file: Blob): Promise<BoardConfig> {
  const zip = await JSZip.loadAsync(file);
  const json = await zip.file('board.json')?.async('string');
  if (!json) throw new Error('Kein board.json im Bundle gefunden.');
  const board = JSON.parse(json) as BoardConfig;
  if (board.version !== 1 || !Array.isArray(board.groups)) throw new Error('Unbekanntes Bundle-Format.');

  for (const group of board.groups) {
    for (const pad of group.pads) {
      for (const clip of pad.clips) {
        const entry = zip.file(`files/${clip.fileId}`);
        if (!entry) continue;
        const blob = await entry.async('blob');
        await putFile({
          id: clip.fileId,
          blob: new Blob([blob], { type: clip.mimeType }),
          name: clip.fileName,
          type: clip.mimeType,
        });
      }
    }
  }
  return board;
}

/** Loescht alle Audiodateien, auf die kein Clip mehr zeigt. */
export async function deleteOrphanFiles(board: BoardConfig): Promise<number> {
  const referenced = new Set<string>();
  for (const g of board.groups) for (const p of g.pads) for (const c of p.clips) referenced.add(c.fileId);
  const ids = await listFileIds();
  let removed = 0;
  for (const id of ids) {
    if (!referenced.has(id)) {
      await deleteFile(id);
      removed++;
    }
  }
  return removed;
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
