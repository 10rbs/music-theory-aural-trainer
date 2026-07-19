---
name: add-exercise
description: Add a new drill/exercise type (dictation, rhythm, written theory, new aural drill) to the exercise registry. Use whenever creating or extending practice drills or M5+ course-qualification exercises.
---

# Add an exercise

Exercises are plugins behind one contract (`src/core/exercises/types.ts`).
Adding one must not touch existing exercises.

## 1. Core definition first

Create `src/core/exercises/<id>.ts` implementing `ExerciseDef<P, R>`:

- `id`: kebab-case, stable forever (it's the attempts key in IndexedDB — renaming
  orphans user history).
- `interaction`: pick from `'multiple-choice' | 'pitch-match' | 'note-entry' | 'rhythm-tap' | 'written'`.
  A new interaction kind means a new panel component (step 3) — reuse existing kinds when possible.
- `next(rng)`: pure. All randomness through the injected `Rng` (`seededRng` in tests).
  Audio content goes in `playback` as a `PlaybackSpec` (`core/playback/spec.ts` has
  `melodic`/`harmonic` builders) — never raw frequencies. Written questions omit `playback`.
- `grade(question, response)`: pure. Return `score` 0..1 — use fractional scores for
  partial credit (per-note dictation credit, rubric scoring), not just 0/1.
- Note spelling for prompts/answers comes from `core/theory/keys.ts` (`spellScale`,
  `tonicName`) — never hand-write note names with ASCII # / b.

Register it in `core/exercises/registry.ts`.

## 2. Tests before UI

Minimum coverage (mirror `exercises.test.ts` patterns):
- determinism: same seed → identical question
- shape invariants over ~50 seeds (choices unique, answer present, midi in range 36–96)
- grade: correct → `{correct: true, score: 1}`; wrong → 0 with the answer named in `explanation`
- partial credit boundaries if score is fractional

## 3. UI wiring

- Existing interaction kind: nothing to do — `DrillRunner` renders it via the
  registry and `/drill/$exerciseId` just works, including home-page stats.
- New interaction kind: add a panel component in `src/features/drills/` and a
  branch in `DrillRunner` mapping the `interaction` value to it. Panels receive
  the question + a `result` and call `onAnswer(response)` exactly once.

## 4. Attempts

`DrillRunner` already records attempts (append-only) and fires `statsEvents`.
If the exercise records outside DrillRunner (like scale practice does), copy the
`recordAttempt` + `statsEvents.dispatchEvent(new Event('attempt'))` pattern from
`features/practice/PracticeView.tsx` so streaks and dashboards stay live.
