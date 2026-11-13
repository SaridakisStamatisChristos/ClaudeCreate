# ClaudeCreate production verification

Checkpoint: development branch `feature/production-verification`. Level 4 genuine execution and Level 5 automated production-length verification have now passed. **Manual artistic acceptance and final release-readiness remain open; do not promote to `main` without explicit user approval.**

## Evidence levels

| Level | What must execute | Command / evidence |
|---|---|---|
| 1 Static | Syntax, script contract and unit tests | `npm test`, `node --check` |
| 2 Mock integration | Real FFmpeg with synthetic WAV and mock HyperFrames | `npm run test:integration` (NOT Kokoro) |
| 3 Real components | Actual HyperFrames Kokoro WAV, whisper.cpp transcription, audio duration/sample rate, exact words | `npm run test:real`, `reports/real-verification.json` |
| 4 Real end-to-end | Two animated templates + actual narration + word-level captions + FFmpeg portrait/landscape MP4 | `npm run test:real`, video artifacts and ffprobe metadata |
| 5 Production | 15/30/60-second scripts, 1080×1920 portrait and landscape playback and subjective intelligibility/visual checks | Automated 15s, 30s, 60s production jobs PASS; manual quality acceptance OPEN |

## Ubuntu / Linux Mint dependencies

~~~bash
sudo apt-get update
sudo apt-get install -y ffmpeg python3 python3-venv espeak-ng
python3 -m venv .venv
.venv/bin/python -m pip install kokoro-onnx soundfile
export HYPERFRAMES_PYTHON="$PWD/.venv/bin/python"
# Install Node 22+ from an official Node distribution if not already installed
node --version
npm ci
npm ls hyperframes gsap three --depth=0
npx hyperframes tts --list
npx hyperframes transcribe --help
npm test
npm run test:integration
npm run test:hyperframes
npm run test:real
~~~

`npm run test:real` is **not** part of the lightweight default test suite. It may download Kokoro and the Whisper `small.en` model. Internet access is needed only for first-time package/model installation, not for inference. Some Linux installations also require Chromium or Playwright browser dependencies used by HyperFrames. Use `npx hyperframes doctor` to diagnose a broken installation; review its actual output before changing system packages.

The first real CI attempt, [run 43407025515](https://github.com/SaridakisStamatisChristos/ClaudeCreate/actions/runs/43407025515), verified Level 1/2 and the real HyperFrames visual smoke test but failed to synthesize narration because `kokoro-onnx` was absent. This is an observed dependency, not an inferred one. The next CI iteration installs it before repeating the genuine test.

The actual-model test uses `examples/verification_short.json`. It first loads a local Kokoro voice and invokes the real TTS plus Whisper CLI with no test doubles. It records WAV media properties, word-level timestamps, full MP4 stream metadata, and whether rerendering reuses cached WAV files. Captions are generated from those timestamps by the existing composition engine. If the real recognizer omits or adds words, the test **must fail**, rather than inventing alignment.

A successful `npm run test:hyperframes` proves video rendering only with synthetic word timing; a successful `npm run test:integration` proves FFmpeg outputs only with mocked TTS and rendering. Only the independent `npm run test:real` can promote speech/video evidence to Level 3/4.

## GitHub Actions

The standard `.github/workflows/validate.yml` is the fast validation suite. `.github/workflows/real-e2e.yml` runs on pushes to this feature branch or via manual dispatch. It installs FFmpeg, espeak-ng and HyperFrames' required Python `kokoro-onnx` runtime, then runs the full model test, and uploads reports, transcripts, audio and MP4 evidence even if the test fails partway. A green Actions run with the exact commit identifies the successful runtime; the mere presence of the workflow is not proof it ran.

Verify uploaded files by playing the actual MP4: spoken text, captions, scene progression and transitions must be visually/audibly inspected before Level 5 claims. FFprobe checks alone cannot prove speech intelligibility or visible scene continuity.

## Known remaining risks

- Direct dependency versions and the transitive graph are pinned by committed `package-lock.json`; `npm ci` is part of CI.
- TTS output and Whisper can vary across platforms/models; exact word matching intentionally fails when pronunciation or tokenization differs.
- Concurrent synthesis of the same cache key is not yet protected by an inter-process lock.
- A successful 10-second draft does not establish full-resolution 15/30/60-second reliability.
- A model download blocked by bandwidth, disk or runner capabilities must be reported as a real blocker, not as a passing test.


## Verified production updates — 13 November 2026

- [15-second-class full-resolution production](https://github.com/SaridakisStamatisChristos/ClaudeCreate/actions/runs/43409053603): GitHub CI success, eight scenes, genuine narration/FFmpeg exports.
- [30- and 60-second-class full-resolution production](https://github.com/SaridakisStamatisChristos/ClaudeCreate/actions/runs/43409912649): both jobs passed, with 15- and 30-scene fixtures respectively. These verify export reliability, **not visual sophistication**; templates were repetitive.
- [Latest baseline validation](https://github.com/SaridakisStamatisChristos/ClaudeCreate/actions/runs/43410533721): passed at previous checkpoint `319c08b`.
- [Script-directed graphics render](https://github.com/SaridakisStamatisChristos/ClaudeCreate/actions/runs/43455758830): 22 unit tests and genuine 9.867-second procedural demo, portrait/landscape H.264/AAC, 48 kHz audio; six distinct frame samples. See [directed milestone report](DIRECTED_VERIFICATION_2026-11-13.md). This is an *additional small demonstration*, not yet a production-length visually diverse reel.

Automated successes do not replace manual visual and listening acceptance. Avoid overstating the readiness of the declarative graphics renderer.
