import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { AnimalPanel } from "./components/AnimalPanel";
import { ControlPanel, type RecordPhase } from "./components/ControlPanel";
import { EmotionLegend } from "./components/EmotionLegend";
import { HumanPanel } from "./components/HumanPanel";
import { TitleBanner } from "./components/TitleBanner";
import { UtilityCluster } from "./components/UtilityCluster";
import { WebcamStage } from "./components/WebcamStage";
import { getAnimal } from "./lib/animals";
import { playBuffer } from "./lib/animalVoice";
import { readLevel, startCapture, stopCapture, type CaptureSession } from "./lib/capture";
import { translate } from "./lib/translate";
import type { EmotionWeights, TranslationResult } from "./lib/types";

function friendlyError(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError") {
      return "Camera/mic permission was denied. Allow access and try again.";
    }
    if (err.name === "NotFoundError") {
      return "No camera or microphone found on this device.";
    }
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong. Try again.";
}

// Subtle: dark-teal tint (dims/desaturates the artwork a touch), a very
// faint pixel-dot texture, and a soft vignette — all layered as CSS on one
// fixed overlay, so background.jpg (set on `body`, see index.css) stays
// bright and clearly recognizable underneath.
const BACKGROUND_OVERLAY_STYLE: CSSProperties = {
  backgroundColor: "rgba(11, 30, 31, 0.16)",
  backgroundImage:
    "radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.14) 100%), radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)",
  backgroundSize: "auto, 4px 4px",
};

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<CaptureSession | null>(null);

  const [animalId, setAnimalId] = useState("dog");
  const [phase, setPhase] = useState<RecordPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [muted, setMuted] = useState(false);

  const [liveWeights, setLiveWeights] = useState<EmotionWeights | null>(null);
  const [liveLevel, setLiveLevel] = useState(0);
  const [faceDetected, setFaceDetected] = useState<boolean | null>(null);

  // Poll the live face/level readouts while recording, for the on-screen meter.
  useEffect(() => {
    if (phase !== "recording") return;
    const id = setInterval(() => {
      const session = sessionRef.current;
      if (!session) return;
      setLiveLevel(readLevel(session.analyser));
      const last = session.faceFrames[session.faceFrames.length - 1];
      if (last) {
        setFaceDetected(last.weights !== null);
        if (last.weights) setLiveWeights(last.weights);
      }
    }, 100);
    return () => clearInterval(id);
  }, [phase]);

  const handleReset = useCallback(() => {
    setResult(null);
    setError(null);
    setLiveWeights(null);
    setFaceDetected(null);
  }, []);

  const handleStart = useCallback(async () => {
    handleReset();

    if (!videoRef.current) return;
    try {
      const session = await startCapture(videoRef.current);
      sessionRef.current = session;
      setPhase("recording");
    } catch (err) {
      setError(friendlyError(err));
      setPhase("idle");
    }
  }, [handleReset]);

  const handleStop = useCallback(async () => {
    const session = sessionRef.current;
    if (!session) return;
    setPhase("processing");

    try {
      const blob = await stopCapture(session);
      sessionRef.current = null;

      const animal = getAnimal(animalId);
      const translated = await translate(blob, session.faceFrames, animal);

      if (translated.syllables.length === 0) {
        setError("Didn't catch you say anything — get a little closer to the mic and try again.");
        setPhase("idle");
        return;
      }

      setResult(translated);
      setPhase("idle");
    } catch (err) {
      setError(friendlyError(err));
      setPhase("idle");
    }
  }, [animalId]);

  const handleRecordClick = useCallback(() => {
    if (phase === "idle") void handleStart();
    else if (phase === "recording") void handleStop();
  }, [phase, handleStart, handleStop]);

  const handlePlayHuman = useCallback(() => {
    if (result) void playBuffer(result.humanAudioBuffer);
  }, [result]);

  const handlePlayAnimal = useCallback(() => {
    if (result) void playBuffer(result.renderedAudio);
  }, [result]);

  const displayLevel = muted ? 0 : liveLevel;

  return (
    <>
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0" style={BACKGROUND_OVERLAY_STYLE} />

      <div className="relative z-10 mx-auto min-h-screen max-w-6xl px-4 py-8 text-white">
        <UtilityCluster muted={muted} onToggleMute={() => setMuted((m) => !m)} onReset={handleReset} resetDisabled={phase !== "idle" || !result} />

        <header className="mb-6 text-center">
          <TitleBanner className="intro-title" />
        </header>

        <div className="intro-fade mb-5 flex justify-center" style={{ animationDelay: "480ms" }}>
          <EmotionLegend />
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-200 backdrop-blur-md">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.3fr_1fr] lg:items-start">
          <div className="intro-left" style={{ animationDelay: "700ms" }}>
            <HumanPanel buffer={result?.humanAudioBuffer ?? null} syllables={result?.syllables} onPlay={result ? handlePlayHuman : undefined} />
          </div>

          <div className="intro-fade" style={{ animationDelay: "600ms" }}>
            <WebcamStage
              ref={videoRef}
              isRecording={phase === "recording"}
              level={displayLevel}
              faceDetected={faceDetected}
              liveWeights={liveWeights}
            />
          </div>

          <div className="intro-right" style={{ animationDelay: "700ms" }}>
            <AnimalPanel result={result} animalId={animalId} onPlay={result ? handlePlayAnimal : undefined} />
          </div>
        </div>

        <div className="intro-up mt-6 flex justify-center" style={{ animationDelay: "900ms" }}>
          <ControlPanel selectedId={animalId} onSelect={setAnimalId} phase={phase} onRecordClick={handleRecordClick} />
        </div>
      </div>
    </>
  );
}
