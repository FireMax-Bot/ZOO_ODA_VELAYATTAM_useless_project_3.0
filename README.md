<img width="1280" height="640" alt="git (1)" src="https://github.com/user-attachments/assets/8920b256-2ba8-4988-b824-5351134eb4bd" />



# ZOO_ODA VELAYATTAM 🐶🐱🐄🐐


## Basic Details
### Team Name: Matrix


### Team Members
- Team Lead: Noel Issac AJ - Toc H Institute of Science & Technology
- Member 2: Arjun SM - Toc H Institute of Science & Technology


### Project Description
ZOO_ODA VELAYATTAM is a completely unnecessary animal voice translator that lets you talk to your webcam and microphone and turns your voice into an animal sound

You choose an animal , make a face, say something, and the system tries to make the animal sound match your emotion, voice pitch and speaking rhythm.

### The Problem (that doesn't exist)

Have you ever wanted to know what you would sound like as a dog?

### The Solution (that nobody asked for)

We built an app that listens to your voice and watches your face.

You choose a dog , cat , cow or goat and starts talking.

The camera checks your facial expression and decides whether you look Happy ,Angry or sad . At the same time , the microphone checks things like your pitch , loudness , rhythm and syllables

The system then takes animal sound clips and modifies them to roughly follow the way you spoke.

So if you angrily say something with a rising pitch , you get an angry animal sound that follows the pattern.

Was this necessary?
No.

Does it work?
Yes.

## Technical Details

For Software:
- TypeScript
- React 19
- Vite
- Tailwind CSS v4
- Web Audio API
- MediaRecorder API
- OfflineAudioContext
- Custom Digital Signal Processing (DSP)
- Autocorrelation for pitch detection
- RMS energy and peak picking for syllable detection
- Custom FFT based audio analysis

For Hardware:
- Webcam
- Microphone
- Laptop
- Speakers

### Implementation


# Installation
```bash
npm install
npm run dev
```

Open the printed 'http://localhost:5173'

```bash
npm run build
npm run preview
```

### Project Structure
```
ZOO_ODA-VELAYATTAM
|--README.md
|--PROJECT.md
|--CREDITS.md
|--index.html
|--package.json
|--vite.config.ts
|
|--public/
|  |--background.jpg
|  |--title-banner.png
|  |--models/
|  |--wasm/
|  |--icons/
|  |--screenshots/
|  |   |--home.png
|  |   |--recording.png
|  |   |--results.png
|  |--sounds/
|    |--dog/
|    |--cat/
|    |--goat/
|    |--cow/
|
|-src/
  |--main.tsx
  |--App.tsx
  |--index.css
  |
  |--components/
  |  |--GlassPanel.tsx
  |  |--WebcamStage.tsx
  |  |--EmotionLegend.tsx
  |  |--ControlPanel.tsx
  |  |--HumanPanel.tsx
  |  |--AnimalPanel.tsx
  |  |--UtilityCluster.tsx
  |  |--Icon.tsx
  |  |--TitleBanner.tsx
  |  |--Icon.tsx
  |  |--PixelIcon.tsx
  |  |--Waveform.tsx
  |
  |--lib/
      |--capture.ts
      |--faceEmotion.ts
      |--voiceEmotion.ts
      |--audioAnalysis.ts
      |--prosody.ts
      |--fusion.ts
      |--animals.ts
      |--animalVoice.ts
      |--gloss.ts
      |--wav.ts
      |--emotionSpace.ts
      |--types.ts
```
# Screenshots 

![Home Screen](screenshots/home.png)
*Main Screen where the user selects an animal and starts the recording*

![Recording](screenshots/recording.png)
*Recording screen showing the webcam and microphone being used.*

![Generated Result](screenshots/result.png)
*Final animal sound generated from the user's voice and facial expression*

# Flow chart
```mermaid
flowchart TD
    A[Tap mic] --> B[Webcam + mic recording starts]
    B --> C[MediaPipe reads face blendshapes, 15fps]
    B --> D[MediaRecorder captures audio]
    A2[Tap mic again to stop] --> E[Decode recorded audio]
    D --> E
    C --> F[Aggregate face frames → Happy /Angry / Sad]
    E --> G[Detect syllables + pitch contour]
    E --> H[Extract voice loudness/pitch/rates]
    F --> I{fusion.ts}
    H --> I
    I -->|face gesture decides the emotion| J[Chosen emotion + intensity]
    G --> K[animalVoice.ts: render]
    J --> K
    K --> L[One animal call per syllable,<br/>pitch-matched,emotion-wraped]
    L --> M[Play button + WAV download]
```



## Team Contributions
- Noel: Main programming , audio processing , face emotion detection
- Arjun: UI/UX Design , frontend development and making the interface clean and easy to use


---
Made with ❤️ at TinkerHub Useless Projects 

![Static Badge](https://img.shields.io/badge/TinkerHub-24?color=%23000000&link=https%3A%2F%2Fwww.tinkerhub.org%2F)
![Static Badge](https://img.shields.io/badge/UselessProjects--26-26?link=https%3A%2F%2Ftinkerhub.org%2Fevents%2F1M8ORET9A1%2Fuseless-projects-3.0)



