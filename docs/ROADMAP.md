# Roadmap

Status legend: ✅ done · 🚧 in progress · ⬜ planned

## Milestones

| # | Status | Ships | Contents |
|---|--------|-------|----------|
| **M0** | ✅ | Deployed shell + docs | Vite+React+TS scaffold, TanStack Router, Docker, CI + GitHub Pages deploy, planning docs |
| **M1** | ✅ | Parity — replaces the vanilla app | core/ + shell/ port, exercise contract + 3 multiple-choice drills, DrillRunner, IndexedDB store + v0 localStorage migration (streak preserved), PWA installable/offline, tests ported to Vitest; old files deleted (archived at tag `v0-vanilla`) |
| **M2** | ✅ | Metronome | Pure rhythm timing math in core, lookahead scheduler in shell, tempo/time signatures/subdivisions, tap tempo, visual beat indicator |
| **M3** | ✅ | Tuner | Pitch detection (MPM) in core + tests, mic adapter + permission UX, note + cents needle, A4 calibration (438–443) |
| **M4** | ✅ | Scale practice + dashboard | Date-keyed daily scale rotation, reference playback at tempo, proper note spelling (`keys.ts`), practice card on home, export/import JSON backup |
| **M4.5** | ✅ | TE-style header widgets | Tuner + metronome recast as always-available header drop-widgets (pill toggles the tool, chevron drops the panel; keep running across navigation). Tuner gains a pitch-history graph and a drone note circle (octave 2–5, A4-aware). Dashboard is the main page; `/tuner` + `/metronome` routes removed. Metronome + drone settings persisted |
| **M4.6** | ✅ | Practice notation + settings | Daily scales rendered as staff notation (hand-rolled SVG, pure layout math in `core/notation/` — see `docs/decisions/0001`), header settings menu with practice customization (scale types, notation/note-name visibility, persisted per-slot octave shift), clef choice (treble/alto/tenor/bass — clef also sets the practice register; bass sits in trombone range) and light/dark theme (light default) |
| **M4.7** | ✅ | Transposition + key signatures | Diatonic transposition primitive (`core/theory/transpose.ts`, MusicXML `<transpose>` semantics — the foundation for instrument transposition and transposable etudes; octave shift now routes through it). Key signatures rendered on the practice staves (`core/notation/key-signature.ts`): sharps/flats drawn after the clef with inline accidentals suppressed, harmonic/melodic minor keeping the natural-minor signature, modes taking the parent signature. Per-slot key button (♯/♭) steps a scale through all twelve practical keys with the signature following; persisted like the octave shift. Key-signature display is a settings toggle (default on). Still hand-rolled, no notation library — see `docs/decisions/0002` |
| **M4.8** | ✅ | Warm-up section | `/warmup` route + home card mirroring daily practice. Generative brass warm-ups in `core/warmups.ts`: long tones, lip-flexibility slurs (harmonic-series partials), and arpeggios (major/minor/dom7 from `spellChord` in `chords.ts`). Reuses the staff, playback, and octave/key transpose controls (shared `StaffWithControls`); arpeggios transpose through the keys. A few short exercises transcribed in-house from the **public-domain 1864 Arban method** with provenance shown — see `docs/decisions/0003`. Completing a warm-up records a `warmup` attempt and counts toward the streak (no storage-schema change). Register anchoring factored into `core/register.ts` |
| **M4.9** | ✅ | Rhythm notation engine | Hand-rolled bounded rhythm engine (`core/notation/rhythm.ts` + `features/practice/RhythmStaff.tsx`): note values (whole→sixteenth), dots, rests, stems, flags, **beaming** (primary per beat + full/stub secondary beams), bar lines, time signatures (4/4·3/4·2/4·6/8), and **multi-system wrapping** (long passages wrap onto multiple staff lines at natural note size), single voice. Durations reuse `PlaybackSpec.durationBeats`; pitch reuses `staffLayout`. First consumer: the **Articulation** warm-up category (single tonguing, dotted patterns, an Arban sixteenth study — two-measure passages). Chose to extend the hand-rolled notation over a library — see `docs/decisions/0004`. Triplets/ties/multi-voice/MusicXML deferred |
| **M4.10** | ✅ | Arban studies page | Dedicated deep-dive **`/studies`** route + home card + nav, with a **category → exercise selector** (Long tones · Lip flexibility · Scales · Thirds · Arpeggios · Articulation). Expanded engine-safe study library (`arbanStudyLibrary` in `core/warmups.ts`): more lip-flexibility slurs (up to the fifth partial), a one-octave **major scale study** and a **study in thirds** — both rendered through the wrapping `RhythmStaff` — plus the arpeggio/long-tone/articulation studies. New curated items transcribed in-house from the **public-domain 1864 Arban method** with provenance shown, per `docs/decisions/0003` (still single-voice, no tuplets/ties). `scaleNotes` generalized for multi-octave; `ScaleStaff` width now fits the run's note count (longer slurs/arpeggios no longer clip). Completing a study records a `warmup` attempt (counts toward the streak) under its own `study:<date>` key — no storage-schema change. Reuses `StaffWithControls` octave/key transpose |
| **M4.11** | ✅ | Workouts, etudes + more studies | **Workouts** page (`/workouts` route + home card + nav): guided full-page routines (Flexibility · Technique · Daily warm-up) — an ordered list of studies with a progress bar and a completion state (`WORKOUTS` + `buildWorkout` in `core/warmups.ts`). **Etudes** category with two full-page passages that wrap across many systems: a four-key **scale cycle** (C·G·D·A, key-correct accidentals via `spellScaleDegrees`) and a four-measure **articulation endurance** etude. More individual studies — **natural minor scale**, **diminished / maj7 / min7 arpeggios**, a **wide-interval slur**. `scaleNotes` refactored onto a general `diatonicNotes` (any tonic/intervals). Extracted a shared `ExerciseCard` + `useStudyState` hook (Studies and Workouts share one done-set — completing a study in a workout shows done in the browser, counts toward the streak); transpose resolution moved into a pure, tested `resolveWarmup`/`clampOctaveShift` in core. Still single-voice, no tuplets/ties — the full-method ask stays blocked on the M5+ notation-library trigger |
| **M4.12** | ✅ | Key signatures on the rhythm staff | Key signatures now render on the **rhythm staff** (they already did on the practice `ScaleStaff` since M4.7). `rhythmLayout` takes a `KeySignature` — or **one per measure** for a passage that changes key — reserves room after the clef on every system, and suppresses inline accidentals the signature already covers (a natural against the signature still draws a ♮). A per-measure key **change starts a fresh line** carrying the new signature. The **natural-minor scale study** now shows its three flats (no inline accidentals), and the **scale-cycle etude** shows C · 1♯ · 2♯ · 3♯ — each key on its own line — instead of a field of inline sharps. Respects the existing `practiceDisplay.keySignature` toggle (shared via the new `useStudyState` hook); off falls back to inline. Layout stays pure + unit-tested. Extends `docs/decisions/0004` |
| **M4.13** | ✅ | Etude polish — phrasing + multi-bar reading | Scale / thirds / minor / scale-cycle sections now **end on a held quarter** instead of a padding eighth **rest** (no more lone eighth-then-rest). Widened the rhythm wrap target so eighth-note passages **pack ~2 bars per line** instead of one — multi-bar studies read continuously (the scale study is now one 2-bar line; the scale cycle is four 2-bar lines, one per key with its signature). New continuous **F-major étude** (`etude:fmajor`): eight bars — scale, thirds, arpeggio, scale — each a two-bar phrase ending on a held note, under one key signature, built in-house from the method's scale/arpeggio material |
| **M4.14** | ✅ | Notation spacing + compact cards | Notation was boxed into ~half the card by a tall "Listen / Mark done" action column and a hard staff-width cap. Reworked the study/workout card (`ExerciseCard`): a compact **play/pause + done icon pair beside the title**, no action column, so the staff gets the **full card width** (staves render at natural size instead of scaled down). Loosened the rhythm engine's note spacing (`ADVANCE`; sixteenths ~5px→~10px clear, eighths ~10px→~14px), and added **leading padding after each bar line** (`MEASURE_LEAD`) so a new measure's first note no longer butts against the bar. Hand-rolled engine retained — a notation library (VexFlow MIT / OSMD BSD, both permissively licensed) stays deferred to the `docs/decisions/0004` trigger (MusicXML / tuplets / multi-voice), not warranted by a spacing fix |
| **M5+** | ⬜ | Course-qualification features (rubric-gated) | See below |

