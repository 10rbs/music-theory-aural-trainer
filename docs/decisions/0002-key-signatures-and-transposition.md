# 0002 — Key signatures & transposition: still hand-rolled, no library

**Date:** 2026-07-20 · **Status:** accepted · **Context:** M4.7 (per-slot key
button + key-signature rendering on the daily practice page). Follows up on
[0001](0001-notation-rendering.md), which asked us to record the outcome the
first time richer notation was needed.

## Decision

Add diatonic transposition (`core/theory/transpose.ts`) and key signatures
(`core/notation/key-signature.ts`) as pure, Vitest-tested core modules, rendered
by extending the existing hand-rolled `ScaleStaff` SVG. **Still no VexFlow or
any notation-rendering dependency.**

0001 listed "key signatures" as one of the triggers to re-evaluate VexFlow. Now
that we've built them, the answer is that key signatures did *not* justify the
library — they were ~1 small `core/notation/` module plus a handful of SVG
`<text>` glyphs. The remaining 0001 triggers (rhythmic values, stems, beams,
note entry) are unaffected and still the real re-evaluation point.

## Why it stayed hand-rolled

- **Transposition is letter+accidental math, which `keys.ts` already does.**
  `transpose.ts` reuses the same target-pitch-class → correct-accidental logic
  as `spellScaleDegrees`. An interval carries both `diatonic` (letter-steps) and
  `chromatic` (semitones), matching MusicXML's `<transpose>`, so "up a minor
  third from C" spells E♭, never D♯. One primitive serves all three operations
  the design doc separates: instrument transposition, practice transposition
  (the key button), and octave displacement (`shiftOctaves` now routes through
  it).
- **A key signature is a short ordered list of accidentals at fixed staff
  positions.** The per-clef positions are encoded as data (`SHARP_STEPS` /
  `FLAT_STEPS`) and validated in the test by mapping each step back to the letter
  it must land on. The signature vs. inline-accidental split is a pure decision
  (`inlineAlter`): a note only shows an accidental when it departs from the
  signature (harmonic/melodic minor's raised degrees, or a ♮ cancelling a
  signature accidental). Harmonic/melodic minor take the *natural*-minor
  signature via `Scale.signature`; diatonic modes take their parent (relative
  major) signature automatically.
- Splitting theory/layout (pure, tested) from SVG (React) keeps the
  functional-core rule and the same testability we have everywhere else.

## Revisit when

Unchanged from 0001: the first drill that needs **rhythmic values, stems, beams,
or note entry** (M5+ dictation / rhythm) is the point to weigh VexFlow/OSMD
against extending `core/notation/` again — and, per the design doc, the point at
which transposable *etudes* (arbitrary spelled melodies, not scale runs) become
feasible. `transpose.ts` is the primitive those etudes will transpose with;
`keys.ts`/`transpose.ts`/`PlaybackSpec` were designed so either renderer can
consume the same data model.
