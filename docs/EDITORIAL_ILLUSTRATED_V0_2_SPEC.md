# ClaudeCreate v0.2 — Editorial Illustrated Mode Technical Specification
**Status:** Design/proposed schema **not implemented yet**. Branch `feature/editorial-illustrated-v0.2` only.

## 1. Why v2 needs an explicit opt-in
Current v1 checker rejects additional top-level fields, new templates and unknown props. We must keep v1 stable while adding new features.

- Missing `schema_version` means legacy v1. Preserve exact v1 accepted keys and six templates.
- New v2 requires integer `"schema_version":2` and string `"mode":"editorial_illustrated"`.
- All other top-level fields stay: `title`, `handle`, optional `voice`, `accent`, `caption`, `hashtags`, `scenes`.
- All scene fields remain required: `template`, `say`, `highlight`, `illustrative`, `sfx`, `props`.
- Classic six templates are accepted in v2. New four template names require v2+editorial mode.
- Prompts aim for <=10 spoken words/scene; hard error stays at >16, as on v1.
- All existing target lengths and CLI flags remain unaffected. No implicit migration.

## 2. Media descriptor contract
All illustrated/media templates use a consistent declarative `media` value.

Image example:
~~~json
{
  "kind": "image",
  "src": "assets/editorial/demo-landscape.png",
  "fit": "cover",
  "motion": "pan_left"
}
~~~

Layered parallax example:
~~~json
{
  "kind": "layers",
  "fit": "cover",
  "motion": "parallax",
  "layers": [
    {"src":"assets/editorial/demo-sky.png","depth":-0.5},
    {"src":"assets/editorial/demo-trees.png","depth":0.4},
    {"src":"assets/editorial/demo-foreground.png","depth":0.9}
  ]
}
~~~

Validated fields:
- `kind`: `image`, `video`, `layers`.
- `src`: required for image/video and forbidden for layers; local relative path only.
- `fit`: `cover` or `contain`, default `cover`.
- `motion`: `none`, `zoom_in`, `zoom_out`, `pan_left`, `pan_right`, `parallax` (last valid only for layers).
- `layers`: only for layers mode, 2–5 entries each with validated `src` and finite `depth` in [-1,1].
- image formats PNG/JPEG/WebP, preferably 1080+ source pixels wide. MP4 only after media seeking is verified; reject unsupported formats instead of inventing playback.
- No network URLs, absolute paths, traversal, symlink escapes, SVG with untrusted embedded code, file:// URLs, or missing files. Resolve against a single approved local root with realpath checks. Source assets should not be copied into GitHub automatically.
- All generated video frame capture must be deterministic and reproducible at a given frame index; if browser video seeking fails, preprocess with local FFmpeg.

## 3. New scene templates
These JSON examples are PROPOSED v2 shapes; current v1 validator will reject them until implementation. The images referenced below are original fixture paths that must be supplied during Stage A/B.

### editorial_split
The primary composite image frame above text, all within **one timed scene**:
~~~json
{
  "template":"editorial_split",
  "say":"An illustration can make history feel alive.",
  "highlight":"history feel alive",
  "illustrative":true,
  "sfx":"none",
  "props":{
    "media":{"kind":"image","src":"assets/editorial/demo-landscape.png","fit":"cover","motion":"pan_left"},
    "kicker":"DID YOU KNOW",
    "text":"Ordinary lives shaped extraordinary histories",
    "emphasis":"extraordinary histories",
    "player_chrome":true
  }
}
~~~
Props: `media` required; `kicker` optional max 4 words; `text` required 1–14 words; `emphasis` optional exact substring in text; `player_chrome` optional bool, default true. The visual text and spoken text can differ, but must be coherent. Narration captions go in a non-overlapping region. No copied Instagram/player branding.

### editorial_text_card
~~~json
{
  "template":"editorial_text_card",
  "say":"One small symbol changed mathematical thinking.",
  "highlight":"changed",
  "illustrative":false,
  "sfx":"none",
  "props":{
    "kicker":"ONE DISCOVERY",
    "text":"A small symbol with enormous consequences",
    "emphasis":"enormous consequences"
  }
}
~~~
Props: kicker optional max 4 words; text required 1–14 words; emphasis optional exact substring in text. Serif headline reveal is deterministic, not wall-clock driven.

