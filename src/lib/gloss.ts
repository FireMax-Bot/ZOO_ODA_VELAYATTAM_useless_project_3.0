import type { Emotion } from "./types";

const GLOSS_WORDS: Record<string, string> = {
  dog: "Woof",
  cat: "Meow",
  goat: "Bleh",
  cow: "Moo",
};

/**
 * Turns "you spoke N syllables, feeling X" into a silly caption like
 * "WOOF! WOOF! woof..." — purely for the result card, not the audio engine.
 */
export function generateGloss(animalId: string, emotion: Emotion, syllableCount: number): string {
  const word = GLOSS_WORDS[animalId] ?? "Grr";
  const n = Math.max(1, Math.min(syllableCount, 12));

  const parts: string[] = [];
  for (let i = 0; i < n; i++) {
    let w = word;
    if (emotion === "angry") w = `${w.toUpperCase()}!`;
    else if (emotion === "sad") w = `${w.toLowerCase()}...`;
    else if (emotion === "happy") w = Math.random() < 0.4 ? `${w}!` : w;
    parts.push(w);
  }
  return parts.join(" ");
}
