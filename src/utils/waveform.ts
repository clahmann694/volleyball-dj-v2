/**
 * Dekodiert eine Audiodatei und liefert normierte Pegelspitzen (0..1)
 * fuer die Wellenform-Anzeige im Cue-Editor.
 */
export async function computePeaks(blob: Blob, buckets = 600): Promise<{ peaks: Float32Array; duration: number }> {
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctor();
  try {
    const data = await blob.arrayBuffer();
    // Callback-Form: Safari unterstuetzt die Promise-Variante erst seit kurzem
    const buffer = await new Promise<AudioBuffer>((resolve, reject) => {
      ctx.decodeAudioData(data, resolve, err => reject(err ?? new Error('decodeAudioData fehlgeschlagen')));
    });
    const peaks = new Float32Array(buckets);
    const perBucket = Math.max(1, Math.floor(buffer.length / buckets));
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const samples = buffer.getChannelData(ch);
      for (let b = 0; b < buckets; b++) {
        const from = b * perBucket;
        const to = Math.min(samples.length, from + perBucket);
        let max = 0;
        for (let i = from; i < to; i += 4) {
          const v = Math.abs(samples[i]);
          if (v > max) max = v;
        }
        if (max > peaks[b]) peaks[b] = max;
      }
    }
    return { peaks, duration: buffer.duration };
  } finally {
    void ctx.close();
  }
}
