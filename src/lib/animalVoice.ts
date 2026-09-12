import { clamp } from "./emotionSpace";
import type { Animal } from "./animals";
import type { Emotion, Syllable } from "./types";

export interface ResolvedClipSet {
  short: AudioBuffer[];
  long: AudioBuffer[];
}

export type ResolvedClipBank = Record<string, ResolvedClipSet>;

// ---------------------------------------------------------------------------
// Clip loading (with in-memory caching + graceful fallback for missing files)
// ---------------------------------------------------------------------------

let decodeCtx: AudioContext | null = null;
function getDecodeContext(): AudioContext {
  if (!decodeCtx) decodeCtx = new AudioContext();
  return decodeCtx;
}

const clipBankCache = new Map<string, Promise<ResolvedClipBank>>();

async function loadOne(ctx: AudioContext, path: string): Promise<AudioBuffer | null> {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return await ctx.decodeAudioData(arrayBuffer);
  } catch {
    return null; // missing clip is fine — the caller falls back
  }
}

async function loadMany(ctx: AudioContext, paths: string[]): Promise<AudioBuffer[]> {
  const results = await Promise.all(paths.map((p) => loadOne(ctx, p)));
  return results.filter((b): b is AudioBuffer => b !== null);
}

async function buildClipBank(animal: Animal): Promise<ResolvedClipBank> {
  const ctx = getDecodeContext();
  const bank: ResolvedClipBank = {};
  await Promise.all(
    Object.entries(animal.clips).map(async ([type, set]) => {
      const [short, long] = await Promise.all([loadMany(ctx, set.short), loadMany(ctx, set.long)]);
      bank[type] = { short, long };
    }),
  );
  return bank;
}

/**
 * Loads (and caches) every available clip for an animal. Missing files are
 * silently dropped — so the app works the moment even one clip per animal
 * exists, and gets richer as more land in public/sounds.
 */
export function loadAnimalClips(animal: Animal): Promise<ResolvedClipBank> {
  let cached = clipBankCache.get(animal.id);
  if (!cached) {
    cached = buildClipBank(animal);
    clipBankCache.set(animal.id, cached);
  }
  return cached;
}

function hasClips(bank: ResolvedClipBank, type: string | undefined): type is string {
  return !!type && !!bank[type] && (bank[type].short.length > 0 || bank[type].long.length > 0);
}

function resolveType(bank: ResolvedClipBank, type: string | undefined, fallback: string): string {
  if (hasClips(bank, type)) return type;
  if (hasClips(bank, fallback)) return fallback;
  // Last resort: whatever type in the bank has anything at all.
  const anyType = Object.keys(bank).find((t) => hasClips(bank, t));
  if (anyType) return anyType;
  throw new Error(`No sound clips loaded for this animal at all — check public/sounds.`);
}

// ---------------------------------------------------------------------------
// Emotion -> rendering presets
// ---------------------------------------------------------------------------

export interface EmotionPreset {
  rate: number;
  jitter: number;
  gain: number;
  timeScale: number;
  filter?: { type: BiquadFilterType; freq: number };
  distortion?: number;
  tremolo?: { freq: number; depth: number };
  reverb?: boolean;
  /**
   * How much a syllable's pitch (relative to the utterance) bends this
   * call's playback rate, 0..1. Defaults to 0.6 when omitted. Tonal calls
   * (barks, moos, meows) want the default so they audibly follow your
   * voice's contour; noise-like calls (a hiss has no real "pitch") should
   * dial this down, or full pitch-tracking just reads as random, wrong
   * pitch jumps instead of anger.
   */
  pitchTracking?: number;
}

const EMOTION_PRESETS: Record<Emotion, EmotionPreset> = {
  happy: { rate: 1.25, jitter: 0.12, gain: 0.9, timeScale: 0.85, filter: { type: "highpass", freq: 200 } },
  angry: { rate: 1.35, jitter: 0.05, gain: 1.0, timeScale: 0.65, distortion: 40 },
  sad: { rate: 0.72, jitter: 0.03, gain: 0.55, timeScale: 1.6, filter: { type: "lowpass", freq: 1200 }, reverb: true },
};

/** Merges an animal's per-emotion override (if any) over the shared preset —
 * a bark and a hiss shouldn't get identical distortion just because both
 * map to "angry". */
function resolvePreset(animal: Animal, emotion: Emotion): EmotionPreset {
  const base = EMOTION_PRESETS[emotion];
  const override = animal.presetOverrides?.[emotion];
  return override ? { ...base, ...override } : base;
}

// ---------------------------------------------------------------------------
// Small DSP helpers
// ---------------------------------------------------------------------------

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function makeDistortionCurve(amount: number): Float32Array {
  const n = 44100;
  const curve = new Float32Array(n);
  const deg = Math.PI / 180;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
  }
  return curve;
}

