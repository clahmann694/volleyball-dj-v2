// Erzeugt Testtoene als WAV (16 Bit, mono) - keine externen Werkzeuge noetig.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const RATE = 44100;

/** parts: [{ seconds, freq (null = Stille), amp }] */
function wav(parts) {
  const frames = [];
  for (const { seconds, freq, amp } of parts) {
    const n = Math.round(seconds * RATE);
    for (let i = 0; i < n; i++) {
      const env = Math.min(1, i / 400, (n - i) / 400); // kurzes Ein-/Ausblenden gegen Knacken
      const v = freq ? amp * env * Math.sin((2 * Math.PI * freq * i) / RATE) : 0;
      frames.push(Math.round(v * 32767));
    }
  }
  const data = Buffer.alloc(frames.length * 2);
  frames.forEach((v, i) => data.writeInt16LE(v, i * 2));
  const header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(36 + data.length, 4); header.write('WAVE', 8);
  header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24); header.writeUInt32LE(RATE * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
  header.write('data', 36); header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

export function createFixtures() {
  const dir = join(tmpdir(), 'vbdj-tests');
  mkdirSync(dir, { recursive: true });
  const files = {
    kurz: [{ seconds: 1.5, freq: 440, amp: 0.8 }],                                   // 1,5 s
    mittel: [{ seconds: 2.5, freq: 660, amp: 0.8 }],                                 // 2,5 s
    leise: [{ seconds: 2, freq: 330, amp: 0.1 }],                                    // leise (fuer Pegel)
    lang: [{ seconds: 2, freq: 220, amp: 0.2 }, { seconds: 3, freq: 440, amp: 0.8 }, { seconds: 3, freq: 660, amp: 0.8 }], // 8 s
  };
  const out = {};
  for (const [name, parts] of Object.entries(files)) {
    const path = join(dir, `${name}.wav`);
    writeFileSync(path, wav(parts));
    out[name] = path;
  }
  return out;
}
