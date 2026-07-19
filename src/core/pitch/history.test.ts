import { describe, expect, test } from 'vitest'
import { GAP_MS, pushReading, toSegments, type PitchSample } from './history'

const WINDOW = 8000
const W = 100
const H = 100

function samplesEvery(ms: number, count: number, cents = 0, start = 0): PitchSample[] {
  return Array.from({ length: count }, (_, i) => ({ t: start + i * ms, cents }))
}

describe('pushReading', () => {
  test('appends without mutating the input', () => {
    const before: PitchSample[] = [{ t: 0, cents: 10 }]
    const after = pushReading(before, { t: 100, cents: 12 }, 100, WINDOW)
    expect(after).toHaveLength(2)
    expect(before).toHaveLength(1)
  })

  test('drops samples older than the window', () => {
    let samples: PitchSample[] = []
    for (let t = 0; t <= 10000; t += 1000) {
      samples = pushReading(samples, { t, cents: 0 }, t, WINDOW)
    }
    // at now=10000 with an 8s window, t<2000 is gone
    expect(samples[0].t).toBe(2000)
    expect(samples[samples.length - 1].t).toBe(10000)
  })
})

describe('toSegments', () => {
  test('maps time to x (right edge = now) and cents to y', () => {
    const segs = toSegments([{ t: 1000, cents: 0 }], 1000, WINDOW, W, H)
    expect(segs).toHaveLength(1)
    const [p] = segs[0].points
    expect(p.x).toBeCloseTo(W) // newest sample sits at the right edge
    expect(p.y).toBeCloseTo(H / 2) // 0 cents on the center line
  })

  test('+50 cents is the top edge, −50 the bottom', () => {
    const segs = toSegments(
      [
        { t: 900, cents: 50 },
        { t: 1000, cents: -50 },
      ],
      1000,
      WINDOW,
      W,
      H,
    )
    const pts = segs.flatMap((s) => s.points)
    expect(pts[0].y).toBeCloseTo(0)
    expect(pts[1].y).toBeCloseTo(H)
  })

  test('clamps out-of-range cents into the viewport', () => {
    const segs = toSegments([{ t: 0, cents: 120 }], 0, WINDOW, W, H)
    expect(segs[0].points[0].y).toBeCloseTo(0)
  })

  test('a silence gap splits the trace into two segments', () => {
    const first = samplesEvery(50, 4, 20)
    const second = samplesEvery(50, 4, 20, 3000)
    const segs = toSegments([...first, ...second], 3150, WINDOW, W, H)
    expect(segs).toHaveLength(2)
    expect(segs[0].points).toHaveLength(4)
    expect(segs[1].points).toHaveLength(4)
  })

  test('closely spaced samples stay in one segment', () => {
    const segs = toSegments(samplesEvery(GAP_MS - 1, 10, 20), 2500, WINDOW, W, H)
    expect(segs).toHaveLength(1)
  })

  test('in-tune flips start a new segment with the flag set', () => {
    const samples: PitchSample[] = [
      { t: 0, cents: 20 },
      { t: 50, cents: 12 },
      { t: 100, cents: 3 }, // crosses into tune
      { t: 150, cents: -2 },
      { t: 200, cents: 15 }, // back out
    ]
    const segs = toSegments(samples, 200, WINDOW, W, H)
    expect(segs.map((s) => s.inTune)).toEqual([false, true, false])
    expect(segs.map((s) => s.points.length)).toEqual([2, 2, 1])
  })

  test('samples outside the window are excluded', () => {
    const segs = toSegments(
      [
        { t: -100, cents: 0 },
        { t: 500, cents: 0 },
      ],
      8000,
      WINDOW,
      W,
      H,
    )
    expect(segs.flatMap((s) => s.points)).toHaveLength(1)
  })
})
