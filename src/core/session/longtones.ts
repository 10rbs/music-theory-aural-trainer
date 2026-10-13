// Guided long tones (M7): a fixed routine of target notes, each held for a
// set time. A pure reducer over the tracker's finished notes — no timers.
// The player moves on when they've held the target long enough; anything
// else (a short hold, the wrong partial) leaves the step open with a hint.

import { rateNote, type NoteRatings, type NoteSummary } from '../pitch/notes'
import { midiToFlatName } from '../theory/notes'

export interface LongToneRoutine {
  id: string
  name: string
  /** Target notes in order, MIDI (concert pitch). */
  steps: number[]
  holdMs: number
}

/** Concert B♭ partials up and back: B♭2 F3 B♭3 D4 F4 D4 B♭3 F3 B♭2. */
export const LIP_SLUR_SERIES: LongToneRoutine = {
  id: 'long-tones-bb-partials',
  name: 'B♭ partials',
  steps: [46, 53, 58, 62, 65, 62, 58, 53, 46],
  holdMs: 8000,
}

/** Notes shorter than this aren't treated as an attempt at all (tonguing, blips). */
export const MIN_ATTEMPT_MS = 1500

/** Target spelling — flats, matching the tuner readout. */
export const flatName = midiToFlatName

export interface StepResult {
  midi: number
  note: NoteSummary
  ratings: NoteRatings
}

export type Hint =
  | { kind: 'short'; heldMs: number }
  | { kind: 'wrong-note'; played: number }

export interface LongToneState {
  routine: LongToneRoutine
  /** Index of the current target; === steps.length when done. */
  step: number
  results: (StepResult | null)[] // null = skipped
  hint: Hint | null
}

export function startRoutine(routine: LongToneRoutine): LongToneState {
  return { routine, step: 0, results: [], hint: null }
}

export const isDone = (s: LongToneState) => s.step >= s.routine.steps.length
export const targetOf = (s: LongToneState): number | null =>
  isDone(s) ? null : s.routine.steps[s.step]

/** Feed one finished note. Held on target for holdMs → record and advance. */
export function applyNote(s: LongToneState, note: NoteSummary): LongToneState {
  const target = targetOf(s)
  if (target === null || note.durationMs < MIN_ATTEMPT_MS) return s
  if (note.midi !== target) return { ...s, hint: { kind: 'wrong-note', played: note.midi } }
  if (note.durationMs < s.routine.holdMs) return { ...s, hint: { kind: 'short', heldMs: note.durationMs } }
  return {
    ...s,
    step: s.step + 1,
    results: [...s.results, { midi: target, note, ratings: rateNote(note) }],
    hint: null,
  }
}

export function skipStep(s: LongToneState): LongToneState {
  if (isDone(s)) return s
  return { ...s, step: s.step + 1, results: [...s.results, null], hint: null }
}

/** Live hold progress 0..1 for a note in progress (null if not on target). */
export function holdProgress(
  s: LongToneState,
  current: { midi: number; startT: number } | null,
  now: number,
): number | null {
  const target = targetOf(s)
  if (target === null || !current || current.midi !== target) return null
  return Math.max(0, Math.min(1, (now - current.startT) / s.routine.holdMs))
}

export interface RoutineSummary {
  held: number
  skipped: number
  /** Mean |avg tuning| across held notes, cents. */
  meanTuningCents: number | null
  meanSpreadCents: number | null
  meanLevelSpreadDb: number | null
  /** Count of 'good' ratings across all held notes and all four metrics. */
  goodRatings: number
  totalRatings: number
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

export function summarizeRoutine(s: LongToneState): RoutineSummary {
  const held = s.results.filter((r): r is StepResult => r !== null)
  const ratings = held.flatMap((r) => Object.values(r.ratings))
  return {
    held: held.length,
    skipped: s.results.length - held.length,
    meanTuningCents: mean(held.map((r) => Math.abs(r.note.avgCents))),
    meanSpreadCents: mean(held.map((r) => r.note.centsSpread)),
    meanLevelSpreadDb: mean(held.map((r) => r.note.levelSpreadDb)),
    goodRatings: ratings.filter((r) => r === 'good').length,
    totalRatings: ratings.length,
  }
}

/** Score for the attempt log: share of 'good' ratings (0 if nothing was held). */
export function routineScore(sum: RoutineSummary): number {
  return sum.totalRatings ? sum.goodRatings / sum.totalRatings : 0
}

/**
 * Compact per-step record for the attempt's `detail` — enough for a future
 * practice log to chart trends without the audio.
 */
export function routineDetail(s: LongToneState) {
  return {
    item: s.routine.id,
    mode: 'long-tones',
    steps: s.results.map((r) =>
      r === null
        ? null
        : {
            midi: r.midi,
            durationMs: Math.round(r.note.durationMs),
            avgCents: round1(r.note.avgCents),
            centsSpread: round1(r.note.centsSpread),
            attackMs: Math.round(r.note.attackMs),
            levelSpreadDb: round1(r.note.levelSpreadDb),
            brightness: r.note.tone ? round1(r.note.tone.brightness) : null,
          },
    ),
  }
}

const round1 = (x: number) => Math.round(x * 10) / 10
