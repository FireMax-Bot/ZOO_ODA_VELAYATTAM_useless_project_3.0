import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { EMOTIONS, type EmotionWeights, type FaceEmotionResult } from "./types";
import { clamp, weightsToPoint } from "./emotionSpace";

let landmarkerPromise: Promise<FaceLandmarker> | null = null;

/**
 * Lazily creates the singleton FaceLandmarker. Model + wasm are vendored
 * under /public so this works even with no internet at the venue.
 */
export function getFaceLandmarker(): Promise<FaceLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks("/wasm");
      return FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "/models/face_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        outputFaceBlendshapes: true,
        numFaces: 1,
      });
    })();
  }
  return landmarkerPromise;
}

function avg(a: number, b: number): number {
  return (a + b) / 2;
}

function normalize(w: EmotionWeights): EmotionWeights {
  const sum = EMOTIONS.reduce((s, e) => s + w[e], 0) || 1;
  const out = {} as EmotionWeights;
  for (const e of EMOTIONS) out[e] = w[e] / sum;
  return out;
}

// One clear physical gesture per emotion, instead of a multi-blendshape
// weighted formula. The old formula computed neutral = 1 - max(others),
// which meant neutral won almost every frame (ordinary expressions rarely
// push a blendshape near 1.0) and buried "sad" especially hard, since its
// main signal (mouth-frown) barely activates in MediaPipe's face model.
// A single strong, deliberate gesture per emotion is both easier to
// perform on demand and much harder for "neutral" to accidentally beat.
const ANGRY_THRESHOLD = 0.35; // browDown avg(L,R)
const SAD_THRESHOLD = 0.55; // min(eyeBlinkL, eyeBlinkR), after EMA smoothing
const HAPPY_THRESHOLD = 0.3; // mouthSmile avg(L,R)
const SMOOTHSTEP_WIDTH = 0.15;

/** Soft threshold: 0 below (threshold-width), 1 above (threshold+width), S-curve between. */
function smoothstep(x: number, threshold: number, width = SMOOTHSTEP_WIDTH): number {
  const t = clamp((x - (threshold - width)) / (2 * width), 0, 1);
  return t * t * (3 - 2 * t);
}

// A small floor so all-near-zero frames (a genuinely relaxed face) still
// normalize to *something* rather than dividing by ~0 — with no neutral
// bucket to catch weak signal, one of the 3 always has to win a frame.
const RESIDUAL_FLOOR = 0.02;

/**
 * Gesture-trigger scoring: angry = furrowed eyebrows, sad = both eyes held
 * shut, happy = smile. No neutral bucket — by request, one of the 3 always
 * wins each frame, weighted by how strongly it fired. Each trigger is a
 * smoothstep around a threshold (soft edge, not a hard cliff) with small
 * assist terms from related blendshapes. Fully transparent, zero training
 * data, and re-tunable in seconds if venue lighting throws it off.
 */
export function scoreBlendshapes(byName: Map<string, number>): EmotionWeights {
  const g = (n: string) => byName.get(n) ?? 0;

  const smile = avg(g("mouthSmileLeft"), g("mouthSmileRight"));
  const cheekSquint = avg(g("cheekSquintLeft"), g("cheekSquintRight"));
  const frown = avg(g("mouthFrownLeft"), g("mouthFrownRight"));
  const browDown = avg(g("browDownLeft"), g("browDownRight"));
  const noseSneer = avg(g("noseSneerLeft"), g("noseSneerRight"));
  const mouthPress = avg(g("mouthPressLeft"), g("mouthPressRight"));
  // min, not avg: a one-eyed wink should never register as "eyes closed".
  const eyesClosed = Math.min(g("eyeBlinkLeft"), g("eyeBlinkRight"));

  const raw: EmotionWeights = {
    angry: RESIDUAL_FLOOR + smoothstep(browDown, ANGRY_THRESHOLD) + 0.15 * noseSneer + 0.15 * mouthPress,
    sad: RESIDUAL_FLOOR + smoothstep(eyesClosed, SAD_THRESHOLD) + 0.15 * frown,
    happy: RESIDUAL_FLOOR + smoothstep(smile, HAPPY_THRESHOLD) + 0.1 * cheekSquint,
  };

  return normalize(raw);
}

export interface FaceFrame {
  t: number; // seconds from recording start
  weights: EmotionWeights | null; // null = no face found this frame
}

/** EMA-smooths a stream of per-frame weights; call once per detected frame. */
export class FaceEmotionSmoother {
  private smoothed: EmotionWeights | null = null;
  private readonly alpha: number;

  constructor(alpha = 0.3) {
    this.alpha = alpha;
  }

  push(weights: EmotionWeights): EmotionWeights {
    if (!this.smoothed) {
      this.smoothed = { ...weights };
      return this.smoothed;
    }
    const out = {} as EmotionWeights;
    for (const e of EMOTIONS) {
      out[e] = this.alpha * weights[e] + (1 - this.alpha) * this.smoothed[e];
    }
    this.smoothed = out;
    return out;
  }
}

/**
 * Aggregates a whole recording window into one result using a peak-weighted
 * mean: each frame is weighted by how strongly its own winning emotion
 * fired (squared, to sharpen the contrast), so a clearly-held gesture
 * dominates the result even across a few ambiguous/transitional frames.
 * There's no neutral bucket to fall back on here — every frame already
 * resolved to one of the 3 real emotions in `scoreBlendshapes`.
 */
export function aggregateFaceFrames(frames: FaceFrame[]): FaceEmotionResult {
  const withFace = frames.filter((f) => f.weights !== null) as {
    t: number;
    weights: EmotionWeights;
  }[];

  const confidence = frames.length > 0 ? withFace.length / frames.length : 0;

  if (withFace.length === 0) {
    // No face seen the whole recording — flat/ambiguous; fusion.ts treats
    // confidence === 0 as "ignore this, use voice instead".
    const flat = normalize({ happy: 1, sad: 1, angry: 1 });
    return { weights: flat, valence: 0, arousal: 0, confidence: 0 };
  }

  let totalWeight = 0;
  const acc: EmotionWeights = { happy: 0, sad: 0, angry: 0 };

  for (const { weights } of withFace) {
    const dominant = Math.max(weights.happy, weights.sad, weights.angry);
    const salience = dominant * dominant;
    totalWeight += salience;
    for (const e of EMOTIONS) acc[e] += weights[e] * salience;
  }

  const meanWeights =
    totalWeight > 0
      ? normalize(Object.fromEntries(EMOTIONS.map((e) => [e, acc[e] / totalWeight])) as EmotionWeights)
      : normalize({ happy: 1, sad: 1, angry: 1 });

  const point = weightsToPoint(meanWeights);
  return { weights: meanWeights, valence: point.valence, arousal: point.arousal, confidence };
}
