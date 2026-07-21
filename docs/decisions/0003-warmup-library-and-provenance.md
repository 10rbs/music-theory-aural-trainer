# 0003 — Warm-up library: generative first, curated content public-domain only

**Date:** 2026-07-21 · **Status:** accepted · **Context:** M4.8 (warm-up section
— long tones, lip flexibility, arpeggios, with Arban examples)

## Decision

The warm-up library (`src/core/warmups.ts`) is **generative first**: exercises
are produced by pure functions from the theory core (chords → arpeggios,
harmonic series → lip slurs, scale degrees → long tones), reusing the same
`SpelledNote` + `PlaybackSpec` model as the daily scales so they render in
`ScaleStaff`, play through `playSpec`, and carry the M4.7 octave/key controls.

A small number of **curated** exercises are transcribed **in-house from
public-domain sources only**, tagged with provenance (`WarmupSource`). The first
batch is from the **1864 Arban method** (Jean-Baptiste Arban, d. 1889 → life+70
long expired; the original musical content is public domain worldwide).

## Rules for curated content

1. **Public domain only.** Encode the underlying musical content ourselves — our
   own note data, our own SVG. Never copy a modern edition's specific engraving,
   fingerings, or editorial additions (those carry a fresh editorial copyright
   even when the notes underneath are PD).
2. **Store provenance on every curated item** (`work`, `composer`, `year`,
   `publicDomain`, plus a note that it was transcribed in-house) and surface it
   in the UI. Matches the design doc §4.
3. **Keep it modest and representative** — short exercises, not facsimiles of a
   whole method.

## Why this is safe here

This is a **single-user, local-first** app: curated content never enters a
shared or public library, so there is no redistribution/takedown surface (design
doc §4's main rights concern). The provenance discipline is in place now so it
scales cleanly if a shared library is ever added — at which point PD-status per
jurisdiction and user-upload isolation become live concerns, not before.

## Streak integration

Completing a warm-up records an attempt (`exerciseId: 'warmup'`) and a
`warmup:<date>` completion key, exactly like the daily scales. No storage-schema
change: the streak is derived from attempts by date, and export/import already
iterate all attempts + kv. See `docs/ARCHITECTURE.md` (Storage).

## Revisit when

A shared/public library or user uploads are added (per-jurisdiction PD checks,
upload isolation), or when rhythmic notation lands and articulation/etude
categories join — re-confirm sourcing per new content.
