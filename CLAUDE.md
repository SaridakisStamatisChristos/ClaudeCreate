# ClaudeCreate working rules

Read **STYLE.md** and **docs/SCRIPT_SPEC.md** before any change.

- Local-first: no Claude API, paid services, HyperFrames cloud/publish.
- Never modify script schema silently; update spec, examples, tests, and changelog.
- Commands should be quiet and show errors; avoid dumping generated files/logs.
- Prefer short deterministic `--draft` tests at 540×960; never test-render >10 seconds without explicit permission.
- Before production changes, run `npm test`; use `npx hyperframes doctor`, `lint`, and `check` when installed.
- Preserve source assets/credits, avoid reference content or logos.
- No reference reels: do not invent metrics or falsely claim visual equivalence.
- During phased work, report `PHASE N DONE` with three concise summary lines.
