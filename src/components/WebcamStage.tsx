import { forwardRef } from "react";
import { EMOTIONS, type EmotionWeights } from "../lib/types";
import { Icon } from "./Icon";
import type { PixelIconName } from "./PixelIcon";

interface WebcamStageProps {
  isRecording: boolean;
  level: number; // 0..1
  faceDetected: boolean | null; // null = unknown (not recording yet)
  liveWeights: EmotionWeights | null;
}

const EMOTION_BADGE: Record<string, { icon: PixelIconName; label: string }> = {
  happy: { icon: "face-happy", label: "Happy" },
  angry: { icon: "face-angry", label: "Angry" },
  sad: { icon: "face-sad", label: "Sad" },
};

function dominantEmotion(weights: EmotionWeights | null): string | null {
  if (!weights) return null;
  let best: string = EMOTIONS[0];
  let bestVal = -Infinity;
  for (const e of EMOTIONS) {
    if (weights[e] > bestVal) {
      bestVal = weights[e];
      best = e;
    }
  }
  return best;
}

export const WebcamStage = forwardRef<HTMLVideoElement, WebcamStageProps>(
  function WebcamStage({ isRecording, level, faceDetected, liveWeights }, ref) {
    const dominant = dominantEmotion(liveWeights);
    const badge = dominant ? EMOTION_BADGE[dominant] : null;

    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/20 bg-black/55 shadow-2xl shadow-black/50 backdrop-blur-[220px]">
        <video ref={ref} className="h-full w-full -scale-x-100 object-cover" playsInline muted />

        {isRecording && (
          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full border border-white/20 bg-black/45 px-3.5 py-1.5 text-sm font-medium text-white/95 backdrop-blur-md">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500" />
            REC
          </div>
        )}

        {/* Emotion badge: a live readout, not instructions — see EmotionLegend for those. */}
        {faceDetected !== null && (
          <div className="absolute right-3 top-3 flex items-center gap-2 rounded-full border border-white/20 bg-black/45 px-3.5 py-1.5 text-sm font-medium text-white/95 backdrop-blur-md transition-all">
            {faceDetected && badge ? (
              <>
                <Icon name={badge.icon} size={18} />
                {badge.label}
              </>
            ) : (
              <>
                <Icon name="face-happy" size={18} className="opacity-40" />
                no face
              </>
            )}
          </div>
        )}

        <div className="absolute inset-x-3 bottom-3 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-emerald-700/80 transition-[width] duration-75"
            style={{ width: `${Math.min(100, level * 220)}%` }}
          />
        </div>
      </div>
    );
  },
);
