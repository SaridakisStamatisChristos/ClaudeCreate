# ClaudeCreate v0.4 — Atmosphere and Depth

This is a backward-compatible extension of the existing local-first `directed_scene` renderer. It adds **environmental art direction**, not a new template or video backend. The original primitive and compound objects, relative animations, path following, narration, captions, HyperFrames, Kokoro, Whisper and FFmpeg are preserved.

## Full-height sky backgrounds

Each `directed_scene` may optionally define:

```json
"environment": {
  "sky": { "top": "#081428", "bottom": "#8E526C" }
}
```

The `sky` colours must be hex `#RRGGBB` strings. The top-to-bottom gradient covers the **whole 1080×1920 composition scene**, not just the internal 900×900 vector artboard. The SVG backdrop becomes transparent when `sky` is present so the colours do not form a visible rectangular seam. Existing scenes without `environment` retain the original flat background and SVG backdrop.

## Deterministic environmental particles

A scene may optionally add `particles` in its environment:

```json
"environment": {
  "sky": {"top":"#06152D","bottom":"#314D6F"},
  "particles": {
    "type": "stars",
    "count": 40,
    "seed": 34217,
    "color": "#E6F6FF",
    "opacity": 0.65,
    "driftX": -25,
    "driftY": 15
  }
}
```

The `type` must be one of:

- `stars` — irregularly sized small discs, soft scattered night lights
- `fireflies` — paired central dots and faint halo rings
- `mist` — low-opacity ellipses forming layered fog
- `rain` — thin diagonal strokes falling through the scene

Limits: `count` is an integer from 1 to 60, `seed` an integer from 0 to 999999, `opacity` a finite number from 0.05 to 0.8, and `driftX` and `driftY` finite numbers from -160 to 160 (SVG units across the whole scene). A scene may use sky, particles, both or neither.

All particle positions, sizes and opacities are computed by a fixed seeded algorithm **once when compiling the scene**, independent of `Math.random`, frame times and model-generated scripts. The renderer emits two SVG groups (back and front of the main drawing). Paused GSAP timelines translate these layers at different rates over the actual scene duration. HyperFrames can seek any frame reproducibly. There is no timer, external image request, particle video clip, shader dependency, dynamic code execution or runtime generation cost per frame.

## Shadow and glow depth

Any existing basic object, art primitive or compound `group` may add:

```json
"shadow": {
  "color": "#F3B76D",
  "blur": 18,
  "dx": 0,
  "dy": 0,
  "opacity": 0.55
}
```

Shadows are native SVG `feDropShadow` filters with local per-object IDs; they travel with the shape or group and inherit its transforms. A zero-offset coloured blur acts as a **subtle glow** around luminous shapes; an offset darker blur creates **depth beneath a house, object or character**.

Mandatory bounded fields: six-digit `color`, `blur` 0–22, `dx` and `dy` -32..32, `opacity` 0.05–0.8. The compiler refuses unknown fields. The renderer also validates these bounds before interpolation if it is called without the normal CLI check.

Shadows and gradients are composited by the browser. Use them sparingly; nested shadows multiply effects and increase rendering costs. If many glowing objects are needed, shadow their parent group instead of every child.

## Executable v0.4 example

[**A City Through Four Skies**](../examples/directed_atmosphere_city.json) demonstrates four distinct environments over the same proven compound-city architecture:

1. **Morning mist:** warm dawn gradient, drifting thin fog and a glowing sun over assembled buildings
2. **Energy at twilight:** teal sky, firefly glimmers, luminous panels and a particle travelling along a real Bézier wire
3. **Connected homes at night:** deep navy sky, deterministic stars and an animated neighborhood network
4. **Rain above the future skyline:** overcast gradient, diagonal rain, lit windows and rising buildings

```bash
npm ci
npm test
node bin/reel.mjs check examples/directed_atmosphere_city.json --target 15
node bin/reel.mjs render examples/directed_atmosphere_city.json --draft --target 15
```

Generated files appear in `out/a-city-through-four-skies-draft/`. This is an **~8–10 second short demo**, not a calibrated 15-second Instagram reel, so the `--target 15` checker can issue normal length warnings.

## Security and verification

The object and atmosphere grammars are finite and strict. There is no raw SVG, arbitrary CSS, `filter` URL, procedural shader, remote media URL or event-handler property in the JSON contract. Invalid identifiers, colors, huge particle counts, non-finite coordinates, out-of-range blur/opacity and unknown properties fail validation. Runtime markup is generated with bounded numeric values and validated colours.

The dedicated `tests/directed_environment.test.mjs` covers four atmospheres, deterministic seeded output, shadows, safe invalid-input fallbacks, real full-scene gradient markup, and GSAP motion registration. A dedicated real FFmpeg/HyperFrames/Kokoro workflow also renders and checks actual portrait and landscape MP4s.

**Quality limitations:** atmospheric dots and fog are still simple vector drawing, not cinematic volumetric lighting; no articulated actors, detailed face/body motion, realistic weather simulation, image synthesis or automatic scene comprehension is claimed. The landscape version is still a reframe rather than an independently storyboarded 16:9 composition. The best metric remains manual review of the rendered video alongside repeatable technical tests.
