/**
 * Zugangssperre für die Dev-Ansicht – fest in die App eingebaut.
 *
 * Das Passwort wird beim Veröffentlichen festgelegt (`npm run set-password`
 * schreibt Salt + SHA-256-Wert nach `src/config/devLock.json`) und gilt damit
 * auf JEDEM Gerät, das die App öffnet – auch bei jemandem, der nur den Link
 * bekommen hat. Ein Gerät, auf dem das Passwort einmal richtig eingegeben
 * wurde, merkt sich das (`vbdj-v2-dev-unlocked`); gespeichert wird dabei der
 * Hash, sodass ein neues Passwort automatisch alle Geräte wieder sperrt.
 *
 * WICHTIG: Das ist KEIN echter Schutz. Die App läuft ohne Server – wer die
 * Entwicklerwerkzeuge kennt, kommt daran vorbei. Es verhindert, dass jemand
 * beiläufig in die Dev-Ansicht gerät. Die Tests überschreiben die Konfiguration
 * per VITE_DEV_LOCK_* (siehe tests/run.mjs).
 */

import builtIn from '../config/devLock.json';

const UNLOCK_KEY = 'vbdj-v2-dev-unlocked';

interface LockConfig {
  salt: string;
  hash: string;
  /** Eigene Gedächtnisstütze, wird auf dem Sperrbildschirm angezeigt */
  hint: string;
}

function config(): LockConfig | null {
  const env = import.meta.env;
  const salt: string = env.VITE_DEV_LOCK_SALT ?? builtIn.salt ?? '';
  const hash: string = env.VITE_DEV_LOCK_HASH ?? builtIn.hash ?? '';
  const hint: string = env.VITE_DEV_LOCK_HINT ?? builtIn.hint ?? '';
  return salt && hash ? { salt, hash, hint } : null;
}

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromBase64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

async function digest(password: string, salt: Uint8Array): Promise<string> {
  if (!crypto?.subtle) throw new Error('Passwortschutz braucht eine sichere Verbindung (https).');
  const pw = new TextEncoder().encode(password);
  const data = new Uint8Array(salt.length + pw.length);
  data.set(salt, 0);
  data.set(pw, salt.length);
  return toBase64(new Uint8Array(await crypto.subtle.digest('SHA-256', data)));
}

/** Ist überhaupt ein Passwort eingebaut? */
export function isLocked(): boolean {
  return config() !== null;
}

export function lockHint(): string {
  return config()?.hint ?? '';
}

/** Wurde das Passwort auf diesem Gerät schon einmal richtig eingegeben? */
export function isUnlockedHere(): boolean {
  const c = config();
  if (!c) return true;
  try {
    return localStorage.getItem(UNLOCK_KEY) === c.hash;
  } catch {
    return false;
  }
}

export function rememberUnlock(): void {
  const c = config();
  if (!c) return;
  try {
    localStorage.setItem(UNLOCK_KEY, c.hash);
  } catch {
    /* privater Modus o. ä. – dann fragt die App beim nächsten Mal eben wieder */
  }
}

/** Dieses Gerät wieder sperren, z. B. bevor man das iPad aus der Hand gibt. */
export function forgetUnlock(): void {
  try {
    localStorage.removeItem(UNLOCK_KEY);
  } catch {
    /* s. o. */
  }
}

export async function verifyPassword(password: string): Promise<boolean> {
  const c = config();
  if (!c) return true;
  try {
    return (await digest(password, fromBase64(c.salt))) === c.hash;
  } catch {
    return false;
  }
}
