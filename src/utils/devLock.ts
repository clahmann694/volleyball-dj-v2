/**
 * Zugangssperre für die Dev-Ansicht.
 *
 * WICHTIG: Das ist KEIN echter Schutz. Die App läuft nur im Browser, ohne
 * Server – wer die Entwicklerwerkzeuge kennt, kommt daran vorbei. Der Zweck
 * ist, dass niemand am Kampfgericht aus Versehen oder Neugier in die
 * Dev-Ansicht gerät und dort etwas löscht.
 *
 * Das Passwort selbst wird nie gespeichert, nur ein Salt und der SHA-256-Wert
 * darüber – damit es nicht im Klartext im Browserspeicher liegt.
 * Die Sperre gilt pro Gerät und wandert bewusst NICHT im .vbdj-Bundle mit.
 */

const KEY = 'vbdj-v2-dev-lock';

interface StoredLock {
  salt: string;
  hash: string;
  /** Eigene Gedächtnisstütze, wird auf dem Sperrbildschirm angezeigt */
  hint: string;
}

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromBase64(s: string): Uint8Array {
  const bin = atob(s);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

function read(): StoredLock | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const lock = JSON.parse(raw) as StoredLock;
    return lock.salt && lock.hash ? lock : null;
  } catch {
    return null;
  }
}

async function digest(password: string, salt: Uint8Array): Promise<string> {
  if (!crypto?.subtle) throw new Error('Passwortschutz braucht eine sichere Verbindung (https).');
  const pw = new TextEncoder().encode(password);
  const data = new Uint8Array(salt.length + pw.length);
  data.set(salt, 0);
  data.set(pw, salt.length);
  return toBase64(new Uint8Array(await crypto.subtle.digest('SHA-256', data)));
}

/** Ist die Dev-Ansicht auf diesem Gerät gesperrt? */
export function isLocked(): boolean {
  return read() !== null;
}

/** Selbst gewählte Gedächtnisstütze (leer, wenn keine hinterlegt) */
export function lockHint(): string {
  return read()?.hint ?? '';
}

export async function setPassword(password: string, hint: string): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const lock: StoredLock = { salt: toBase64(salt), hash: await digest(password, salt), hint: hint.trim().slice(0, 80) };
  localStorage.setItem(KEY, JSON.stringify(lock));
}

export async function verifyPassword(password: string): Promise<boolean> {
  const lock = read();
  if (!lock) return true;
  try {
    return (await digest(password, fromBase64(lock.salt))) === lock.hash;
  } catch {
    return false;
  }
}

/** Sperre entfernen. Sounds und Einrichtung bleiben unberührt. */
export function removePassword(): void {
  localStorage.removeItem(KEY);
}
