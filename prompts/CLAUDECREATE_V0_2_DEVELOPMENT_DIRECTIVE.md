# ClaudeCreate v0.2 — Master Development Directive
## Editorial Illustrated Explainer Mode
Repository: https://github.com/SaridakisStamatisChristos/ClaudeCreate
Target branch: `feature/editorial-illustrated-v0.2`
Reference: the user-provided screenshot showing a painterly animated illustration in a framed player above large editorial serif copy on a parchment background. Use STYLE ONLY, not the original artwork, name, interface branding, text or soundtrack.

## Mission
You are lead software architect, HTML-animation engineer, multimedia pipeline engineer, visual director and independent verifier. Extend the **actual working repository** into a local, free, offline-after-setup generator for editorial illustrated educational reels. Implement code, execute tests, compare frames, fix defects and commit verified checkpoints. Do not substitute diagrams, high-level planning or mock output for working functionality.

## Preflight: respect the existing implementation
1. Check out `feature/editorial-illustrated-v0.2` and verify the checked-out branch. Never change `main` or merge without explicit owner approval.
2. Read `CLAUDE.md`, `STYLE.md`, `README.md`, `docs/SCRIPT_SPEC.md`, `docs/ARCHITECTURE.md` and the companion `docs/EDITORIAL_ILLUSTRATED_V0_2_SPEC.md`.
3. Read current `src/spec.mjs`, `src/composition.mjs`, `bin/reel.mjs`, `tools/tts.py`, `package.json` and tests. Preserve existing code structure where practical.
4. Run `npm test` before editing. Run FFmpeg and real 1-second HyperFrames smoke tests when dependencies are present; report which tests are real and which are simulated.
5. Develop additively; never delete prior templates, features, original assets, documentation or tests.

## Hard constraints
- No paid APIs, Claude calls for rendering, cloud media services, remote CDN, network fetch during production, or external stock scraping.
- Internet may be used at installation time for npm/Python/browser/model downloads. Rendering after local assets/models are cached must be offline-capable.
- Preserve the existing JSON v1 schema and original six templates. Add a **documented, explicitly selected v2 schema**; do not accept unversioned new keys or silently rewrite legacy scripts.
- Keep original CLI behavior: voice-sample, voice-select, check, preview, render, doctor, `--target 15|30|60` and `--draft`.
- Existing script hard errors remain, including 16 words maximum in `say`. Prompt writers should continue targeting at most 10 words per scene.
- Keep actual Kokoro word timestamps, real per-scene voice audio duration, FFmpeg mixing, loudness measurement, both output orientations, thumbnails, caption and credits.
- Escape all script text before interpolation into HTML/JS. Never execute arbitrary JS, CSS or HTML from JSON.
- Validate every media path under an explicitly declared local asset root; reject absolute paths, parent traversal, remote URLs, symlink escape, bad extension and missing files with concise scene-indexed errors.
- Rendering tests are LIMITED to <=10 seconds at 540x960. Do not render longer automatically. Full production requires owner approval.
- Do not claim that camera-motion animation of a flattened photo makes humans walk, talk or gesture. Real independent subject motion requires layered/sprite assets or a supplied video clip.
- Do not automatically merge the feature branch into `main`.

## Artistic objective
Create faceless reels with elegant editorial typography, subtle warm-paper texture, soft shadows, one gold-like accent, a painterly illustration in a framed video-player element, smooth motion, and a large serif headline beneath. Preserve strong readability, easy scanning and Instagram safe margins. Avoid generic AI aesthetics (purple glows, orbs, excessive particles, empty spectacle), as well as copying someone else's brand. The screenshot is inspiration for the *visual composition*, not an asset to copy.

Initial, adjustable design tokens (not measurements from screenshot):
- Canvas 1080x1920, 30fps, draft 540x960.
- Paper #EEE6D9, ink #27211C, secondary #6E6258, accent #B18A42 unless overwritten by script.accent.
- Safe sides around 90px. Reserve top and bottom platform overlay zones.
- Flagship framed player around x=70,y=260,w=940,h=700 at full resolution, with subtle generic player chrome.
- Distinct licensed local serif display font or system font fallback; sans for metadata and captions. No Google Font network request.
- Lower kicker + readable two- to three-line headline; accent highlights chosen words.
- Time-driven camera motion, text reveal and minimal scene entry; useful visual change every ~1-2 seconds; no flashing.
- Maintain word-by-word captions from verified TTS timestamps without collisions with headlines.

