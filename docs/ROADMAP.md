# Roadmap

Status legend: ✅ done · 🚧 in progress · ⬜ planned

## Milestones

| # | Status | Ships | Contents |
|---|--------|-------|----------|
| **M0** | ✅ | Deployed shell + docs | Vite+React+TS scaffold, TanStack Router, Docker, CI + GitHub Pages deploy, planning docs |
| **M1** | ✅ | Parity — replaces the vanilla app | core/ + shell/ port, exercise contract + 3 multiple-choice drills, DrillRunner, IndexedDB store + v0 localStorage migration (streak preserved), PWA installable/offline, tests ported to Vitest; old files deleted (archived at tag `v0-vanilla`) |
| **M2** | ⬜ | Metronome | Pure rhythm timing math in core, lookahead scheduler in shell, tempo/time signatures/subdivisions, visual beat indicator |
| **M3** | ⬜ | Tuner | Pitch detection (autocorrelation/MPM) in core + tests, mic adapter + permission UX, note + cents display, A4 calibration (440/442) |
| **M4** | ⬜ | Scale practice + dashboard | Date-seeded daily scale assignments, reference playback at tempo, proper note spelling (`keys.ts`), export/import JSON backup |
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
- **Notation rendering** — evaluate VexFlow vs. hand-rolled SVG at that point
  (decision record in `docs/decisions/` when it happens)

Until the rubrics arrive, every design decision keeps these fits in mind — see the
exercise contract and functional-core rules in [ARCHITECTURE.md](ARCHITECTURE.md).

## Deliberately out of scope (for now)

- User accounts / cloud sync — the storage layer is designed so an event-log sync
  can be added later without rewrites ($0/month constraint). JSON export/import
  (M4) is the interim backup story.
- Rhythm/sight-reading drills before rubrics arrive.
