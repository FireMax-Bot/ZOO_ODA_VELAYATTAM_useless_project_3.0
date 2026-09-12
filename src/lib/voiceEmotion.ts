import {
  autocorrelationPitch,
  frameSignal,
  hzToSemitones,
  mean,
  resampleLinear,
  rms,
  spectralCentroid,
  toMono,
  variance,
} from "./audioAnalysis";
import { detectSyllables } from "./prosody";
import { clamp } from "./emotionSpace";
import type { EmotionPoint, Syllable, VoiceFeatures } from "./types";

const ANALYSIS_RATE = 16000;
const FRAME_SEC = 0.025;
const HOP_SEC = 0.01;

/**
 * @param syllables Pass the result of `detectSyllables(buffer)` if the
 * caller already computed it, to avoid running onset detection twice.
 */
export function extractVoiceFeatures(buffer: AudioBuffer, syllables?: Syllable[]): VoiceFeatures {
  const mono16k = resampleLinear(toMono(buffer), buffer.sampleRate, ANALYSIS_RATE);
  const { frames, times } = frameSignal(mono16k, ANALYSIS_RATE, FRAME_SEC, HOP_SEC);

  if (frames.length === 0) {
    return {
      f0Mean: 0,
      f0RangeSemitones: 0,
      rmsMean: 0,
      rmsVariance: 0,
      syllableRate: 0,
      spectralCentroid: 0,
      pauseRatio: 1,
      f0TerminalSlope: 0,
    };
  }

  const rmsValues = frames.map(rms);
  const f0Values = frames.map((f) => autocorrelationPitch(f, ANALYSIS_RATE));

  const voiced = f0Values
    .map((f0, i) => ({ f0, t: times[i] }))
    .filter((x) => x.f0 > 0);

  const f0Mean = mean(voiced.map((v) => v.f0));
  const semitones = voiced.map((v) => hzToSemitones(v.f0));
  const f0RangeSemitones = Math.sqrt(variance(semitones));

  const centroids = frames
    .filter((_, i) => f0Values[i] > 0)
    .map((f) => spectralCentroid(f, ANALYSIS_RATE));

  const pauseRatio = 1 - voiced.length / frames.length;

  const duration = times[times.length - 1] ?? 0;
  const syllableCount = (syllables ?? detectSyllables(buffer)).length;
  const syllableRate = duration > 0 ? syllableCount / duration : 0;

  // Linear fit of pitch (semitones) vs time over the last 300ms of voiced speech.
  const windowStart = duration - 0.3;
  const tail = voiced.filter((v) => v.t >= windowStart);
  let f0TerminalSlope = 0;
  if (tail.length >= 2) {
    const ts = tail.map((v) => v.t);
    const sts = tail.map((v) => hzToSemitones(v.f0));
    const tMean = mean(ts);
    const sMean = mean(sts);
    let num = 0;
    let den = 0;
    for (let i = 0; i < tail.length; i++) {
      num += (ts[i] - tMean) * (sts[i] - sMean);
      den += (ts[i] - tMean) ** 2;
    }
    f0TerminalSlope = den > 0 ? num / den : 0;
  }

  return {
    f0Mean,
    f0RangeSemitones,
    rmsMean: mean(rmsValues),
    rmsVariance: variance(rmsValues),
    syllableRate,
    spectralCentroid: mean(centroids),
    pauseRatio,
    f0TerminalSlope,
  };
}

interface Stat {
  mean: number;
  std: number;
}

// Speaker-agnostic-ish placeholder constants for conversational speech.
// TUNE THESE during the hour 13-15 session using real recordings at the venue.
const STATS = {
  rms: { mean: 0.06, std: 0.04 } as Stat,
  f0Range: { mean: 4, std: 3 } as Stat,
  rate: { mean: 4, std: 1.5 } as Stat,
  centroid: { mean: 1500, std: 800 } as Stat,
  f0Mean: { mean: 150, std: 45 } as Stat,
  pauseRatio: { mean: 0.35, std: 0.15 } as Stat,
  f0Slope: { mean: 0, std: 8 } as Stat,
};

function z(x: number, stat: Stat): number {
  return clamp((x - stat.mean) / stat.std, -2.5, 2.5);
}

/**
 * Voice carries AROUSAL well (loudness, pitch range, speech rate all track
 * excitement reliably) and VALENCE poorly (a shout can be joy or rage).
 * The fusion step in fusion.ts deliberately trusts voice more for arousal
 * and the face more for valence — this is that asymmetry's source.
 */
export function voiceFeaturesToPoint(f: VoiceFeatures): EmotionPoint {
  const zRms = z(f.rmsMean, STATS.rms);
  const zF0Range = z(f.f0RangeSemitones, STATS.f0Range);
  const zRate = z(f.syllableRate, STATS.rate);
  const zCentroid = z(f.spectralCentroid, STATS.centroid);
  const zSlope = z(f.f0TerminalSlope, STATS.f0Slope);
  const zF0Mean = z(f.f0Mean, STATS.f0Mean);
  const zPause = z(f.pauseRatio, STATS.pauseRatio);

  const arousalRaw = 0.35 * zRms + 0.25 * zF0Range + 0.25 * zRate + 0.15 * zCentroid;
  const valenceRaw = 0.45 * zSlope + 0.3 * zF0Mean - 0.25 * zPause;

  return {
    arousal: clamp(arousalRaw / 2.5, -1, 1),
    valence: clamp(valenceRaw / 2.5, -1, 1),
  };
}
