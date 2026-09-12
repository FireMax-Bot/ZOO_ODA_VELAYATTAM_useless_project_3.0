<!--
  Drop a screenshot of the running site here before pushing to GitHub.
  Easiest way: take the screenshot, save it as docs/screenshot.png in this
  project, then this image tag will pick it up automatically.
-->
<p align="center">
  <img src="docs/screenshot.png" alt="ZOO_ODA VELAYATTAM screenshot" width="800" />
</p>

<h1 align="center">🐾 ZOO_ODA VELAYATTAM</h1>
<p align="center"><em>Speak to it. It answers back as a dog, cat, cow, or goat — in your rhythm, your pitch, your mood.</em></p>

---

## What is this?

A hackathon "Useless Project": talk into your webcam, and the app reads your face and
voice, then re-says whatever you said as an animal — matching how many syllables you
spoke, the pitch contour of your voice, and the emotion your face showed (furrow your
brows for angry, close your eyes for sad, smile for happy).

Everything runs **100% in the browser** — no backend, no server, no API keys, works
offline once the page has loaded once.

For a deeper explanation of the tech and how the pipeline actually works, see
**[PROJECT.md](PROJECT.md)**.

## Features

- 🎥 Live webcam-based emotion detection (MediaPipe face landmarks, client-side)
- 🎤 Per-syllable pitch tracking — the animal's pitch follows your voice's contour
- 🐕🐈🐄🐐 Four animals, each with emotion-specific sounds (not just a pitched-down bark)
- 🖼️ Apple-glass UI with a hand-built pixel-art icon system (falls back gracefully if
  you haven't added your own icon files yet)
- ⬇️ Download the animal's response as a WAV file
- 📴 No internet required after the first page load (model + audio runtime are vendored)

## Quick start

```bash
npm install
npm run dev
```

Open the printed `http://localhost:5173` link **in Chrome or Edge**. Must be
`http://localhost` or `https://` — camera/mic access is blocked on a plain `http://` LAN
address.

```bash
npm run build      # production build → dist/
npm run preview    # serve that build locally
```

## Project structure

```
ZOO_ODA-VELAYATTAM/
├── README.md              this file
├── PROJECT.md             tech stack + how the pipeline works, in detail
├── CREDITS.md             sound/asset sources — keep updated as you add clips
├── index.html
├── package.json
├── vite.config.ts
│
├── public/                 everything here ships as-is, nothing fetched remotely
│   ├── background.jpg      page background art (yours)
│   ├── title-banner.png    illustrated title banner (yours; falls back to text if absent)
│   ├── models/              vendored MediaPipe face-detection model
│   ├── wasm/                 vendored MediaPipe WASM runtime
│   ├── icons/                your icon PNGs — see naming list below
│   └── sounds/
│       ├── dog/   bark_*.mp3  aggro_*.mp3  whimper_*.mp3  ...
│       ├── cat/   meow_*.mp3  hiss_*.mp3   mew_*.mp3      ...
│       ├── goat/  bleat_*.mp3 scream_*.mp3 ...
│       └── cow/   moo_*.mp3   bellow_*.mp3 ...
│
└── src/
    ├── main.tsx             entry point
    ├── App.tsx              top-level layout + state machine (idle/recording/processing)
    ├── index.css            Tailwind import + background/intro-animation CSS
    │
    ├── components/           UI only — no signal-processing logic lives here
    │   ├── GlassPanel.tsx      shared frosted-glass surface
    │   ├── WebcamStage.tsx     camera feed + live emotion badge
    │   ├── EmotionLegend.tsx   "how to show an emotion" instructions
    │   ├── ControlPanel.tsx    bottom 5-button row (4 animals + mic)
    │   ├── HumanPanel.tsx      left column: your voice's waveform + pitch dots
    │   ├── AnimalPanel.tsx     right column: animal's response + waveform
    │   ├── UtilityCluster.tsx  mute / reset, top-right
    │   ├── TitleBanner.tsx     illustrated title, falls back to text
    │   ├── Icon.tsx            loads /icons/<name>.png, falls back to PixelIcon
    │   ├── PixelIcon.tsx       hand-coded pixel-art icon set (the fallback)
    │   └── Waveform.tsx        canvas waveform + optional pitch-dot overlay
    │
    └── lib/                   the actual pipeline — see PROJECT.md for how each works
        ├── capture.ts           webcam/mic capture + MediaPipe frame loop
        ├── faceEmotion.ts       blendshapes → Happy/Angry/Sad
        ├── voiceEmotion.ts      pitch/loudness/rate → intensity
        ├── audioAnalysis.ts     shared DSP helpers (FFT, autocorrelation, framing)
        ├── prosody.ts           syllable onset detection
        ├── fusion.ts            combines face + voice into one final result
        ├── animals.ts           per-animal sound registry + emotion→sound mapping
        ├── animalVoice.ts       Web Audio render graph (the synthesis engine)
        ├── translate.ts         wires the whole pipeline together
        ├── gloss.ts             "Woof! Woof!"-style caption text
        ├── wav.ts               AudioBuffer → downloadable WAV
        ├── emotionSpace.ts      shared valence/arousal helpers
        └── types.ts             shared TypeScript types
```

## How it works (flow chart)

```mermaid
flowchart TD
    A[Tap mic] --> B[Webcam + mic recording starts]
    B --> C[MediaPipe reads face blendshapes, 15fps]
    B --> D[MediaRecorder captures audio]
    A2[Tap mic again to stop] --> E[Decode recorded audio]
    D --> E
    C --> F[Aggregate face frames → Happy / Angry / Sad]
    E --> G[Detect syllables + pitch contour]
    E --> H[Extract voice loudness/pitch/rate]
    F --> I{fusion.ts}
    H --> I
    I -->|face gesture decides the emotion| J[Chosen emotion + intensity]
    G --> K[animalVoice.ts: render]
    J --> K
    K --> L[One animal call per syllable,<br/>pitch-matched, emotion-warped]
    L --> M[Play button + WAV download]
```

## Adding your own assets

The app is built to degrade gracefully — it works with none of these added, and gets
better as you add them, exactly like the sound clips already do.

**Icons** — drop PNGs into `public/icons/` using these exact names (falls back to a
built-in pixel-art icon for anything missing):

```
mic.png  stop.png  hourglass.png  play.png  download.png  reset.png
mute.png  unmute.png
cat.png  dog.png  cow.png  goat.png
face-happy.png  face-angry.png  face-sad.png
```

**Sounds** — drop `.mp3` files into `public/sounds/<animal>/<type>_<n>.mp3` (numbers
starting at 0). See [PROJECT.md](PROJECT.md) and [CREDITS.md](CREDITS.md) for the full
type list per animal and where to source clips.

**Background & title** — `public/background.jpg` and `public/title-banner.png`.

## Pushing this to GitHub

This sandbox doesn't have Git installed, so run these on your own machine, from this
project's folder:

```bash
# 1. One-time setup, if this folder isn't a git repo yet
git init
git add .
git commit -m "Initial commit: ZOO_ODA VELAYATTAM"

# 2. Create a new, EMPTY repository on GitHub first (no README/license/.gitignore) —
#    either at https://github.com/new, or with the GitHub CLI:
gh repo create zoo-oda-velayattam --public --source=. --remote=origin

#    ...or if you created it on the website instead, connect it manually
#    (replace <your-username> and the repo name):
git remote add origin https://github.com/<your-username>/zoo-oda-velayattam.git

# 3. Push
git branch -M main
git push -u origin main
```

After that, any time you make changes:

```bash
git add .
git commit -m "describe what changed"
git push
```

If `git push` asks for a password and rejects it, GitHub no longer accepts account
passwords over HTTPS — either use the GitHub CLI (`gh auth login`, then push normally)
or set up a [personal access token](https://github.com/settings/tokens) to use as the
password when prompted.

## Credits

See [CREDITS.md](CREDITS.md) for sound sources and vendored library licenses.
