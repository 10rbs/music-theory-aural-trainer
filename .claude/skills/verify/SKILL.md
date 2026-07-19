---
name: verify
description: How to run and verify this app end-to-end — dev server, drill flow, metronome timing, tuner states, practice completion, PWA, and what can only be tested by a human. Use before committing any change with a runtime surface.
---

# Verify Aural Trainer

## Launch

Dev server via `.claude/launch.json` config "dev" (Vite, port 5173). All URLs sit
under the base path: `http://localhost:5173/music-theory-aural-trainer/`.
Production build check: `npm run build`, optionally `npm run preview` (port 4173).

## Per-surface checklist

**Drills** (`/drill/interval-id`, `chord-quality`, `scale-id`)
- 4 choices render; answering disables buttons, shows Correct/Not-quite feedback,
  reveals the right answer, bumps session score; Next loads a fresh question.
- Home cards show updated `n/m correct` after reload (IndexedDB persistence).

**Metronome** (`/metronome`)
- Start → beat dots cycle 0..n-1. Measure cadence: sample `.beat-dot.active`
  transitions via `javascript_tool`; intervals should match 60000/bpm ms within
  ~±20ms once settled (ignore early samples — background-tab throttling delays
  visuals, not audio).
- Changing bpm/signature/subdivision while running restarts cleanly; navigating
  away stops the click.

**Tuner** (`/tuner`)
- Idle state shows the privacy note + enable button. Do NOT click enable in the
  sandbox pane — mic capture is blocked there; permission/active/denied logic is
  covered by unit tests and human testing.

**Practice** (`/practice`)
- Three items with properly spelled notes (♯/♭ glyphs, e.g. harmonic minor shows
  its raised 7th). Mark done → button flips to ✓, streak badge updates live,
  home card shows n/3, state survives reload.

**Streak/migration** — to simulate a v0 user: plant `aural-trainer:stats:v1` in
localStorage, `indexedDB.deleteDatabase('aural-trainer')`, reload; imported streak
and per-mode stats must appear.

**Console** — `read_console_messages` with onlyErrors after each flow: must be empty.

## Human-only (flag in the PR, don't fake it)

- Audible quality: synth tone, click voices, volume balance
- Real-microphone tuner accuracy against a reference pitch
- Mobile/iOS: PWA install, AudioContext resume on gesture, mic in installed mode
