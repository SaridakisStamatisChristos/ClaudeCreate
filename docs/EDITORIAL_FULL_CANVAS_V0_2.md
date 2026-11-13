# ClaudeCreate v0.2 — Full-canvas editorial correction

**Branch:** feature/editorial-illustrated-v0.2

## Intended output

The screenshot supplied by the owner was a visual inspiration for the **finished video scene**, not an app/player UI to show inside another video. The earlier 940×700 embedded-player implementation was incorrect and is superseded here.

The image or illustrated layers now fill the **whole portrait video**, 1080×1920 in production / 540×960 in draft. Animation is applied to that artwork directly. Any kicker, headline or actual word-timed caption is composited on top of the visual, with safe margins and a lower contrast gradient. No inset card border, mock play icon, scrub/progress bar, username or player shell appears inside these editorial scenes.

| Scene type | Correct output |
| --- | --- |
| editorial_split | Full-screen illustrated animation with integrated lower headline |
| illustration_motion | Full-screen image / transparent layers, bounded motion, optional label |
| video_card | Full-screen animated image, name retained for compatibility only |
| editorial_text_card | Full-screen parchment typography |
| Six classic v1 templates | Unchanged |

For experimental v2 scripts, omit player_chrome or set it to false. Requesting true is now a validation error rather than silently constructing the disallowed interface. Existing local image path protections, Kokoro timestamp pipeline, FFmpeg outputs, CLI and audio constraints remain unchanged. MP4 source input is still disabled until deterministic seeking is verified.

## Verification and limitations

Run npm test, npm run test:integration, npm run test:hyperframes, node tools/editorial_hyperframes_smoke.mjs and node tools/editorial_draft_smoke.mjs on the feature branch. Inspect GitHub Actions short video and still artifacts: all illustrated scene boundaries must be edge-to-edge, with no caption/title collision. The smoke test uses synthetic voice timing and test-tone audio. It does not prove the genuine Kokoro production pipeline.

Do not render over 10 seconds at 540×960 without permission. Do not merge into main without owner approval. The earlier nested-player preview artifacts are historical results and are **not** acceptable references for this corrected design.
