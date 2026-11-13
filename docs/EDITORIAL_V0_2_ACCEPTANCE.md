# ClaudeCreate v0.2 — Acceptance Matrix
**Branch:** `feature/editorial-illustrated-v0.2`
**Status:** Automated Stage A–D tests have been implemented and CI-smoked; the full acceptance checklist remains open for real Kokoro, independent human review, offline disconnect and local MP4 seeking. See measured results below and EDITORIAL_V0_2_VISUAL_AUDIT.md.

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


## Implemented checkpoint and evidence summary — 13 November 2026

The checklist above is the target acceptance standard, not an assertion that every item is approved. The following results were measured in the feature-branch GitHub Actions workflow:

| Gate | Verdict | Evidence / limitation |
| --- | --- | --- |
| Unversioned v1 compatibility and six classic templates | PASS (automated) | Existing Node unit suite runs unchanged |
| Explicit v2 schema and four editorial templates | PASS (automated) | Editorial schema and CLI tests |
| Media traversal, URL, symlink, bad extension, invalid layers | PASS (automated) | Scene-indexed negative tests |
| Escaped text, safe local media staging | PASS (automated) | Node HTML and staged-asset tests |
| Genuine 2-second editorial HyperFrames draft | PASS (measured) | Real renderer with synthetic word timing; ffprobe 540×960 |
| Camera motion and repeat-time still extraction | PASS (automated) | Distinct timestamp frames and matching repeated captures |
| Genuine 8.4-second editorial HyperFrames draft | PASS (measured) | All four new templates plus FFmpeg export |
| Portrait and landscape MP4 + audio stream | PASS (measured) | FFprobe 540×960 and 960×540; synthetic tone only |
| Loudness normalization | PASS (measured) | Two-pass FFmpeg loudnorm and reported final integrated reading; no claim of exact -14 LUFS without value |
| Actual Kokoro voice and aligned word timestamps | BLOCKED | Local Kokoro weights and end-to-end voice test absent in CI |
| Scene-by-scene human artistic review of six stills | NOT RUN | CI attaches frames for manual review; no human visual signoff claimed |
| Fully disconnected production test | NOT RUN | Not demonstrated after disconnect |
| Local MP4 source seeking | NOT RUN | Explicitly rejected until deterministic seek tested |
| Full-length production render / merge main | NOT RUN | Intentionally prohibited without owner approval |

The standalone tools/editorial_draft_smoke.mjs **does not use the production Kokoro voice pipeline** and its audio is a synthesized test tone. Its passing result must not be interpreted as a complete narrated reel. Branch must stay feature/editorial-illustrated-v0.2 until further review.

## Correction to v0.2 creative direction — full-canvas illustration

The owner clarified that the supplied screenshot represents the **finished video itself**, not a player embedded inside a second video. The previous inset-player design is superseded. In all four v2 editorial templates, artwork/typography occupies the full 1080×1920 scene. A lower legibility gradient supports text and synchronized captions over the illustration. There are **no fake playback controls, inset player frames, handles or footers**. The legacy video_card name remains for schema compatibility but its visual is full-frame. Optional player_chrome must be omitted or false; true now fails validation. The original six v1 templates are unchanged.

See [full-canvas correction and testing](EDITORIAL_FULL_CANVAS_V0_2.md). Prior embedded-player screenshots and their visual audits are historical engineering evidence, not approval of the corrected design.
