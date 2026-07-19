# Aural Trainer → Music Theory Practice PWA

## Context

The repo currently holds a small dependency-free vanilla-JS ear trainer (interval/chord/scale multiple-choice drills, Web Audio synth, localStorage streak). Brian wants to grow it into a full music theory / aural skills / daily practice app — including a tuner, metronome, and scale routines — that will also help prepare for naval reserve musician course qualifications (official rubrics to be provided later).

**Decisions made with the user:**
- **Stack**: React + Vite + TypeScript, TanStack Router. (TanStack Query skipped — no server, nothing to cache; add later only if sync arrives.)
- **Paradigm**: **Functional core, imperative shell.** All domain logic (theory, exercise generation/grading, streak calc, pitch-detection math, scheduler beat math, assignment generation) is pure, synchronous, dependency-free TS in `src/core/`. All side effects (Web Audio output, mic capture, IndexedDB, DOM/React, timers) live in the shell (`src/shell/`, `src/features/`, `src/routes/`). Core never imports from shell; shell orchestrates core.
- **Data**: Local-first PWA, no backend, $0/month. IndexedDB behind a storage interface so cloud sync can be added later without rewrites.
- **Containerized & vendor-agnostic**: Docker dev environment + multi-stage production build (static files, optional nginx image). Primary deploy: GitHub Pages (free, no new vendor).
- **V1 scope**: port existing drills, chromatic tuner, metronome, scale practice routines, keep daily streak.
- **Future scope the architecture must accommodate** (rubric-gated): sight singing/rhythm drills, melodic/harmonic dictation, written theory quizzes, qualification tracking.
- **Planning persistence**: native in-repo docs, not GSD. M0 commits `docs/PLAN.md` (this plan), `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`, and a `CLAUDE.md` pointing future sessions at them. Same context/token benefit as a framework, zero lock-in.

## Migration approach

Rewrite in place — the app is ~350 lines and ports in one milestone.
1. `git tag v0-vanilla` (archive is git history, not a `legacy/` folder).
2. Scaffold Vite React-TS at repo root; port `src/theory.js` nearly verbatim to TS; split `audio.js`/`drills.js` along the core/shell boundary below; delete `app.js`, `style.css`, `tests/run.html` at parity.
3. Existing localStorage key `aural-trainer:stats:v1` is migrated on first run — **the user's streak survives**.

## Directory layout (functional core, imperative shell)

```
docs/                      PLAN.md, ROADMAP.md, ARCHITECTURE.md, decisions/ (only when contested)
CLAUDE.md                  session entry point → points at docs/
public/icons/              PWA icons
src/
  core/                    ★ FUNCTIONAL CORE — pure TS. No React, no DOM, no Web Audio,
                           no IndexedDB, no Date.now()/timers. Deterministic & unit-testable.
    theory/                notes.ts, intervals.ts, chords.ts, scales.ts, keys.ts (M4)
    exercises/             types.ts (contract), registry.ts, interval-id.ts, chord-quality.ts,
                           scale-id.ts, random.ts (seedable RNG)
    playback/              PlaybackSpec types + spec builders (notes+beats+bpm → timed events)
    pitch/                 detect.ts (autocorrelation/MPM on Float32Array), cents.ts
    rhythm/                scheduler math: beat/subdivision timing as pure functions of (bpm, sig, t)
    streak.ts              pure streak logic (ported from storage.js, takes dates as args)
    assignments.ts         date-seeded daily scale assignment generator (M4)
  shell/                   ★ IMPERATIVE SHELL — all side effects behind thin adapters
    audio/                 context.ts (lazy AudioContext, resume-on-gesture), synth.ts,
                           scheduler.ts (setInterval lookahead driver → calls core/rhythm math),
                           mic.ts (getUserMedia + AnalyserNode capture → Float32Array frames)
    storage/               types.ts (ProgressStore interface), idb-store.ts, migrate-v0.ts
  features/                React per feature: drills/ (DrillRunner, MultipleChoicePanel),
                           tuner/, metronome/, practice/, stats/
  routes/                  TanStack Router: __root (shell/streak), index, drill.$exerciseId,
                           tuner, metronome, practice
  components/              shared primitives
Dockerfile, compose.yaml, .github/workflows/{ci,deploy}.yml, vite.config.ts, vitest.config.ts
```

Enforced rule (ESLint `no-restricted-imports` or dependency-cruiser check in CI): `core/` may not import from `shell/`, `features/`, `routes/`, or any browser API. Future dictation/rhythm/rubric logic lands in core first as tested pure functions, then gets a thin shell/feature wrapper.

## Key designs

**Exercise contract** (`core/exercises/types.ts`) — splits the current `{mode, freqs, playStyle, answer, choices}` shape into what-to-play / what-to-ask / how-to-grade so future drill types plug in:
- `PlaybackSpec` = note events + bpm (data, not raw freqs — reusable for notation rendering later)
- `Question` = `{exerciseId, playback?, prompt, answerKey}`
- `GradeResult` = `{correct, score: 0..1, explanation}` — partial credit ready for dictation/rubrics
- `ExerciseDef` = `{id, title, interaction: 'multiple-choice'|'pitch-match'|'note-entry'|'rhythm-tap'|'written', next(rng), grade(q, response)}` — both `next` and `grade` pure
- Registry maps id → def; drill route renders the matching interaction component.

