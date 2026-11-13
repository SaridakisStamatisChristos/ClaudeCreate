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
