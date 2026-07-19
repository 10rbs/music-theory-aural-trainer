import { describe, expect, test } from 'vitest'
import {
  clampBpm,
  secondsPerBeat,
  tapTempo,
  tickAt,
  SUBDIVISIONS,
  TIME_SIGNATURES,
  type ClickTrackConfig,
} from './click-track'

const sig = (label: string) => TIME_SIGNATURES.find((s) => s.label === label)!
const sub = (label: string) => SUBDIVISIONS.find((s) => s.label === label)!

const cfg = (bpm: number, s: string, d: string): ClickTrackConfig => ({
  bpm,
  signature: sig(s),
  subdivision: sub(d),
})

describe('clampBpm', () => {
  test('clamps to [30, 260] and rounds', () => {
    expect(clampBpm(10)).toBe(30)
    expect(clampBpm(1000)).toBe(260)
    expect(clampBpm(120.6)).toBe(121)
  })
})

describe('secondsPerBeat', () => {
  test('120 bpm → 0.5s', () => {
    expect(secondsPerBeat(120)).toBeCloseTo(0.5)
  })
})

describe('tickAt — 4/4, no subdivision, 120 bpm', () => {
  const c = cfg(120, '4/4', 'Beat')

  test('tick times are spaced one beat apart', () => {
    expect(tickAt(c, 0).time).toBeCloseTo(0)
    expect(tickAt(c, 1).time).toBeCloseTo(0.5)
    expect(tickAt(c, 4).time).toBeCloseTo(2.0)
  })

  test('downbeat on beat 0 of every bar, plain beats elsewhere', () => {
    expect(tickAt(c, 0).accent).toBe('downbeat')
    expect(tickAt(c, 1).accent).toBe('beat')
    expect(tickAt(c, 3).accent).toBe('beat')
    expect(tickAt(c, 4).accent).toBe('downbeat')
    expect(tickAt(c, 4).bar).toBe(1)
  })

  test('beatInBar cycles 0..3', () => {
    expect([0, 1, 2, 3, 0, 1].map((_, i) => tickAt(c, i).beatInBar)).toEqual([0, 1, 2, 3, 0, 1])
  })
})

describe('tickAt — subdivisions', () => {
  test('eighths: sub ticks between beats, half-beat spacing', () => {
    const c = cfg(60, '4/4', 'Eighths')
    expect(tickAt(c, 0).accent).toBe('downbeat')
    expect(tickAt(c, 1).accent).toBe('sub')
    expect(tickAt(c, 1).time).toBeCloseTo(0.5) // half of a 1s beat
    expect(tickAt(c, 2).accent).toBe('beat')
    expect(tickAt(c, 2).time).toBeCloseTo(1.0)
  })

  test('triplets: three ticks per beat', () => {
    const c = cfg(60, '3/4', 'Triplets')
    expect(tickAt(c, 1).time).toBeCloseTo(1 / 3)
    expect(tickAt(c, 2).time).toBeCloseTo(2 / 3)
    expect(tickAt(c, 3).accent).toBe('beat')
    // new bar after 3 beats * 3 ticks
    expect(tickAt(c, 9).accent).toBe('downbeat')
    expect(tickAt(c, 9).bar).toBe(1)
  })

  test('sixteenths at 240 bpm stay precise', () => {
    const c = cfg(240, '4/4', 'Sixteenths')
    expect(tickAt(c, 16).time).toBeCloseTo(1.0) // 16 ticks = 4 beats = 1s at 240
    expect(tickAt(c, 16).accent).toBe('downbeat')
  })
})

describe('tickAt — 6/8 compound accent', () => {
  const c = cfg(120, '6/8', 'Beat')

  test('secondary accent on beat 4 (index 3)', () => {
    expect(tickAt(c, 0).accent).toBe('downbeat')
    expect(tickAt(c, 3).accent).toBe('downbeat') // secondary accent
    expect(tickAt(c, 1).accent).toBe('beat')
    expect(tickAt(c, 6).bar).toBe(1)
  })
})

describe('tapTempo', () => {
  test('needs at least two taps', () => {
    expect(tapTempo([])).toBeNull()
    expect(tapTempo([1000])).toBeNull()
  })

  test('steady 500ms taps → 120 bpm', () => {
    expect(tapTempo([0, 500, 1000, 1500])).toBe(120)
  })

  test('uses only the last 5 taps', () => {
    // early slow taps must not drag the average down
    expect(tapTempo([0, 2000, 4000, 4500, 5000, 5500, 6000])).toBe(120)
  })

  test('rejects stale gaps over 3s', () => {
    expect(tapTempo([0, 5000])).toBeNull()
  })

  test('clamps extreme tempi', () => {
    expect(tapTempo([0, 100, 200])).toBe(260)
  })
})
