import { useMemo } from "react";
import { generateGloss } from "../lib/gloss";
import type { TranslationResult } from "../lib/types";
import { GlassPanel } from "./GlassPanel";
import { Icon } from "./Icon";
import { Waveform } from "./Waveform";

interface AnimalPanelProps {
  result: TranslationResult | null;
  animalId: string;
  onPlay?: () => void;
}

const EMOTION_LABEL: Record<string, string> = {
  happy: "Happy",
  angry: "Angry",
  sad: "Sad",
};

export function AnimalPanel({ result, animalId, onPlay }: AnimalPanelProps) {
  const gloss = useMemo(
    () => (result ? generateGloss(animalId, result.fusion.emotion, result.syllables.length) : null),
    [result, animalId],
  );
  const downloadUrl = useMemo(() => (result ? URL.createObjectURL(result.wavBlob) : null), [result]);

  return (
    <div className="flex flex-col gap-3">
      <GlassPanel className="min-h-[100px] px-5 py-4">
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-white/45">Animal says</p>
        {result ? (
          <p className="text-xl font-bold tracking-wide text-white/95">{gloss}</p>
        ) : (
          <p className="text-base text-white/40">Waiting for a recording&hellip;</p>
        )}
        {result && (
          <p className="mt-1 text-sm text-white/55">
            {EMOTION_LABEL[result.fusion.emotion]} &middot; {result.syllables.length} syllables
          </p>
        )}
      </GlassPanel>

      <GlassPanel className="px-5 py-4">
        <Waveform buffer={result?.renderedAudio ?? null} color="#6ea88f" height={64} />
      </GlassPanel>

      <div className="flex gap-2">
        <button
          onClick={onPlay}
          disabled={!onPlay}
          aria-label="Play animal sound"
          className="flex h-12 flex-1 items-center justify-center rounded-xl border border-white/20 bg-white/[0.14] text-white/90 shadow-xl shadow-black/40 backdrop-blur-[220px] transition-all duration-150 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Icon name="play" size={18} />
        </button>
        {downloadUrl && result ? (
          <a
            href={downloadUrl}
            download={`${animalId}-${result.fusion.emotion}.wav`}
            aria-label="Download WAV"
            className="flex h-12 flex-1 items-center justify-center rounded-xl border border-white/20 bg-white/[0.14] text-white/90 shadow-xl shadow-black/40 backdrop-blur-[220px] transition-all duration-150 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-95"
          >
            <Icon name="download" size={18} />
          </a>
        ) : (
          <span className="flex h-12 flex-1 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/25">
            <Icon name="download" size={18} />
          </span>
        )}
      </div>
    </div>
  );
}
