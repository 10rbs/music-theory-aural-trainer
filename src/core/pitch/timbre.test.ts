import { describe, expect, test } from 'vitest'
import { HARMONIC_FLOOR_DB, HARMONICS, parseReferenceTone, toneFrame, toneOf } from './timbre'

const SR = 48000
const N = 4096

/** Sum of harmonics with the given amplitudes (index 0 = fundamental), plus optional noise. */
function tone(f0: number, amps: number[], noiseAmp = 0): Float32Array {
  let seed = 99
  return Float32Array.from({ length: N }, (_, i) => {
    let v = 0
    amps.forEach((a, k) => (v += a * Math.sin((2 * Math.PI * f0 * (k + 1) * i) / SR)))
    if (noiseAmp) {
      seed = (seed * 1664525 + 1013904223) >>> 0
      v += noiseAmp * (seed / 0xffffffff - 0.5)
    }
    return v
  })
}

const sawAmps = Array.from({ length: HARMONICS }, (_, k) => 0.5 / (k + 1))

describe('toneFrame / toneOf', () => {
  test('a pure sine is all fundamental: brightness 1, richness ~0', () => {
    const t = toneOf([toneFrame(tone(233.08, [0.5]), SR, 233.08)])!
    expect(t.brightness).toBeCloseTo(1, 2)
    expect(t.richness).toBeLessThan(0.001)
    expect(t.harmonics[0]).toBe(0)
    expect(t.harmonics[5]).toBe(HARMONIC_FLOOR_DB)
  })

  test('a sawtooth-like spectrum shows harmonics falling ~6 dB per octave', () => {
    const t = toneOf([toneFrame(tone(220, sawAmps), SR, 220)])!
    expect(t.harmonics[0]).toBeCloseTo(0, 0)
    expect(t.harmonics[1]).toBeCloseTo(-6.02, 0) // 1/2 amplitude
    expect(t.harmonics[3]).toBeCloseTo(-12.04, 0) // 1/4
    expect(t.richness).toBeGreaterThan(0.3)
  })

  test('more upper-harmonic energy reads brighter and richer', () => {
    const dark = toneOf([toneFrame(tone(220, [0.5, 0.15, 0.05]), SR, 220)])!
    const bright = toneOf([toneFrame(tone(220, [0.3, 0.3, 0.25, 0.2, 0.15]), SR, 220)])!
    expect(bright.brightness).toBeGreaterThan(dark.brightness + 0.5)
    expect(bright.richness).toBeGreaterThan(dark.richness)
  })

  test('added breath noise raises airiness', () => {
    const clean = toneOf([toneFrame(tone(220, sawAmps), SR, 220)])!
    const airy = toneOf([toneFrame(tone(220, sawAmps, 0.4), SR, 220)])!
    expect(clean.airiness).toBeLessThan(0.02)
    expect(airy.airiness).toBeGreaterThan(clean.airiness * 5)
  })

  test('harmonics above Nyquist are empty, not garbage', () => {
    const f0 = 2500 // 12th harmonic = 30 kHz > 24 kHz Nyquist
    const frame = toneFrame(tone(f0, [0.5, 0.25]), SR, f0)
    expect(frame.powers[11]).toBe(0)
    expect(frame.powers[9]).toBe(0)
  })

  test('works in the low brass range (Bb1 ≈ 58 Hz)', () => {
    const t = toneOf([toneFrame(tone(58.27, [0.5, 0.25]), SR, 58.27)])!
    expect(t.harmonics[1]).toBeCloseTo(-6.02, 0)
  })

  test('averages across frames by power', () => {
    const a = toneFrame(tone(220, [0.5]), SR, 220)
    const b = toneFrame(tone(220, [0.5, 0.5]), SR, 220)
    const t = toneOf([a, b])!
    // mean powers: h1 = p, h2 = p/2 → h2 ≈ −3 dB
    expect(t.harmonics[1]).toBeCloseTo(-3.01, 0)
  })

  test('no frames or no energy → null', () => {
    expect(toneOf([])).toBeNull()
    expect(toneOf([toneFrame(new Float32Array(N), SR, 220)])).toBeNull()
  })
})

describe('parseReferenceTone', () => {
  const good = {
    harmonics: Array(HARMONICS).fill(-10),
    brightness: 2,
    richness: 0.4,
    airiness: 0.05,
    midi: 58,
    savedOn: '2026-10-11',
  }

  test('accepts a well-formed reference', () => {
    expect(parseReferenceTone(good)).toEqual(good)
  })

  test('rejects missing, malformed or wrong-length data', () => {
    expect(parseReferenceTone(null)).toBeNull()
    expect(parseReferenceTone('x')).toBeNull()
    expect(parseReferenceTone({ ...good, harmonics: [0, -6] })).toBeNull()
    expect(parseReferenceTone({ ...good, brightness: 'bright' })).toBeNull()
    expect(parseReferenceTone({ ...good, airiness: Number.NaN })).toBeNull()
    expect(parseReferenceTone({ ...good, savedOn: undefined })).toBeNull()
  })

  test('drops unknown extra fields', () => {
    expect(parseReferenceTone({ ...good, extra: 1 })).not.toHaveProperty('extra')
  })
})
