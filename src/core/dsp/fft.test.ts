import { describe, expect, test } from 'vitest'
import { autocorrelate, fft, nextPow2 } from './fft'

/** Deterministic pseudo-random signal (LCG). */
function noise(n: number, seed = 7): Float32Array {
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0
    out[i] = seed / 0xffffffff - 0.5
  }
  return out
}

function naiveDft(x: Float32Array) {
  const n = x.length
  const re = new Float64Array(n)
  const im = new Float64Array(n)
  for (let k = 0; k < n; k++) {
    for (let t = 0; t < n; t++) {
      re[k] += x[t] * Math.cos((2 * Math.PI * k * t) / n)
      im[k] -= x[t] * Math.sin((2 * Math.PI * k * t) / n)
    }
  }
  return { re, im }
}

describe('nextPow2', () => {
  test.each([
    [1, 1],
    [5, 8],
    [8, 8],
    [4097, 8192],
  ])('%i → %i', (n, p) => expect(nextPow2(n)).toBe(p))
})

describe('fft', () => {
  test('matches a direct DFT', () => {
    const x = noise(64)
    const re = Float64Array.from(x)
    const im = new Float64Array(64)
    fft(re, im)
    const ref = naiveDft(x)
    for (let k = 0; k < 64; k++) {
      expect(re[k]).toBeCloseTo(ref.re[k], 9)
      expect(im[k]).toBeCloseTo(ref.im[k], 9)
    }
  })

  test('a pure tone lands in its bin', () => {
    const n = 256
    const re = Float64Array.from({ length: n }, (_, i) => Math.cos((2 * Math.PI * 10 * i) / n))
    const im = new Float64Array(n)
    fft(re, im)
    const mags = Array.from(re, (r, i) => Math.hypot(r, im[i]))
    expect(mags[10]).toBeCloseTo(n / 2, 6)
    expect(mags[11]).toBeCloseTo(0, 6)
  })

  test('inverse round-trips', () => {
    const x = noise(128)
    const re = Float64Array.from(x)
    const im = new Float64Array(128)
    fft(re, im)
    fft(re, im, true)
    for (let i = 0; i < 128; i++) {
      expect(re[i]).toBeCloseTo(x[i], 9)
      expect(im[i]).toBeCloseTo(0, 9)
    }
  })

  test('rejects non-power-of-two lengths', () => {
    expect(() => fft(new Float64Array(6), new Float64Array(6))).toThrow()
  })
})

describe('autocorrelate', () => {
  test('matches the direct sum (linear, not circular)', () => {
    const x = noise(300)
    const r = autocorrelate(x, 150)
    for (const tau of [0, 1, 17, 149]) {
      let direct = 0
      for (let i = 0; i < x.length - tau; i++) direct += x[i] * x[i + tau]
      expect(r[tau]).toBeCloseTo(direct, 6)
    }
  })
})
