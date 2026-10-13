import { describe, expect, test } from 'vitest'
import type { NoteSummary } from '../pitch/notes'
import {
  applyNote,
  flatName,
  holdProgress,
  isDone,
  LIP_SLUR_SERIES,
  routineDetail,
  routineScore,
  skipStep,
  startRoutine,
  summarizeRoutine,
  targetOf,
  type LongToneRoutine,
} from './longtones'

const ROUTINE: LongToneRoutine = { id: 't', name: 'Test', steps: [46, 53], holdMs: 8000 }

function note(midi: number, durationMs: number, over: Partial<NoteSummary> = {}): NoteSummary {
  return {
    midi,
    startT: 0,
    endT: durationMs,
    durationMs,
    avgCents: 2,
    centsSpread: 3,
    attackMs: 50,
    sustainDb: -20,
    levelSpreadDb: 0.5,
    tone: null,
    ...over,
  }
}

describe('flatName', () => {
  test('spells black keys as flats', () => {
    expect(LIP_SLUR_SERIES.steps.map(flatName)).toEqual([
      'B♭2', 'F3', 'B♭3', 'D4', 'F4', 'D4', 'B♭3', 'F3', 'B♭2',
    ])
    expect(flatName(63)).toBe('E♭4')
  })
})

describe('applyNote', () => {
  test('a full hold on the target records a result and advances', () => {
    const s = applyNote(startRoutine(ROUTINE), note(46, 8200))
    expect(s.step).toBe(1)
    expect(targetOf(s)).toBe(53)
    expect(s.results[0]?.ratings).toEqual({ tuning: 'good', pitchSteadiness: 'good', attack: 'good', evenness: 'good' })
    expect(s.hint).toBeNull()
  })

  test('a short hold on the target stays put with a hint', () => {
    const s = applyNote(startRoutine(ROUTINE), note(46, 5000))
    expect(s.step).toBe(0)
    expect(s.hint).toEqual({ kind: 'short', heldMs: 5000 })
  })

  test('a held wrong partial stays put with a hint', () => {
    const s = applyNote(startRoutine(ROUTINE), note(53, 9000))
    expect(s.step).toBe(0)
    expect(s.hint).toEqual({ kind: 'wrong-note', played: 53 })
  })

  test('blips under MIN_ATTEMPT_MS are ignored and keep the last hint', () => {
    const hinted = applyNote(startRoutine(ROUTINE), note(46, 5000))
    expect(applyNote(hinted, note(40, 300))).toBe(hinted)
  })

  test('a success clears an earlier hint', () => {
    const s = applyNote(applyNote(startRoutine(ROUTINE), note(46, 5000)), note(46, 8000))
    expect(s.hint).toBeNull()
    expect(s.step).toBe(1)
  })

  test('the routine finishes after the last step; further notes do nothing', () => {
    const done = applyNote(applyNote(startRoutine(ROUTINE), note(46, 8000)), note(53, 8000))
    expect(isDone(done)).toBe(true)
    expect(targetOf(done)).toBeNull()
    expect(applyNote(done, note(46, 9000))).toBe(done)
  })
})

describe('skipStep', () => {
  test('records a null result and advances; no-op when done', () => {
    const s = skipStep(startRoutine(ROUTINE))
    expect(s.results).toEqual([null])
    expect(targetOf(s)).toBe(53)
    const done = skipStep(s)
    expect(skipStep(done)).toBe(done)
  })
})

describe('holdProgress', () => {
  const s = startRoutine(ROUTINE)
  test('fraction of the hold time on the target, clamped', () => {
    expect(holdProgress(s, { midi: 46, startT: 1000 }, 5000)).toBeCloseTo(0.5)
    expect(holdProgress(s, { midi: 46, startT: 1000 }, 20000)).toBe(1)
  })
  test('null when off target or silent', () => {
    expect(holdProgress(s, { midi: 47, startT: 1000 }, 5000)).toBeNull()
    expect(holdProgress(s, null, 5000)).toBeNull()
  })
})

describe('summary, score and detail', () => {
  const s = skipStep(
    applyNote(startRoutine(ROUTINE), note(46, 8000, { avgCents: -12, centsSpread: 5, levelSpreadDb: 1.5 })),
  )

  test('summarizes held notes only', () => {
    const sum = summarizeRoutine(s)
    expect(sum).toMatchObject({ held: 1, skipped: 1, meanTuningCents: 12, meanSpreadCents: 5, meanLevelSpreadDb: 1.5 })
    // tuning ok, steadiness ok, attack good, evenness ok
    expect(sum.goodRatings).toBe(1)
    expect(sum.totalRatings).toBe(4)
    expect(routineScore(sum)).toBe(0.25)
  })

  test('nothing held → null means and score 0', () => {
    const sum = summarizeRoutine(skipStep(startRoutine(ROUTINE)))
    expect(sum.meanTuningCents).toBeNull()
    expect(routineScore(sum)).toBe(0)
  })

  test('detail keeps compact, rounded per-step numbers', () => {
    expect(routineDetail(s)).toEqual({
      item: 't',
      mode: 'long-tones',
      steps: [
        { midi: 46, durationMs: 8000, avgCents: -12, centsSpread: 5, attackMs: 50, levelSpreadDb: 1.5, brightness: null },
        null,
      ],
    })
  })
})
