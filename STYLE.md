# Style specification — configurable neutral defaults

Status: **design defaults**, NOT reference measurements. No example reels supplied.
Canvas: 1080 × 1920 (9:16), 30 fps; draft 540 × 960.
Safe edge padding: 90 px horizontal (8.3% width).
Handle: x=96 px, y=102 px; font 28 px, semibold+.
Captions: top=250 px; left/right=90 px; 61 px font, weight 900.
Caption word reveal: actual Kokoro word times; same baseline per phrase.
Caption highlight: exact matching substring shown in one global accent.
Accent: #F8C95A (single color per script; change `accent`).
Background: #111318; neutral foreground: #F6F6F3.
Secondary neutral: #9DA5B0; app panels: #20242C and #30353F.
Main visual zone: x=90–990 px; y=560–1630 px.
Caption screen headline: up to 110 px; strong weight, no glow.
Counter: 154 px numeric type; 1 linear value progression per scene.
Scene entry animation: translate 65 px + fade over <=0.42 seconds.
Continuous motion: slow moving diagonal texture and template-specific progress.
Preferred visible beats: 1–2 seconds; phrase changes timed to voice.
Transition: hard clip cut; each scene has its own entry tween.
Music default: none; optional user-provided music mixed at low volume.
Speech average planning rate: 145 WPM; actual audio controls length.
Voice silence gap: >=0.12 seconds between scenes.
Voice loudness target: −14 LUFS integrated; true peak ≤−1.5 dBTP.
References: `assets/references/`; generated analyses: `assets/references/analysis/`.
Measurement: `npm run style-scan` (4 fps, cut sensitivity 0.30).
Caption sizing and positioning in references: manual contact-sheet review required.
No guessed reference palette, cuts, typography, transitions or WPM.


## Editorial illustrated v0.2 (explicit opt-in only)

The defaults above continue unchanged for v1 and the six legacy templates. When a script explicitly requests schema_version=2 and mode=editorial_illustrated, editorial scenes use parchment #EEE6D9, ink #27211C, neutral secondary #6E6258 and gold-like accent #B18A42 (or script accent). These are original creative defaults, not sampled reference metrics.

Full scene composition uses 1080×1920 canvas, 30 fps; draft 540×960. The flagship scene places a generic framed image/player near (70,260) at about 940×700, a kicker/headline below and a distinct word-caption region around y=1553–1769. Preserve side-safe padding around 90 px. Display headlines use locally available Georgia/Times-style serif fallback; sans-serif UI/captions, warm flat texture and restrained shadow. Highlight a phrase using one accent, never flashing effects. Frame motion is bounded, GSAP timeline-driven and repeatable at absolute frame times. Player progress uses scene timing, not fabricated playback metrics.

Single-image motion does not animate people independently. Layered parallax requires transparent, independently authored sprites. No branded player, Instagram clone, copyrighted screenshot art, external font/CDN, or user-supplied executable code.
