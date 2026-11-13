# ClaudeCreate v0.2 — Acceptance Matrix
**Branch:** `feature/editorial-illustrated-v0.2`
**Status:** These are planned tests, not yet completed.

## Compatibility and schema
- [ ] Original unversioned v1 `examples/dummy.json` and `examples/templates.json` pass with unchanged rules and visual output.
- [ ] All six legacy templates remain usable in new v2 editorial scripts.
- [ ] V2 requires explicit schema_version:2 and mode:editorial_illustrated; original v1 rejects extra v2 fields.
- [ ] All four new templates validate strict props; invalid templates, props, 17-word scenes, bad accents, unknown SFX and missing highlight fail with concise errors.
- [ ] 15-, 30-, 60-second checker warnings and CLI semantics remain unchanged.

## Media and security
- [ ] Valid local PNG/JPEG/WebP images are staged into the generated composition.
- [ ] Reject absolute paths, parent traversal, remote URLs, symlink escapes, bad extensions, missing media and invalid layer depth/count.
- [ ] No unescaped HTML/script from title, headlines, captions, labels, filenames, or other props.
- [ ] Local MP4 support is either verified at frame-level or explicitly documented as unsupported until resolved.

## Visual and deterministic output
- [ ] At least six still frames visually inspected at different timestamps, including full text lengths.
- [ ] Warm-paper editorial styling, serif typography, accented phrase, upper player and lower text are visible, balanced and readable.
- [ ] Captions do not overlap the headline or player and are readable at draft/full resolution.
- [ ] Pan/zoom appears across frames, does not expose blank borders, and is stable on repeated captures at identical timestamps.
- [ ] Original test illustrations created/licensed for this project, no reference-video reuse or impersonating branding.

## Rendering, audio, export
- [ ] `npm test` passes, plus real 1-second HyperFrames smoke test with ffprobe.
- [ ] A <=10-second draft at 540x960 renders from new scene types, with correctly timed captions.
- [ ] A local audio-backed test produces playable portrait/landscape MP4, thumbnail A/B, captions and credits.
- [ ] Actual Kokoro TTS and word timestamps are verified end-to-end OR marked BLOCKED (not misreported).
- [ ] FFmpeg loudness measurement recorded, target -14 LUFS, not blindly claimed met.
- [ ] Offline production verified after dependency/model downloads OR marked NOT RUN.

## Documentation and preservation
- [ ] A full editorial v2 example JSON and rights-cleared media fixture are committed.
- [ ] New free-Claude v2 prompt exists; existing v1 prompt left unchanged.
- [ ] README, schema docs, style docs and architecture notes explain exact commands and compatibility.
- [ ] All changes remain on the feature branch, with verified commit SHAs; main untouched.
- [ ] No full-length rendering without user approval; no merge without explicit instruction.

**Verdict format:** PASS (measured), FAIL (observed), BLOCKED (missing prerequisite), NOT RUN. Code lint and synthetic smoke tests never count as proof of full genuine Kokoro+HyperFrames operation.

### Development commands
~~~bash
git branch --show-current
npm test
npm run test:integration
npm run test:hyperframes
# After code and original fixture are implemented:
npm run reel -- check examples/editorial_v2.example.json --target 15
npm run reel -- preview examples/editorial_v2.example.json --draft --target 15
npm run reel -- render examples/editorial_v2.example.json --draft --target 15
~~~
