// Tone colour (M6.3): how strong each harmonic is relative to the others,
// and three descriptive numbers derived from that. Pure functions over a
// time-domain frame + the f0 the tuner already found.
//
// Numbers describe the sound; they don't judge it. The mic and room colour
// the spectrum and brass brightens as it gets louder, so the useful
// comparison is against your own saved reference on the same device.

import { fft } from '../dsp/fft'

export const HARMONICS = 12
/** Harmonic bar floor, dB below the strongest harmonic. */
export const HARMONIC_FLOOR_DB = -40

/** Per-frame raw material — powers average cleanly across a note. */
export interface ToneFrame {
  /** Power around each harmonic 1..HARMONICS (0 above Nyquist). */
  powers: number[]
  /** Power in the band f0/2..(HARMONICS+½)·f0 that sits between harmonics. */
  noise: number
}

export interface Tone {
  /** Each harmonic in dB relative to the strongest (≥ HARMONIC_FLOOR_DB). */
  harmonics: number[]
  /** Power-weighted mean harmonic number: 1 = pure fundamental, higher = brighter. */
  brightness: number
  /** Share of harmonic power above the fundamental, 0..1. */
  richness: number
  /** Share of in-band power between the harmonics (breath/noise), 0..1. */
  airiness: number
}

const hannCache = new Map<number, Float64Array>()
function hann(n: number): Float64Array {
  let w = hannCache.get(n)
  if (!w) {
    w = Float64Array.from({ length: n }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)))
    hannCache.set(n, w)
  }
  return w
}

/** Power spectrum |X[k]|² for k = 0..n/2 of a Hann-windowed frame (n a power of two). */
export function powerSpectrum(buf: Float32Array): Float64Array {
  const n = buf.length
  const w = hann(n)
  const re = new Float64Array(n)
  const im = new Float64Array(n)
  for (let i = 0; i < n; i++) re[i] = buf[i] * w[i]
  fft(re, im)
  const out = new Float64Array(n / 2 + 1)
  for (let k = 0; k <= n / 2; k++) out[k] = re[k] * re[k] + im[k] * im[k]
  return out
}

/**
 * Split a frame's spectrum into power at each harmonic of f0 (summed over a
 * few bins either side, so between-bin harmonics aren't undercounted) and
 * the power left between them.
 */
export function toneFrame(buf: Float32Array, sampleRate: number, f0: number): ToneFrame {
  const spec = powerSpectrum(buf)
  const binHz = sampleRate / buf.length
  const lastBin = spec.length - 1
  const spacing = f0 / binHz
  // Hann's main lobe is ±2 bins; stay well inside half the harmonic spacing
  const hw = Math.max(1, Math.min(3, Math.floor(spacing * 0.3)))

  const claimed = new Uint8Array(spec.length)
  const powers: number[] = []
  for (let h = 1; h <= HARMONICS; h++) {
    const center = Math.round(h * spacing)
    if (center + hw > lastBin) {
      powers.push(0)
      continue
    }
    let p = 0
    for (let k = center - hw; k <= center + hw; k++) {
      p += spec[k]
      claimed[k] = 1
    }
    powers.push(p)
  }

  const lo = Math.max(1, Math.floor(spacing / 2))
  const hi = Math.min(lastBin, Math.round((HARMONICS + 0.5) * spacing))
  let noise = 0
  for (let k = lo; k <= hi; k++) if (!claimed[k]) noise += spec[k]
  return { powers, noise }
}

/** Average frames (by power) and derive the tone numbers. Null if there's no harmonic energy. */
export function toneOf(frames: ToneFrame[]): Tone | null {
  if (frames.length === 0) return null
  const powers = Array.from({ length: HARMONICS }, (_, h) =>
    frames.reduce((s, f) => s + f.powers[h], 0) / frames.length,
  )
  const noise = frames.reduce((s, f) => s + f.noise, 0) / frames.length
  const total = powers.reduce((a, b) => a + b, 0)
  const peak = Math.max(...powers)
  if (total <= 0 || peak <= 0) return null

  return {
    harmonics: powers.map((p) =>
      p > 0 ? Math.max(HARMONIC_FLOOR_DB, 10 * Math.log10(p / peak)) : HARMONIC_FLOOR_DB,
    ),
    brightness: powers.reduce((s, p, i) => s + (i + 1) * p, 0) / total,
    richness: (total - powers[0]) / total,
    airiness: noise / (noise + total),
  }
}

/** A saved "this is the sound I want" snapshot (setting `referenceTone`). */
export interface ReferenceTone extends Tone {
  midi: number
  /** Local date it was saved (toLocalDateStr), for display. */
  savedOn: string
}

const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x)

/**
 * Validate a stored/imported reference — settings can come from an old or
 * hand-edited backup, so anything malformed reads as "no reference".
 */
export function parseReferenceTone(x: unknown): ReferenceTone | null {
  if (!x || typeof x !== 'object') return null
  const r = x as Record<string, unknown>
  if (
    !Array.isArray(r.harmonics) ||
    r.harmonics.length !== HARMONICS ||
    !r.harmonics.every(isNum) ||
    !isNum(r.brightness) ||
    !isNum(r.richness) ||
    !isNum(r.airiness) ||
    !isNum(r.midi) ||
    typeof r.savedOn !== 'string'
  ) {
    return null
  }
  return {
    harmonics: r.harmonics as number[],
    brightness: r.brightness,
    richness: r.richness,
    airiness: r.airiness,
    midi: r.midi,
    savedOn: r.savedOn,
  }
}
