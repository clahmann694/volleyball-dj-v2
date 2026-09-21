/**
 * Minimaler MP4-Leser: holt die AAC-Tonspur einer Videodatei heraus, ohne sie
 * neu zu kodieren.
 *
 * Warum: Die Nutzerin importiert Instagram-Reels. Deren Tonspur ist bereits
 * AAC mit 128 kbit/s; sie zu dekodieren und erneut zu kodieren kostet eine
 * Generation Qualitaet voellig ohne Not. Hier werden stattdessen die fertigen
 * AAC-Pakete aus der Datei gelesen und unveraendert in einen M4A-Container
 * gelegt - Bit fuer Bit derselbe Ton.
 *
 * Bewusst konservativ: Alles, was nicht dem erwarteten Aufbau entspricht
 * (fragmentierte MP4s, andere Codecs, fehlende Tabellen), liefert null.
 * Der Aufrufer weicht dann auf das Neukodieren aus.
 */

export interface AacSample {
  data: Uint8Array;
  /** Zeitstempel in Mikrosekunden */
  timestamp: number;
  /** Dauer in Mikrosekunden */
  duration: number;
}

export interface AacTrack {
  samples: AacSample[];
  sampleRate: number;
  channels: number;
  /** AudioSpecificConfig aus der esds-Box */
  description: Uint8Array;
  /** Gesamtdauer in Sekunden */
  duration: number;
}

interface Box {
  type: string;
  start: number;
  end: number;
  /** Beginn des Inhalts (hinter Groesse und Typ) */
  body: number;
}

function readBoxes(view: DataView, from: number, to: number): Box[] {
  const boxes: Box[] = [];
  let p = from;
  while (p + 8 <= to) {
    let size = view.getUint32(p);
    const type = String.fromCharCode(view.getUint8(p + 1 + 3), view.getUint8(p + 5), view.getUint8(p + 6), view.getUint8(p + 7));
    let body = p + 8;
    if (size === 1) {
      if (p + 16 > to) break;
      // 64-Bit-Groesse; die oberen 32 Bit sind bei diesen Dateien immer 0
      const high = view.getUint32(p + 8);
      const low = view.getUint32(p + 12);
      size = high * 2 ** 32 + low;
      body = p + 16;
    } else if (size === 0) {
      size = to - p;
    }
    if (size < 8 || p + size > to) break;
    boxes.push({ type, start: p, end: p + size, body });
    p += size;
  }
  return boxes;
}

function typeAt(view: DataView, p: number): string {
  return String.fromCharCode(view.getUint8(p + 4), view.getUint8(p + 5), view.getUint8(p + 6), view.getUint8(p + 7));
}

function find(boxes: Box[], type: string): Box | undefined {
  return boxes.find(b => b.type === type);
}

/** ES-Descriptor durchlaufen und die DecoderSpecificInfo (Tag 0x05) holen. */
function readAudioSpecificConfig(bytes: Uint8Array): Uint8Array | null {
  let p = 4; // Version + Flags
  const readLength = () => {
    let len = 0;
    for (let i = 0; i < 4; i++) {
      const b = bytes[p++];
      len = (len << 7) | (b & 0x7f);
      if (!(b & 0x80)) break;
    }
    return len;
  };
  while (p < bytes.length) {
    const tag = bytes[p++];
    const len = readLength();
    if (tag === 0x05) return bytes.slice(p, p + len);
    if (tag === 0x03) {
      // ES_Descriptor: ES_ID (2) + Flags (1), danach optionale Felder
      const flags = bytes[p + 2];
      let skip = 3;
      if (flags & 0x80) skip += 2; // abhaengiger Stream
      if (flags & 0x40) skip += 1 + bytes[p + skip]; // URL
      if (flags & 0x20) skip += 2; // OCR
      p += skip;
      continue; // Inhalt weiter durchlaufen
    }
    if (tag === 0x04) {
      p += 13; // objectType + streamType + bufferSize + max/avg-Bitrate
      continue;
    }
    p += len; // unbekannt: ueberspringen
  }
  return null;
}

