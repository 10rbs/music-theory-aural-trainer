# Architecture

## Stack

- **Vite + React + TypeScript**, TanStack Router (file-based routes via
  `@tanstack/router-plugin`; `src/routeTree.gen.ts` is generated, gitignored).
- **No backend.** Local-first installable PWA; all data in the browser.
- **Runtime dependencies are deliberately minimal**: `react`, `react-dom`,
  `@tanstack/react-router`, plus `idb` (M1) and `vite-plugin-pwa` (M1).
  Adding a runtime dependency requires a reason written in this file or a
  decision record.
- Deploys as static files to GitHub Pages; Docker nginx image is the
  vendor-agnostic escape hatch.

## Functional core, imperative shell

The organizing paradigm of the codebase:

- **`src/core/` — functional core.** Pure, synchronous, deterministic TS.
  No React, no DOM, no Web Audio, no IndexedDB, no `Date.now()`, no timers, no
  randomness without an injected seeded RNG. Everything here is unit-testable
  with plain Vitest.
- **`src/shell/` — imperative shell.** Thin adapters over side effects:
  Web Audio output (`shell/audio/`), mic capture, IndexedDB (`shell/storage/`).
- **`src/features/`, `src/routes/`** — React UI. Orchestrates core + shell.

Rules:
1. `core/` may not import from `shell/`, `features/`, `routes/`, or any browser API.
2. New domain logic (grading, timing math, assignment generation, rubric scoring)
   lands in `core/` first as tested pure functions, then gets a thin UI wrapper.
3. "Today" and "now" are always passed into core functions as arguments.

## Module map (target state)

```
src/
  core/
    theory/        notes, intervals, chords (+ spellChord), scales, keys (M4),
                   transpose.ts (diatonic transposition, MusicXML semantics) (M4.7)
    exercises/     exercise contract, registry, per-drill generators+graders, seeded RNG
    playback/      PlaybackSpec types + builders (notes+beats+bpm → timed events)
    pitch/         detect.ts (autocorrelation/MPM on Float32Array), cents.ts,
                   history.ts (pitch-history graph math)                        (M3/M4.5)
    rhythm/        beat/subdivision timing as pure functions of (bpm, sig, t)  (M2)
    notation/      staff layout math (clefs, diatonic steps, ledger lines)     (M4.6),
                   key-signature.ts (signature accidentals + inline suppression) (M4.7)
    streak.ts      pure streak logic, dates passed in
    register.ts    clef → comfortable register anchoring, shared by scales +
                   warm-ups                                                    (M4.8)
    warmups.ts     generative brass warm-ups (long tones, slurs, arpeggios) +
                   public-domain Arban items; same shape as a scale item       (M4.8)
    assignments.ts date-seeded daily scale assignments; register follows the
                   chosen clef, eligible scale types are a setting             (M4/M4.6)
  shell/
    audio/         context (lazy AudioContext, resume-on-gesture), synth,
                   scheduler (lookahead driver), mic (M3), drone (M4.5)
    storage/       ProgressStore interface, idb-store, migrate-v0
  features/        drills/, tuner/, metronome/, practice/ (+ StaffWithControls,
                   shared with warmup/), warmup/, settings/, stats/
  routes/          __root, index, drill.$exerciseId, practice, warmup
  components/      shared primitives (DropWidget — header pill + drop-down panel)
```

## Exercise contract

Splits *what to play* / *what to ask* / *how to grade* so future drill types
(dictation, rhythm, written theory) plug in without touching existing code:

```ts
interface PlaybackSpec {           // data, not raw freqs — notation rendering can reuse it
  events: { midi: number[]; startBeat: number; durationBeats: number }[];
  bpm: number;
}
interface Question<P = unknown> {
  exerciseId: string;
  playback?: PlaybackSpec;         // absent for written-theory questions
  prompt: P;
  answerKey: unknown;              // opaque to UI, consumed by grade()
}
interface GradeResult {
  correct: boolean;
  score: number;                   // 0..1 — partial credit for dictation/rubrics
  explanation?: string;
}
interface ExerciseDef<P, R> {
  id: string;
  title: string;
  interaction: 'multiple-choice' | 'pitch-match' | 'note-entry' | 'rhythm-tap' | 'written';
  next(rng: Rng): Question<P>;     // pure
  grade(q: Question<P>, response: R): GradeResult;  // pure
}
```

A registry maps `id → ExerciseDef`; the `/drill/$exerciseId` route looks up the
def and renders the component matching its `interaction`.

## Storage

- **Append-only attempt log** in IndexedDB (via `idb`): aggregates (accuracy,
  streak) are always derived. Event logs merge cleanly if cloud sync is ever
  added; mutated counters don't.
- `ProgressStore` interface (`shell/storage/types.ts`): `recordAttempt`,
  `getExerciseStats`, `getStreak`, settings kv, `exportAll`/`importAll`.
- **Schema changes bump the IDB version with an upgrade function.** Attempts are
  never rewritten.
- Global display settings (`clef`, `theme`, `practiceScales`) live in the kv
  store like all settings, so they ride along in backups. The theme is
  additionally mirrored to localStorage (`aural-trainer:theme`) purely so
  `main.tsx` can apply it before first paint — the kv store stays the source
  of truth.
- **Daily completion + streak.** Finishing a scale or a warm-up records an
  append-only attempt (`exerciseId` `scale-practice` / `warmup`) and stores the
  day's completed ids under a date-suffixed kv key (`practice:<date>` /
  `warmup:<date>`, local dates). The streak is derived from attempts by date, so
  any exercise type feeds it — warm-ups (M4.8) needed no schema change, just the
  new id and key. Per-slot octave/key transpose shifts persist under
  `practiceOctaves`/`practiceKeys` and `warmupOctaves`/`warmupKeys`.
- **v0 migration**: one-time import of the vanilla app's localStorage key
  `aural-trainer:stats:v1` (streak + per-mode aggregates). The old key is left
  untouched for rollback. Note: v0 used UTC dates for "today"; the new code uses
  local dates — the migration handles this deliberately (see tests).

## Audio

- Lazy singleton `AudioContext`, created/resumed only inside a user gesture
  (iOS Safari requirement).
- All timed audio uses the **lookahead scheduler** pattern ("A Tale of Two
  Clocks"): a ~25 ms tick schedules events falling in the next ~100 ms at exact
  `AudioContext.currentTime` timestamps. Never schedule clicks with bare
  `setInterval`. Timing *math* is pure in `core/rhythm/`; the driver is shell.
- Tuner mic pipeline: explicit user opt-in button → `getUserMedia` (echo
  cancellation/AGC off) → AnalyserNode → Float32Array frames → pure
  `detectPitch` in core.
- Tuner and metronome are header widgets mounted in the root layout
  (`routes/__root.tsx`), so their audio keeps running across route changes
  (M4.5). The drone (`shell/audio/drone.ts`) is a single sustained oscillator;
  note switches glide frequency instead of restarting.

## Deployment

- GitHub Pages via Actions. **Base path has one source of truth**: `base` in
  `vite.config.ts` (default `/music-theory-aural-trainer/`, overridable with
  `VITE_BASE`). The router reads it via `import.meta.env.BASE_URL`
  (`src/main.tsx`); the PWA scope (M1) must do the same. The Docker image
  builds with `VITE_BASE=/` since it serves at the domain root.
- CI on PRs: typecheck → tests → build (plus core-import-boundary check once
  core/ exists in M1).
