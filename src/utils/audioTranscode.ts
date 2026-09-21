/**
 * Extrahiert die Tonspur einer Mediendatei und speichert sie kompakt als AAC in
 * einem M4A-Container (mit Sample-Index -> exaktes Anspringen von Cue-Points).
 *
 * Warum: Die Nutzerin importiert Instagram-Reels (MP4). Die Videospur macht
 * ~85-98 % der Datei aus, wird aber nie gebraucht. Ebenso werden WAV/AIFF/FLAC
 * (Soundeffekt-Seiten) um den Faktor ~10 kleiner.
 *
 * Technik: decodeAudioData (Browser demuxt/dekodiert jedes Format, das er
 * abspielen kann) -> WebCodecs AudioEncoder (AAC-LC) -> mp4-muxer.
 * Ohne AudioEncoder (alte Browser) liefert transcodeToAac() null und die
 * Originaldatei wird unveraendert gespeichert.
 */

import { extractAacTrack } from './mp4Demux';

const AAC_CODEC = 'mp4a.40.2'; // AAC-LC
const BITRATE = 128_000;
const FRAMES_PER_CHUNK = 48_000; // ~1 s pro AudioData-Objekt

// ISO/IEC 14496-3, samplingFrequencyIndex
const AAC_RATE_INDEX: Record<number, number> = {
  96000: 0, 88200: 1, 64000: 2, 48000: 3, 44100: 4, 32000: 5, 24000: 6, 22050: 7, 16000: 8, 12000: 9, 11025: 10, 8000: 11, 7350: 12,
};

/**
 * AudioSpecificConfig fuer AAC-LC selbst bauen (2 Bytes: Objekttyp 2, Ratenindex, Kanaele).
 * Grund: Die Browser liefern in `decoderConfig.description` Unterschiedliches -
 * Chrome die reine ASC, Safari einen kompletten ES-Descriptor. Letzteren wuerde
 * der Muxer ein zweites Mal einpacken, und Safari spielt die Datei dann nicht ab.
 */
function audioSpecificConfig(sampleRate: number, channels: number): Uint8Array {
  const idx = AAC_RATE_INDEX[sampleRate];
  if (idx === undefined) throw new Error(`Abtastrate ${sampleRate} nicht fuer AAC geeignet`);
  const bits = (2 << 11) | (idx << 7) | (channels << 3);
  return new Uint8Array([bits >> 8, bits & 0xff]);
}

/**
 * Formate, bei denen sich das Umwandeln lohnt: Video (Tonspur reicht) oder
 * unkomprimiert (WAV/AIFF/FLAC). Bereits verlustbehaftet komprimierte Dateien
 * (MP3, M4A, AAC, OGG, Opus) werden NIE neu kodiert - jede weitere Kodierung
 * kostet Qualitaet, egal wie hoch ihre Bitrate ist (320-kbit/s-MP3, iTunes 256k).
 */
export function shouldCompress(file: { type: string; name: string; size: number }, duration: number | null): boolean {
  if (file.type.startsWith('video/') || /\.(mp4|m4v|mov|webm)$/i.test(file.name)) return true;
  if (/\.(wav|aif|aiff|flac)$/i.test(file.name) || /wav|aiff|flac/.test(file.type)) return true;
  if (/\.(mp3|m4a|aac|ogg|oga|opus)$/i.test(file.name) || /mpeg|mp3|mp4|aac|ogg|opus/.test(file.type)) return false;
  // Sicherheitsnetz nur fuer unbekannte Formate: alles ueber ~400 kbit/s ist Video oder verlustfrei
  if (duration && duration > 0) return (file.size * 8) / duration > 400_000;
  return false;
}

export function canTranscode(): boolean {
  return typeof AudioEncoder !== 'undefined' && typeof AudioData !== 'undefined';
}

export interface TranscodeResult {
  blob: Blob;
  duration: number;
  sampleRate: number;
  channels: number;
}

async function decode(blob: Blob): Promise<AudioBuffer> {
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctor();
  try {
    const data = await blob.arrayBuffer();
    return await new Promise<AudioBuffer>((resolve, reject) => {
      ctx.decodeAudioData(data, resolve, err => reject(err ?? new Error('decodeAudioData fehlgeschlagen')));
    });
  } finally {
    void ctx.close();
  }
}

/** Auf eine vom Encoder unterstuetzte Abtastrate bringen. */
async function resample(buffer: AudioBuffer, targetRate: number): Promise<AudioBuffer> {
  if (buffer.sampleRate === targetRate) return buffer;
  const length = Math.ceil(buffer.duration * targetRate);
  const off = new OfflineAudioContext(buffer.numberOfChannels, length, targetRate);
  const src = off.createBufferSource();
  src.buffer = buffer;
  src.connect(off.destination);
  src.start(0);
  return off.startRendering();
}

