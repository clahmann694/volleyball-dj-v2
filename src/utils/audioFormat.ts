const EXT_BY_MIME: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/aac': 'aac',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/wave': 'wav',
  'audio/ogg': 'ogg',
  'audio/flac': 'flac',
  'audio/x-flac': 'flac',
  'audio/aiff': 'aiff',
  'audio/x-aiff': 'aiff',
  'audio/webm': 'webm',
};

const AUDIO_EXT = /\.(mp3|m4a|mp4|aac|wav|ogg|oga|flac|aif|aiff|webm)$/i;

function extension(fileName: string): string | null {
  const m = fileName.match(/\.([a-z0-9]{2,5})$/i);
  return m ? m[1].toLowerCase() : null;
}

/** Howler braucht bei Blob-URLs das Format explizit, weil die URL keine Endung hat. */
export function howlerFormat(fileName: string, mimeType: string): string {
  const ext = extension(fileName);
  if (ext) return ext === 'mp4' ? 'm4a' : ext === 'aif' ? 'aiff' : ext;
  return EXT_BY_MIME[mimeType] ?? 'mp3';
}

export function isAudioFile(file: File): boolean {
  return file.type.startsWith('audio/') || AUDIO_EXT.test(file.name);
}

/** "here-comes-the-boom.mp3" -> "here comes the boom" */
export function cleanClipName(fileName: string): string {
  return fileName
    .replace(/\.[^/.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Liest die Dauer einer Audiodatei ueber ein <audio>-Element aus. */
export function readDuration(blob: Blob): Promise<number | null> {
  return new Promise(resolve => {
    const url = URL.createObjectURL(blob);
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    let settled = false;
    const done = (value: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      audio.removeAttribute('src');
      audio.load();
      URL.revokeObjectURL(url);
      resolve(value);
    };
    const timer = setTimeout(() => done(null), 15000);
    audio.onloadedmetadata = () => done(Number.isFinite(audio.duration) ? audio.duration : null);
    audio.onerror = () => done(null);
    audio.src = url;
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