### illustration_motion
~~~json
{
  "template":"illustration_motion",
  "say":"Imagine a river beside an ancient city.",
  "highlight":"ancient city",
  "illustrative":true,
  "sfx":"whoosh",
  "props":{
    "media":{"kind":"image","src":"assets/editorial/demo-river.png","fit":"cover","motion":"zoom_in"},
    "label":"An illustrative reconstruction"
  }
}
~~~
Props: media required (image or layers only); label optional max 5 words. Still motion includes pan, zoom and parallax of explicit layers, **not automatically generated people or animals moving independently**.

### video_card
~~~json
{
  "template":"video_card",
  "say":"Watch the scene unfold in different layers.",
  "highlight":"different layers",
  "illustrative":true,
  "sfx":"swipe",
  "props":{
    "media":{"kind":"image","src":"assets/editorial/demo-landscape.png","fit":"cover","motion":"zoom_out"},
    "label":"A visual example",
    "player_chrome":true
  }
}
~~~
Props: media required, label optional max 5 words, player_chrome optional bool. Support static-media motion at first; local MP4 must be reproducibly tested. Progress indicator derives from scene time. The card is a generic stylized player, not a simulated real Instagram account.

## 4. Complete v2 envelope (illustrative example, not final reel)
~~~json
{
  "schema_version":2,
  "mode":"editorial_illustrated",
  "title":"The Hidden Power of Zero",
  "handle":"@example",
  "accent":"#B18A42",
  "caption":"The story of a mathematical idea.",
  "hashtags":["#mathematics","#history"],
  "scenes":[
    {
      "template":"editorial_split",
      "say":"An illustration can make history feel alive.",
      "highlight":"history feel alive",
      "illustrative":true,
      "sfx":"none",
      "props":{
        "media":{"kind":"image","src":"assets/editorial/demo-landscape.png","fit":"cover","motion":"pan_left"},
        "kicker":"DID YOU KNOW",
        "text":"Ordinary lives shaped extraordinary histories",
        "emphasis":"extraordinary histories",
        "player_chrome":true
      }
    }
  ]
}
~~~
The example is short on purpose, and the referenced raster fixture is to be generated during implementation. A 15/30/60 second complete reel contains the required number of scenes and narration words.

## 5. Art direction, safety and motion
- 1080x1920 at 30fps; draft 540x960. Start with parchment #EEE6D9, ink #27211C, secondary #6E6258, gold #B18A42 (or script accent).
- Suggested player frame x≈70,y≈260,w≈940,h≈700; generic rounded card, subtle border/shadow/progress. Lower kicker/headline; preserve Instagram top/bottom safe areas and a dedicated caption zone.
- Use a locally available/licensed serif font with an actual fallback; no remote font request.
- Caption component uses Kokoro word timing; do not duplicate/overlap large editorial headline.
- Camera interpolation tied to absolute timeline t=frameIndex/30, zoom about 1.00→1.08, pan ≤~5–7% width with overscan; ensure no uncovered canvas edges.
- Layered parallax offsets by bounded depth with 2–5 distinct image layers. Use original or licensed art; no automatic prompt-to-video fantasy.
- Preserve original voice, timestamp cache, sound effects, two-pass loudnorm, Instagram/YouTube exports, thumbnails, caption and credits.
- Escape JSON content, allowlist style values, resolve media securely; no user-controlled code.
- Keep the current classic style visually unaffected.
- User-provided screenshot is visual reference only. Do not upload or distribute its branded image or soundtrack.

## 6. Verification
See `docs/EDITORIAL_V0_2_ACCEPTANCE.md`. Require strict validation tests and security negative cases, six stills without clipping, real <=10s HyperFrames draft, ffprobe on portrait and landscape outputs, audit of voice-word alignment, and honest offline network assessment. Tests with synthetic speech must not be described as successful Kokoro synthesis. Do not promote to main without owner's instruction.
