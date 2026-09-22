/**
 * End-to-End-Tests fuer VB DJ. Aufruf: `npm test`
 *
 * Startet den Vite-Dev-Server auf Port 3100 (oder nutzt BASE_URL), treibt das
 * installierte Chrome headless (playwright-core, kein Browser-Download) und
 * prueft die Kernfunktionen: Mannschaft, Import, Cue-Points, Wiedergabe mit
 * Zeitmessung, Pause/Weiter, Auto-Weiterspielen, Lautstaerke, Sortieren,
 * Ziehen, Export/Import, Migration. Beendet sich mit Exit-Code 1 bei Fehlern.
 */
import { spawn, spawnSync } from 'node:child_process';
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createFixtures } from './fixtures.mjs';

const PORT = 3100;
const BASE = process.env.BASE_URL ?? `http://localhost:${PORT}/`;
let failures = 0;
const ok = (cond, label, detail = '') => {
  console.log(`${cond ? '  ✓' : '  ✗'} ${label}${detail ? '  (' + detail + ')' : ''}`);
  if (!cond) failures++;
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitFor(url, ms = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try { if ((await fetch(url)).ok) return true; } catch { /* noch nicht da */ }
    await sleep(500);
  }
  return false;
}

async function main() {
  let vite = null;
  if (!process.env.BASE_URL) {
    vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort', '--no-open'], { stdio: 'ignore' });
    if (!(await waitFor(BASE))) throw new Error('Dev-Server startet nicht');
  }
  const fx = createFixtures();
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 120)); });
  p.on('dialog', d => d.accept());
  const board = () => p.evaluate(() => JSON.parse(localStorage.getItem('vbdj-v2-board')));
  /** DJ -> Dev geht nur ueber die Sicherheitsabfrage */
  const goDev = async () => {
    await p.click('header button:has-text("Dev")');
    const dialog = p.locator('[role=alertdialog]');
    if (await dialog.count()) await dialog.locator('button:has-text("Ja, zur Dev-Ansicht")').click();
    await p.waitForSelector('text=Einrichtung');
  };
  const footer = () => p.locator('footer').innerText().then(t => t.replace(/\s+/g, ' '));
  const clipInFooter = async () => ((await footer()).match(/· (\S+)/) || [])[1] ?? null;
  const posInFooter = async () => ((await footer()).match(/(\d:\d\d) -\d/) || [])[1] ?? null;

  try {
    console.log('\n1) Migration + Startfrage');
    await p.goto(BASE);
    await p.evaluate(() => {
      localStorage.clear();
      const pad = (id, name) => ({ id, name, color: '#e00000', teams: ['herren', 'damen'], clips: [] });
      localStorage.setItem('vbdj-v2-board', JSON.stringify({ version: 4, rows: [{ id: 'r1', pads: [pad('a', 'Ass'), pad('b', 'Block'), pad('c', 'Mix')] }] }));
    });
    await p.reload();
    ok(await p.locator('text=Für wen legst du auf?').count() === 1, 'Startfrage erscheint');
    let b = await board();
    ok(b.version === 5 && b.rows[0].pads.every(x => x.playback === 'single'), 'v4 → v5 migriert (Modus "single")', `version=${b.version}`);
    await p.click('button:has-text("Herren 1")');
    await p.waitForSelector('button.pad3d');
    ok((await p.locator('button.pad3d').count()) === 3, 'DJ zeigt 3 Buttons');

    console.log('\n1b) Sicherheitsabfrage vor der Dev-Ansicht');
    await p.click('header button:has-text("Dev")');
    ok((await p.locator('[role=alertdialog]').count()) === 1, 'Abfrage erscheint');
    await p.click('[role=alertdialog] button:has-text("Abbrechen")');
    ok((await p.locator('[role=alertdialog]').count()) === 0 && (await p.locator('button.pad3d').count()) === 3, 'Abbrechen bleibt in der DJ-Ansicht');
    await p.click('header button:has-text("Dev")');
    await p.keyboard.press('Escape');
    ok((await p.locator('[role=alertdialog]').count()) === 0, 'Escape schließt die Abfrage');

    console.log('\n2) Import + Wiedergabemodus');
    await goDev();
    const inputs = p.locator('input[data-role="add-clips"]');
    await inputs.nth(0).setInputFiles([fx.kurz, fx.mittel]);
    await p.waitForSelector('text=2 Dateien hinzugefügt');
    await inputs.nth(1).setInputFiles([fx.lang]);
    await p.waitForSelector('text=1 Datei hinzugefügt');
    await inputs.nth(2).setInputFiles([fx.kurz, fx.mittel, fx.leise]);
    await p.waitForSelector('text=3 Dateien hinzugefügt');
    // Ass = der Reihe nach, Mix = zufaellig endlos
    const card = name => p.locator('div.rounded-2xl').filter({ has: p.locator(`input[value="${name}"]`) }).first();
    await card('Ass').locator('button[role=radio]:has-text("Der Reihe nach")').click();
    await card('Mix').locator('button[role=radio]:has-text("Zufällig endlos")').click();
    b = await board();
    ok(b.rows[0].pads[0].playback === 'sequence' && b.rows[0].pads[2].playback === 'shuffle', 'Wiedergabemodi gespeichert');
    ok(b.rows[0].pads[0].clips.every(c => c.gain === 1), 'Neue Sounds haben Lautstärke 100 %');

    console.log('\n2b) Beschreibung (Kleingedrucktes)');
    await card('Ass').locator('input[aria-label="Beschreibung des Buttons"]').fill('z.B. kurzer Aufschlag, Lob');
    b = await board();
    ok(b.rows[0].pads[0].description === 'z.B. kurzer Aufschlag, Lob', 'Beschreibung gespeichert');

    console.log('\n3) Sortieren + Verschieben');
    await card('Ass').locator('button[title="Nach unten"]').first().click();
    b = await board();
    ok(b.rows[0].pads[0].clips.map(c => c.name).join(',') === 'mittel,kurz', 'Sound nach unten sortiert', b.rows[0].pads[0].clips.map(c => c.name).join(','));
    await card('Ass').locator('select[aria-label="In einen anderen Button verschieben oder kopieren"]').first().selectOption({ label: '→ Block' });
    await sleep(150);
    b = await board();
    ok(b.rows[0].pads[0].clips.length === 1 && b.rows[0].pads[1].clips.length === 2, 'Sound in anderen Button verschoben', `Ass=${b.rows[0].pads[0].clips.length} Block=${b.rows[0].pads[1].clips.length}`);
    await card('Block').locator('select[aria-label="In einen anderen Button verschieben oder kopieren"]').last().selectOption({ label: '→ Ass' });
    await sleep(150);

    // Ass steht auf "Der Reihe nach", Mix auf "Zufällig endlos"
    ok((await card('Ass').locator('button[title="Nach oben"]').count()) === 2, 'Sortierpfeile nur bei „Der Reihe nach“');
    ok((await card('Mix').locator('button[title="Nach oben"]').count()) === 0, 'Keine Sortierpfeile bei zufälliger Wiedergabe');

    console.log('\n3b) Kopieren – Datei wird geteilt');
    {
      const fileIds = () => p.evaluate(() => new Promise(res => { const r = indexedDB.open('vbdj-v2'); r.onsuccess = () => { const k = r.result.transaction('files').objectStore('files').getAllKeys(); k.onsuccess = () => res(k.result.length); }; }));
      const before = await fileIds();
      const counts = () => board().then(x => x.rows[0].pads.map(y => y.clips.length).join(','));
      const countsBefore = await counts();
      const original = (await board()).rows[0].pads[2].clips[0];
      await card('Mix').locator('select[aria-label="In einen anderen Button verschieben oder kopieren"]').first().selectOption({ label: '⧉ Block' });
      await sleep(250);
      b = await board();
      const copy = b.rows[0].pads[1].clips.at(-1);
      ok(copy?.fileId === original.fileId && copy.id !== original.id, 'Kopie liegt im Zielbutton und teilt die Audiodatei');
      ok(b.rows[0].pads[2].clips.length === 3, 'Das Original bleibt, wo es war');
      ok((await fileIds()) === before, 'Kopieren belegt keinen zusätzlichen Speicher');
      // Kopie wieder loeschen: die Datei muss bleiben, weil das Original sie noch braucht
      await card('Block').locator('button[title="Sound löschen"]').last().click();
      await sleep(300);
      const survived = await p.evaluate(id => new Promise(res => { const r = indexedDB.open('vbdj-v2'); r.onsuccess = () => { const g = r.result.transaction('files').objectStore('files').get(id); g.onsuccess = () => res(!!g.result); }; }), original.fileId);
      ok(survived, 'Löschen der Kopie nimmt dem Original die Datei nicht weg');
      ok((await counts()) === countsBefore, 'Ausgangszustand wiederhergestellt', `${countsBefore} → ${await counts()}`);
    }

    console.log('\n3c) Farbauswahl');
    ok((await card('Ass').locator('[role=radiogroup][aria-label="Tastenfarbe"] button').count()) === 7, 'Sieben Farben zur Auswahl');
    await card('Ass').locator('button[title="Hellblau"]').click();
    ok((await board()).rows[0].pads[0].color === '#0093d8', 'Hellblau gespeichert');

    console.log('\n4) Lautstärke je Sound');
    await card('Mix').locator('button:has-text("✂ Cue")').last().click(); // "leise"
    await p.waitForSelector('canvas', { timeout: 15000 });
    await p.waitForFunction(() => document.body.innerText.includes('Pegel'), null, { timeout: 15000 });
    const pegelText = await p.locator('text=/Pegel/').first().innerText();
    ok(/-\d+\.\d dB/.test(pegelText), 'Pegel wird gemessen', pegelText.replace(/\s+/g, ' '));
    const slider = p.locator('input[aria-label="Lautstärke dieses Sounds"]');
    await slider.fill('50');
    await p.click('button:has-text("Speichern")');
    await p.waitForSelector('text=Cue-Points setzen', { state: 'detached' });
    b = await board();
    ok(b.rows[0].pads[2].clips[2].gain === 0.5, 'Lautstärke 50 % gespeichert', `gain=${b.rows[0].pads[2].clips[2].gain}`);
    ok((await card('Mix').locator('text=/50 %/').count()) === 1, 'Lautstärke in der Liste sichtbar');

    console.log('\n4b) Datei ersetzen – Einstellungen bleiben');
    {
      const before = (await board()).rows[0].pads[2].clips[2];
      const row = card('Mix').locator('div.rounded-lg').filter({ has: p.locator('input[value="leise"]') }).first();
      await row.locator('input[data-role="replace-file"]').setInputFiles(fx.mittel);
      await row.locator('button:has-text("✓ ersetzt")').waitFor({ timeout: 15000 });
      const after = (await board()).rows[0].pads[2].clips[2];
      const oldBlobGone = await p.evaluate(id => new Promise(res => { const r = indexedDB.open('vbdj-v2'); r.onsuccess = () => { const g = r.result.transaction('files').objectStore('files').get(id); g.onsuccess = () => res(!g.result); }; }), before.fileId);
      ok(after.fileId !== before.fileId && after.name === 'leise' && after.gain === 0.5 && after.cue.start === before.cue.start, 'Neue Datei, Name/Lautstärke/Cue unverändert', `gain=${after.gain} dauer=${after.duration?.toFixed(1)}`);
      ok(oldBlobGone, 'Alte Audiodatei gelöscht');
    }

    console.log('\n5) Auto-Weiterspielen (der Reihe nach) + Zeitmessung');
    await p.click('header button:has-text("DJ")');
    await p.waitForSelector('button.pad3d');
    ok((await p.locator('button.pad3d:has-text("Ass") .pad3d__desc').innerText()) === 'z.B. kurzer Aufschlag, Lob', 'Beschreibung steht kleingedruckt auf der Taste');
    b = await board();
    const reihe = b.rows[0].pads[0].clips; // Ass: Reihenfolge nach Schritt 3
    const dauer = { kurz: 1.5, mittel: 2.5 };
    const t0 = Date.now();
    await p.click('button.pad3d:has-text("Ass")');
    await p.waitForFunction(() => /-\d:\d\d/.test(document.querySelector('footer')?.innerText || ''), null, { timeout: 5000 });
    const startMs = Date.now() - t0;
    ok(startMs < 1500, 'Sound startet', `${startMs} ms`);
    ok((await clipInFooter()) === reihe[0].name, 'Reihe beginnt mit dem ersten Sound', `${await clipInFooter()} (erwartet ${reihe[0].name})`);
    const tA = Date.now();
    await p.waitForFunction(n => ((document.querySelector('footer')?.innerText || '').replace(/\s+/g, ' ').match(/· (\S+)/) || [])[1] === n, reihe[1].name, { timeout: 6000 }).catch(() => {});
    const wechsel1 = (Date.now() - tA) / 1000;
    const soll1 = dauer[reihe[0].name];
    ok((await clipInFooter()) === reihe[1].name && Math.abs(wechsel1 - soll1) < 0.9, 'Nach dem Ende folgt automatisch der zweite Sound', `nach ${wechsel1.toFixed(1)} s, Soll ≈ ${soll1} s`);
    const tB = Date.now();
    await p.waitForFunction(n => ((document.querySelector('footer')?.innerText || '').replace(/\s+/g, ' ').match(/· (\S+)/) || [])[1] === n, reihe[0].name, { timeout: 6000 }).catch(() => {});
    const wechsel2 = (Date.now() - tB) / 1000;
    ok((await clipInFooter()) === reihe[0].name && Math.abs(wechsel2 - dauer[reihe[1].name]) < 0.9, 'Nach dem letzten Sound beginnt die Reihe von vorn', `nach ${wechsel2.toFixed(1)} s, Soll ≈ ${dauer[reihe[1].name]} s`);
    ok((await p.locator('button.pad3d--active').count()) === 1, 'Button bleibt dabei aktiv');

    console.log('\n6) Pause / Weiter');
    await sleep(600);
    await p.click('footer button[aria-label="Pause"]');
    await sleep(200);
    const posA = await posInFooter();
    const clipA = await clipInFooter();
    ok((await footer()).includes('pausiert'), 'Zustand "pausiert" angezeigt');
    await sleep(1800);
    const posB = await posInFooter();
    ok(posA !== null && posA === posB && clipA === (await clipInFooter()), 'Position und Titel stehen während der Pause', `${posA} → ${posB}`);
    ok((await p.locator('.pad3d--paused').count()) === 1, 'Button pulsiert nicht während der Pause');
    await p.click('footer button[aria-label="Weiter"]');
    await sleep(700);
    ok(!(await footer()).includes('pausiert') && (await p.locator('.pad3d--active').count()) === 1, 'Weiter setzt fort');
    await p.keyboard.press('Space');
    await sleep(300);
    ok((await footer()).startsWith('Bereit'), 'Leertaste stoppt');

    console.log('\n7) Einzeln: nach dem Sound Stille');
    await p.click('button.pad3d:has-text("Block")');
    await p.waitForFunction(() => document.querySelector('footer')?.innerText.includes('-0:'), null, { timeout: 5000 });
    await p.waitForFunction(() => document.querySelector('footer')?.innerText.startsWith('Bereit'), null, { timeout: 12000 }).catch(() => {});
    ok((await footer()).startsWith('Bereit'), 'Modus "Einzeln" spielt nicht weiter');

    console.log('\n8) Zufällig endlos ohne direkte Wiederholung');
    await p.click('button.pad3d:has-text("Mix")');
    const seen = [];
    for (let i = 0; i < 6; i++) {
      await p.waitForFunction(prev => { const t = (document.querySelector('footer')?.innerText || '').replace(/\s+/g, ' '); const m = t.match(/Mix · (\S+)/); return !!m && m[1] !== prev; }, seen[seen.length - 1] ?? null, { timeout: 6000 }).catch(() => {});
      const m = (await footer()).match(/Mix · (\S+)/);
      if (m) seen.push(m[1]);
    }
    ok(seen.length >= 5 && seen.every((s, i) => i === 0 || s !== seen[i - 1]), 'Nie zweimal derselbe Sound hintereinander', seen.join(' → '));
    await p.keyboard.press('Space');

    console.log('\n9) Ziehen, Export/Import, Persistenz');
    await goDev();
    const from = await p.locator('[data-pad-id]').filter({ hasText: 'Mix' }).boundingBox();
    const to = await p.locator('[data-row-id="__neue_zeile__"]').boundingBox();
    await p.mouse.move(from.x + from.width / 2, from.y + from.height / 2); await p.mouse.down();
    await p.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 10 }); await sleep(100); await p.mouse.up(); await sleep(200);
    b = await board();
    ok(b.rows.length === 2 && b.rows[1].pads[0].name === 'Mix', 'Button per Ziehen in neue Zeile');
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('button:has-text("Exportieren")')]);
    const file = await dl.path();
    await p.evaluate(() => localStorage.clear());
    await p.reload();
    await p.click('button:has-text("Damen 1")');
    await goDev();
    await p.locator('section input[type=file]').first().setInputFiles(file);
    await p.waitForSelector('text=Bundle importiert');
    b = await board();
    const mix = b.rows.flatMap(r => r.pads).find(x => x.name === 'Mix');
    ok(b.rows.length === 2 && mix?.playback === 'shuffle' && mix.clips.length === 3 && mix.clips[2].gain === 0.5, 'Export/Import erhält Zeilen, Modi und Lautstärke', `rows=${b.rows.length} mix=${mix?.playback}/${mix?.clips.length}`);
    ok(b.rows[0].pads[0].description === 'z.B. kurzer Aufschlag, Lob', 'Export/Import erhält die Beschreibung');

    console.log('\n9b) Nach der letzten Verwendung wird die Datei gelöscht');
    {
      await goDev();
      const firstCard = p.locator('div.rounded-2xl').filter({ has: p.locator('button[title="Sound löschen"]') }).first();
      const padName = await firstCard.locator('[aria-label="Beschriftung des Buttons"]').inputValue();
      const target = (await board()).rows.flatMap(r => r.pads).find(x => x.name === padName);
      const fileId = target.clips[0].fileId;
      const others = (await board()).rows.flatMap(r => r.pads).flatMap(x => x.clips).filter(c => c.fileId === fileId);
      for (let i = 0; i < others.length; i++) {
        const row = p.locator('div.rounded-lg').filter({ has: p.locator(`input[value="${others[i].name}"]`) }).first();
        await row.locator('button[title="Sound löschen"]').click();
        await sleep(250);
      }
      const gone = await p.evaluate(id => new Promise(res => { const r = indexedDB.open('vbdj-v2'); r.onsuccess = () => { const g = r.result.transaction('files').objectStore('files').get(id); g.onsuccess = () => res(!g.result); }; }), fileId);
      ok(gone, 'Audiodatei verschwindet, wenn kein Sound sie mehr nutzt', `${others.length} Verwendung(en) gelöscht`);
    }

    console.log('\n9c) Bildschirmaufnahme (.mov, QuickTime-Layout)');
    {
      // iOS-Bildschirmaufnahmen sind .mov mit Sample-Description Version 1 und
      // esds in einer wave-Box. Braucht ffmpeg zum Erzeugen - sonst uebersprungen.
      const hasFfmpeg = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;
      if (!hasFfmpeg) {
        console.log('  – übersprungen (ffmpeg nicht installiert)');
      } else {
        const mov = join(tmpdir(), 'vbdj-tests', 'screenrec.mov');
        spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=black:s=320x320:r=15', '-i', fx.lang, '-t', '5', '-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac', '-b:a', '128k', '-pix_fmt', 'yuv420p', '-f', 'mov', mov]);
        const data = Array.from(readFileSync(mov));
        const r = await p.evaluate(async d => {
          const t = await import('/src/utils/audioTranscode.ts');
          const res = await t.remuxAudioTrack(new Blob([new Uint8Array(d)], { type: 'video/quicktime' }));
          return res ? { ok: true, dur: +res.duration.toFixed(1), rate: res.sampleRate, ch: res.channels } : { ok: false };
        }, data);
        ok(r.ok && r.rate === 44100, 'Tonspur einer .mov-Aufnahme wird verlustfrei übernommen', JSON.stringify(r));
      }
    }

    console.log('\n10) Bildschirm wachhalten');
    ok(await p.evaluate(() => 'wakeLock' in navigator), 'Wake-Lock-API vorhanden');
  } finally {
    ok(errors.length === 0, 'Keine Fehler in der Konsole', errors.join(' | '));
    await browser.close();
    vite?.kill();
  }
  console.log(failures ? `\n${failures} Test(s) fehlgeschlagen` : '\nAlle Tests bestanden');
  process.exit(failures ? 1 : 0);
}

main().catch(e => { console.error('Testlauf abgebrochen:', e); process.exit(1); });