/**
 * Kopiert die AAC-Tonspur eines Videos unveraendert in eine M4A-Datei.
 * Kein Neukodieren, also kein Qualitaetsverlust. null = geht nicht, dann neu kodieren.
 */
export async function remuxAudioTrack(input: Blob): Promise<TranscodeResult | null> {
  const track = await extractAacTrack(input);
  if (!track) return null;
  try {
    const { ArrayBufferTarget, Muxer } = await import('mp4-muxer');
    const muxer = new Muxer({
      target: new ArrayBufferTarget(),
      audio: { codec: 'aac', sampleRate: track.sampleRate, numberOfChannels: track.channels },
      fastStart: 'in-memory',
    });
    const decoderConfig = {
      codec: AAC_CODEC,
      sampleRate: track.sampleRate,
      numberOfChannels: track.channels,
      description: track.description,
    };
    for (const sample of track.samples) {
      // AAC-Pakete sind samtlich Keyframes
      muxer.addAudioChunkRaw(sample.data, 'key', sample.timestamp, sample.duration, { decoderConfig });
    }
    muxer.finalize();
    return {
      blob: new Blob([muxer.target.buffer], { type: 'audio/mp4' }),
      duration: track.duration,
      sampleRate: track.sampleRate,
      channels: track.channels,
    };
  } catch (e) {
    console.warn('Tonspur konnte nicht umgepackt werden, kodiere neu', e);
    return null;
  }
}

export async function transcodeToAac(input: Blob): Promise<TranscodeResult | null> {
  if (!canTranscode()) return null;

  let buffer = await decode(input);
  const channels = Math.min(2, buffer.numberOfChannels);

  // Encoder-Konfiguration finden (bevorzugt Original-Abtastrate)
  let sampleRate = buffer.sampleRate;
  let config: AudioEncoderConfig = { codec: AAC_CODEC, sampleRate, numberOfChannels: channels, bitrate: BITRATE, bitrateMode: 'constant' };
  if (AAC_RATE_INDEX[sampleRate] === undefined || !(await AudioEncoder.isConfigSupported(config)).supported) {
    sampleRate = 48_000;
    config = { ...config, sampleRate };
    if (!(await AudioEncoder.isConfigSupported(config)).supported) return null;
    buffer = await resample(buffer, sampleRate);
  }

  // Der Muxer wird nur beim Import gebraucht - erst hier laden, nicht beim App-Start
  let mux: typeof import('mp4-muxer');
  try {
    mux = await import('mp4-muxer');
  } catch {
    // Nach einem Update fehlt die alte Datei auf dem Server; dann Original speichern statt abbrechen
    console.warn('mp4-muxer nicht ladbar (App aktualisiert?) - Original wird gespeichert');
    return null;
  }
  const { ArrayBufferTarget, Muxer } = mux;
  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    audio: { codec: 'aac', sampleRate, numberOfChannels: channels },
    fastStart: 'in-memory',
  });

  const decoderConfig = { codec: AAC_CODEC, sampleRate, numberOfChannels: channels, description: audioSpecificConfig(sampleRate, channels) };
  let encodeError: unknown = null;
  const encoder = new AudioEncoder({
    // Browser-Metadaten bewusst ignorieren, eigene ASC verwenden (siehe oben)
    output: chunk => muxer.addAudioChunk(chunk, { decoderConfig }),
    error: e => {
      encodeError = e;
    },
  });
  encoder.configure(config);

  // Planar-Float32-Daten in ~1-s-Stuecken an den Encoder geben
  const total = buffer.length;
  const planes = Array.from({ length: channels }, (_, ch) => buffer.getChannelData(ch));
  for (let offset = 0; offset < total; offset += FRAMES_PER_CHUNK) {
    const frames = Math.min(FRAMES_PER_CHUNK, total - offset);
    const data = new Float32Array(frames * channels);
    for (let ch = 0; ch < channels; ch++) data.set(planes[ch].subarray(offset, offset + frames), ch * frames);
    const audioData = new AudioData({
      format: 'f32-planar',
      sampleRate,
      numberOfFrames: frames,
      numberOfChannels: channels,
      timestamp: Math.round((offset / sampleRate) * 1_000_000),
      data,
    });
    encoder.encode(audioData);
    audioData.close();
    if (encodeError) break;
  }

  await encoder.flush();
  encoder.close();
  if (encodeError) throw encodeError;

  muxer.finalize();
  const out = new Blob([muxer.target.buffer], { type: 'audio/mp4' });
  return { blob: out, duration: buffer.duration, sampleRate, channels };
}
