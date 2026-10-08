import { describe, expect, test } from 'vitest'
import { FLOOR_DB, frameDb, pushLevel, toEnvelopeShapes, type LevelSample } from './level'

describe('frameDb', () => {
  test('full-scale square wave is 0 dBFS', () => {
    const buf = Float32Array.from({ length: 512 }, (_, i) => (i % 2 ? 1 : -1))
    expect(frameDb(buf)).toBeCloseTo(0, 6)
  })

  test('halving amplitude drops ~6 dB', () => {
    const buf = Float32Array.from({ length: 512 }, (_, i) => (i % 2 ? 0.5 : -0.5))
    expect(frameDb(buf)).toBeCloseTo(-6.02, 1)
  })

  test('silence and empty buffers sit on the floor', () => {
    expect(frameDb(new Float32Array(512))).toBe(FLOOR_DB)
    expect(frameDb(new Float32Array(0))).toBe(FLOOR_DB)
    expect(frameDb(Float32Array.from({ length: 512 }, () => 1e-6))).toBe(FLOOR_DB)
  })
})

describe('pushLevel', () => {
  test('appends without mutating and drops samples outside the window', () => {
    const before: LevelSample[] = [{ t: 0, db: -20 }]
    const after = pushLevel(before, { t: 5000, db: -10 }, 5000, 4000)
    expect(before).toHaveLength(1)
    expect(after).toEqual([{ t: 5000, db: -10 }])
  })
})

describe('toEnvelopeShapes', () => {
  const W = 100
  const H = 100
  const steady = (from: number, to: number, db: number): LevelSample[] =>
    Array.from({ length: (to - from) / 20 + 1 }, (_, i) => ({ t: from + i * 20, db }))

  test('a held note is one mirrored polygon around the center line', () => {
    const shapes = toEnvelopeShapes(steady(0, 1000, -30), 1000, 1000, W, H)
    expect(shapes).toHaveLength(1)
    const ys = shapes[0].map((p) => p.y)
    // -30 dB on a 60 dB range = half amplitude → quarter/three-quarter height
    expect(Math.min(...ys)).toBeCloseTo(25)
    expect(Math.max(...ys)).toBeCloseTo(75)
    // closed outline: top run left→right, then bottom run right→left
    expect(shapes[0][0].x).toBeCloseTo(0)
    expect(shapes[0][shapes[0].length - 1].x).toBeCloseTo(0)
  })

  test('louder draws taller', () => {
    const [quiet] = toEnvelopeShapes(steady(0, 100, -40), 100, 100, W, H)
    const [loud] = toEnvelopeShapes(steady(0, 100, -10), 100, 100, W, H)
    expect(Math.min(...loud.map((p) => p.y))).toBeLessThan(Math.min(...quiet.map((p) => p.y)))
  })

  test('silence between notes splits the shape', () => {
    const samples = [...steady(0, 400, -20), ...steady(420, 500, FLOOR_DB), ...steady(520, 900, -20)]
    expect(toEnvelopeShapes(samples, 900, 1000, W, H)).toHaveLength(2)
  })

  test('a time gap longer than gapMs splits the shape', () => {
    const samples = [...steady(0, 200, -20), ...steady(600, 800, -20)]
    expect(toEnvelopeShapes(samples, 800, 1000, W, H)).toHaveLength(2)
  })

  test('samples outside the window are ignored', () => {
    expect(toEnvelopeShapes(steady(0, 200, -20), 5000, 1000, W, H)).toEqual([])
  })
})
