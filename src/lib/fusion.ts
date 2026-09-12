import { EMOTIONS } from "./types";
import { clamp, nearestEmotion } from "./emotionSpace";
import type { Emotion, EmotionPoint, FaceEmotionResult, FusionResult } from "./types";

/**
 * The face gesture is the sole decider of *which* emotion plays — Happy,
 * Angry, or Sad, whichever the face weights favor most — as long as a face
 * was seen at all during the recording. Voice no longer gets a vote on the
 * category: it used to (blended into a circumplex point, 60% arousal
 * weight), and that diluted a clean, deliberate gesture with whatever your
 * voice happened to be doing — a person talking at normal volume with
 * their eyes closed has "normal" arousal, which pulled the blended point
 * away from sad's corner and toward a wrong answer. Voice still shapes how
 * *intense* the render is via `intensity` below, just not which one plays.
 *
 * Falls back to a voice-only read (nearest of the 3 prototypes) only when
 * no face was ever detected the whole recording (camera covered) —
 * `face.confidence === 0`.
 */
export function fuse(face: FaceEmotionResult, voice: EmotionPoint): FusionResult {
  const faceConf = face.confidence;

  let emotion: Emotion = EMOTIONS[0];
  let best = -Infinity;
  for (const e of EMOTIONS) {
    if (face.weights[e] > best) {
      best = face.weights[e];
      emotion = e;
    }
  }

  const usingVoiceFallback = faceConf === 0;
  if (usingVoiceFallback) {
    emotion = nearestEmotion(voice);
  }

  // Intensity blends face + voice arousal/valence magnitude — still a
  // genuine fusion, just for "how hard to push the render", not "which".
  const valence = usingVoiceFallback ? voice.valence : 0.6 * face.valence + 0.4 * voice.valence;
  const arousal = usingVoiceFallback ? voice.arousal : 0.4 * face.arousal + 0.6 * voice.arousal;
  const intensity = clamp(Math.hypot(valence, arousal), 0, 1);

  return { valence, arousal, emotion, intensity, faceConfidence: faceConf };
}