## Required scene types — add four, preserve six
1. **editorial_split**: the essential composite. Framed moving illustration/video in upper region + editorial kicker/headline/emphasis below **within the same scene**. This must be the first visual milestone.
2. **editorial_text_card**: kinetic serif typography on warm paper with one emphasized phrase.
3. **illustration_motion**: local still image pan/zoom; support separately layered parallax when supplied. Motion must be deterministic at absolute timeline timestamps.
4. **video_card**: a framed local image/moving clip with a believable, generic progress display. Support an image-backed card first; support local MP4 only after proving deterministic frames/seek under HyperFrames or building local FFmpeg preprocessing.

Use the exact proposed JSON interfaces in `docs/EDITORIAL_ILLUSTRATED_V0_2_SPEC.md`. The implementer may improve internal class/module design, but any public JSON deviation must be explicitly documented and tested. Keep a compatibility table for v1 vs v2.

## Implementation architecture
- Extend `src/spec.mjs` with version-aware strict validators. Unversioned scripts use untouched v1 rules. v2 scripts explicitly select `"schema_version":2` and `"mode":"editorial_illustrated"`. Existing original templates remain legal in v2.
- Put editorial layout/design/media helpers under `src/editorial/` (or another compact, documented module structure). Reuse escaping helpers; don't grow a monolith.
- Build an asset resolver that validates relative paths, realpath containment and sizes, copies only needed media to the generated composition and produces safe sanitized names.
- Compose fixed-timestamp scene states through HyperFrames. Avoid wall-clock-driven randomness and mutating animation that fails on out-of-order frame capture. Use time = frameIndex/30 for progress, zoom, pan and textual reveals.
- For first visual tests, author **original rights-cleared demonstration art** or programmatic local fixtures, not screenshots ripped from Instagram. A layered landscape in original style is enough for visual acceptance.
- For local video clips, test the exact version of HyperFrames in package.json; if browser media seeking fails, preprocess with FFmpeg into frames or another deterministic local format and prove the result.
- Supply readable fallback for unsupported WebGL, absent extra media or font fallback where appropriate, but do not silently replace a required missing image.
- Existing pipeline stays: JSON check -> Kokoro per-scene audio -> word timings -> HyperFrames -> FFmpeg voice/music/sfx -> two-pass loudnorm -> Instagram and YouTube MP4 -> thumbs/caption/credits.
- Add a dedicated `prompts/CLAUDE_EDITORIAL_REEL_MASTER.md` for free Claude Chat, retaining the existing `prompts/CLAUDE_REEL_MASTER.md` for v1.
- Update README, STYLE.md, schema docs and installation instructions after implementation; no unsupported "fully tested" claim.

## Four development stages
### Stage A — Schema and flagship composition
Implement versioned JSON v2 validation; preserve v1 error semantics. Add editorial theme tokens plus `editorial_text_card` and `editorial_split`. Generate rights-cleared test artwork. Show preview stills and tests. Commit stage A on the feature branch.

### Stage B — Illustration motion
Add `illustration_motion` with bounded pan/zoom and optional 2–5 local transparent layers. Motion must be deterministic and not reveal blank canvas. Verify stills at start/middle/end, captions and safe zones. Commit stage B.

### Stage C — Media and real rendering
Add `video_card` (image-backed first), then local MP4 if reproducibly capturable. Test with real one-second HyperFrames video, a <=10-second draft and FFmpeg ffprobe inspections. Keep audio source/test distinctions clear. Commit stage C.

### Stage D — Prompt, documentation, production polish
Provide complete v2 script example and original fixture media; optional Claude prompt; docs, regression coverage, CI, style/performance audit, credits and limitations. Commit stage D. Optional draft PR may be opened for review; **do not merge**.

## Mandatory acceptance and evidence
- Unversioned v1 JSON and six existing templates work unchanged; all original tests pass.
- New v2 JSON validates only with explicit version/mode; invalid fields/media paths rejected.
- Original visual demo shows warm paper, upper illustration/player and clean editorial serif text without captions overlapping.
- Actual <=10-second draft exports at 540x960 with narration, synchronized captions and sound effects if Kokoro is available; otherwise clearly report what remains blocked.
- FFprobe verifies dimensions and runtime; audio loudness is measured rather than assumed.
- No runtime remote asset requests.
- No repeated/random footage and no copying the reference's own artwork or branding.
- No long render >10s without owner approval; no commit to main or merge.

Read `docs/EDITORIAL_V0_2_ACCEPTANCE.md` for precise gates. At the end of each stage, report: branch, commit SHA, files changed, exact tests executed, real vs synthetic evidence, open failures and next action. Quiet logs; don't paste large code files. Do not claim completion before real evidence.

**Begin by inspecting the existing branch and implementing Stage A immediately.**
