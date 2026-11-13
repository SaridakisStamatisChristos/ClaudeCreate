# `script.json` — schema v1 (unchanged)

All top-level fields are required except `voice`. No extra fields are accepted.

```json
{
  "title": "Example reel",
  "handle": "@example",
  "voice": "af_heart",
  "accent": "#F8C95A",
  "caption": "A short Instagram caption.",
  "hashtags": ["#example", "#learn"],
  "scenes": [
    {"template":"caption_screen","say":"One insight changes everything.","highlight":"insight","illustrative":false,"sfx":"pop","props":{"big_text":"THINK BIG"}}
  ]
}
```

## Legacy template examples (all preserved)

| `template` | `props` |
| --- | --- |
| `caption_screen` | `{"big_text":"THINK BIG"}` |
| `counter` | `{"from":0,"to":1000,"prefix":"$","suffix":"","label":"Revenue"}` |
| `app_screen` | `{"app_name":"Analytics","rows":[{"label":"Visits","value":"100k"}],"highlight_row":0}` |
| `callout` | `{"text":"Verified","style":"stamp"}` — also `arrow` / `circle` |
| `object_3d` | `{"shape":"sphere","label":"Growth"}` — also `cube` / `torus` / `stack` |
| `compare` | `{"left":{"label":"Old","value":"8 h"},"right":{"label":"New","value":"2 h"}}` |

A seventh template, `directed_scene`, accepts `props.background`, `props.objects`, `props.animations`, and optional `props.camera`; use the detailed [directed-scene contract](DIRECTED_SCENES.md) and the [script-directed prompt](../prompts/CLAUDE_REEL_DIRECTED_MASTER_v1.2.md). This new template is additive: all six templates listed above remain unchanged.

For each scene, also supply `say` (4–10 words recommended, max 16), `highlight` (case-insensitive substring within `say`), `illustrative` (boolean), and `sfx` (`whoosh`, `pop`, `tick`, `stamp`, `ding`, `swipe`, or `none`). `highlight` may be empty. If `illustrative=true`, a small `EXAMPLE` badge is overlaid; use it for demonstrations rather than real data. `voice` can be omitted to use `config.json`'s default.

`reel check` emits **errors** for unknown templates/effects, invalid accent, missing highlight phrase, a `say` exceeding 16 words, invalid template props, malformed handle, and malformed schema. **Warnings** only: >10 words per scene, scene count outside ±40% of `(target / 2)`, or estimated spoken length outside ±20% of `target`. Default `--target` is **30 seconds**; supported values are **15**, **30**, and **60**. Estimated spoken length is `sum(scene say words) / 2.4` seconds and intentionally excludes gaps. Actual rendered duration comes from Kokoro's measured per-scene audio plus approximately 0.12s gaps. The original v1 scene envelope and hard validation rules remain intact; `directed_scene` adds its own strict scene-property validator.

Generate scripts using [the canonical Claude master prompt](../prompts/CLAUDE_REEL_MASTER.md). The prompt limits itself to 10 words per scene to avoid warnings, but the application retains the pre-existing hard limit of 16 words for backward compatibility.

Run `npm run reel -- check script.json --target 15` (or `30` / `60`) before a render. The CLI prints both the chosen target and the estimated length.


## Compound illustration v0.3

The `directed_scene` JSON contract now includes hierarchical `group` objects, an optional per-object `parent` string (referencing a group), and optional integer `layer` (-20…20) to determine drawing order among siblings. Child x/y values are local to their parent (-450…450), while root objects remain in stage coordinates (0…900). Group nesting is limited to four levels and the whole scene to 64 objects; parent cycles and cross-parent line connections are rejected.

A numeric Bézier `path` may serve as a motion track: animate a different object using `{ "target":"spark", "property":"pathProgress", "path":"wire", "at":0.1, "duration":0.75, "from":0, "to":1, "ease":"power2.inOut" }`. Both objects must share the same parent, and the traveler cannot also animate x/y. All timing remains measured-scene-relative and seekable. Only one pathProgress animation per traveler is supported. This feature does not execute model-generated SVG path code.

See [compound semantics and limits](DIRECTED_COMPOUNDS.md), [the verified regression fixture](../examples/directed_compound_city.json), and [the v1.4 scene-generation prompt](../prompts/CLAUDE_REEL_COMPOUND_MASTER_v1.4.md).


## Directed environment and depth — v0.4

A `directed_scene` may optionally include `props.environment`, containing `sky: {top:"#RRGGBB",bottom:"#RRGGBB"}` and/or `particles: {type:"stars"|"fireflies"|"mist"|"rain",count:1..60,seed:0..999999,color:"#RRGGBB",opacity:0.05..0.8,driftX:-160..160,driftY:-160..160}`. The sky gradient fills the full portrait scene, not just the SVG artboard. Particle geometry is deterministically seeded at compile time and animated through the existing GSAP timeline. Individual basic/art objects and compound groups may optionally specify `shadow: {color:"#RRGGBB",blur:0..22,dx:-32..32,dy:-32..32,opacity:0.05..0.8}`. All values are strictly validated; unknown properties fail. No raw SVG/CSS injection, image requests or user-authored scripts are accepted. See [full guide](DIRECTED_ENVIRONMENTS.md) and [working JSON example](../examples/directed_atmosphere_city.json).
