import { autocorrelationPitch, frameSignal, rms, toMono } from "./audioAnalysis";
import type { Syllable } from "./types";

const FRAME_SEC = 0.025;
const HOP_SEC = 0.01;
const SMOOTH_WINDOW_FRAMES = 5; // ~50ms at a 10ms hop
const MIN_SEPARATION_SEC = 0.12;
const MAX_SYLLABLES = 24;

function movingAverage(xs: number[], windowSize: number): number[] {
  const out = new Array<number>(xs.length);
  const half = Math.floor(windowSize / 2);
  for (let i = 0; i < xs.length; i++) {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - half); j <= Math.min(xs.length - 1, i + half); j++) {
      sum += xs[j];
      count++;
    }
    out[i] = sum / count;
  }
  return out;
}

function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.floor(p * (sortedAsc.length - 1));
  return sortedAsc[idx];
}

/**
 * Segments a recorded utterance into syllable-like onsets by peak-picking
 * a smoothed RMS envelope. This is what makes the animal's calls follow the
 * rhythm of what you actually said, instead of firing on a fixed timer.
 */
export function detectSyllables(buffer: AudioBuffer): Syllable[] {
  const sr = buffer.sampleRate;
  const mono = toMono(buffer);
  const { frames, times } = frameSignal(mono, sr, FRAME_SEC, HOP_SEC);
  if (frames.length === 0) return [];

  const rawRms = frames.map(rms);
  const smoothed = movingAverage(rawRms, SMOOTH_WINDOW_FRAMES);

  const sortedAsc = [...smoothed].sort((a, b) => a - b);
  const p95 = percentile(sortedAsc, 0.95);
  const threshold = 0.15 * p95;
  const minSepFrames = Math.max(1, Math.round(MIN_SEPARATION_SEC / HOP_SEC));

  const peaks: number[] = [];
  for (let i = 1; i < smoothed.length - 1; i++) {
    const isLocalPeak = smoothed[i] >= smoothed[i - 1] && smoothed[i] >= smoothed[i + 1];
    if (!isLocalPeak || smoothed[i] <= threshold) continue;

    const last = peaks[peaks.length - 1];
    if (last === undefined || i - last >= minSepFrames) {
      peaks.push(i);
    } else if (smoothed[i] > smoothed[last]) {
      peaks[peaks.length - 1] = i; // stronger peak nearby wins
    }
  }

  let chosen = peaks;
  if (chosen.length > MAX_SYLLABLES) {
    chosen = [...peaks]
      .sort((a, b) => smoothed[b] - smoothed[a])
      .slice(0, MAX_SYLLABLES)
      .sort((a, b) => a - b);
  }

  // 60ms, not 40ms: 40ms only spans ~2.8 cycles at the low end of the pitch
  // range (70Hz), which is borderline for autocorrelation and let lower
  // voices silently drop to "unvoiced" on some syllables. Still comfortably
  // fits inside the shortest clamped syllable duration (80ms).
  const winLen = Math.round(0.06 * sr);
  const totalDur = times[times.length - 1] ?? 0;

  return chosen.map((idx, i) => {
    const t = times[idx];
    const nextT = i + 1 < chosen.length ? times[chosen[i + 1]] : totalDur;
    const dur = Math.max(0.08, Math.min(1.0, nextT - t));

    const center = Math.round(t * sr);
    const start = Math.max(0, center - Math.floor(winLen / 2));
    const window = mono.subarray(start, Math.min(mono.length, start + winLen));
    const f0 = autocorrelationPitch(window, sr);

    return { t, dur, f0, rms: smoothed[idx] };
  });
}
