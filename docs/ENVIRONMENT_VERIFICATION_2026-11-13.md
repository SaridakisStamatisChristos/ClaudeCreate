# ClaudeCreate v0.4 — Atmosphere and depth, verified checkpoint

**Date:** 13 November 2026  
**Branch:** `feature/production-verification` — deliberately unmerged  
**Successful genuine video workflow:** https://github.com/SaridakisStamatisChristos/ClaudeCreate/actions/runs/43516417946  
**Archived video artifact:** https://github.com/SaridakisStamatisChristos/ClaudeCreate/actions/runs/43516417946/artifacts/14080818696  
**Illustrated example:** [A City Through Four Skies](../examples/directed_atmosphere_city.json)

## Implemented

- `src/directed-environment.mjs`: strict per-scene sky/particle schema; deterministic seeded fog, stars, fireflies and rain; object-level shadow/glow validation; defensive runtime bounds
- `src/directed.mjs`: renders back and front atmospheric layers, filter definitions, transparent SVG over scene-wide gradients
- `src/directed-art.mjs` and `src/directed-layout.mjs`: independently filtered basic, art and compound-group shapes
- `src/directed-runtime.mjs`: two frame-seekable GSAP atmospheric drift timelines, one foreground and one background, no runtime randomness or asynchronous clock
- `src/composition.mjs`: same full-height sky gradients across the entire portrait scene, with validated-colour fallback for malformed direct HTML calls
- `tests/directed_environment.test.mjs`: deterministic output, injection rejection, colour fallback, shadow bounding, time-based motion and old-scene compatibility
- `prompts/CLAUDE_REEL_ATMOSPHERE_MASTER_v1.5.md`: machine-readable atmosphere and lighting instructions for a scriptwriting model
- `.github/workflows/atmosphere-e2e.yml`: authentic offline TTS/render/export and FFprobe+sampled-pixel verification

The established six templates plus `directed_scene`, HyperFrames, Kokoro, Whisper, GSAP, Three.js and FFmpeg remain in place. This work does not import another video repository or add commercial AI rendering services.

## Measured evidence

GitHub Actions **43516417946** succeeded. It installed local model packages, ran the tests, generated actual speech and videos, probed the media streams, sampled the frames and checked the compiled artwork.

| Measure | Result |
|---|---|
| Node regression suite | **43 passed, 0 failed** |
| JSON schema check | Passed; **one warning** for four scenes versus the 15-second scene-count recommendation |
| Actual portrait MP4 | **540×960**, **10.000 seconds**, H.264 + AAC |
| Actual landscape MP4 | **960×540**, **10.000 seconds**, H.264 + AAC |
| Audio | **48 kHz**, measured integrated loudness **−14.19 LUFS** |
| Sampled sky colours near the top | `(18,29,54)`, `(18,61,67)`, `(5,16,39)`, `(19,37,59)` |
| Vertical sky colour differences | **112.0, 55.8, 36.7, 49.3** mean per-channel values |
| Scene/frame variety | Four time-separated decoded video frames had distinct hashes |
| Compiled evidence | Four atmospheric scene layers and targeted object/group shadows found |
| Final job conclusion | **Success** |

The command used `--target 15` with `--draft`. **10 seconds is the actual duration**; the target flag is not an exact-duration setter. The scene-count recommendation remains a warning. No claim of a calibrated full 15-second finished reel is made.

## Visual inspection

I inspected eight actual video frames extracted at 0.50, 1.80, 2.90, 4.15, 5.45, 6.75, 7.90 and 9.25 seconds. The sunrise and homes now sit under a warm full-frame sky and drifting mist. The energy scene has teal atmospheric fireflies. The neighborhood has legible night stars. The final rising skyline has diagonal rain and darker compositional depth. The atmosphere changes materially with the narrative and no longer looks like one blank background recycled four times.

### Remaining limitations

The illustrated objects themselves remain simple icons and geometric primitives; there is no expressive human character motion, hand-drawn scenery or articulated animation. The sky gradients and SVG shadows add depth but do not equate to cinematic volumetric lighting. The landscape video remains a reframe, not an independently directed cinematic layout. The test of distinct frames and colours does not establish story quality, intelligibility or commercial-grade motion. This version was evaluated as a working **editorial vector animation engine**, not a complete general-purpose animation studio.

## Next quality frontier

A subsequent iteration could add scene-to-scene transitions, richer illustrated subject libraries, reusable character rigs and stronger distinct landscape storyboards. Each should receive an independent rendered-video test and explicit visual review rather than being called complete because code compiles. Preserve backward compatibility, isolate all work on the development branch, and do not merge to `main` without approval.
