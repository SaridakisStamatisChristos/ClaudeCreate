# ClaudeCreate — local reel-maker

Turn a `script.json` written in any ordinary Claude/ChatGPT chat into finished social videos **locally**. Rendering makes **zero Claude, HeyGen cloud, or paid API calls**. One-time installation and Kokoro model downloads need internet; after setup, TTS/rendering uses local software. Requires Node.js 22+, Python 3.11/3.12, FFmpeg, and a browser supported by HyperFrames.

## Installation (Ubuntu / Linux Mint)

```bash
sudo apt update
sudo apt install -y ffmpeg espeak-ng python3 python3-venv python3-pip git chromium-browser || sudo apt install -y ffmpeg espeak-ng python3 python3-venv python3-pip git chromium
# Install Node.js 22+ via nvm or the official distribution, then:
git clone https://github.com/SaridakisStamatisChristos/ClaudeCreate.git
cd ClaudeCreate
npm install
python3 -m venv .venv
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install -r requirements.txt
npx skills add heygen-com/hyperframes             # optional agent skills; interactive
npx hyperframes doctor
npm test
```

> If `npx skills add` prompts for a selection, select the HyperFrames core skills. The skills are for authoring, not required for `reel render`. CPU Kokoro is supported; model weights and voices are downloaded the first time you synthesize them. Linux Mint often needs `python3.12` installed separately for the virtual environment.

## Four commands

```bash
npm run reel -- voice-sample                     # create several local WAV samples
npm run reel -- check examples/dummy.json         # strict checks; one-line problems
npm run reel -- preview examples/dummy.json --draft # 6–8 PNGs, no video
npm run reel -- render examples/dummy.json --draft  # 540×960, <=10 seconds
```

Pick a default voice with `npm run reel -- voice-select am_michael`, or set a `voice` per script. Full-resolution production is `npm run reel -- render your-script.json` (1080×1920, 30 fps). A draft of a longer script renders only its first ten seconds; production renders the entire validated script. To diagnose installed tools, use `npm run reel -- doctor`.

Outputs go into `out/<title-slug>/`: `instagram.mp4`, `youtube.mp4` (vertical over blurred landscape background), `thumb_a.png`, `thumb_b.png`, `caption.txt`, `CREDITS.txt`. Drafts go in a separate `-draft` folder. Cached speech lives under `.cache/voices/` keyed by the complete text and voice so repeated scripts do not need new synthesis. Work files are in `.reel-work/`; all generated outputs and caches are gitignored.

## Script format

The schema is fixed as supplied. See [docs/SCRIPT_SPEC.md](docs/SCRIPT_SPEC.md) and [examples/templates.json](examples/templates.json). `say` must contain at most 16 words (4–10 recommended), `highlight` must match a substring in it, `accent` is `#RRGGBB`, `sfx` is one of `whoosh/pop/tick/stamp/ding/swipe/none`. Validation warns about 20–40 scenes and 45–75s estimated duration, but does not reject short dummy scripts. A scene marked `illustrative:true` displays an `EXAMPLE` tag. Captions follow the per-word timestamps produced by Kokoro, with optional **local** faster-whisper fallback.

## Appearance, SFX, and local-only operation

The initial style is documented in [STYLE.md](STYLE.md); no reference reels or channel niche were supplied, so its numeric constants are design defaults, **not claimed measurements**. Add reference MP4s under `assets/references/` and run `npm run style-scan` to analyze shot cuts and produce at most two contact sheets per reference. Human review is still required to assess actual caption fonts/positions accurately.

`tools/synth_sfx.py` creates 18 reproducible, original CC0 WAV effects on the first render. If you want natural samples instead, replace them with appropriately licensed WAV files in `assets/sfx/` and update `CREDITS.txt` yourself. Place an appropriately licensed audio file (`.mp3`, `.wav`, `.m4a`, `.flac`, `.ogg`) in `assets/music/` for optional backing music; otherwise none. Voice and sound are mixed locally in FFmpeg and measured using two-pass loudnorm targeting −14 LUFS.

No telemetry or paid APIs are invoked by our code. HyperFrames' local CLI, Chrome, FFmpeg, and Kokoro handle production. Do **not** run `hyperframes cloud`, `publish`, or other online commands. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for testing limitations and local processing.

## Verification

`npm run test:hyperframes` checks a genuine 1-second HyperFrames render after `npm install`. `npm run test:integration` checks the real FFmpeg audio/export path with synthetic speech and a stub renderer (not proof of Kokoro/HyperFrames). `npm test` validates the JSON contract, templates, and HTML escaping without external packages. Integration validation requires `npm install`, the Kokoro model download, and a supported local browser. Use the three-scene dummy with `--draft`, inspect the stills, then inspect its <=10s MP4/ffprobe duration and measured LUFS before producing a full reel. CI runs static tests, a synthetic-audio FFmpeg export smoke test, and a genuine one-second HyperFrames video render; it does not verify the full Kokoro end-to-end path.
