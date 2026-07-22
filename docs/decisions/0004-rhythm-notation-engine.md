# 0004 — Rhythm notation: hand-rolled bounded engine, still no library

**Date:** 2026-07-21 · **Status:** accepted · **Context:** M4.9 (rhythmic
notation for articulation warm-ups and, later, rhythm drills / etudes). This is
the re-decision that [0001](0001-notation-rendering.md) and
[0002](0002-key-signatures-and-transposition.md) deferred to "when rhythmic
values, stems, beams… are needed."

## Decision

Extend the hand-rolled `core/notation/` with a bounded rhythm engine
(`core/notation/rhythm.ts` + `features/practice/RhythmStaff.tsx`) rather than
adopt VexFlow or OSMD. **Still no notation-rendering dependency.**

## Scope (v1)

Whole → sixteenth notes, dotted notes, rests, time signatures (4/4, 3/4, 2/4,
6/8), single voice, **with beaming** (primary beams per beat group, full
secondary beams for sixteenth runs, and stub secondary beams for a lone beamed
sixteenth — e.g. dotted-eighth + sixteenth). Stem direction follows the note
furthest from the middle line. **Multi-system wrapping:** a passage longer than
one line packs whole measures onto a staff line until it fills, then wraps to the
next line (clef on every line, time signature on the first), so longer passages
read at a natural note size instead of shrinking.

**Deferred:** triplets/tuplets, ties across bar lines, multi-voice, and MusicXML
ingestion.

## Why hand-rolled

- The v1 vocabulary is the bounded case; a library's value is concentrated in the
  edge cases we're deferring (tuplets, multi-voice, arbitrary imported scores).
- Near-term consumers are our own *generated* content (articulation warm-ups,
  future rhythm drills), not imported scores — so OSMD's MusicXML ingestion buys
  nothing yet.
- VexFlow/OSMD would be by far the largest runtime dependency in the app, against
  the minimal-deps policy (docs/ARCHITECTURE.md), and would not match the
  hand-drawn clef/staff aesthetic that carried M4.6–4.8.
- Durations reuse the existing model: `RhythmEvent.beats` is in quarter-note
  beats, the same unit as `PlaybackSpec.durationBeats`, so an exercise's playback
  and its notation come from one source. Pitch positions reuse `staffLayout`.
- The layout is pure and unit-tested (values, bar lines, beaming, stems) like the
  rest of `core/`; only pixel mapping lives in the React renderer.

## Revisit when (the library trigger, reaffirmed)

The first time we need to **ingest/render MusicXML etudes**, or hit
**tuplets / multi-voice / complex engraving** that the bounded engine can't cover
cleanly, re-evaluate VexFlow/OSMD against extending `rhythm.ts` — and record the
outcome as the next decision. `RhythmEvent` / `PlaybackSpec` were designed so
either renderer can consume the same data.
