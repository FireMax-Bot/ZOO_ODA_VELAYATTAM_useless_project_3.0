import { EMOTIONS, type Emotion, type EmotionPoint, type EmotionWeights } from "./types";

/** Prototype coordinates on Russell's valence/arousal circumplex. */
export const EMOTION_POINTS: Record<Emotion, EmotionPoint> = {
  happy: { valence: 0.8, arousal: 0.6 },
  angry: { valence: -0.7, arousal: 0.8 },
  sad: { valence: -0.7, arousal: -0.5 },
};

/** Weighted centroid of the emotion prototypes, weighted by `weights`. */
export function weightsToPoint(weights: EmotionWeights): EmotionPoint {
  let valence = 0;
  let arousal = 0;
  let total = 0;
  for (const e of EMOTIONS) {
    const w = weights[e];
    valence += w * EMOTION_POINTS[e].valence;
    arousal += w * EMOTION_POINTS[e].arousal;
    total += w;
  }
  if (total <= 0) return { valence: 0, arousal: 0 };
  return { valence: valence / total, arousal: arousal / total };
}

/** Closest emotion prototype to an arbitrary (valence, arousal) point. */
export function nearestEmotion(point: EmotionPoint): Emotion {
  let best: Emotion = "happy";
  let bestDist = Infinity;
  for (const e of EMOTIONS) {
    const p = EMOTION_POINTS[e];
    const d = (p.valence - point.valence) ** 2 + (p.arousal - point.arousal) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = e;
    }
  }
  return best;
}

export function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}