function makeImpulseResponse(ctx: OfflineAudioContext, durationSec: number, decay: number): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(rate * durationSec));
  const impulse = ctx.createBuffer(2, length, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return impulse;
}

/** Picks a random clip, avoiding an immediate repeat of the last one played. */
function pickClip(list: AudioBuffer[], lastIndex: { current: number }): AudioBuffer {
  if (list.length === 1) {
    lastIndex.current = 0;
    return list[0];
  }
  let idx = Math.floor(Math.random() * list.length);
  if (idx === lastIndex.current) idx = (idx + 1) % list.length;
  lastIndex.current = idx;
  return list[idx];
}

/** Which syllable indices actually get an animal call, per animal.callEvery / phraseLevel. */
function selectCallIndices(animal: Animal, syllables: Syllable[]): number[] {
  if (syllables.length === 0) return [];

  if (animal.phraseLevel) {
    const phraseStarts: number[] = [0];
    for (let i = 1; i < syllables.length; i++) {
      const gap = syllables[i].t - (syllables[i - 1].t + syllables[i - 1].dur);
      if (gap > 0.4) phraseStarts.push(i);
    }
    return phraseStarts;
  }

  const indices: number[] = [];
  for (let i = 0; i < syllables.length; i += Math.max(1, animal.callEvery)) indices.push(i);
  return indices;
}

interface ScheduleOptions {
  startTime: number;
  playbackRate: number;
  gain: number;
  preset: EmotionPreset;
}

function scheduleCall(
  ctx: OfflineAudioContext,
  master: AudioNode,
  convolver: ConvolverNode | undefined,
  buffer: AudioBuffer,
  opts: ScheduleOptions,
): void {
  const { startTime, playbackRate, gain, preset } = opts;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = playbackRate;

  let node: AudioNode = src;

  if (preset.distortion) {
    const shaper = ctx.createWaveShaper();
    shaper.curve = makeDistortionCurve(preset.distortion) as Float32Array<ArrayBuffer>;
    shaper.oversample = "2x";
    node.connect(shaper);
    node = shaper;
  }

  if (preset.filter) {
    const biquad = ctx.createBiquadFilter();
    biquad.type = preset.filter.type;
    biquad.frequency.value = preset.filter.freq;
    node.connect(biquad);
    node = biquad;
  }

  const gainNode = ctx.createGain();
  gainNode.gain.value = gain;
  node.connect(gainNode);
  node = gainNode;

  const clipDuration = buffer.duration / playbackRate;

  if (preset.tremolo) {
    const lfo = ctx.createOscillator();
    lfo.frequency.value = preset.tremolo.freq;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = gain * preset.tremolo.depth;
    lfo.connect(lfoGain);
    lfoGain.connect(gainNode.gain);
    lfo.start(Math.max(0, startTime));
    lfo.stop(Math.max(0, startTime) + clipDuration + 0.1);
  }

  node.connect(master);

  if (convolver) {
    const send = ctx.createGain();
    send.gain.value = gain * 0.4;
    node.connect(send);
    send.connect(convolver);
  }

  src.start(Math.max(0, startTime));
}

function makeNoiseBuffer(ctx: OfflineAudioContext, durationSec: number): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * durationSec));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/**
 * A short synthesized noise burst (band-limited white noise, no audio file)
 * layered under the loudest moments of an angry-cat utterance — a "spit"
 * texture that doesn't rely on distortion, which is what made the hiss/yowl
 * clips sound like a lion instead of a cat.
 */
function scheduleNoiseBurst(ctx: OfflineAudioContext, master: AudioNode, startTime: number, gain: number): void {
  const durationSec = 0.09;
  const src = ctx.createBufferSource();
  src.buffer = makeNoiseBuffer(ctx, durationSec);

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.value = 4500; // hiss/spit register
  bandpass.Q.value = 0.7;

  const g = ctx.createGain();
  const t0 = Math.max(0, startTime);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
  g.gain.linearRampToValueAtTime(0, t0 + durationSec);

  src.connect(bandpass);
  bandpass.connect(g);
  g.connect(master);
  src.start(t0);
}

function scheduleBed(
  ctx: OfflineAudioContext,
  master: AudioNode,
  buffer: AudioBuffer,
  gain: number,
  totalDurSec: number,
): void {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;

  const g = ctx.createGain();
  const fade = Math.min(0.3, totalDurSec / 4);
  g.gain.setValueAtTime(0, 0);
  g.gain.linearRampToValueAtTime(gain, fade);
  g.gain.setValueAtTime(gain, Math.max(fade, totalDurSec - fade));
  g.gain.linearRampToValueAtTime(0, totalDurSec);

  src.connect(g);
  g.connect(master);
  src.start(0);
  src.stop(totalDurSec);
}