**Storage** — append-only `Attempt` log in IndexedDB (aggregates derived; event logs merge cleanly if sync is added later). `ProgressStore` interface: `recordAttempt`, `getExerciseStats`, `getStreak`, settings kv, `exportAll`/`importAll` (JSON backup = the $0 "sync" story). One dependency: `idb` (~1.2 kB).
Migration (`shell/storage/migrate-v0.ts`): one-time read of `aural-trainer:stats:v1` → copy streak + per-mode aggregates into kv, leave the old key untouched for rollback. **Deliberately switch "today" from UTC (`toISOString()` in current [storage.js](src/storage.js)) to local dates during migration, with tests** — current code off-by-ones evening practices. Streak *logic* stays pure in `core/streak.ts` (dates passed in as arguments); the store supplies "today".

**Tuner** — mic behind an explicit "Enable microphone" button (never auto-request); `shell/audio/mic.ts` does `getUserMedia` (echo-cancellation/AGC off) → AnalyserNode (fftSize 2048; 4096 for low brass) and emits Float32Array frames; `core/pitch/detect.ts` is the pure autocorrelation/MPM + parabolic-interpolation function (~80 lines, no dependency, unit-tested against synthesized waveforms, <±5 cents). Note + cents needle, adjustable A4 reference (bands tune to 442). UX states: idle/requesting/denied/active; stop tracks on unmount.

**Metronome** — lookahead pattern ("A Tale of Two Clocks": 25 ms tick scheduling audio events 100 ms ahead at exact AudioContext timestamps). Beat/subdivision *timing math* is pure in `core/rhythm/`; the `setInterval` + AudioContext driver is `shell/audio/scheduler.ts`, reused by scale-practice playback and future rhythm drills. BPM 30–260, time signatures, subdivisions, visual beat indicator.

**Scale practice** — `core/assignments.ts`: date-seeded deterministic daily assignment (circle-of-fifths rotation). Feature adds reference playback at tempo; completion recorded as attempts feeding the same streak.

**PWA** — `vite-plugin-pwa`, `registerType: 'autoUpdate'`, full precache (app <1 MB, zero runtime network calls → trivially offline), update toast.

**Testing** — Vitest; port the existing 8 theory tests day one. The FCIS split makes the high-value surface almost entirely pure: generators+grading (seeded RNG), streak (explicit dates), `detectPitch` (synthesized sine at known Hz), rhythm timing math, migration. `fake-indexeddb` for the store. No automated audio-output testing — the synth adapter is thin; mock it in component tests, verify sound manually.

**Docker** — `compose.yaml` dev service (node:22-alpine, bind mount, port 5173); multi-stage `Dockerfile` (build+test → nginx:alpine static). Nginx image is the vendor-agnostic escape hatch; primary deploy stays GitHub Pages.

**CI/Deploy** — `ci.yml`: tsc → vitest → core-import-boundary check → build on PRs; `deploy.yml`: main → Pages. Gotcha handled in M0: base-path trifecta (`base: '/music-theory-aural-trainer/'` in Vite + router basepath + PWA scope).

## Milestones

| # | Ships | Contents |
|---|-------|----------|
| **M0** | Deployed shell + docs | Scaffold, router, Docker, CI + Pages deploy green; commit docs/PLAN.md (this plan), ROADMAP.md, ARCHITECTURE.md, CLAUDE.md |
| **M1** | Parity — replaces current app | core/ + shell/ port, exercise contract + 3 MC drills, DrillRunner, IDB store + v0 migration (streak preserved), PWA installable/offline, tests ported to Vitest; delete old files, tag `v0-vanilla` |
| **M2** | Metronome | core/rhythm math + shell scheduler + metronome feature + tests |
| **M3** | Tuner | core/pitch detect + tests, mic adapter + permission UX, cents display, A4 calibration |
| **M4** | Scale practice + dashboard | core/assignments (date-seeded), reference playback, keys.ts (note spelling — prerequisite for written theory), export/import backup |
| **M5+** | Rubric-gated qual features | Dictation (note-entry), rhythm drills, written theory, curriculum tracking; notation rendering evaluated then (VexFlow vs SVG — ADR) |

Total runtime deps M1–M4: `react`, `react-dom`, `@tanstack/react-router`, `idb`, `vite-plugin-pwa`.

## Risks / watch items

- **iOS Safari**: AudioContext must resume inside a user gesture (preserve current `ensureCtx` pattern in `shell/audio/context.ts`); test installed-PWA mic access on device in M3.
- **Streak timezone fix** can off-by-one migrated `lastPracticeDate` — test deliberately.
- **Base-path trifecta** is the classic broken-Pages-deploy — proven in M0 before real code.

## Verification

- **M0**: CI green; visit the GitHub Pages URL; routes navigate without 404s on refresh; docs committed.
- **M1**: `docker compose up` → drill all three modes end-to-end with audio; verify streak/stats carried over from the old app in the same browser profile; Lighthouse PWA installable; offline reload works; `vitest run` green; import-boundary check green.
- **M2/M3**: metronome click steadiness at 200+ BPM with tab backgrounded; tuner against a reference tone (play a known-frequency tone, assert displayed cents ≈ 0).
- **M4**: same date → same assignment (determinism); export → clear site data → import → stats restored.

## First implementation step (on approval)

M0: tag `v0-vanilla`, scaffold Vite React-TS, copy this plan into `docs/PLAN.md` and write ROADMAP.md / ARCHITECTURE.md / CLAUDE.md, wire Docker + CI + Pages deploy.
