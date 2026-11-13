# ClaudeCreate — Local AI Reel Maker

Create vertical Instagram Reels and landscape YouTube videos from a `script.json` file, **without calling Claude, a paid AI service, or a cloud render API while producing the video**.

**Workflow:** Use ordinary/free Claude Chat to write the JSON script → save it locally → validate → synthesize voice with Kokoro → render animated scenes with HyperFrames → mix/export with FFmpeg.

> **Current status:** The original JSON v1 validator and six templates remain available. On the experimental v0.2 feature branch, four opt-in editorial templates, secure local asset staging, real short HyperFrames smoke tests, and an 8.4-second draft with synthetic test audio are implemented and CI-verified. **A full end-to-end reel using actual Kokoro speech and HyperFrames together still needs testing on a properly configured local machine.** Do not assume all systems are verified just because the source tests pass.
>
> **Internet is needed initially** to download Git/Node/Python packages, browser dependencies, and Kokoro (and possibly faster-whisper) model weights. Once installed and cached, the intended production workflow is local-only. Claude Chat itself remains an online service used separately to author the script; the renderer does not invoke it.

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
| Python | **3.11 or 3.12 recommended** | Kokoro, sound effects, analysis |
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
  ffmpeg espeak-ng libsndfile1 \
  python3 python3-venv python3-pip
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

**Python version:** Prefer Python 3.11 or 3.12 for the current Kokoro stack. If your system default is newer/unsupported, install a compatible interpreter using your distribution's supported method (or a Python version manager) and use `python3.12 -m venv .venv` instead of `python3 -m venv .venv` below. Do not replace the operating system's system Python.

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

The commands below assume your working directory is the repository root (the folder containing `package.json`, `requirements.txt` and `config.json`).

### 2.4 Install JavaScript/HyperFrames dependencies

```bash
npm install
```

This installs the versions allowed by `package.json`, including HyperFrames, GSAP and Three.js. You do **not** need to fork HyperFrames or separately host its rendering service.

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

### 2.5 Create the Python environment and install Kokoro

Use one of the following to create the local environment:

```bash
# Use this if python3 is version 3.11 or 3.12:
python3 -m venv .venv

# Otherwise, if you installed Python 3.12 separately, use:
# python3.12 -m venv .venv
```

Then install the project requirements into that environment:

```bash
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install -r requirements.txt
```

The requirements include `kokoro`, `numpy`, `soundfile` and `faster-whisper` (a local timestamp fallback). Package installation may pull in larger machine-learning dependencies. If an installation fails, record the **first meaningful error**, the Python version, and the exact package that failed before making changes.

Check that Kokoro imports from the correct environment:

```bash
.venv/bin/python -c "from kokoro import KPipeline; print('Kokoro import OK')"
```

**Important:** Python packages being installed does not mean Kokoro's model weights and voice data are cached. A first speech-generation run can download them automatically.

### 2.6 First-time download / initialization

Do this **while connected to the internet** so that the chosen Kokoro voice and any local alignment model can be cached. Generate a short voice sample:

```bash
.venv/bin/python tools/tts.py \
  --text "An interesting idea starts with a question." \
  --voice af_heart \
  --output /tmp/claudecreate-first-voice.wav
```

A successful command writes a WAV file and JSON timing metadata to the terminal. You may listen to the WAV file using your usual media player. If Kokoro's timing data is insufficient, the application uses local faster-whisper, which may also need a one-time model download. The full `voice-sample` command below can prewarm several voices.

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
├── src/                           # validation and compositions
├── tools/                         # Kokoro, SFX, style analysis, smoke tests
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

The exact slug is derived from the script title. Two scripts with the same normalized title may write to the same output folder, so use distinct titles or back up finished videos before re-rendering. `node_modules/`, `.venv/`, `.cache/`, `.reel-work/` and `out/` are Git-ignored and are **not stored in GitHub**.

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
| `No module named kokoro` | Verify `.venv/bin/python` exists, then rerun `.venv/bin/python -m pip install -r requirements.txt`. |
| `espeak` / phonemizer error | Install `espeak-ng` and ensure `espeak-ng --version` works. |
| Models fail to download | Check internet access on the **first** TTS run; repeat after a successful download. |
| `Could not align all word timestamps` | Ensure a plain, pronounceable English `say` string; keep punctuation reasonable. The code may need local faster-whisper; alignment is not faked. |
| `Cannot read script JSON` | Save **only** the valid JSON object; remove markdown fences and any trailing "Facts to verify" text. |
| `unknown template` / `unknown effect` | Use only the six templates and seven SFX values listed above. |
| `highlight: phrase not found` | Copy the exact phrase from the scene's `say` text into `highlight`. |
| Video is not exactly 15/30/60 seconds | `--target` only changes checker warnings; actual timing comes from generated speech and gaps. |
| 30-second reel only exports 10 seconds | You used `--draft`. Remove it for full production. |
| Background music is missing | Confirm a supported audio file exists under `assets/music/`. |
| Render is slow | Use `--draft` first; CPU generation and full-resolution rendering require more resources. |
| Need to rerun after editing text/voice | Rerun the render. Cached TTS is keyed by text and voice; changed text synthesizes a new sample. |
| Finished video appears overwritten | Different scripts can share a title-derived slug; use a distinct `title` or back up the prior output. |

If debugging a failure, report **OS/version, Node version, Python version, command run, and the last error message**. Avoid sharing private API keys (none are needed for this application).

## 13. Updates, maintenance and limitations

### Update the app

From your existing clone:

```bash
cd "$HOME/ClaudeCreate"
git status --short
git pull --ff-only
npm install
.venv/bin/python -m pip install -r requirements.txt
npm test
```

