import type { Emotion } from "./types";
import type { EmotionPreset } from "./animalVoice";

/** Which sound "type" (bark/growl/whimper/...) plays for a given emotion. */
export interface AnimalCallSpec {
  /** Type used for the per-syllable calls. */
  syllable: string;
  /** Optional type played once, quietly, under the whole utterance. */
  bed?: string;
  /** Optional type played once at the very end (uses a `long` clip). */
  tail?: string;
}

export interface AnimalClipSet {
  short: string[];
  long: string[];
}

export interface Animal {
  id: string;
  name: string;
  emoji: string;
  /** Type used when the mapped type for an emotion has no available clips. */
  neutralType: string;
  /**
   * How many detected syllables share one animal call.
   * 1 = a call per syllable (dog, cat). Higher = sparser, more natural
   * for animals that don't vocalize as rapidly as human speech.
   */
  callEvery: number;
  /**
   * true = ignore syllable timing entirely and call once per
   * pause-delimited phrase instead (cow).
   */
  phraseLevel?: boolean;
  emotionMap: Record<Emotion, AnimalCallSpec>;
  clips: Record<string, AnimalClipSet>;
  /** Per-emotion overrides on top of the shared preset — a bark and a hiss
   * shouldn't get identical distortion/timeScale just because both map to
   * the same emotion. */
  presetOverrides?: Partial<Record<Emotion, Partial<EmotionPreset>>>;
}

/** public/sounds/<animalId>/<type>_0.mp3 .. <type>_(n-1).mp3 */
function shortPaths(animalId: string, type: string, count: number): string[] {
  return Array.from(
    { length: count },
    (_, i) => `/sounds/${animalId}/${type}_${i}.mp3`,
  );
}

/** public/sounds/<animalId>/<type>_long_0.mp3 .. */
function longPaths(animalId: string, type: string, count: number): string[] {
  return Array.from(
    { length: count },
    (_, i) => `/sounds/${animalId}/${type}_long_${i}.mp3`,
  );
}

function clipSet(
  animalId: string,
  type: string,
  shortCount: number,
  longCount = 0,
): AnimalClipSet {
  return {
    short: shortPaths(animalId, type, shortCount),
    long: longPaths(animalId, type, longCount),
  };
}

export const ANIMALS: Animal[] = [
  {
    id: "dog",
    name: "Dog",
    emoji: "🐕",
    neutralType: "bark",
    callEvery: 1,
    emotionMap: {
      happy: { syllable: "yip" },
      angry: { syllable: "aggro", bed: "growl" },
      sad: { syllable: "whimper", tail: "howl" },
    },
    clips: {
      bark: clipSet("dog", "bark", 4, 1),
      yip: clipSet("dog", "yip", 3),
      aggro: clipSet("dog", "aggro", 5),
      growl: clipSet("dog", "growl", 0, 2),
      whimper: clipSet("dog", "whimper", 3),
      howl: clipSet("dog", "howl", 0, 2),
    },
  },
  {
    id: "cat",
    name: "Cat",
    emoji: "🐈",
    neutralType: "meow",
    callEvery: 1,
    emotionMap: {
      happy: { syllable: "trill", bed: "purr" },
      // Hiss only — no distorted yowl tail, which was the "sounds like a
      // lion" culprit. See presetOverrides below for the matching distortion fix.
      angry: { syllable: "hiss" },
      sad: { syllable: "mew" },
    },
    clips: {
      meow: clipSet("cat", "meow", 4, 1),
      trill: clipSet("cat", "trill", 3),
      purr: clipSet("cat", "purr", 0, 1),
      hiss: clipSet("cat", "hiss", 4),
      yowl: clipSet("cat", "yowl", 0, 2),
      mew: clipSet("cat", "mew", 4),
    },
    presetOverrides: {
      // Hiss is noise, not a tone — chasing the human voice's pitch on it
      // (the 0.6 default) just produced random-sounding pitch jumps rather
      // than anger. Dialed way down; a little is kept for liveliness.
      angry: { distortion: 0, filter: { type: "bandpass", freq: 3500 }, pitchTracking: 0.15 },
    },
  },
  {
    id: "goat",
    name: "Goat",
    emoji: "🐐",
    neutralType: "bleat",
    callEvery: 2,
    emotionMap: {
      happy: { syllable: "bleat" },
      angry: { syllable: "scream" },
      sad: { syllable: "lowbleat", tail: "lowbleat" },
    },
    clips: {
      bleat: clipSet("goat", "bleat", 4),
      scream: clipSet("goat", "scream", 4),
      lowbleat: clipSet("goat", "lowbleat", 2, 1),
    },
  },
  {
    id: "cow",
    name: "Cow",
    emoji: "🐄",
    neutralType: "moo",
    callEvery: 1,
    phraseLevel: true,
    emotionMap: {
      happy: { syllable: "moo", tail: "moo" },
      angry: { syllable: "bellow" },
      sad: { syllable: "lowmoo" },
    },
    clips: {
      moo: clipSet("cow", "moo", 3, 1),
      bellow: clipSet("cow", "bellow", 3),
      lowmoo: clipSet("cow", "lowmoo", 2),
    },
  },
];

export function getAnimal(id: string): Animal {
  const animal = ANIMALS.find((a) => a.id === id);
  if (!animal) throw new Error(`Unknown animal: ${id}`);
  return animal;
}
