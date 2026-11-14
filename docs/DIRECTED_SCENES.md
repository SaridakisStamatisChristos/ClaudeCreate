# Script-directed scenes (experimental v0.1)

ClaudeCreate now accepts a seventh template, `directed_scene`. It is **an additive feature**; the six existing templates and Kokoro/Whisper/HyperFrames/FFmpeg pipeline remain unchanged.

A `directed_scene` uses a safe JSON description of SVG artwork. It cannot run arbitrary JavaScript, import remote assets, or execute model-generated expressions. Its camera and object motion is evaluated on a paused GSAP timeline, so the renderer can seek to any time/frame.

## Script format

Use the existing top-level script format, narration, highlights, sound effects, captions and title. In a scene:

```json
{
  "template": "directed_scene",
  "say": "An idea becomes a network.",
  "highlight": "network",
  "illustrative": true,
  "sfx": "pop",
  "props": {
    "background": "#071823",
    "objects": [
      {"id": "seed", "type": "circle", "x": 450, "y": 450, "radius": 55, "fill": "#FFCA63"},
      {"id": "friend", "type": "circle", "x": 720, "y": 300, "radius": 35, "fill": "#66E0FF"},
      {"id": "link", "type": "line", "from": "seed", "to": "friend", "stroke": "#66E0FF", "strokeWidth": 7},
      {"id": "title", "type": "text", "x": 450, "y": 100, "text": "CONNECT", "fontSize": 72, "fill": "#FFFFFF"}
    ],
    "animations": [
      {"target": "seed", "property": "scale", "at": 0, "duration": 0.2, "from": 0.25, "to": 1, "ease": "back.out(1.4)"},
      {"target": "link", "property": "draw", "at": 0.25, "duration": 0.25, "from": 0, "to": 1, "ease": "none"},
      {"target": "friend", "property": "opacity", "at": 0.35, "duration": 0.15, "from": 0, "to": 1, "ease": "power2.out"},
      {"target": "camera", "property": "scale", "at": 0, "duration": 1, "from": 1.2, "to": 0.9, "ease": "power2.inOut"}
    ]
  }
}
```

The coordinate system is a **900×900 logical SVG stage** inside the existing portrait visual area. Coordinates start at the top-left; x increases right, y increases down. `rect` is centered on (x,y), and `line` connects the centers of two non-line objects. Connections render behind the other shapes. Background and object colors must be six-digit hexadecimal colors. A `text` object is SVG text, not generated imagery.

Object types: `circle`, `rect`, `text`, `line`. Supported motion properties: `opacity`, `scale`, `x`, `y`, `rotation`, and line-only `draw` (a stroke reveal). Use target `camera` for zoom, pan and rotation. The optional `initial` object on each primitive and optional `camera` object specify initial properties. Otherwise, the first animation's `from` value supplies the starting state.

Timings `at` and `duration` are **normalized 0–1 fractions of the scene's actual narration-driven duration**, not seconds. This keeps animations synchronized when Kokoro speech duration changes. `at + duration` must be <= 1. Overlapping animations for the same target/property are rejected. The validator caps scenes at 64 objects and 128 animations and rejects unknown keys, unsupported easing, invalid links and invalid colors.

Supported eases: `none`, `power1.out`, `power2.out`, `power2.inOut`, `back.out(1.4)`.

## Reproduce the three-scene demo

After installing the usual project dependencies and Kokoro runtime:

```bash
node bin/reel.mjs check examples/directed_network.json --target 15
node bin/reel.mjs preview examples/directed_network.json --draft --target 15
node bin/reel.mjs render examples/directed_network.json --draft --target 15
```

Outputs are written under `out/an-idea-becomes-a-network-draft/`; the portrait file is `instagram.mp4`, landscape reframe `youtube.mp4`, and two extracted still frames `thumb_a.png` and `thumb_b.png`. Use `npm test` for deterministic validator/compiler tests.

## Current boundaries

This initial milestone is **procedural 2D scene direction**, not general cinematography. It does not yet provide articulated characters, arbitrary paths, raster assets, textures, particles, sophisticated 3D environments, automatic storyboard inference, or aesthetic quality scoring. Script writers must describe the scene and choreography explicitly. The only current cross-project dependency remains **none**: AetherMotion, AetherRendering, AetherPaper, and ClaudeExplainatory are not imported. The existing voice/caption/export pipeline is unchanged. Technical acceptance of SVG output and MP4 exports must be reported separately from subjective visual quality.


