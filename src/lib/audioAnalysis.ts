// Low-level DSP helpers shared by voiceEmotion.ts (whole-utterance prosody
// features) and prosody.ts (syllable onset detection). Everything here
// operates on plain Float32Array frames — no Web Audio nodes — so it runs
// synchronously over an already-decoded AudioBuffer.

/** Downmix an AudioBuffer to a single mono Float32Array. */
export function toMono(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels === 1) return buffer.getChannelData(0).slice();
  const out = new Float32Array(buffer.length);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < buffer.length; i++) out[i] += data[i] / buffer.numberOfChannels;
  }
  return out;
}

/** Simple linear-interpolation resampler — good enough for analysis, not playback. */
export function resampleLinear(
  samples: Float32Array,
  fromRate: number,
  toRate: number,
): Float32Array {
  if (fromRate === toRate) return samples;
  const ratio = fromRate / toRate;
  const outLength = Math.floor(samples.length / ratio);
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const srcPos = i * ratio;
    const i0 = Math.floor(srcPos);
    const i1 = Math.min(i0 + 1, samples.length - 1);
    const frac = srcPos - i0;
    out[i] = samples[i0] * (1 - frac) + samples[i1] * frac;
  }
  return out;
}

export interface FrameSet {
  frames: Float32Array[];
  /** Center time of each frame, in seconds from the start of the signal. */
  times: number[];
  hopSec: number;
}

export function frameSignal(
  samples: Float32Array,
  sampleRate: number,
  frameSec: number,
  hopSec: number,
): FrameSet {
  const frameLen = Math.round(frameSec * sampleRate);
  const hopLen = Math.round(hopSec * sampleRate);
  const frames: Float32Array[] = [];
  const times: number[] = [];
  for (let start = 0; start + frameLen <= samples.length; start += hopLen) {
    frames.push(samples.subarray(start, start + frameLen));
    times.push((start + frameLen / 2) / sampleRate);
  }
  return { frames, times, hopSec };
}

export function rms(frame: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < frame.length; i++) sum += frame[i] * frame[i];
  return Math.sqrt(sum / frame.length);
}

/**
 * Autocorrelation pitch detection with parabolic interpolation.
 * Returns 0 for frames that are too quiet or not periodic enough (unvoiced).
 */
export function autocorrelationPitch(
  frame: Float32Array,
  sampleRate: number,
  minHz = 70,
  maxHz = 400,
): number {
  const size = frame.length;
  const energy = rms(frame);
  if (energy < 0.01) return 0;

  const minLag = Math.max(1, Math.floor(sampleRate / maxHz));
  const maxLag = Math.min(size - 1, Math.floor(sampleRate / minHz));
  if (minLag >= maxLag) return 0;

  const corrAt = (lag: number): number => {
    let c = 0;
    const n = size - lag;
    for (let i = 0; i < n; i++) c += frame[i] * frame[i + lag];
    return c / n;
  };

  let bestLag = -1;
  let bestCorr = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    const c = corrAt(lag);
    if (c > bestCorr) {
      bestCorr = c;
      bestLag = lag;
    }
  }
  if (bestLag <= 0) return 0;

  const c0 = corrAt(Math.max(minLag, bestLag - 1));
  const c1 = bestCorr;
  const c2 = corrAt(Math.min(maxLag, bestLag + 1));
  const denom = c0 - 2 * c1 + c2;
  const shift = denom !== 0 ? (0.5 * (c0 - c2)) / denom : 0;
  const refinedLag = bestLag + shift;

  const zeroLagEnergy = corrAt(0);
  const confidence = zeroLagEnergy > 0 ? bestCorr / zeroLagEnergy : 0;
  if (confidence < 0.3) return 0;

  const freq = sampleRate / refinedLag;
  return freq >= minHz && freq <= maxHz ? freq : 0;
}

/** In-place iterative radix-2 Cooley-Tukey FFT. Length must be a power of 2. */
function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wRe = Math.cos(ang);
    const wIm = Math.sin(ang);
    for (let start = 0; start < n; start += len) {
      let curRe = 1;
      let curIm = 0;
      for (let k = 0; k < len / 2; k++) {
        const uRe = re[start + k];
        const uIm = im[start + k];
        const vRe = re[start + k + len / 2] * curRe - im[start + k + len / 2] * curIm;
        const vIm = re[start + k + len / 2] * curIm + im[start + k + len / 2] * curRe;
        re[start + k] = uRe + vRe;
        im[start + k] = uIm + vIm;
        re[start + k + len / 2] = uRe - vRe;
        im[start + k + len / 2] = uIm - vIm;
        const nextRe = curRe * wRe - curIm * wIm;
        const nextIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
        curIm = nextIm;
      }
    }
  }
}

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

/** Spectral centroid (Hz) — the "brightness" of a frame. */
export function spectralCentroid(frame: Float32Array, sampleRate: number): number {
  const n = nextPow2(frame.length);
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  re.set(frame);
  fft(re, im);

  let weightedSum = 0;
  let magSum = 0;
  const half = n / 2;
  for (let k = 0; k < half; k++) {
    const mag = Math.hypot(re[k], im[k]);
    const freq = (k * sampleRate) / n;
    weightedSum += freq * mag;
    magSum += mag;
  }
  return magSum > 0 ? weightedSum / magSum : 0;
}

export function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

export function variance(xs: number[]): number {
  if (xs.length === 0) return 0;
  const m = mean(xs);
  return mean(xs.map((x) => (x - m) ** 2));
}

export function hzToSemitones(hz: number, refHz = 100): number {
  return hz > 0 ? 12 * Math.log2(hz / refHz) : 0;
}
