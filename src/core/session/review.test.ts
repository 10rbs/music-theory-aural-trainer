import { describe, expect, test } from 'vitest'
import type { NoteSummary } from '../pitch/notes'
import { centerView, clampView, followPlayhead, formatClock, noteAt, pitchAt, xToTime } from './review'

const TAKE = { startMs: 0, endMs: 60000 }
const WIN = 10000

describe('xToTime', () => {
  test('maps lane x to time within the view', () => {
    expect(xToTime(0, 600, 30000, WIN, TAKE)).toBe(20000)
    expect(xToTime(300, 600, 30000, WIN, TAKE)).toBe(25000)
    expect(xToTime(600, 600, 30000, WIN, TAKE)).toBe(30000)
  })

  test('clamps to the take (short take, view hangs off the left)', () => {
    expect(xToTime(0, 600, 4000, WIN, { startMs: 0, endMs: 4000 })).toBe(0)
  })
})

describe('clampView / centerView', () => {
  test('a view cannot run past either end of the take', () => {
    expect(clampView(70000, WIN, TAKE)).toBe(60000)
    expect(clampView(3000, WIN, TAKE)).toBe(10000)
  })

  test('a take shorter than the window pins the view to its end', () => {
    expect(clampView(1000, WIN, { startMs: 0, endMs: 4000 })).toBe(4000)
  })

  test('centerView puts t in the middle where possible', () => {
    expect(centerView(30000, WIN, TAKE)).toBe(35000)
    expect(centerView(59000, WIN, TAKE)).toBe(60000)
  })
})

describe('followPlayhead', () => {
  test('leaves the view alone while the playhead is comfortably inside', () => {
    expect(followPlayhead(30000, 25000, WIN, TAKE)).toBe(30000)
  })

  test('pages forward as the playhead nears the right edge', () => {
    const v = followPlayhead(30000, 29500, WIN, TAKE)
    expect(v).toBe(29500 + 7500)
    expect(29500).toBeGreaterThan(v - WIN)
  })

  test('jumps to a playhead outside the view', () => {
    expect(followPlayhead(30000, 5000, WIN, TAKE)).toBe(12500)
  })
})

describe('pitchAt', () => {
  const samples = [0, 20, 40, 200, 220].map((t) => ({ t, cents: t / 10 }))

  test('returns the nearest sample within tolerance', () => {
    expect(pitchAt(samples, 25)?.t).toBe(20)
    expect(pitchAt(samples, 205)?.t).toBe(200)
  })

  test('returns null in a gap or on an empty history', () => {
    expect(pitchAt(samples, 120)).toBeNull()
    expect(pitchAt([], 10)).toBeNull()
  })
})

describe('noteAt', () => {
  const note = (startT: number, endT: number) => ({ startT, endT }) as NoteSummary
  const notes = [note(3000, 4000), note(0, 2000)]

  test('finds the note under t', () => {
    expect(noteAt(notes, 1000)?.startT).toBe(0)
    expect(noteAt(notes, 3500)?.startT).toBe(3000)
    expect(noteAt(notes, 2500)).toBeNull()
  })
})

describe('formatClock', () => {
  test.each([
    [0, '0:00.0'],
    [12345, '0:12.3'],
    [61000, '1:01.0'],
    [-5, '0:00.0'],
  ])('%i ms → %s', (ms, s) => expect(formatClock(ms)).toBe(s))
})