// ---------------------------------------------------------------------------
// Main render
// ---------------------------------------------------------------------------

const SAMPLE_RATE = 44100;

/**
 * Renders the full translated utterance into one AudioBuffer via an
 * OfflineAudioContext, so the exact same graph produces both the "play"
 * button and the downloadable WAV.
 */
export async function renderAnimalVoice(
  animal: Animal,
  emotion: Emotion,
  intensity: number,
  syllables: Syllable[],
): Promise<AudioBuffer> {
  const bank = await loadAnimalClips(animal);
  const preset = resolvePreset(animal, emotion);
  const spec = animal.emotionMap[emotion];

  const syllableType = resolveType(bank, spec.syllable, animal.neutralType);
  const bedType = spec.bed && hasClips(bank, spec.bed) ? spec.bed : undefined;
  const tailType = spec.tail && hasClips(bank, spec.tail) ? spec.tail : undefined;

  const callIndices = selectCallIndices(animal, syllables);

  const lastEnd = syllables.length ? syllables[syllables.length - 1].t + syllables[syllables.length - 1].dur : 1;
  const renderDurSec = Math.max(1, lastEnd * preset.timeScale + 1.5);

  const offlineCtx = new OfflineAudioContext(2, Math.ceil(renderDurSec * SAMPLE_RATE), SAMPLE_RATE);

  const master = offlineCtx.createGain();
  master.gain.value = 1;
  const compressor = offlineCtx.createDynamicsCompressor();
  master.connect(compressor);
  compressor.connect(offlineCtx.destination);

  let convolver: ConvolverNode | undefined;
  if (preset.reverb) {
    convolver = offlineCtx.createConvolver();
    convolver.buffer = makeImpulseResponse(offlineCtx, 1.4, 2.2);
    convolver.connect(master);
  }

  if (callIndices.length > 0) {
    const voicedF0 = syllables.map((s) => s.f0).filter((f) => f > 0);
    const medianF0 = median(voicedF0) || 150;
    const maxRms = Math.max(...syllables.map((s) => s.rms), 0.0001);

    const lastShortIdx = { current: -1 };
    const lastLongIdx = { current: -1 };

    callIndices.forEach((si, ci) => {
      const syl = syllables[si];
      const isLast = ci === callIndices.length - 1;

      let clipBuffer: AudioBuffer;
      if (isLast && tailType && bank[tailType].long.length > 0) {
        clipBuffer = pickClip(bank[tailType].long, lastLongIdx);
      } else {
        const set = bank[syllableType];
        const pool = set.short.length > 0 ? set.short : set.long;
        clipBuffer = pickClip(pool, lastShortIdx);
      }

      const semitoneDelta = syl.f0 > 0 ? 12 * Math.log2(syl.f0 / medianF0) : 0;
      const pitchRatio = Math.pow(2, (semitoneDelta * (preset.pitchTracking ?? 0.6)) / 12);
      const jitterAmt = 1 + (Math.random() * 2 - 1) * preset.jitter;

      const playbackRate = clamp(preset.rate * pitchRatio * jitterAmt, 0.45, 2.2);
      const gain = preset.gain * (0.5 + 0.5 * (syl.rms / maxRms)) * (0.7 + 0.3 * intensity);
      const startTime = syl.t * preset.timeScale;

      scheduleCall(offlineCtx, master, convolver, clipBuffer, { startTime, playbackRate, gain, preset });
    });

    if (bedType) {
      const set = bank[bedType];
      const pool = set.long.length > 0 ? set.long : set.short;
      if (pool.length > 0) {
        const bedClip = pickClip(pool, { current: -1 });
        scheduleBed(offlineCtx, master, bedClip, 0.25 * preset.gain, renderDurSec);
      }
    }

    if (animal.id === "cat" && emotion === "angry") {
      const loudest = callIndices
        .map((si) => syllables[si])
        .sort((a, b) => b.rms - a.rms)
        .slice(0, 2);
      for (const syl of loudest) {
        scheduleNoiseBurst(offlineCtx, master, syl.t * preset.timeScale, preset.gain * 0.8);
      }
    }
  }

  return offlineCtx.startRendering();
}

// ---------------------------------------------------------------------------
// Playback (separate live AudioContext, since Offline only renders)
// ---------------------------------------------------------------------------

let playbackCtx: AudioContext | null = null;
function getPlaybackContext(): AudioContext {
  if (!playbackCtx) playbackCtx = new AudioContext();
  return playbackCtx;
}

/** Plays a rendered AudioBuffer. Must be called from a user-gesture handler
 * the first time, so the browser's autoplay policy doesn't block it. */
export async function playBuffer(buffer: AudioBuffer): Promise<void> {
  const ctx = getPlaybackContext();
  if (ctx.state === "suspended") await ctx.resume();
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.connect(ctx.destination);
  src.start();
}