export async function extractAacTrack(file: Blob): Promise<AacTrack | null> {
  try {
    const buffer = await file.arrayBuffer();
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);
    const top = readBoxes(view, 0, buffer.byteLength);

    // Fragmentierte MP4s haben keine vollstaendigen Tabellen im moov
    if (find(top, 'moof')) return null;
    const moov = find(top, 'moov');
    if (!moov) return null;

    for (const trak of readBoxes(view, moov.body, moov.end).filter(b => b.type === 'trak')) {
      const mdia = find(readBoxes(view, trak.body, trak.end), 'mdia');
      if (!mdia) continue;
      const mdiaBoxes = readBoxes(view, mdia.body, mdia.end);

      const hdlr = find(mdiaBoxes, 'hdlr');
      if (!hdlr || typeAt(view, hdlr.body + 4) !== 'soun') continue;

      const mdhd = find(mdiaBoxes, 'mdhd');
      if (!mdhd) continue;
      const mdhdVersion = view.getUint8(mdhd.body);
      const timescale = mdhdVersion === 1 ? view.getUint32(mdhd.body + 20) : view.getUint32(mdhd.body + 12);
      if (!timescale) continue;

      const minf = find(mdiaBoxes, 'minf');
      if (!minf) continue;
      const stbl = find(readBoxes(view, minf.body, minf.end), 'stbl');
      if (!stbl) continue;
      const s = readBoxes(view, stbl.body, stbl.end);

      // --- Codec und AudioSpecificConfig ---
      const stsd = find(s, 'stsd');
      if (!stsd) continue;
      const entries = readBoxes(view, stsd.body + 8, stsd.end);
      const mp4a = entries.find(b => b.type === 'mp4a');
      if (!mp4a) continue;
      const channels = view.getUint16(mp4a.body + 16);
      const sampleRate = view.getUint16(mp4a.body + 24); // 16.16-Festkomma, ganzzahliger Teil
      const esds = find(readBoxes(view, mp4a.body + 28, mp4a.end), 'esds');
      if (!esds) continue;
      const description = readAudioSpecificConfig(bytes.slice(esds.body, esds.end));
      if (!description || description.length < 2) continue;

      // --- Tabellen ---
      const stts = find(s, 'stts');
      const stsz = find(s, 'stsz');
      const stsc = find(s, 'stsc');
      const stco = find(s, 'stco') ?? find(s, 'co64');
      if (!stts || !stsz || !stsc || !stco) continue;

      // Groessen
      const uniformSize = view.getUint32(stsz.body + 4);
      const sampleCount = view.getUint32(stsz.body + 8);
      const sizes = new Uint32Array(sampleCount);
      if (uniformSize) sizes.fill(uniformSize);
      else for (let i = 0; i < sampleCount; i++) sizes[i] = view.getUint32(stsz.body + 12 + i * 4);

      // Dauern
      const sttsCount = view.getUint32(stts.body + 4);
      const deltas = new Uint32Array(sampleCount);
      let di = 0;
      for (let i = 0; i < sttsCount && di < sampleCount; i++) {
        const n = view.getUint32(stts.body + 8 + i * 8);
        const delta = view.getUint32(stts.body + 12 + i * 8);
        for (let k = 0; k < n && di < sampleCount; k++) deltas[di++] = delta;
      }
      if (di < sampleCount) continue;

      // Chunk-Positionen
      const is64 = stco.type === 'co64';
      const chunkCount = view.getUint32(stco.body + 4);
      const chunkOffsets = new Float64Array(chunkCount);
      for (let i = 0; i < chunkCount; i++) {
        chunkOffsets[i] = is64
          ? view.getUint32(stco.body + 8 + i * 8) * 2 ** 32 + view.getUint32(stco.body + 12 + i * 8)
          : view.getUint32(stco.body + 8 + i * 4);
      }

      // Samples je Chunk
      const stscCount = view.getUint32(stsc.body + 4);
      const runs: Array<{ firstChunk: number; perChunk: number }> = [];
      for (let i = 0; i < stscCount; i++) {
        runs.push({
          firstChunk: view.getUint32(stsc.body + 8 + i * 12),
          perChunk: view.getUint32(stsc.body + 12 + i * 12),
        });
      }
      if (runs.length === 0) continue;

      // --- Samples einsammeln ---
      const samples: AacSample[] = [];
      let sampleIndex = 0;
      let time = 0;
      for (let c = 0; c < chunkCount && sampleIndex < sampleCount; c++) {
        const chunkNumber = c + 1;
        let run = runs[0];
        for (const r of runs) if (r.firstChunk <= chunkNumber) run = r;
        let offset = chunkOffsets[c];
        for (let k = 0; k < run.perChunk && sampleIndex < sampleCount; k++) {
          const size = sizes[sampleIndex];
          if (offset + size > buffer.byteLength) return null;
          samples.push({
            data: bytes.slice(offset, offset + size),
            timestamp: Math.round((time / timescale) * 1_000_000),
            duration: Math.round((deltas[sampleIndex] / timescale) * 1_000_000),
          });
          offset += size;
          time += deltas[sampleIndex];
          sampleIndex++;
        }
      }
      if (samples.length !== sampleCount || samples.length === 0) return null;

      return { samples, sampleRate: sampleRate || timescale, channels: channels || 2, description, duration: time / timescale };
    }
    return null;
  } catch (e) {
    console.warn('MP4-Tonspur konnte nicht gelesen werden', e);
    return null;
  }
}
