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