## M5+ — waiting on official rubrics

Brian is a naval reserve musician; official course-qualification rubrics will be
provided at a future date. When they arrive, they unlock:

- **Melodic/harmonic dictation** — note-entry UI, per-note partial-credit grading
- **Sight singing / rhythm drills** — rhythm tap grading via the scheduler; possibly
  mic-based pitch checking reusing the tuner's `detectPitch`
- **Written theory quizzes** — key signatures, scale/chord spelling (builds on `keys.ts`)
- **Curriculum / qualification tracking** — rubric-driven practice paths and
  progress toward qual dates
- **Richer notation rendering** — M4.6–4.9 shipped hand-rolled SVG for scale
  runs, key signatures, diatonic transposition, and a rhythm engine (durations,
  rests, beaming, time signatures)
  (`docs/decisions/0001`–`0004`); the library trigger is now **MusicXML-ingested
  etudes** or tuplets/multi-voice/complex engraving — the same point transposable
  **etudes** (arbitrary spelled melodies, whose pitch math `core/theory/transpose.ts`
  already handles) become feasible

Until the rubrics arrive, every design decision keeps these fits in mind — see the
exercise contract and functional-core rules in [ARCHITECTURE.md](ARCHITECTURE.md).

## Deliberately out of scope (for now)

- User accounts / cloud sync — the storage layer is designed so an event-log sync
  can be added later without rewrites ($0/month constraint). JSON export/import
  (M4) is the interim backup story.
- Rhythm/sight-reading drills before rubrics arrive.
