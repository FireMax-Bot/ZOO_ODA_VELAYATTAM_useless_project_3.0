// Shared vocabulary used across the whole pipeline: capture -> face/voice
// emotion extraction -> fusion -> animal voice rendering.

export const EMOTIONS = ["happy", "angry", "sad"] as const;

export type Emotion = (typeof EMOTIONS)[number];

/** A point on Russell's valence/arousal circumplex, both in [-1, 1]. */
export interface EmotionPoint {
  valence: number;
  arousal: number;
}

/** Per-frame face read: probability-ish weight per emotion, 0..1 each. */
export type EmotionWeights = Record<Emotion, number>;

export interface FaceEmotionResult extends EmotionPoint {
  weights: EmotionWeights;
  /** Fraction of captured frames where a face was actually found, 0..1. */
  confidence: number;
}

export interface VoiceFeatures {
  f0Mean: number; // Hz
  f0RangeSemitones: number;
  rmsMean: number;
  rmsVariance: number;
  syllableRate: number; // syllables/sec
  spectralCentroid: number; // Hz
  pauseRatio: number; // 0..1
  f0TerminalSlope: number; // semitones/sec over last 300ms voiced
}

export type VoiceEmotionResult = EmotionPoint;

/** One detected syllable onset within the recorded utterance. */
export interface Syllable {
  /** Onset time in seconds from start of utterance. */
  t: number;
  /** Duration in seconds until the next onset or end of voiced region. */
  dur: number;
  /** Local pitch estimate in Hz (0 if unvoiced). */
  f0: number;
  /** Peak RMS energy in this syllable's window, 0..1-ish. */
  rms: number;
}

export interface FusionResult extends EmotionPoint {
  emotion: Emotion;
  intensity: number; // 0..1, how far from center on the circumplex
  faceConfidence: number;
}

export interface TranslationResult {
  fusion: FusionResult;
  syllables: Syllable[];
  /** The user's own recorded voice, decoded — kept so it can be played back. */
  humanAudioBuffer: AudioBuffer;
  renderedAudio: AudioBuffer;
  wavBlob: Blob;
}
