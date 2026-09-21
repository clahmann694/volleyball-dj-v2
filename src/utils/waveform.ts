/**
 * Dekodiert eine Audiodatei und liefert je Abschnitt ("Bucket") die Pegelspitze
 * (fuer die Wellenform) und den Effektivwert (fuer die Lautstaerkemessung).
 */
export interface WaveformData {
  /** Spitzenwert je Bucket, 0..1 */
  peaks: Float32Array;
  /** Effektivwert (RMS) je Bucket, 0..1 */
  rms: Float32Array;
  duration: number;
}

export async function computePeaks(blob: Blob, buckets = 600): Promise<WaveformData> {
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctor();
  try {
    const data = await blob.arrayBuffer();
    // Callback-Form: Safari unterstuetzt die Promise-Variante erst seit kurzem
    const buffer = await new Promise<AudioBuffer>((resolve, reject) => {
      ctx.decodeAudioData(data, resolve, err => reject(err ?? new Error('decodeAudioData fehlgeschlagen')));
    });
    const peaks = new Float32Array(buckets);
    const rms = new Float32Array(buckets);
    const perBucket = Math.max(1, Math.floor(buffer.length / buckets));
    const channels = buffer.numberOfChannels;
    for (let b = 0; b < buckets; b++) {
      const from = b * perBucket;
      const to = Math.min(buffer.length, from + perBucket);
      let max = 0;
      let sumSq = 0;
      let n = 0;
      for (let ch = 0; ch < channels; ch++) {
        const samples = buffer.getChannelData(ch);
        for (let i = from; i < to; i += 4) {
          const v = samples[i];
          const a = Math.abs(v);
          if (a > max) max = a;
          sumSq += v * v;
          n++;
        }
      }
      peaks[b] = max;
      rms[b] = n ? Math.sqrt(sumSq / n) : 0;
    }
    return { peaks, rms, duration: buffer.duration };
  } finally {
    void ctx.close();
  }
}

/** Mittlerer Pegel eines Zeitbereichs in dBFS (0 = Vollaussteuerung). */
export function levelDb(data: WaveformData, start: number, end: number): number | null {
  if (!data.duration || end <= start) return null;
  const n = data.rms.length;
  const from = Math.max(0, Math.floor((start / data.duration) * n));
  const to = Math.min(n, Math.ceil((end / data.duration) * n));
  let sumSq = 0;
  let count = 0;
  for (let i = from; i < to; i++) {
    sumSq += data.rms[i] * data.rms[i];
    count++;
  }
  if (!count) return null;
  const rms = Math.sqrt(sumSq / count);
  return rms > 0 ? 20 * Math.log10(rms) : -100;
}

/** Ziel-Pegel, auf den "Angleichen" die Sounds bringt (typischer Wert fuer Musik) */
export const TARGET_DB = -18;

/** Verstaerkung (0..1), die einen Sound vom gemessenen auf den Ziel-Pegel bringt - lauter als 1 geht nicht */
export function gainForTarget(measuredDb: number, targetDb = TARGET_DB): number {
  const g = Math.pow(10, (targetDb - measuredDb) / 20);
  return Math.min(1, Math.max(0.05, Math.round(g * 100) / 100));
}
