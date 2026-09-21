import { useEffect, useRef } from 'react';

interface Props {
  peaks: Float32Array | null;
  color: string;
}

/** Zeichnet die Pegelspitzen als symmetrische Wellenform in ein Canvas. */
export function Waveform({ peaks, color }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !peaks) return;
    const w = peaks.length;
    const h = 120;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = color;
    for (let i = 0; i < w; i++) {
      const amp = Math.max(1, peaks[i] * h * 0.92);
      ctx.fillRect(i, (h - amp) / 2, 1, amp);
    }
  }, [peaks, color]);

  if (!peaks) {
    return <div className="absolute inset-0 flex items-center justify-center text-xs text-white/40">Wellenform wird berechnet…</div>;
  }
  return <canvas ref={ref} className="absolute inset-0 w-full h-full opacity-80 pointer-events-none" />;
}
