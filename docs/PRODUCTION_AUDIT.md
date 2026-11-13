# ClaudeCreate Production Completion — Technical Audit

**Scope:** existing `ClaudeCreate` repo, branch `feature/production-verification`. The baseline is `main@6c4b0129e11058331b20db93c427982e8e5b0f13`. The ClaudeExplainatory editorial feature was not modified or restored.

## Audit findings and corrections

| Finding | Observed evidence | Implemented action | Verification |
|---|---|---|---|
| Existing Kokoro tests were test doubles | `tests/hyperframes_audio.test.mjs` wrote literal `mock wav`; simulated CLI wrote transcript | Added `tools/real_pipeline.mjs` and real CI workflow | Real-model Level 3/4 pass, [run 43408390497](https://github.com/SaridakisStamatisChristos/ClaudeCreate/actions/runs/43408390497) |
| HyperFrames needs Python backend in this version | Initial real TTS failed: `The kokoro-onnx package is not installed` | Install minimal venv `kokoro-onnx soundfile`, pass `HYPERFRAMES_PYTHON`; removed standalone TTS/faster-whisper remain absent | Actual Kokoro WAV created, real Whisper words matched |
| Transcript alignment silently skipped extra ASR words | Adapter advanced over unmatched transcript tokens | Enforced exact one-to-one scripted/transcribed word sequence | Regression tests and genuine words checked |
| Cached narration WAV could be corrupt | Timing cache previously validated JSON without audio integrity | SHA-256 content hash, adapter-version check, FFprobe sample-rate/channels/duration, atomic timing writes | Corruption recovery and missing-media regression tests |
| Child processes lacked time bounds | No timeouts or group termination for CLI processes | Added bounded runtime and POSIX process-group termination | Static tests pass; timeout kill path not stress-tested |
| Draft rendered <=10s but synthesized entire long script | `prepare` iterated all scenes before clipping video | Bound draft synthesis and composition to first <=10s worth of scenes | Existing integration tests and short real render pass |
| Final AAC sample rate drifted | First real video had **96 kHz stereo AAC** despite 48 kHz processing | Force `-ar 48000 -ac 2` during AAC encoding; verify stream | Independent FFprobe inspection on corrected run: **48 kHz stereo AAC** |
| Direct dependency versions floated | `package.json` used caret ranges | Pin direct `hyperframes=0.9.37`, `gsap=3.14.2`, `three=0.181.0` | `npm install` and CI passed; no committed transitive lockfile |
| First 15s full-resolution target overshot | Real 8-scene/40-word sample rendered **18.6s** | Calibrated reproducible fixture to 32 scripted words, preserving six original templates | Re-run underway; not yet a passing 15s claim |

## Confirmed tests

- **Level 1:** 17 Node unit tests; validation, escaping, script length and six-template HTML emission.
- **Level 2:** FFmpeg portrait+landscape export and loudness with **mocked** HyperFrames and synthetic sine-wave speech.
- **Level 3:** Genuine Kokoro voice `af_heart`; real WAVs at **24 kHz**, actual per-word Whisper timestamps, exact script matching and cached checksum.
- **Level 4:** Genuine animated two-template video with Kokoro narration, Whisper captions and FFmpeg portrait **540×960** plus landscape **960×540** exports. A repeated render used cached WAVs. Corrected deliverables carry **AAC 48 kHz stereo**.
- **Level 5:** **OPEN** pending acceptance of 15/30/60s full-resolution production jobs and listening/visual review.

The verified Level 4 evidence is uploaded as [workflow artifact 14028801290](https://github.com/SaridakisStamatisChristos/ClaudeCreate/actions/runs/43408390497/artifacts/14028801290), including MP4s, narration WAVs, word transcripts, JSON reports and logs.

## Remaining limitations

1. Production test fixtures use real measured duration. `--target` is presently an **estimate/validator hint**, not a duration-constraining render parameter; script calibration must respect measured voice speed.
2. 15/30/60s full-resolution outputs and manual audiovisual inspection still need independent acceptance; CI metadata alone cannot prove visual or spoken quality.
3. Concurrent same-cache-key synthesis, cold-download model error recovery, interrupted renders, large media, disk pressure and long-running memory use have not yet received dedicated adversarial verification.
4. Transitive npm packages are not locked with a committed `package-lock.json`.
5. Other voice languages are not verified; only English `af_heart` is demonstrated.

## Reproduction

```bash
sudo apt-get update
sudo apt-get install -y ffmpeg python3 python3-venv espeak-ng
python3 -m venv .venv
.venv/bin/python -m pip install kokoro-onnx soundfile
npm install
npm test
npm run test:integration
npm run test:hyperframes
npm run test:real
node tools/production_verify.mjs 15
node tools/production_verify.mjs 30
node tools/production_verify.mjs 60
```

No paid inference API is used. Initial package/model downloads still require internet access; runtime inference operates locally. Production status is **not yet complete**.