## Illustrated vector extension — v0.2

The original v0.1 primitives and `examples/directed_network.json` still work. The v0.2 extension introduces four additional primitives, curated vector symbols, gradient fills, and curved stroke reveals.

Use the complete executable demo at [`examples/directed_illustrated.json`](../examples/directed_illustrated.json):

```bash
npm ci
npm test
node bin/reel.mjs check examples/directed_illustrated.json --target 15
node bin/reel.mjs render examples/directed_illustrated.json --draft --target 15
```

Outputs are written under `out/how-ideas-change-the-world-draft/`. The demonstration is designed to fit within the draft's 10-second ceiling and is **not a calibrated 15-second production fixture**. The real CI workflow additionally checks both the original network example and this new illustrated example.

### New objects

- `ellipse`: `{"id":"sun","type":"ellipse","x":400,"y":350,"rx":150,"ry":100,"fill":"#B6CDE5"}`. Radii are 1–450.
- `polygon`: `{"id":"mountain","type":"polygon","x":400,"y":550,"points":[{"x":-120,"y":70},{"x":0,"y":-120},{"x":120,"y":70}],"fill":"#47647F"}`. Vertices are 3–32 local x/y pairs.
- `path`: explicit numeric SVG path commands, never a raw `d` string. See below.
- `icon`: pre-approved locally drawn vector illustrations. `{"id":"figure","type":"icon","name":"person","x":450,"y":400,"size":220,"stroke":"#FFFFFF","strokeWidth":5}`. Available names: `lightbulb`, `person`, `globe`, `leaf`, `book`, `rocket`, `factory`, `computer`. All are simple line illustrations, not photorealistic characters.

These shapes use the same unique IDs and common `initial` state as other directed objects. Each object's static x/y is an **anchor**; an `x` or `y` animation moves relative to that anchor. The camera still operates across the whole 900×900 SVG stage. A directed scene's background now fills the complete 1080×1920 scene background so the 900×900 drawing stage is not artificially surrounded by a contrasting rectangle.

### Numeric path grammar

```json
{
  "id": "curve",
  "type": "path",
  "x": 450, "y": 500,
  "commands": [
    {"op":"M","x":-200,"y":50},
    {"op":"C","c1x":-80,"c1y":-100,"c2x":80,"c2y":100,"x":200,"y":-30}
  ],
  "fill": "none",
  "stroke": "#FFD080",
  "strokeWidth": 7
}
```

All path coordinates are relative to the shape anchor. Grammar: first `M` (move), then 1–47 segments `L` (line), `Q` (quadratic curve), `C` (cubic curve), optional final `Z` (close). Coordinates must lie between −450 and +450, and the whole path cannot exceed 48 commands. There is **no support** for raw path strings, arbitrary SVG attributes, filters, embedded HTML, JavaScript or URLs.

`fill` is either a six-digit hexadecimal colour or `"none"`. If fill is `"none"`, supply a valid `stroke`. Optional `strokeWidth` is 1–30. A stroked `path` supports the `draw` animation from 0 to 1; stroke length is computed from the browser's actual geometry and is reproducibly sought through GSAP's paused timeline. For a pure hand-drawn reveal, use `"fill":"none"`.

### Linear gradients

Circle, rectangle, ellipse, polygon, and path objects may include:

```json
"gradient": {
  "start": "#14324C",
  "end": "#3B79B5",
  "direction": "diagonal"
}
```

Directions: `horizontal`, `vertical`, `diagonal`. Gradients are scoped to the individual SVG scene with generated local IDs. They do not fetch textures, assets, fonts, or network resources. A gradient requires a filled object, not `"fill":"none"`.

### Security, bounds and quality

The CLI rejects malformed numeric commands, extra attributes, invalid colours, unknown symbol names, self-referential invalid links, invalid easing, overlaps for the same target/property, oversized shapes and unsupported draw properties. All actual SVG markup is created by our fixed compiler, not copied from the LLM output.

Rendering is local and seekable, but **artistic quality still depends on the screenplay**. The symbols are intentionally concise editorial line art and cannot depict realistic people, detailed faces, complex landscapes or automatically generated photorealism. The v0.2 fixture illustrates varied concepts but does not by itself prove arbitrary script-to-storyboard intelligence. No other animation repository is imported.
