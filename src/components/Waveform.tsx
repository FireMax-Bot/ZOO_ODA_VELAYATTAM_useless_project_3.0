import { useEffect, useRef } from "react";
import type { Syllable } from "../lib/types";

interface WaveformProps {
  buffer: AudioBuffer | null;
  color?: string;
  /** Optional: overlays a pitch dot per voiced syllable — visual proof that
   * per-syllable pitch tracking is actually picking something up. */
  syllables?: Syllable[];
  dotColor?: string;
  height?: number;
}

export function Waveform({ buffer, color = "#34d399", syllables, dotColor = "#fbbf24", height = 64 }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    if (!buffer) return;

    const data = buffer.getChannelData(0);
    const step = Math.max(1, Math.ceil(data.length / width));
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    for (let x = 0; x < width; x++) {
      let min = 1;
      let max = -1;
      for (let i = 0; i < step; i++) {
        const idx = x * step + i;
        if (idx >= data.length) break;
        const v = data[idx];
        if (v < min) min = v;
        if (v > max) max = v;
      }
      const y1 = ((1 - max) / 2) * height;
      const y2 = ((1 - min) / 2) * height;
      ctx.moveTo(x, y1);
      ctx.lineTo(x, y2);
    }
    ctx.stroke();

    if (syllables && syllables.length > 0 && buffer.duration > 0) {
      const voiced = syllables.filter((s) => s.f0 > 0);
      if (voiced.length > 0) {
        const minF0 = Math.min(...voiced.map((s) => s.f0));
        const maxF0 = Math.max(...voiced.map((s) => s.f0));
        const range = maxF0 - minF0 || 1;

        ctx.fillStyle = dotColor;
        for (const syl of voiced) {
          const x = (syl.t / buffer.duration) * width;
          // Higher pitch draws higher (smaller y); margins keep dots off the edges.
          const norm = (syl.f0 - minF0) / range;
          const y = height * 0.85 - norm * height * 0.7;
          ctx.beginPath();
          ctx.arc(x, y, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }, [buffer, color, syllables, dotColor]);

  return <canvas ref={canvasRef} width={400} height={height} className="w-full rounded-lg bg-black/30" />;
}
