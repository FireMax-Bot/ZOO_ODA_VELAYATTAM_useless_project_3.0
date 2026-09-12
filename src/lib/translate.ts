import type { Animal } from "./animals";
import { aggregateFaceFrames, type FaceFrame } from "./faceEmotion";
import { extractVoiceFeatures, voiceFeaturesToPoint } from "./voiceEmotion";
import { detectSyllables } from "./prosody";
import { fuse } from "./fusion";
import { renderAnimalVoice } from "./animalVoice";
import { audioBufferToWav } from "./wav";
import type { TranslationResult } from "./types";

/**
 * The whole pipeline, run once on a finished recording: decode -> extract
 * face + voice emotion -> fuse -> segment syllables -> render the animal's
 * voice. Everything here is synchronous analysis of a completed buffer,
 * which is both simpler and more accurate than trying to do it live.
 */
export async function translate(
  audioBlob: Blob,
  faceFrames: FaceFrame[],
  animal: Animal,
): Promise<TranslationResult> {
  const decodeCtx = new AudioContext();
  let audioBuffer: AudioBuffer;
  try {
    const arrayBuffer = await audioBlob.arrayBuffer();
    audioBuffer = await decodeCtx.decodeAudioData(arrayBuffer);
  } finally {
    void decodeCtx.close();
  }

  const syllables = detectSyllables(audioBuffer);
  const voiceFeatures = extractVoiceFeatures(audioBuffer, syllables);
  const voicePoint = voiceFeaturesToPoint(voiceFeatures);
  const faceResult = aggregateFaceFrames(faceFrames);
  const fusion = fuse(faceResult, voicePoint);

  const renderedAudio = await renderAnimalVoice(animal, fusion.emotion, fusion.intensity, syllables);
  const wavBlob = audioBufferToWav(renderedAudio);

  return { fusion, syllables, humanAudioBuffer: audioBuffer, renderedAudio, wavBlob };
}
