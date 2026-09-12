import { GlassPanel } from "./GlassPanel";
import { Icon } from "./Icon";

/** Static instructional key — teaches the 3 gestures before recording, as
 * opposed to WebcamStage's badge, which is the live readout. */
export function EmotionLegend() {
  return (
    <GlassPanel className="px-5 py-3.5">
      <p className="mb-2 text-center text-xs font-medium uppercase tracking-wide text-white/45">
        Show us how you feel
      </p>
      <div className="flex flex-wrap items-center justify-center gap-5 text-base text-white/85">
        <span className="flex items-center gap-2">
          <Icon name="face-angry" size={22} /> Furrow brows
        </span>
        <span className="flex items-center gap-2">
          <Icon name="face-sad" size={22} /> Close your eyes
        </span>
        <span className="flex items-center gap-2">
          <Icon name="face-happy" size={22} /> Smile
        </span>
      </div>
    </GlassPanel>
  );
}
