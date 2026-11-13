# Script-directed animation — actual verification checkpoint

**Date:** 2026-11-13  
**Repository:** ClaudeCreate  
**Branch:** `feature/production-verification`  
**GitHub run:** https://github.com/SaridakisStamatisChristos/ClaudeCreate/actions/runs/43455758830  
**Artifact ZIP:** https://github.com/SaridakisStamatisChristos/ClaudeCreate/actions/runs/43455758830/artifacts/14052939405

## Actual implemented capability

`directed_scene` extends the existing schema with JSON-defined SVG circles, rectangles, text, lines, distinct IDs, normalized scene-time animation, line draw, and camera movement. Validation is strict; model-produced data is rendered without arbitrary script execution. The existing six templates, HyperFrames-based Kokoro synthesis and Whisper timing, GSAP/Three.js, FFmpeg export, and title/captions remain intact.

The reference fixture `examples/directed_network.json` contains three distinct scenes: an idea expanding to four satellite nodes; connections extending from a hub; and a closing graphical statement. The scenes are not independent samples of a random static template.

## Verified evidence

- 22 of 22 deterministic Node tests passed in the real end-to-end job, including previous tests and directed-scene validation.
- Actual `node bin/reel.mjs render examples/directed_network.json --draft --target 15` completed successfully on GitHub Actions using locally executed Kokoro, Whisper, HyperFrames and FFmpeg. It was **not** a simulated or mock video.
- Real portrait file: `out/an-idea-becomes-a-network-draft/instagram.mp4`, H.264, 540×960, AAC stereo at 48 kHz.
- Real landscape reframe: `out/an-idea-becomes-a-network-draft/youtube.mp4`, H.264, 960×540, AAC stereo at 48 kHz. This is a blurred/background landscape adaptation, **not** an independent landscape composition.
- Measured length: **9.867 seconds**.
- Measured integrated loudness: **−14.24 LUFS**.
- Six of six time-separated sampled video frames had distinct SHA-256 PNG hashes. This demonstrates actual frame changes; it does not by itself prove visual excellence.
- Two frame thumbnails and HTML composition were preserved in the workflow artifact. Visual review confirms a readable diagram growing across time and a different final scene; graphical style remains elementary.

## Limitations and classification

**Implemented and verified:** constrained script-directed procedural 2D visuals, deterministic GSAP timeline, offline video/audio export, nonidentical video frames and local narration.  
**Implemented but not fully accepted:** artistic quality, narration/illustration semantic fidelity on arbitrary scripts, wide variation across many topics, long-form stability.  
**Planned only:** articulated figures and facial expression, richer drawn assets, complex vector/raster storytelling, native landscape scene layout, generated storyboards from topics, automated visual quality scoring, full 15/30/60s visual diversity regression.

The three-scene demonstration deliberately has only ~10 seconds of measured speech. Its `--target 15` check emits two **warnings** about scene count and estimated duration; the demonstration is not a calibrated 15-second delivery. Do not count it as full-length 15-second acceptance.

**GitHub protection:** changes remain in development branch and draft PR 1. No integration with AetherMotion, AetherRendering, AetherPaper or ClaudeExplainatory. No main-branch merge.

## Recommended next milestone

Expand the safe scene language beyond four primitives and support richer scripted diagram/illustration behaviors while preserving deterministic per-frame replay. Develop actual visual acceptance fixtures and subject-specific storyboards, then inspect and refine more than three scenes per video.
