#!/usr/bin/env node
/**
 * Legt das Passwort der Dev-Ansicht fest.
 *
 *   npm run set-password                      fragt interaktiv (Eingabe unsichtbar)
 *   npm run set-password -- --password X --hint "..."   ohne Rückfrage
 *   npm run set-password -- --clear           Sperre ganz entfernen
 *
 * Schreibt nur Salt + SHA-256(Salt + Passwort) nach src/config/devLock.json –
 * das Passwort selbst landet nirgends. Danach committen und veröffentlichen;
 * ein neues Passwort sperrt automatisch alle Geräte wieder.
 */
import { createHash, randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const FILE = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'config', 'devLock.json');

const args = process.argv.slice(2);
const flag = name => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] ?? '' : undefined;
};

function ask(question, { hidden = false } = {}) {
  return new Promise(resolve => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      // Eingabe nicht anzeigen
      rl._writeToOutput = str => { if (str.includes(question)) rl.output.write(question); };
    }
    rl.question(question, answer => { rl.close(); if (hidden) process.stdout.write('\n'); resolve(answer); });
  });
}

export function hashPassword(password, salt = randomBytes(16)) {
  const hash = createHash('sha256').update(Buffer.concat([salt, Buffer.from(password, 'utf8')])).digest('base64');
  return { salt: salt.toString('base64'), hash };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (args.includes('--clear')) {
    writeFileSync(FILE, JSON.stringify({ salt: '', hash: '', hint: '' }, null, 2) + '\n');
    console.log('Sperre entfernt – die Dev-Ansicht ist nach dem nächsten Veröffentlichen für alle offen.');
    process.exit(0);
  }
  let password = flag('password');
  let hint = flag('hint');
  if (password === undefined) {
    password = await ask('Neues Passwort für die Dev-Ansicht: ', { hidden: true });
    const again = await ask('Noch einmal: ', { hidden: true });
    if (password !== again) { console.error('Die beiden Eingaben stimmen nicht überein.'); process.exit(1); }
  }
  if (password.length < 4) { console.error('Mindestens 4 Zeichen.'); process.exit(1); }
  if (hint === undefined) hint = await ask('Merkhilfe (optional, wird beim Entsperren angezeigt): ');
  const { salt, hash } = hashPassword(password);
  writeFileSync(FILE, JSON.stringify({ salt, hash, hint: hint.trim().slice(0, 80) }, null, 2) + '\n');
  console.log(`Gespeichert in ${FILE}\nJetzt committen und veröffentlichen – danach fragt die App auf jedem Gerät einmal nach dem Passwort.`);
}
