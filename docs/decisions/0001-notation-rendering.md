# 0001 — Notation rendering: hand-rolled SVG, not VexFlow

**Date:** 2026-07-19 · **Status:** accepted · **Context:** M4.6 (scale notation
on the daily practice page)

## Decision

Render scale notation with a small hand-rolled SVG component
(`features/practice/ScaleStaff.tsx`) backed by pure layout math in
`core/notation/staff.ts`. Do not add VexFlow (or any notation library) as a
runtime dependency.

## Why

- Current need is narrow: one-octave scale runs as whole notes on a staff
  (treble/alto/tenor/bass) — staff lines, clef, note heads, accidentals,
  ledger lines. That is ~150 lines of our own code vs. a several-hundred-KB
  dependency.
- Runtime dependencies are minimal by policy (docs/ARCHITECTURE.md); VexFlow
  would be the largest dependency in the app by far, for a fraction of its
  surface.
- Splitting layout (pure, in `core/notation/`, Vitest-tested) from pixel
  rendering (React SVG) fits the functional-core rule and gives us the same
  testability we get everywhere else.
- The clef and accidentals are drawn/text glyphs (♯ ♭ are BMP codepoints with
  universal font coverage); no font embedding needed.

## Revisit when

M5+ dictation/written-theory needs richer notation (rhythmic values, stems,
beams, key signatures, note entry). At that point re-evaluate VexFlow against
extending `core/notation/` — the `PlaybackSpec`/`spelled` data model was
designed so either can consume it. Record the outcome as a new decision here.
