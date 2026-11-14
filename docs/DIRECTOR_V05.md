# ClaudeCreate v0.5 — Character acting and scene transitions

This milestone adds a reusable **articulated vector character** and **matched cross-clip scene transitions** to the existing local-first, script-directed renderer. It does not use an additional generative video model, import another repository or execute model-produced drawing code.

## Character as a scene object

Add a `character` primitive inside a `directed_scene.props.objects` array:

```json
{
  "id":"explorer",
  "type":"character",
  "x":450,
  "y":665,
  "size":180,
  "skin":"#F5B38A",
  "shirt":"#E9AA54",
  "pants":"#334E68",
  "hair":"#473348",
  "layer":11
}
```

The character is a fixed, locally compiled SVG illustration with independent head, arms and legs, facial features, and colored clothes. A root character has position in the 900×900 drawing stage; a character inside a parent group uses local coordinates (-450…450). `size` accepts 80–420; all color fields require six-digit hexadecimal values. Optional `layer`, `parent`, `shadow` and `initial` follow the previous compound-object contract. Arbitrary raw SVG, external images, CSS or JavaScript are prohibited.

Each character is rendered as a single scene object named `directed-SCENE-ID` with internally named parts `head`, `arm-left`, `arm-right`, `leg-left` and `leg-right`. The shoulder and hip pivots are encoded in the reusable renderer, not in the script. An AI model generates **only character identities, palette choices, positions and action instructions**; it does not generate joint or path implementation code.

## Semantic performance instructions

An optional `props.performances` array (maximum 24) schedules independent actor performances:

```json
{
  "actor": "explorer",
  "action": "walk",
  "at": 0.17,
  "duration": 0.64
}
```

All timing is normalized to the **individual** scene duration, just like other directed animations. Supported fixed actions:

| Action | Actual joint movement |
| --- | --- |
| `walk` | Alternating left/right arm and leg swings with mild head bob |
| `wave` | One raised, oscillating arm, with gentle opposite-arm movement |
| `nod` | Head rotates down, up and returns neutral |
| `cheer` | Both arms rise and lower, accompanied by head movement |

The rig is 2D and simplified. `walk` is a cyclical walking gesture, not a physically simulated gait; combine it with an ordinary `x` or `pathProgress` animation on the character object to move through space. The action has deterministic fixed joint angles and is evaluated through short adjacent `gsap.fromTo` segments on the paused HyperFrames/GSAP timeline. There is no repeated simulation step, real-time clock, hidden inference or random action generation. Reject unsupported actions, missing/non-character IDs, overlapping action intervals for one actor, out-of-range normalized times and unknown properties. Animations of the entire character via previous `props.animations` remain available.

## Scene transitions across HyperFrames clip boundaries

HyperFrames renders each scene on its own track interval. A tween extending visually across a clip boundary could be clipped. Therefore, a `transition` is specified **on the incoming scene** and compiled into **two matching masks**: an exit animation *inside the previous clip* and an entrance animation *inside the next clip*. This makes the cut reproducible in exported MP4s without changing the established clip timing model or shifting voiceover audio.

```json
{
  "template": "directed_scene",
  "say": "A friendly engineer waves while the energy flows.",
  "highlight": "engineer waves",
  "illustrative": false,
  "sfx": "swipe",
  "transition": {
    "kind": "fade",
    "color": "#102338",
    "duration": 0.6
  },
  "props": {"background":"#112233","objects":[],"animations":[]}
}
```

The above `props.objects` placeholder illustrates the transition location only; real directed scenes require at least one valid object.

`transition` supports the following safe, deterministic transitions:

- **`fade`**: fade to the transition color, hard-cut at full cover, then reveal the next scene
- **`wipe-left`**: slide a full-frame color panel from the left to cover the outgoing scene and slide off the right to reveal the next
- **`iris`**: expand a colored radial cover from center to hide the outgoing scene, then shrink it to reveal the next

Transition data fields are exactly `kind`, `color` and `duration`. The first scene cannot have an incoming transition. Duration must be 0.2–1.2 seconds; it is split equally between outgoing and incoming halves (and clamped to a maximum 38% of either adjacent actual scene duration). The color must be `#RRGGBB`. Every transition controls an overlay **inside the entire scene** at a higher paint depth than captions, characters and environmental particles. No third-party transition videos, CSS injection, external resources or top-level track restructuring are needed.

The half-animations are seekable GSAP tweens, so the renderer can sample arbitrary frame times without playback history. The exit and entry overlays share exactly the same color, preventing mismatched background flickers at the cut. This is a designed **full-color masking transition**, not simultaneous cross-dissolve between two overlapping camera views.

## Demonstration

The [**A City Comes Alive** v0.5 storyboard](../examples/directed_story_v05.json) follows the previously verified atmospheric city illustration through four scenes: a walking explorer at dawn, a waving engineer in a teal energy scene, two neighbors interacting under night stars, and a cheering figure in a rainy skyline. It includes all three transition styles.

```bash
npm ci
npm test
node bin/reel.mjs check examples/directed_story_v05.json --target 15
node bin/reel.mjs render examples/directed_story_v05.json --draft --target 15
```

Results are under `out/a-city-comes-alive-draft/`. The draft render is capped at ten seconds and is **not a guaranteed 15-second calibrated production**.

## Verification and remaining work

`tests/director_v05.test.mjs` exercises schema security, five character rigs, joint keyframes, parent compatibility, three transition styles, timeline placement at exact cuts and legacy fixture compatibility.

`.github/workflows/director-v05-e2e.yml` executes the complete actual Kokoro/Whisper/HyperFrames/FFmpeg pipeline, probes two MP4 orientations and confirms decoded frames on **both sides** of each actual clip boundary. A successful job provides strong evidence that source code, narration and clip boundaries render together; it does not automatically establish professional animation quality.

Limitations: characters are stylized editorial figures, not anatomically realistic or lip-synchronized humans; eyes and mouths do not yet speak in sync with voiceover. Gaits are cycle-based, not physics-based; arms and legs are basic rigs without elbows, hands or complex poses. The landscape export remains a reframe of portrait rather than a dedicated 16:9 storyboard.
