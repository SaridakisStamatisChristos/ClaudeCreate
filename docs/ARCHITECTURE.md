# Architecture and verification

**CLI:** `bin/reel.mjs` parses commands and delegates strict script validation to `src/spec.mjs` and HyperFrames composition creation to `src/composition.mjs`.

**Speech:** `tools/tts.py` uses the open-source Kokoro KPipeline to generate local 24 kHz mono WAV speech. Word timing comes from Kokoro's predicted token timestamps where complete. If incomplete, locally-installed faster-whisper generates word-level alignment; missing aligned words stop production with a clear error rather than fabricating word times. Speech segments are SHA-256 cached by voice/text/version.

**Video:** Each template is a timed HTML clip with a registered paused GSAP timeline. A single caption component builds word spans, reveals them at exact timestamps and colors the matching highlight. 3D scenes use a local `three.module.js` copy with deterministic time-based animation and a CSS fallback if WebGL fails. No CDN resources are referenced. The generated HyperFrames project resides in `.reel-work` and is not a server app.

**Audio:** FFmpeg places each voice/sfx file using sample-aligned per-scene delays, optionally includes a provided music track, and runs measured two-pass `loudnorm` with −14 LUFS / −1.5 dBTP target. The normalized track is muxed into vertical MP4; a blurred, darkened landscape reframe is created by FFmpeg. Thumbnails and caption are extracted/written afterwards.

**Style:** `tools/style_scan.py` analyzes references offline at 4 fps, measures scene-cut counts, and emits up to two 5×5 contact sheets per reel. Font and position estimates need human review. No unsupported claims of automatic typography detection.

**Testing:** `node tools/hyperframes_smoke.mjs` runs a real 1-second local HyperFrames rendering smoke test (requires npm packages but not Kokoro). `python3 tools/smoke_test.py` runs the actual FFmpeg export pipeline against deterministic synthetic WAVs and a dummy renderer. This is not a genuine HyperFrames or Kokoro test. `node --test` exercises the JSON schema, six template emission, and escaping, without TTS models or network. Full integration must be tested on a machine with the HyperFrames CLI and Kokoro weights installed. Never interpret static green tests as proof a video was rendered. `--draft` bounds render to <=10s.

**Current known limits:** Default Kokoro voice examples are English; other languages require compatible phonemization and may not align. Full rendering is CPU/GPU intensive. Actual cuts, style and WPM cannot be derived from references until videos are supplied. User-provided music licenses are the user's responsibility. Kokoro and faster-whisper download model assets once unless already cached; no paid inference API is used.


## Editorial illustrated v0.2 branch extension

The original CLI, Kokoro timing/alignment, GSAP/Three classic scene composition, FFmpeg audio, and output packaging remain in place. src/spec.mjs selects strict unversioned v1 or explicit schema_version:2 + mode:editorial_illustrated. The four editorial templates reuse the standard scene timing and caption word metadata.

- src/editorial/assets.mjs verifies media paths against a single approved repository assets root, resolves real paths, checks file/size/extension constraints, and stages only referenced assets in a generated media directory under content-derived safe filenames. No JSON-provided HTML/CSS/JS is executed.
- src/editorial/layout.mjs owns the warm paper palette, upper framed image/player, lower serif headline, layered illustration, video card, and escaped markup. The original dark six-template composition is unchanged.
- src/composition.mjs integrates these v2 layouts into existing HyperFrames HTML, GSAP absolute-time scene animation, image motion, and caption words. Pan/zoom uses at least 9% image-scale overscan and a bounded horizontal motion; explicit layers move at depth-weighted rates. Player progress is time-based.
- Local MP4 clip input is not enabled because deterministic browser frame seeking has not been demonstrated. video_card is an image-backed moving visual today.
- assets/editorial contains project-generated, rights-cleared PNG illustrations: a river landscape and transparent foliage layer. There are no runtime CDN references.

**Test levels are distinct:** npm test covers validation/escaping/security and composition markup. tools/editorial_hyperframes_smoke.mjs creates a genuine 2-second local HyperFrames draft and frame samples. tools/editorial_draft_smoke.mjs creates an actual 8.4-second 540×960 HyperFrames draft using synthetic timing, then FFmpeg two-pass-measured audio tone, 960×540 export, ffprobe, still images and captions/credits. These do NOT prove end-to-end genuine Kokoro narration, word alignment, caption visual signoff, or fully disconnected offline operation. The existing tools/smoke_test.py is a synthetic FFmpeg integration test with a dummy renderer; do not misreport it as a Kokoro video render.

Do not run tests longer than 10 seconds at 540×960 or merge into main without explicit approval. GitHub CI artifacts provide visual material for human review.
