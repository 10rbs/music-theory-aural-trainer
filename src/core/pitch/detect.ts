// Monophonic pitch detection via McLeod Pitch Method (normalized square
// difference + parabolic interpolation). Pure function on a time-domain
// buffer — the shell's mic adapter supplies the Float32Array.

import { autocorrelate } from '../dsp/fft'

export interface PitchResult {
  freq: number
  /** 0..1 — how periodic the signal is. Reject below ~0.9 for tuner use. */
  clarity: number
}

const DEFAULT_CLARITY_THRESHOLD = 0.9
const MIN_RMS = 0.005 // below this it's silence

/**
 * Detect the fundamental frequency of `buf` (time-domain samples).
 * Returns null for silence or unpitched noise.
 */
export function detectPitch(
  buf: Float32Array,
  sampleRate: number,
  clarityThreshold = DEFAULT_CLARITY_THRESHOLD,
): PitchResult | null {
  const n = buf.length
  const maxLag = Math.floor(n / 2)

  // silence gate
  let sumSq = 0
  for (let i = 0; i < n; i++) sumSq += buf[i] * buf[i]
  if (Math.sqrt(sumSq / n) < MIN_RMS) return null

  // NSDF: n'(tau) = 2*acf(tau) / m(tau), where m(tau) = Σ x[i]² + x[i+tau]².
  // acf via FFT (O(n log n)); m is updated incrementally from m(0) = 2·Σx².
  const acf = autocorrelate(buf, maxLag)
  const nsdf = new Float32Array(maxLag)
  let m = 2 * sumSq
  for (let tau = 0; tau < maxLag; tau++) {
    if (tau > 0) m -= buf[tau - 1] * buf[tau - 1] + buf[n - tau] * buf[n - tau]
    nsdf[tau] = m > 0 ? (2 * acf[tau]) / m : 0
  }

  // key-maxima picking: first find where nsdf dips below zero, then track
  // maxima between zero crossings
  const maxima: { tau: number; value: number }[] = []
  let tau = 1
  while (tau < maxLag && nsdf[tau] > 0) tau++ // skip the initial lobe
  while (tau < maxLag) {
    // advance to positive region
    while (tau < maxLag && nsdf[tau] <= 0) tau++
    if (tau >= maxLag) break
    // track the peak of this lobe
    let peakTau = tau
    while (tau < maxLag && nsdf[tau] > 0) {
      if (nsdf[tau] > nsdf[peakTau]) peakTau = tau
      tau++
    }
    maxima.push({ tau: peakTau, value: nsdf[peakTau] })
  }
  if (maxima.length === 0) return null

  // pick the first maximum exceeding k * highest maximum (McLeod's k ≈ 0.8-0.9)
  const highest = Math.max(...maxima.map((m) => m.value))
  const k = 0.9
  const chosen = maxima.find((m) => m.value >= k * highest)!

  // parabolic interpolation around the chosen lag for sub-sample precision
  const t = chosen.tau
  let refinedTau = t
  if (t > 0 && t < maxLag - 1) {
    const a = nsdf[t - 1]
    const b = nsdf[t]
    const c = nsdf[t + 1]
    const denom = a - 2 * b + c
    if (denom !== 0) refinedTau = t + (0.5 * (a - c)) / denom
  }

  const clarity = chosen.value
  if (clarity < clarityThreshold) return null

  return { freq: sampleRate / refinedTau, clarity }
}
