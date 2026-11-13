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
