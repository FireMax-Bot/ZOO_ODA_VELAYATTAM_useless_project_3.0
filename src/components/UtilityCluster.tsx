import { Icon } from "./Icon";

interface UtilityClusterProps {
  muted: boolean;
  onToggleMute: () => void;
  onReset: () => void;
  resetDisabled?: boolean;
}

/** Small floating icon cluster, separate from the main 5-button row. */
export function UtilityCluster({ muted, onToggleMute, onReset, resetDisabled }: UtilityClusterProps) {
  return (
    <div className="intro-fade fixed right-4 top-4 z-20 flex gap-2.5" style={{ animationDelay: "1000ms" }}>
      <button
        onClick={onToggleMute}
        aria-label={muted ? "Unmute live meter" : "Mute live meter"}
        title={muted ? "Unmute live meter" : "Mute live meter"}
        className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/[0.14] text-white/90 shadow-2xl shadow-black/40 backdrop-blur-[220px] transition-all duration-150 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-95"
      >
        <Icon name={muted ? "mute" : "unmute"} size={20} />
      </button>
      <button
        onClick={onReset}
        disabled={resetDisabled}
        aria-label="Reset"
        title="Reset"
        className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/[0.14] text-white/90 shadow-2xl shadow-black/40 backdrop-blur-[220px] transition-all duration-150 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:brightness-100"
      >
        <Icon name="reset" size={20} />
      </button>
    </div>
  );
}
