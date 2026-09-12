import { ANIMALS, type Animal } from "../lib/animals";
import { GlassPanel } from "./GlassPanel";
import { Icon } from "./Icon";
import type { PixelIconName } from "./PixelIcon";

export type RecordPhase = "idle" | "recording" | "processing";

interface ControlPanelProps {
  selectedId: string;
  onSelect: (id: string) => void;
  phase: RecordPhase;
  onRecordClick: () => void;
}

function AnimalButton({
  animal,
  selected,
  disabled,
  onSelect,
}: {
  animal: Animal;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      aria-label={`Select ${animal.name}`}
      aria-pressed={selected}
      className={`flex h-16 w-16 items-center justify-center rounded-2xl border text-white/90 shadow-2xl shadow-black/40 backdrop-blur-[220px] transition-all duration-150 will-change-transform hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:brightness-100 ${
        selected
          ? "border-emerald-600/50 bg-emerald-800/30 ring-2 ring-emerald-600/40"
          : "border-white/20 bg-white/[0.14] hover:bg-white/[0.2]"
      }`}
    >
      <Icon name={animal.id as PixelIconName} size={28} />
    </button>
  );
}

function byId(id: string): Animal {
  const found = ANIMALS.find((a) => a.id === id);
  if (!found) throw new Error(`Unknown animal: ${id}`);
  return found;
}

// Display order matches the reference layout: Cat, Dog | Mic | Cow, Goat.
// Purely presentational — doesn't touch the ANIMALS data order.
const LEFT_IDS = ["cat", "dog"];
const RIGHT_IDS = ["cow", "goat"];

export function ControlPanel({ selectedId, onSelect, phase, onRecordClick }: ControlPanelProps) {
  const disabled = phase !== "idle";
  const isRecording = phase === "recording";
  const isProcessing = phase === "processing";

  return (
    <GlassPanel className="flex items-center justify-center gap-4 px-6 py-5 sm:gap-6">
      {LEFT_IDS.map((id) => {
        const a = byId(id);
        return (
          <AnimalButton key={a.id} animal={a} selected={selectedId === a.id} disabled={disabled} onSelect={() => onSelect(a.id)} />
        );
      })}

      <button
        onClick={onRecordClick}
        disabled={isProcessing}
        aria-label={isRecording ? "Stop recording" : "Start recording"}
        className={`relative flex h-24 w-24 items-center justify-center rounded-full text-white shadow-2xl shadow-black/50 backdrop-blur-[220px] transition-all duration-150 will-change-transform hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 ${
          isRecording ? "bg-rose-700/85" : "bg-emerald-800/85 hover:-translate-y-0.5"
        }`}
      >
        {isRecording && <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-rose-700/40" />}
        <Icon name={isProcessing ? "hourglass" : isRecording ? "stop" : "mic"} size={34} />
      </button>

      {RIGHT_IDS.map((id) => {
        const a = byId(id);
        return (
          <AnimalButton key={a.id} animal={a} selected={selectedId === a.id} disabled={disabled} onSelect={() => onSelect(a.id)} />
        );
      })}
    </GlassPanel>
  );
}
