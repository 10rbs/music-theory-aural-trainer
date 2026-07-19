import { describe, expect, test } from 'vitest'
import { detectPitch } from './detect'
import { freqToNote } from './cents'

const SR = 44100
const N = 4096

function sine(freq: number, amp = 0.5, sr = SR, n = N): Float32Array {
  const buf = new Float32Array(n)
  for (let i = 0; i < n; i++) buf[i] = amp * Math.sin((2 * Math.PI * freq * i) / sr)
  return buf
}

function sawtooth(freq: number, amp = 0.5, sr = SR, n = N): Float32Array {
  const buf = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const phase = ((freq * i) / sr) % 1
    buf[i] = amp * (2 * phase - 1)
  }
  return buf
}

/** cents error between detected and expected frequency */
function centsError(detected: number, expected: number): number {
  return Math.abs(1200 * Math.log2(detected / expected))
}

describe('detectPitch', () => {
  test.each([82.41, 110, 220, 440, 587.33, 880])('sine at %s Hz within 5 cents', (freq) => {
    const result = detectPitch(sine(freq), SR)
    expect(result).not.toBeNull()
    expect(centsError(result!.freq, freq)).toBeLessThan(5)
    expect(result!.clarity).toBeGreaterThan(0.9)
  })

  test.each([110, 233.08, 466.16])('sawtooth (harmonic-rich) at %s Hz within 5 cents', (freq) => {
    const result = detectPitch(sawtooth(freq), SR)
    expect(result).not.toBeNull()
    expect(centsError(result!.freq, freq)).toBeLessThan(5)
  })

  test('low brass range: F2 (87.31 Hz) resolves with a 4096 window', () => {
    const result = detectPitch(sine(87.31), SR)
    expect(result).not.toBeNull()
    expect(centsError(result!.freq, 87.31)).toBeLessThan(5)
  })

  test('silence returns null', () => {
    expect(detectPitch(new Float32Array(N), SR)).toBeNull()
  })

  test('very quiet signal returns null', () => {
    expect(detectPitch(sine(440, 0.001), SR)).toBeNull()
  })

  test('white noise returns null', () => {
    // deterministic LCG noise
    let seed = 12345
    const buf = new Float32Array(N)
    for (let i = 0; i < N; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0
      buf[i] = (seed / 0xffffffff - 0.5) * 0.8
    }
    expect(detectPitch(buf, SR)).toBeNull()
  })

  test('slightly detuned pitch is reported accurately (441 vs 440)', () => {
    const result = detectPitch(sine(441), SR)
    expect(result).not.toBeNull()
    // 441 Hz is ~+3.93 cents from A440 — detection must preserve that distinction
    expect(centsError(result!.freq, 441)).toBeLessThan(2)
  })
})

describe('freqToNote', () => {
  test('440 Hz → A4, 0 cents', () => {
    expect(freqToNote(440)).toEqual({ midi: 69, name: 'A4', cents: 0 })
  })

  test('detuned: 445 Hz → A4 about +20 cents', () => {
    const r = freqToNote(445)!
    expect(r.name).toBe('A4')
    expect(r.cents).toBeGreaterThanOrEqual(19)
    expect(r.cents).toBeLessThanOrEqual(21)
  })

  test('respects A4=442 calibration', () => {
    const r = freqToNote(442, 442)!
    expect(r.name).toBe('A4')
    expect(r.cents).toBe(0)
  })

  test('halfway between notes rounds to nearest', () => {
    const r = freqToNote(452.9)! // ~+50 cents from A4
    expect(Math.abs(r.cents)).toBeLessThanOrEqual(50)
  })

  test('rejects nonsense input', () => {
    expect(freqToNote(0)).toBeNull()
    expect(freqToNote(-5)).toBeNull()
    expect(freqToNote(Number.NaN)).toBeNull()
  })
})