If you have uncommitted local changes, `git pull --ff-only` may refuse to proceed; preserve them or review them before updating. Re-running `npm install` and the Python requirement command is normally safe. Do not delete caches unless you need to regenerate models or timing data.

### Free disk space selectively

- `out/` contains your **finished videos**, thumbnails and previews: back them up before deleting.
- `.cache/voices/` contains expensive-to-recreate Kokoro audio/timing cache: keep it if you rerender frequently.
- `.reel-work/` contains intermediate generated compositions and media; remove old subfolders only after securing finished exports.
- `node_modules/` and `.venv/` can be reinstalled but require new package downloads.
- The program is **not** a web service; no application server, subscription, paid API key or externally hosted inference is required.

### Known limitations

- Full real Kokoro→HyperFrames→FFmpeg end-to-end production still needs local verification.
- Only six included scene templates; no automatic stock footage, image search or photorealistic AI video.
- Built-in voice samples are English; other languages need compatible voice, phonemization and alignment support and have not been verified.
- Some voice/model packages need an internet download the first time they are used.
- Voice timing is per scene; actual final runtime can differ from the rough word-count estimate.
- Music licensing and factual verification remain the user's responsibility.
- No graphical desktop UI yet; current interface is command-line.

**Development guide:** [CLAUDE.md](CLAUDE.md) · [STYLE.md](STYLE.md) · [docs/SCRIPT_SPEC.md](docs/SCRIPT_SPEC.md) · [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

**Repository:** https://github.com/SaridakisStamatisChristos/ClaudeCreate


## 14. Experimental editorial illustrated mode (v0.2 feature branch)

**Branch:** feature/editorial-illustrated-v0.2. Do not merge or modify main without owner approval. This mode is opt-in and preserves the original six templates and unversioned v1 scripts. The new four templates are editorial_split, editorial_text_card, illustration_motion and video_card. The documented v2 envelope requires BOTH schema_version = 2 and mode = "editorial_illustrated". Do not add v2 fields to unversioned v1 JSON. For exact keys, see [v2 spec](docs/EDITORIAL_ILLUSTRATED_V0_2_SPEC.md), [script spec](docs/SCRIPT_SPEC.md), and [acceptance evidence](docs/EDITORIAL_V0_2_ACCEPTANCE.md).

### Install the feature branch on Linux Mint / Ubuntu

Use the existing full Linux installation procedure in Sections 1–3 above (Node 22+, npm, Python 3.11/3.12, FFmpeg/FFprobe, espeak-ng, Kokoro requirements, HyperFrames browser installation). For a fresh checkout:

~~~bash
git clone https://github.com/SaridakisStamatisChristos/ClaudeCreate.git
cd ClaudeCreate
git switch feature/editorial-illustrated-v0.2
npm install --no-audit --no-fund
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements.txt
npm test
npm run test:integration
npm run test:hyperframes
~~~

Use the Python setup notes above if your distribution requires a separately installed Python 3.12. Ensure FFmpeg and its ffprobe utility are on PATH. Kokoro model downloads and browser/package installation happen at setup; normal media files are resolved strictly from the repository's local assets directory.

### Create a v2 script and try a short draft

Start with [complete 15-second target example](examples/editorial_v2.example.json), [small scene-type example](examples/editorial_stage_c.json), and [free Claude Chat prompt](prompts/CLAUDE_EDITORIAL_REEL_MASTER.md). Original, project-created illustrations are included in assets/editorial/. To use your own pictures, place licensed or self-authored PNG/JPEG/WebP files inside assets/ and reference them as relative assets/... paths. No remote URLs, file:// paths, parent traversal, SVG or symlink escape are allowed; missing media is a hard error.

~~~bash
npm run reel -- check examples/editorial_v2.example.json --target 15
npm run reel -- preview examples/editorial_v2.example.json --draft --target 15
npm run reel -- render examples/editorial_v2.example.json --draft --target 15
~~~

**Render safety:** --draft produces 540×960 portrait and 960×540 landscape with a hard ten-second visual bound. The --target setting changes checking estimates and warnings; it does **not** force exact audio duration. Do not invoke a longer full render until the owner approves. Caption timestamps in real production come from Kokoro or its verified local alignment fallback, not proportional word splitting. All ten templates use the existing CLI flags and audio/export system.

The framed player is intentionally generic; video_card is presently **image-backed only**. Local MP4 clip input is rejected rather than assuming reproducible browser seeking. The image pan, zoom and layered parallax are camera/layer effects—not independently animated human figures. Independent walking, lip sync or gestures require supplied sprites, separated motion layers or an independently validated local video pipeline.

### Verification and known gaps

~~~bash
npm test
node tools/editorial_hyperframes_smoke.mjs
node tools/editorial_draft_smoke.mjs
~~~

The first command tests strict schema, HTML escaping, media security and legacy regressions. The second makes a **real 2-second HyperFrames render** at draft resolution and tests multiple stills. The third renders a **real 8.4-second HyperFrames scene sequence**, creates both FFmpeg MP4 orientations, extracts six stills, verifies FFprobe duration/resolution, and records two-pass loudness measurements using a **synthetic tone**. It does **not** validate real Kokoro narration or generated speech timestamps. Both rendering tests run in GitHub Actions and attach ephemeral artifacts. Visual review of all the exported stills still needs human sign-off.

The established Python integration test uses synthetic WAVs and a dummy renderer; it must not be described as full Kokoro/HyperFrames verification. A complete actual Kokoro-to-Instagram v2 production test, fully disconnected network run, source-audio/music licensing checks and independent art review are **not yet completed**. Continue to use the feature branch until those gates are satisfied. The original v1 Claude prompt remains at prompts/CLAUDE_REEL_MASTER.md.
