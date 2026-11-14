# ClaudeCreate — Local AI Reel Maker

Create vertical Instagram Reels and landscape YouTube videos from a `script.json` file, **without calling Claude, a paid AI service, or a cloud render API while producing the video**.

**Workflow:** Use ordinary/free Claude Chat to write the JSON script → save locally → validate → generate voice with HyperFrames' built-in local Kokoro → transcribe word timings with HyperFrames' local Whisper → render scenes with HyperFrames → mix/export with FFmpeg.

> **Current status:** The JSON validator, six templates, synthetic-audio FFmpeg export test, and a one-second real HyperFrames render have been tested. **A full end-to-end reel using actual Kokoro speech and HyperFrames together still needs testing on a properly configured local machine.** Do not assume all systems are verified just because the source tests pass.
>
> **Internet is needed initially** to install Git/Node dependencies, browser support, and HyperFrames' local Kokoro/Whisper model weights. The intended production workflow is local-only once everything is cached (a completely offline production run is not yet verified). Claude Chat is used separately to author the script; the renderer does not invoke it.

## Contents

1. [Requirements](#1-requirements)
2. [Install on Linux Mint or Ubuntu](#2-install-on-linux-mint-or-ubuntu)
3. [Verify the installation](#3-verify-the-installation)
4. [Choose your Kokoro voice](#4-choose-your-kokoro-voice)
5. [Generate a script in free Claude Chat](#5-generate-a-script-in-free-claude-chat)
6. [Validate, preview and render](#6-validate-preview-and-render)
7. [Where the files go](#7-where-the-files-go)
8. [Script format and templates](#8-script-format-and-templates)
9. [Appearance, sound and reference reels](#9-appearance-sound-and-reference-reels)
10. [Configuration and duration control](#10-configuration-and-duration-control)
11. [Testing and quality checks](#11-testing-and-quality-checks)
12. [Troubleshooting](#12-troubleshooting)
13. [Updates, maintenance and limitations](#13-updates-maintenance-and-limitations)

## 1. Requirements

| Component | Requirement | Purpose |
| --- | --- | --- |
| Operating system | Ubuntu / Linux Mint (recommended; instructions below) | Local workstation |
| Node.js | **22 or newer** | Reel CLI and HyperFrames |
| npm | Installed with Node | JavaScript dependencies |
| Python | **3.x with venv/pip** | HyperFrames Kokoro ONNX runtime, sound effects and tests |
| FFmpeg + FFprobe | Available in terminal | Mixing, encoding, media inspection |
| `espeak-ng` | Installed | Kokoro text phonemization |
| Chromium / supported browser | Installed and recognized by HyperFrames | Local scene capture/rendering |
| Git | Installed | Clone and update the repo |
| Internet | Needed during setup/model downloads | **Not required for ordinary rendering after dependencies/models are cached** |

A GPU may improve performance; CPU-based Kokoro is supported but may be slower. Video production can require significant RAM, disk space and time, especially for full-resolution scenes and software rendering. Other operating systems are not covered by the installation instructions below; Windows users may choose WSL2/Ubuntu, but that setup has not been verified for this project.

## 2. Install on Linux Mint or Ubuntu

Open **Terminal** and run the steps in order. Run commands as your normal user except those explicitly using `sudo`. Do not put the repository under a system-owned directory.

### 2.1 Install system utilities

```bash
sudo apt update
sudo apt install -y \
  git curl ca-certificates build-essential \
  ffmpeg espeak-ng \
  python3 python3-venv
```

Install a local Chromium browser if you do not already have one:

```bash
sudo apt install -y chromium
```

On some Ubuntu releases, the available browser package is `chromium-browser` instead, sometimes backed by Snap. If the command above reports "Unable to locate package", try `sudo apt install chromium-browser` or use the browser-installation method supported by your distribution. The authoritative browser check is `npx hyperframes doctor` later in this guide.

Confirm the basic tools:

```bash
git --version
ffmpeg -version | head -n 1
ffprobe -version | head -n 1
espeak-ng --version
python3 --version
```

**Python:** HyperFrames 0.9.37 uses the Python `kokoro-onnx` and `soundfile` packages to execute Kokoro TTS. Keep them in a small local `.venv`; no duplicate Python TTS application or `faster-whisper` is needed. This requirement was confirmed by a real-model GitHub Actions failure.

### 2.2 Install Node.js 22+ (only if needed)

If `node -v` already reports `v22` or later, and `npm -v` works, **skip this subsection**.

One user-local method is [nvm](https://github.com/nvm-sh/nvm). These commands install nvm from its Git repository into your home directory and load it into Bash:

```bash
git clone --depth 1 https://github.com/nvm-sh/nvm.git "$HOME/.nvm"
printf '\nexport NVM_DIR="$HOME/.nvm"\n[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"\n' >> "$HOME/.bashrc"
source "$HOME/.bashrc"
nvm install 22
nvm alias default 22
node --version
npm --version
```

If `~/.nvm` already exists, follow the nvm project's update/install instructions rather than cloning over it. If you use Zsh, put the nvm initialization lines in `~/.zshrc` instead of `~/.bashrc`. A fresh terminal should then find `node` and `npm`.

### 2.3 Clone ClaudeCreate

```bash
cd "$HOME"
git clone https://github.com/SaridakisStamatisChristos/ClaudeCreate.git
cd ClaudeCreate
```

If the folder is already cloned, do **not** clone it again. Instead:

```bash
cd "$HOME/ClaudeCreate"
git pull --ff-only
```

The commands below assume your working directory is the repository root (the folder containing `package.json` and `config.json`).

### 2.4 Install JavaScript/HyperFrames dependencies

```bash
npm ci
```

This installs the exact direct and transitive versions in the committed `package-lock.json` (HyperFrames 0.9.37, GSAP and Three.js), rather than floating package updates. You do **not** need to fork HyperFrames or separately host its rendering service.

Check the installed HyperFrames CLI:

```bash
npx --no-install hyperframes doctor
```

If the doctor reports missing browser dependencies, fix those according to the diagnostic. Do not use HyperFrames' cloud, publish, or remote-rendering commands: ClaudeCreate uses its **local** render/snapshot CLI.

**Optional, for developers using Claude Code:** The HyperFrames authoring skills are separate from the renderer and are not required for normal use:

```bash
npx skills add heygen-com/hyperframes
```

Only run that optional command if you want its agent skills; it may be interactive and requires internet.

### 2.5 Install the HyperFrames Kokoro runtime

HyperFrames provides the **single** TTS CLI interface, but its Kokoro execution backend requires Python `kokoro-onnx` and `soundfile`. Install only these runtime dependencies into the local venv. Do not restore the old standalone TTS script or add `faster-whisper`.

```bash
python3 -m venv .venv
.venv/bin/python -m pip install --disable-pip-version-check kokoro-onnx soundfile
export HYPERFRAMES_PYTHON="$PWD/.venv/bin/python"
.venv/bin/python -c "import kokoro_onnx, soundfile; print('Kokoro runtime ready')"
```

The ClaudeCreate CLI automatically prefers `.venv/bin/python` when invoking HyperFrames. The `export` above also makes the same venv available to standalone `npx hyperframes tts` invocations in this shell.

Check the installed commands:

```bash
npx --no-install hyperframes tts --help
npx --no-install hyperframes transcribe --help
npx --no-install hyperframes tts --list
```

### 2.6 First-time speech initialization

With internet access for the first model download, generate a short sample:

```bash
npx --no-install hyperframes tts \
  "An interesting idea starts with a question." \
  --voice af_heart \
  --output /tmp/claudecreate-first-voice.wav
```

Generate actual word-level timestamps (this may download Whisper model weights):

```bash
npx --no-install hyperframes transcribe \
  /tmp/claudecreate-first-voice.wav \
  --dir /tmp --engine whisper --model small.en --language en --json
```

A full render performs these steps **automatically** for each scene through `src/audio/hyperframes.mjs`. Caption timings must match the original scripted words; errors stop the render rather than estimating timestamps. HyperFrames caches downloaded model weights; ClaudeCreate separately caches approved WAV/timing pairs under `.cache/voices/`. A genuine speech-to-video production test must still be performed on a local machine. See [native HyperFrames voice pipeline](docs/HYPERFRAMES_VOICE.md).

## 3. Verify the installation

These commands check different layers; **none alone proves the complete voice-to-video workflow**.

```bash
npm test
npm run test:integration
npm run test:hyperframes
npm run reel -- doctor
```

- `npm test`: validates script rules, template composition and escaping; no full video render.
- `npm run test:integration`: exercises FFmpeg/audio/export using **synthetic speech and a mock renderer**.
- `npm run test:hyperframes`: creates an actual **one-second**, local HyperFrames video without Kokoro.
- `npm run reel -- doctor`: invokes the HyperFrames diagnostics.

Once these pass, use the real three-scene dummy to test the combined pipeline:

```bash
npm run reel -- check examples/dummy.json --target 15
npm run reel -- preview examples/dummy.json --draft --target 15
npm run reel -- render examples/dummy.json --draft --target 15
```

The dummy script is intentionally short and **may generate pacing warnings**. Warnings do not invalidate an otherwise correct script. A successful real draft render should create `out/three-moments-one-idea-draft/instagram.mp4` and related files. The draft is limited to **at most 10 seconds** and **540×960**; inspect and listen to it before attempting a full-length production.

## 4. Choose your Kokoro voice

Generate the built-in voice samples:

```bash
npm run reel -- voice-sample
```

Samples are written to `out/voice-samples/`. The available sample voices in the current code are:

| Voice ID | Description |
| --- | --- |
| `af_heart` | American English female |
| `af_bella` | American English female |
| `bf_emma` | British English female |
| `am_michael` | American English male |
| `am_adam` | American English male |
| `bm_george` | British English male |

Listen to the WAV files, then select one as the project default:

```bash
npm run reel -- voice-select am_michael
```

The selected voice is saved to `config.json`. You can override it for an individual reel by putting, for example, `"voice": "af_heart"` at the **top level** of `script.json`. Without a `voice` property, ClaudeCreate uses the configured default.

Do not change individual scenes to different voices: the current script schema does not support a per-scene `voice` field.

## 5. Generate a script in free Claude Chat

The canonical instruction file is **[prompts/CLAUDE_REEL_MASTER.md](prompts/CLAUDE_REEL_MASTER.md)** (v1.1). You can use it in free Claude Chat, with no Claude API key.

1. Open a regular Claude Chat (or a Claude Project, if your account supports it).
2. Paste the master prompt. If using a Project, put sections 1–11 into Project Instructions.
3. Fill in section 12: topic, niche, target audience, `@handle`, optional hook, accent color, and target duration **15**, **30** or **60** seconds.
4. Ask Claude to output the completed script. Its current prompt requests **one JSON code block** plus a separate `Facts to verify:` line.
5. **Copy only the JSON object inside the code block** into a local file such as `script.json`. Do not include the triple backticks, explanations or `Facts to verify` line.
6. Review factual claims. The renderer cannot independently verify science, history, investment claims, quotations or numbers.

**Suggested first assignment:**

> TOPIC: Why zero is an extraordinary mathematical invention  
> NICHE: Mathematics and scientific curiosity  
> TARGET AUDIENCE: Curious adults  
> INSTAGRAM HANDLE: @yourhandle  
> TARGET LENGTH: 30 seconds  
> HOOK: Start with an unexpected consequence of zero  
> LANGUAGE: English  
> TONE: Intelligent, engaging and educational  
> ACCENT COLOR: #F59E0B

The master prompt targets approximately 4–6 spoken words per scene and limits itself to 10 words per scene. ClaudeCreate's existing **hard limit is 16 words** per scene for backward compatibility; 11–16 words produce warnings, not errors. The prompt's pacing/variety preferences are creative instructions, not guaranteed outcomes.

### Save the script to a file

From the repository directory, create or edit the file with any plain-text editor:

```bash
nano script.json
```

Paste **only** the JSON, save with `Ctrl+O`, press Enter, then exit with `Ctrl+X`. The filename can be anything ending in `.json`, such as `scripts/zero.json` if you have created a `scripts` folder yourself. Use UTF-8 encoding and real JSON, not JavaScript-style comments.

For a working minimal fixture, see [examples/dummy.json](examples/dummy.json); for all six templates, see [examples/templates.json](examples/templates.json).

## 6. Validate, preview and render

Run these from the root of the cloned project.

### 6.1 Check the script before generating any media

```bash
npm run reel -- check script.json --target 30
```

Choose the target based on the script's intended length:

```bash
npm run reel -- check script.json --target 15
npm run reel -- check script.json --target 30
npm run reel -- check script.json --target 60
```

The default is **30 seconds** when `--target` is omitted. The CLI prints the requested target, estimated spoken duration, and any errors or warnings. It returns a nonzero exit code for hard errors (e.g. malformed JSON, invalid accent, invalid template or SFX, missing required props, highlights absent from narration, or more than 16 words in a scene).

A warning indicates an editorial issue, such as too many/few scenes or an estimated duration outside the target range. See [docs/SCRIPT_SPEC.md](docs/SCRIPT_SPEC.md).

### 6.2 Produce a still-frame preview

```bash
npm run reel -- preview script.json --draft --target 30
```

This generates **6–8 still images only** for checking typography, layouts, captions and templates. The current implementation may still synthesize and cache speech to determine timing; "preview" means no MP4, not "no TTS". Generated frames appear under `out/<title-slug>-draft/preview/`.

### 6.3 Render a short draft first

```bash
npm run reel -- render script.json --draft --target 30
```

A draft uses **540×960** vertical output and stops its video at **10 seconds maximum**. It also generates a landscape output at **960×540**, thumbnails, caption and credits. The program may synthesize speech for the full script when preparing the timeline, even though the draft video is clipped to 10 seconds.

Check that narration, caption timing, camera/motion, transitions and sound effects look correct. A draft is for technical and visual review, not final publishing.

### 6.4 Render the complete finished reel

Only after inspecting your draft:

```bash
npm run reel -- render script.json --target 30
```

This produces **Instagram: 1080×1920, 30 fps** plus **YouTube: 1920×1080** with the vertical reel centered over a blurred/darkened background. Output files are put in `out/<title-slug>/`.

**Important:** `--target` controls *validation warnings only*. It does **not** time-stretch speech or force the video to exactly 15/30/60 seconds. Actual duration is based on Kokoro's measured speech audio per scene plus roughly 0.12-second gaps and frame rounding.

### Four principal CLI commands (quick reference)

```bash
npm run reel -- voice-sample
npm run reel -- check script.json --target 30
npm run reel -- preview script.json --draft --target 30
npm run reel -- render script.json --target 30
```

Additional commands: `npm run reel -- voice-select VOICE_ID` and `npm run reel -- doctor`. `--draft` is for short previews/renders; do not expect a 30-second full draft.

## 7. Where the files go

For a script titled `"The Secret of Zero"`, ClaudeCreate normalizes the title to `the-secret-of-zero`.

```text
ClaudeCreate/
├── bin/reel.mjs                   # CLI
├── src/                           # validation, speech bridge and compositions
├── tools/                         # SFX, style analysis, integration smoke tests
├── prompts/CLAUDE_REEL_MASTER.md  # Free Claude Chat master prompt
├── docs/                           # technical and JSON reference
├── assets/
│   ├── music/                      # optional music files you supply
│   ├── references/                 # optional style reference videos
│   └── sfx/                        # generated effects + credits
├── config.json                     # default voice, gap and visual neutrals
├── script.json                     # your script (if saved here)
├── .cache/voices/                  # cached speech WAV + timing JSON
├── .reel-work/                     # temporary HyperFrames projects
└── out/
    ├── voice-samples/              # generated Kokoro WAV samples
    ├── the-secret-of-zero-draft/
    │   ├── instagram.mp4           # 540×960, at most 10 seconds
    │   ├── youtube.mp4             # 960×540
    │   ├── preview/                # stills when requested
    │   ├── thumb_a.png
    │   ├── thumb_b.png
    │   ├── caption.txt
    │   └── CREDITS.txt
    └── the-secret-of-zero/
        ├── instagram.mp4           # 1080×1920
        ├── youtube.mp4             # 1920×1080
        ├── thumb_a.png
        ├── thumb_b.png
        ├── caption.txt
        └── CREDITS.txt
```

The exact slug is derived from the script title. Two scripts with the same normalized title may write to the same output folder, so use distinct titles or back up finished videos before re-rendering. `node_modules/`, `.cache/`, `.reel-work/` and `out/` are Git-ignored and are **not stored in GitHub**.

## 8. Script format and templates

The `script.json` schema is fixed. You must supply `title`, `handle`, `accent`, `caption`, `hashtags`, and `scenes`. The optional top-level `voice` overrides your default voice.

```json
{
  "title": "My first reel",
  "handle": "@mychannel",
  "accent": "#F59E0B",
  "caption": "A short educational reel.",
  "hashtags": ["#education", "#reels"],
  "scenes": [
    {
      "template": "caption_screen",
      "say": "One small idea can change everything.",
      "highlight": "change everything",
      "illustrative": false,
      "sfx": "pop",
      "props": {
        "big_text": "ONE BIG IDEA"
      }
    }
  ]
}
```

This is an **illustrative one-scene schema example** and will correctly trigger pacing warnings for a 15/30/60-second target.

The six supported templates are:

| Template | Purpose | `props` overview |
| --- | --- | --- |
| `caption_screen` | Hooks and key statements | `big_text` |
| `counter` | Animated quantity | numeric `from`, `to`; optional `prefix`, `suffix`, `label` |
| `app_screen` | UI-like structured information | `app_name`, `rows`, `highlight_row` |
| `callout` | Important highlight | `text` and style `stamp` / `arrow` / `circle` |
| `object_3d` | Animated geometric visual | shape `cube` / `sphere` / `torus` / `stack`, optional `label` |
| `compare` | Side-by-side differences | `left` and `right` objects, each with `label` and `value` |

Supported effects: `whoosh`, `pop`, `tick`, `stamp`, `ding`, `swipe`, `none`. Every scene requires one. `highlight` should be an exact phrase from `say` (the current validator checks inclusion case-insensitively; matching exact capitalization is the safest choice). Set `illustrative: true` for a hypothetical demonstration so that an `EXAMPLE` label is shown.

Read [docs/SCRIPT_SPEC.md](docs/SCRIPT_SPEC.md) for exact props and validation rules. Unknown JSON keys are errors; do not silently add template names or new fields.

## 9. Appearance, sound and reference reels

### Overall look

[STYLE.md](STYLE.md) documents the current dark, neutral editorial design defaults. `script.json` chooses a single accent color, for example `"#F59E0B"`, while `config.json` supplies the background and foreground neutrals. No reference reels were originally provided, so these are **design defaults**, not measured reproductions of an existing creator's style.

### Optional background music

Put a legally usable `.mp3`, `.wav`, `.m4a`, `.flac` or `.ogg` file in `assets/music/`. The renderer chooses the **first supported filename alphabetically**. For predictable results, leave only the track you intend to use there. If the folder has no supported file, the result contains **no backing music**.

The audio pipeline combines Kokoro voice, optional music and synthesized SFX, then runs FFmpeg two-pass `loudnorm` targeting **−14 LUFS** integrated loudness and **−1.5 dBTP** true peak. The CLI reports the *measured* result after normalization; targets are not absolute guarantees for every mix.

### Sound effects and rights

The first render generates **18 reproducible synthesized WAV effects** if they are missing (variations of supported sound types). See `assets/sfx/CREDITS.txt`. They are synthesized locally; you are not downloading a mysterious or automatically licensed third-party sound library. You can replace the effects with WAVs you are permitted to use and update the credits.

**You are responsible for the rights to any music or external assets you add.** Reference videos may be used to study appearance; do not copy others' branding or protected content.

### Analyze reference reels (optional)

Place video references in `assets/references/`, then run:

```bash
npm run style-scan
```

The script analyzes video cuts and outputs `assets/references/analysis/measurements.json` plus up to two contact-sheet JPEGs per reference video, sampled at 4 fps. It does **not** automatically extract accurate caption font sizes, positions, palettes or narration WPM; review the contact sheets yourself before changing `STYLE.md`.

### 3D visuals

`object_3d` uses locally installed Three.js; animated HTML scenes use local GSAP/HyperFrames resources. Templates are data-driven motion graphics; the current app does **not** create photorealistic AI video, stock footage or real screenshots from a JSON description.

## 10. Configuration and duration control

Your `config.json` defaults look like this:

```json
{
  "voice": "af_heart",
  "gap": 0.12,
  "wordsPerMinute": 145,
  "background": "#111318",
  "foreground": "#F6F6F3"
}
```

- `voice`: Kokoro default voice.
- `gap`: planned pause between audio scenes (seconds).
- `background` / `foreground`: global visual neutrals.
- `wordsPerMinute`: retained setting; the current **target-duration checker** instead uses the fixed estimate **2.4 words/second**. Do not assume changing `wordsPerMinute` will alter `--target` warnings.
- Per-script `accent` overrides the default accent.

**Duration planning (prompt recommendations, not enforcement):**

| Intended length | Approximate words at 2.4 words/sec | Prompt's suggested scenes |
| --- | ---: | ---: |
| 15 s | 36 | 7–8 |
| 30 s (default) | 72 | 14–16 |
| 60 s | 144 | 28–32 |

The checker warns if scene count lies more than **±40%** outside `target/2`, or if words/2.4 lies more than **±20%** outside target duration. It does not enforce a strict video length. Spoken rate can vary across voices, punctuation and scenes. For a shorter or longer completed reel, edit the number of scenes and the narration, then synthesize again.

## 11. Testing and quality checks

After a code update, repeat:

```bash
npm test
npm run test:integration
npm run test:hyperframes
```

Before publishing a new script, use:

```bash
npm run reel -- check script.json --target 30
npm run reel -- preview script.json --draft --target 30
npm run reel -- render script.json --draft --target 30
```

After a successful full render, inspect output dimensions and duration:

```bash
ffprobe -v error \
  -show_entries format=duration:stream=width,height \
  -of json out/the-secret-of-zero/instagram.mp4
```

Replace `the-secret-of-zero` with your actual output slug. Look for **1080×1920** in full production, correct audio, clean caption highlighting, no cropped text, and an acceptable playback duration. Review the reported LUFS in terminal output. Listen to the entire production before publishing; the CI suite does not substitute for editorial review.

GitHub Actions runs the automated checks defined in [.github/workflows/validate.yml](.github/workflows/validate.yml). It includes a genuine short HyperFrames render but **does not test the full Kokoro model path**.

## 12. Troubleshooting

| Symptom | What to do |
| --- | --- |
| `node` or `npm` not found, or Node version below 22 | Reopen terminal, load nvm, install/use Node 22+, check `node -v`. |
| `Cannot find module` or missing `hyperframes` | Run `npm install` from repository root. |
| HyperFrames doctor complains about browser | Install/configure Chromium supported by your Linux distribution; rerun `npx --no-install hyperframes doctor`. |
| HyperFrames `tts` or `transcribe` command unavailable | Run `npm install` from the repository root, then check `npx --no-install hyperframes tts --help` and `npx --no-install hyperframes transcribe --help`. |
| `espeak` / phonemizer error | Install `espeak-ng` and ensure `espeak-ng --version` works. |
| `kokoro-onnx package is not installed` | Run the venv/pip commands in §2.5; set `HYPERFRAMES_PYTHON` for direct HyperFrames commands. |
| Models fail to download | Check internet access on the **first** TTS run; repeat after a successful download. |
| HyperFrames transcription does not match scripted word | Check the scene narration for acronyms, numbers, punctuation, or mispronunciation; retry with a clear script or a better ASR model. The renderer never invents word timings. |
| `Cannot read script JSON` | Save **only** the valid JSON object; remove markdown fences and any trailing "Facts to verify" text. |
| `unknown template` / `unknown effect` | Use only the six templates and seven SFX values listed above. |
| `highlight: phrase not found` | Copy the exact phrase from the scene's `say` text into `highlight`. |
| Video is not exactly 15/30/60 seconds | `--target` only changes checker warnings; actual timing comes from generated speech and gaps. |
| 30-second reel only exports 10 seconds | You used `--draft`. Remove it for full production. |
| Background music is missing | Confirm a supported audio file exists under `assets/music/`. |
| Render is slow | Use `--draft` first; CPU generation and full-resolution rendering require more resources. |
| Need to rerun after editing text/voice | Rerun the render. Cached TTS is keyed by text and voice; changed text synthesizes a new sample. |
| Finished video appears overwritten | Different scripts can share a title-derived slug; use a distinct `title` or back up the prior output. |

If debugging a failure, report **OS/version, Node version, HyperFrames version, command run, and the last error message**. Avoid sharing private API keys (none are needed for this application).

## 13. Updates, maintenance and limitations

### Update the app

From your existing clone:

```bash
cd "$HOME/ClaudeCreate"
git status --short
git pull --ff-only
npm install
npm test
```

If you have uncommitted local changes, `git pull --ff-only` may refuse to proceed; preserve them or review them before updating. Re-running `npm install` is normally safe. Keep the local `.venv` containing the `kokoro-onnx` and `soundfile` runtime packages; if deleted, recreate it using §2.5. Do not delete caches unless you need to regenerate models or timing data.

### Free disk space selectively

- `out/` contains your **finished videos**, thumbnails and previews: back them up before deleting.
- `.cache/voices/` contains expensive-to-recreate Kokoro audio/timing cache: keep it if you rerender frequently.
- `.reel-work/` contains intermediate generated compositions and media; remove old subfolders only after securing finished exports.
- `node_modules/` can be reinstalled but requires new package downloads. A `.venv/` with HyperFrames' Kokoro ONNX runtime is used by the app; recreate it using §2.5 if absent or corrupted.
- The program is **not** a web service; no application server, subscription, paid API key or externally hosted inference is required.

### Known limitations

- Full real HyperFrames Kokoro→HyperFrames Whisper→HyperFrames video→FFmpeg production still needs local verification.
- Only six included scene templates; no automatic stock footage, image search or photorealistic AI video.
- Built-in voice samples are English; other languages need compatible voice, phonemization and alignment support and have not been verified.
- Some voice/model packages need an internet download the first time they are used.
- Voice timing is per scene; actual final runtime can differ from the rough word-count estimate.
- Music licensing and factual verification remain the user's responsibility.
- No graphical desktop UI yet; current interface is command-line.

**Speech engine:** [docs/HYPERFRAMES_VOICE.md](docs/HYPERFRAMES_VOICE.md)

**Development guide:** [CLAUDE.md](CLAUDE.md) · [STYLE.md](STYLE.md) · [docs/SCRIPT_SPEC.md](docs/SCRIPT_SPEC.md) · [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

**Repository:** https://github.com/SaridakisStamatisChristos/ClaudeCreate


## Production verification (genuine models)

To run the **real** Kokoro → Whisper → HyperFrames → FFmpeg test on Ubuntu/Linux Mint:

~~~bash
sudo apt-get install -y ffmpeg python3 python3-venv espeak-ng
python3 -m venv .venv
.venv/bin/python -m pip install kokoro-onnx soundfile
npm install
npm run test:real
~~~

This uses the short two-scene fixture in `examples/verification_short.json`, with no speech or video mocks. The machine may need to download local model weights on the first run. The test writes `reports/real-verification.json` and MP4 exports under `out/claudecreate-real-pipeline-verification-draft/`. Run `npm test`, `npm run test:integration` and `npm run test:hyperframes` separately for quick tests, mock FFmpeg integration, and real animation with synthetic captions respectively. **None of those three proves Kokoro or Whisper execution.**

Read [the verification levels, evidence, GitHub Actions workflow and remaining production blockers](docs/VERIFICATION.md). Do not describe the application as production-ready until all Level 5 requirements are independently verified.


**Audit:** See [production completion technical audit](docs/PRODUCTION_AUDIT.md) for observed defects, fixes, evidence levels and remaining acceptance gates.


## Experimental: script-directed visual scenes

The `directed_scene` template adds deterministic, script-controlled SVG primitives (`circle`, `rect`, `line`, `text`), object IDs, normalized-time animations, and camera pan/zoom. Existing templates, TTS, word-level captions and FFmpeg exports are preserved. The generated JSON is **data, not executable JavaScript**.

Start from [`examples/directed_network.json`](examples/directed_network.json), then run:

```bash
node bin/reel.mjs check examples/directed_network.json --target 15
node bin/reel.mjs render examples/directed_network.json --draft --target 15
```

See [Directed Scenes guide](docs/DIRECTED_SCENES.md) for every supported property, validation rule and current limitations. This is a first graphics milestone, **not yet full artistic production readiness**. AetherMotion and other video repositories remain separate.

For automated storyboarding with object-level motion instructions, use [`prompts/CLAUDE_REEL_DIRECTED_MASTER_v1.2.md`](prompts/CLAUDE_REEL_DIRECTED_MASTER_v1.2.md). The original `CLAUDE_REEL_MASTER.md` remains available for template-only workflows.


### Illustrated vector scenes (experimental v0.2)

The `directed_scene` renderer now supports `ellipse`, `polygon`, numeric Bézier `path` segments and eight curated vector `icon` symbols in addition to the original four primitives. It also supports local linear gradients, stroke drawing, relative object movement, and matched full-scene backgrounds. No arbitrary SVG, external illustration API or additional video engine is required.

```bash
node bin/reel.mjs check examples/directed_illustrated.json --target 15
node bin/reel.mjs render examples/directed_illustrated.json --draft --target 15
```

[Open the illustrated scene example](examples/directed_illustrated.json) and [v1.3 production prompt](prompts/CLAUDE_REEL_ILLUSTRATED_MASTER_v1.3.md). The established TTS/rendering path remains unchanged, and these illustrations are not yet equivalent to character animation or realistic filmmaking. Automated rendering acceptance and manual artistic review must be reported separately.


### Compound illustration workflow (experimental v0.3)

ClaudeCreate now supports hierarchically grouped SVG objects (`type: "group"`), sibling painter-order layers (`layer: -20..20`), and object motion along structured Bézier curves (`property: "pathProgress"`). Use this to animate an illustrated house, a city block, or a machine as one object and independently animate its components. Scene JSON is still validated data; it is not executable model-generated code.

```bash
npm test
node bin/reel.mjs check examples/directed_compound_city.json --target 15
node bin/reel.mjs render examples/directed_compound_city.json --draft --target 15
```

Read the [compound scene specification](docs/DIRECTED_COMPOUNDS.md) and use the [compound storyboard prompt](prompts/CLAUDE_REEL_COMPOUND_MASTER_v1.4.md) for more directed visual variety. The [A City in Motion JSON fixture](examples/directed_compound_city.json) combines layered buildings, a moving sun, a traveling energy particle, and connected neighborhoods. The dedicated [real compound render workflow](.github/workflows/compound-e2e.yml) tests actual local Kokoro/Whisper/HyperFrames MP4 production, not mocks. This is still 2D procedural illustration, not articulated character animation or photorealistic video.


### Cinematic vector atmosphere (experimental v0.4)

Script-directed animation now supports full-height two-colour sky gradients, deterministic environmental particles (stars, fireflies, mist, rain), and bounded native-SVG shadow/glow effects on individual shapes or compound groups. Environmental movement is bound to the same paused GSAP timeline as the visual objects, so all effects are reproducible by frame. It remains fully local; no AI image API, external assets, or new runtime package is required.

```bash
npm test
node bin/reel.mjs check examples/directed_atmosphere_city.json --target 15
node bin/reel.mjs render examples/directed_atmosphere_city.json --draft --target 15
```

The complete [atmosphere and depth guide](docs/DIRECTED_ENVIRONMENTS.md), [four-environment city demo](examples/directed_atmosphere_city.json), and [v1.5 scene-writing prompt](prompts/CLAUDE_REEL_ATMOSPHERE_MASTER_v1.5.md) explain how to create layered authored scenes. This is improved editorial illustration and stylized motion graphics, **not** character acting or photorealism. The demo runs shorter than a calibrated 15-second reel.


### Character-led stories and clip-safe transitions (v0.5)

The `directed_scene` visual language now includes a reusable articulated `character` SVG primitive with independent head, arms and legs, configurable clothing and skin palettes, and semantic `props.performances` actions (`walk`, `wave`, `nod`, `cheer`). A walking gesture can be combined with a previous `x` or `pathProgress` tween to move the character through the drawing stage.

To avoid HyperFrames clipping animations at scene boundaries, a scene may declare a bounded incoming `transition` (`fade`, `wipe-left`, `iris`). ClaudeCreate creates two matching, frame-seekable transition halves: the previous scene is covered as it ends; the next scene is revealed from the identical colour as it starts. Existing scripts without a transition continue to use hard cuts.

```bash
npm test
node bin/reel.mjs check examples/directed_story_v05.json --target 15
node bin/reel.mjs render examples/directed_story_v05.json --draft --target 15
```

See [the full acting and transition contract](docs/DIRECTOR_V05.md), [A City Comes Alive example](examples/directed_story_v05.json), and [v1.6 director prompt](prompts/CLAUDE_REEL_DIRECTOR_MASTER_v1.6.md). The real [v0.5 end-to-end workflow](.github/workflows/director-v05-e2e.yml) must complete successfully before this build is accepted as an actual narrated MP4. This is still stylized 2D animation, not realistic lip-synchronized actors.
