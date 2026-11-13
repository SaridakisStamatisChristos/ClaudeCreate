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

## Six interchangeable template examples

| `template` | `props` |
| --- | --- |
| `caption_screen` | `{"big_text":"THINK BIG"}` |
| `counter` | `{"from":0,"to":1000,"prefix":"$","suffix":"","label":"Revenue"}` |
| `app_screen` | `{"app_name":"Analytics","rows":[{"label":"Visits","value":"100k"}],"highlight_row":0}` |
| `callout` | `{"text":"Verified","style":"stamp"}` — also `arrow` / `circle` |
| `object_3d` | `{"shape":"sphere","label":"Growth"}` — also `cube` / `torus` / `stack` |
| `compare` | `{"left":{"label":"Old","value":"8 h"},"right":{"label":"New","value":"2 h"}}` |

For each scene, also supply `say` (4–10 words recommended, max 16), `highlight` (case-insensitive substring within `say`), `illustrative` (boolean), and `sfx` (`whoosh`, `pop`, `tick`, `stamp`, `ding`, `swipe`, or `none`). `highlight` may be empty. If `illustrative=true`, a small `EXAMPLE` badge is overlaid; use it for demonstrations rather than real data. `voice` can be omitted to use `config.json`'s default.

`reel check` emits **errors** for unknown templates/effects, invalid accent, missing highlight phrase, a `say` exceeding 16 words, invalid template props, malformed handle, and malformed schema. **Warnings** only: >10 words per scene, scene count outside ±40% of `(target / 2)`, or estimated spoken length outside ±20% of `target`. Default `--target` is **30 seconds**; supported values are **15**, **30**, and **60**. Estimated spoken length is `sum(scene say words) / 2.4` seconds and intentionally excludes gaps. Actual rendered duration comes from Kokoro's measured per-scene audio plus approximately 0.12s gaps. The script schema and hard validation errors remain unchanged.

Generate scripts using [the canonical Claude master prompt](../prompts/CLAUDE_REEL_MASTER.md). The prompt limits itself to 10 words per scene to avoid warnings, but the application retains the pre-existing hard limit of 16 words for backward compatibility.

Run `npm run reel -- check script.json --target 15` (or `30` / `60`) before a render. The CLI prints both the chosen target and the estimated length.


## Versioned editorial v2 (opt-in; v1 remains unchanged)

Version selection is strict and never inferred. An unversioned JSON script is validated against the original v1 envelope and its six templates, with unchanged say limits, target warnings and original visual style. To select v2, provide BOTH these exact fields:

~~~json
{"schema_version":2,"mode":"editorial_illustrated"}
~~~

They accompany every original envelope field and the required per-scene fields (template, say, highlight, illustrative, sfx, props). An unsupported version, missing/wrong mode, or new props used without v2 are errors. The voice, caption, hashtags, accent, length warnings, CLI flags, default Kokoro voice and exact maximum 16 spoken words per scene remain unchanged.

| Capability | Unversioned v1 | Explicit v2 editorial |
| --- | --- | --- |
| Six existing templates | Yes, unchanged | Yes |
| editorial_split, editorial_text_card | Rejected | Yes |
| illustration_motion, video_card | Rejected | Yes |
| Local image and layer descriptors | Rejected | Yes (per template) |
| MP4 media source | Rejected | Rejected pending reproducible frame seeking |
| Default appearance | Original dark neutral | Warm paper, serif, one accent |
| Kokoro timings, FFmpeg mixing/export | Existing pipeline | Same pipeline |

New scene props: editorial_split requires media and 1–14-word text, optional kicker (≤4 words), exact emphasis substring and boolean player_chrome; editorial_text_card has kicker/text/emphasis; illustration_motion has media and optional label (≤5 words); video_card has image media, optional label (≤5 words) and player_chrome. Media uses kind=image or kind=layers (only in split and illustration_motion), fit=cover/contain, motion=none/zoom_in/zoom_out/pan_left/pan_right/parallax (parallax only with layers). Image formats: PNG/JPEG/WebP. Layers: 2–5 entries with finite depth [-1,1]. All sources must be existing, relative assets/... paths contained by the local repository asset root. Malformed or missing media produces a scene-indexed error.

See [v2 specification](EDITORIAL_ILLUSTRATED_V0_2_SPEC.md), [complete example](../examples/editorial_v2.example.json), and [new prompt](../prompts/CLAUDE_EDITORIAL_REEL_MASTER.md). The [original v1 prompt](../prompts/CLAUDE_REEL_MASTER.md) is preserved.
