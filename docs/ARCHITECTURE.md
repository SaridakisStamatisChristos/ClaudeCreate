# Architecture and verification

**CLI:** `bin/reel.mjs` parses commands and delegates strict script validation to `src/spec.mjs` and HyperFrames composition creation to `src/composition.mjs`.

**Speech:** `tools/tts.py` uses the open-source Kokoro KPipeline to generate local 24 kHz mono WAV speech. Word timing comes from Kokoro's predicted token timestamps where complete. If incomplete, locally-installed faster-whisper generates word-level alignment; missing aligned words stop production with a clear error rather than fabricating word times. Speech segments are SHA-256 cached by voice/text/version.

**Video:** Each template is a timed HTML clip with a registered paused GSAP timeline. A single caption component builds word spans, reveals them at exact timestamps and colors the matching highlight. 3D scenes use a local `three.module.js` copy with deterministic time-based animation and a CSS fallback if WebGL fails. No CDN resources are referenced. The generated HyperFrames project resides in `.reel-work` and is not a server app.

**Audio:** FFmpeg places each voice/sfx file using sample-aligned per-scene delays, optionally includes a provided music track, and runs measured two-pass `loudnorm` with −14 LUFS / −1.5 dBTP target. The normalized track is muxed into vertical MP4; a blurred, darkened landscape reframe is created by FFmpeg. Thumbnails and caption are extracted/written afterwards.

**Style:** `tools/style_scan.py` analyzes references offline at 4 fps, measures scene-cut counts, and emits up to two 5×5 contact sheets per reel. Font and position estimates need human review. No unsupported claims of automatic typography detection.

**Testing:** `node --test` exercises the JSON schema, six template emission, and escaping, without TTS models or network. Full integration must be tested on a machine with the HyperFrames CLI and Kokoro weights installed. Never interpret static green tests as proof a video was rendered. `--draft` bounds render to <=10s.

**Current known limits:** Default Kokoro voice examples are English; other languages require compatible phonemization and may not align. Full rendering is CPU/GPU intensive. Actual cuts, style and WPM cannot be derived from references until videos are supplied. User-provided music licenses are the user's responsibility. Kokoro and faster-whisper download model assets once unless already cached; no paid inference API is used.
