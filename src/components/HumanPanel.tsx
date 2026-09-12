import { GlassPanel } from "./GlassPanel";
import { Icon } from "./Icon";
import { Waveform } from "./Waveform";
import type { Syllable } from "../lib/types";

interface HumanPanelProps {
  buffer: AudioBuffer | null;
  syllables?: Syllable[];
  onPlay?: () => void;
}

// Taller than the animal panel's waveform alone — this column lost its
// (non-functional) transcript box, so the waveform grows to fill the space
// and keep both columns roughly the same height.
export function HumanPanel({ buffer, syllables, onPlay }: HumanPanelProps) {
  return (
    <div className="flex flex-col gap-3">
      <GlassPanel className="px-5 py-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-white/45">Your Voice</p>
        <Waveform buffer={buffer} syllables={syllables} color="#7dd3fc" dotColor="#e9c46a" height={140} />
      </GlassPanel>

      <button
        onClick={onPlay}
        disabled={!onPlay}
        aria-label="Play your recording"
        className="flex h-12 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[0.14] text-base font-medium text-white/90 shadow-xl shadow-black/40 backdrop-blur-[220px] transition-all duration-150 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Icon name="play" size={18} /> Your voice
      </button>
    </div>
  );
}
