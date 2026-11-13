# Compound illustration engine — v0.3

This milestone extends `directed_scene` with grouped vector illustrations, explicit depth ordering, and deterministic movement along numeric Bézier paths. The goal is to make each scene a composed animated illustration instead of a collection of unrelated icons. It builds on the existing local Kokoro → Whisper → HyperFrames → FFmpeg pipeline; it does not integrate AetherMotion or any other repository.

## Compound scene syntax

Every object remains in the existing `props.objects` flat JSON array. Add a `group` object, then give its component shapes a `parent` ID. The group is one animatable GSAP target whose transforms also move its children.

```json
{
  "id": "house",
  "type": "group",
  "x": 450,
  "y": 600,
  "layer": 3
}
```

```json
{
  "id": "walls",
  "type": "rect",
  "parent": "house",
  "x": 0,
  "y": 20,
  "width": 240,
  "height": 180,
  "radius": 8,
  "fill": "#447E91",
  "layer": 1
}
```

The root group x/y is in the 900×900 scene coordinate system. Children use local x/y coordinates from -450 to 450 **relative to their parent**. Nested groups are supported up to four levels. An object can have at most one parent, and only a group can be a parent. Cycles and nonexistent group IDs are rejected. Each object ID remains unique within a scene. The scene remains bounded to 64 total objects, including groups.

Use `layer` for sibling painter order (integer -20 through 20): negative layers draw behind positive layers. Equal-layer connection lines are drawn behind other shapes. The system sorts siblings in a deterministic order, respecting the original JSON sequence where appropriate. Layers apply within a parent, not globally across unrelated parents. Every group can animate `x`, `y`, `rotation`, `scale`, `opacity` and contains all its descendants.

A connection `line` may join two primitive objects only when the line and both endpoints share the **same parent**. A line cannot connect group containers or paths across group boundaries; this avoids detached links when a group transforms. Use a separate animated path for more elaborate connections.

## Motion along a path

Draw a `path` as a fixed local Bézier curve with the existing validated numeric commands. A separate icon, circle, rect or group can then follow that path. The path and the traveler must share the same parent.

```json
{
  "target": "spark",
  "property": "pathProgress",
  "path": "powerPath",
  "at": 0.12,
  "duration": 0.76,
  "from": 0,
  "to": 1,
  "ease": "power2.inOut"
}
```

Progress is normalized from 0 to 1, as are `at` and `duration`. The browser computes the actual SVG path length and position using `getTotalLength()` and `getPointAtLength()`; GSAP evaluates progress on the paused seekable timeline. Path following is independent of wall-clock timers or AI inference. The object's own x/y position acts as its local anchor; path following produces *relative* offsets so it does not jump to the SVG origin. The motion can be played in reverse or sampled by frame.

For determinism, one `pathProgress` segment per object is permitted, and that object cannot simultaneously have explicit `x` or `y` tweens. Rotation, scale and opacity tweens remain permitted. Invalid path IDs, line/path travelers, incompatible parents, out-of-range progress, unsupported easing and overlapping intervals fail schema validation before rendering.

## Executable illustration fixture

[Four-scene **A City in Motion** storyboard](../examples/directed_compound_city.json) demonstrates:

1. A sunrise behind assembled streets, roofs, windows and moving clouds.
2. A solar-powered home with a spark traveling along a visible curved wire.
3. A neighborhood diagram with independently animated links and characters.
4. A growing city skyline with trees and a rising sun.

Each vignette uses the same renderer but different geometry, depth and animation behavior. This is still stylized 2D motion graphics, **not** photorealism or articulated character animation.

```bash
npm ci
npm test
node bin/reel.mjs check examples/directed_compound_city.json --target 15
node bin/reel.mjs render examples/directed_compound_city.json --draft --target 15
```

Video outputs will be placed under `out/a-city-in-motion-draft/`. The fixture is deliberately a short render and must not be called a fully calibrated 15-second production. The complete illustrated pipeline runs locally after dependencies and models are downloaded. No new npm package is required.

## What verification means

The schema and deterministic compiler are exercised by `tests/directed_compound.test.mjs`. The dedicated real rendering workflow should independently test a Kokoro/Whisper/HyperFrames-produced MP4 in both orientations, confirm 48 kHz audio, H.264 video, actual frame changes, and preserve the videos for inspection.

Technical success is **not** equivalent to film-quality illustrations, seamless transitions, authentic lip synchronization or automatic storyboarding. Those remain independent development and acceptance tasks.
