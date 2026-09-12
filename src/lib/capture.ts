import { FaceEmotionSmoother, getFaceLandmarker, scoreBlendshapes, type FaceFrame } from "./faceEmotion";

const FACE_FPS = 15;
const FACE_INTERVAL_MS = 1000 / FACE_FPS;

export interface CaptureSession {
  stream: MediaStream;
  recorder: MediaRecorder;
  chunks: Blob[];
  faceFrames: FaceFrame[];
  analyser: AnalyserNode;
  private_rafId: number | null;
  private_recorderStopped: Promise<void>;
}

function pickAudioMimeType(): string | undefined {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) return c;
  }
  return undefined;
}

/**
 * Starts webcam + mic capture: video goes to `videoEl` and, at 15fps, into
 * the MediaPipe face landmarker; audio goes to a MediaRecorder. Call
 * `stopCapture` to get back the recorded audio Blob + the collected face
 * frames.
 */
export async function startCapture(videoEl: HTMLVideoElement): Promise<CaptureSession> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
    audio: true,
  });

  videoEl.srcObject = stream;
  videoEl.muted = true;
  await videoEl.play();

  const audioOnlyStream = new MediaStream(stream.getAudioTracks());
  const mimeType = pickAudioMimeType();
  const recorder = new MediaRecorder(audioOnlyStream, mimeType ? { mimeType } : undefined);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  // Cosmetic live level meter for the UI — not used by the analysis pipeline.
  const meterCtx = new AudioContext();
  const source = meterCtx.createMediaStreamSource(audioOnlyStream);
  const analyser = meterCtx.createAnalyser();
  analyser.fftSize = 256;
  source.connect(analyser);

  const landmarker = await getFaceLandmarker();
  const smoother = new FaceEmotionSmoother(0.3);
  const faceFrames: FaceFrame[] = [];
  const startedAt = performance.now();

  let rafId: number | null = null;
  let lastFaceTime = -Infinity;

  const loop = () => {
    const now = performance.now();
    if (now - lastFaceTime >= FACE_INTERVAL_MS) {
      lastFaceTime = now;
      if (videoEl.readyState >= 2) {
        const result = landmarker.detectForVideo(videoEl, now);
        const t = (now - startedAt) / 1000;
        const categories = result.faceBlendshapes?.[0]?.categories;
        if (categories && categories.length > 0) {
          const byName = new Map(categories.map((c) => [c.categoryName, c.score]));
          faceFrames.push({ t, weights: smoother.push(scoreBlendshapes(byName)) });
        } else {
          faceFrames.push({ t, weights: null });
        }
      }
    }
    rafId = requestAnimationFrame(loop);
  };

  let resolveStopped: () => void;
  const stoppedPromise = new Promise<void>((res) => {
    resolveStopped = res;
  });
  recorder.onstop = () => resolveStopped();

  recorder.start();
  rafId = requestAnimationFrame(loop);

  return {
    stream,
    recorder,
    chunks,
    faceFrames,
    analyser,
    private_rafId: rafId,
    private_recorderStopped: stoppedPromise,
  };
}

/** Stops all tracks + recording, returns the recorded audio as a Blob. */
export async function stopCapture(session: CaptureSession): Promise<Blob> {
  if (session.private_rafId !== null) cancelAnimationFrame(session.private_rafId);
  if (session.recorder.state !== "inactive") session.recorder.stop();
  await session.private_recorderStopped;
  session.stream.getTracks().forEach((t) => t.stop());

  const mimeType = session.recorder.mimeType || "audio/webm";
  return new Blob(session.chunks, { type: mimeType });
}

/** 0..1 current input level, for a live VU meter while recording. */
export function readLevel(analyser: AnalyserNode): number {
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteTimeDomainData(data);
  let sumSquares = 0;
  for (let i = 0; i < data.length; i++) {
    const v = (data[i] - 128) / 128;
    sumSquares += v * v;
  }
  return Math.sqrt(sumSquares / data.length);
}
