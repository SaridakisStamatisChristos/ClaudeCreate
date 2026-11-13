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

`reel check` emits **errors** for unknown templates/effects, invalid accent, missing highlight phrase, a `say` exceeding 16 words, invalid template props, malformed handle, and malformed schema. **Warnings** only: >10 words, scene count outside 20–40, estimated total outside 45–75s. Estimated duration uses default 145 WPM; actual duration uses audio measured per scene, including 0.12s pauses.
