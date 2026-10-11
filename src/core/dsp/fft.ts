// Iterative radix-2 complex FFT, in place on separate real/imag arrays.
// Hand-rolled (no dependency) — used by pitch detection (FFT autocorrelation)
// and, from M6.3, the tone-colour spectrum.

const twiddleCache = new Map<number, { cos: Float64Array; sin: Float64Array }>()

function twiddles(n: number) {
  let t = twiddleCache.get(n)
  if (!t) {
    const cos = new Float64Array(n / 2)
    const sin = new Float64Array(n / 2)
    for (let i = 0; i < n / 2; i++) {
      cos[i] = Math.cos((2 * Math.PI * i) / n)
      sin[i] = Math.sin((2 * Math.PI * i) / n)
    }
    t = { cos, sin }
    twiddleCache.set(n, t)
  }
  return t
}

export function nextPow2(n: number): number {
  let p = 1
  while (p < n) p <<= 1
  return p
}

/**
 * In-place FFT. `re`/`im` must share a power-of-two length. Forward uses
 * e^(−2πik/n) and is unscaled; inverse divides by n, so ifft(fft(x)) = x.
 */
export function fft(re: Float64Array, im: Float64Array, inverse = false): void {
  const n = re.length
  if (n !== im.length || (n & (n - 1)) !== 0) {
    throw new Error(`fft: length must be a power of two (got ${n})`)
  }

  // bit-reversal permutation
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      ;[re[i], re[j]] = [re[j], re[i]]
      ;[im[i], im[j]] = [im[j], im[i]]
    }
  }

  const { cos, sin } = twiddles(n)
  const sign = inverse ? 1 : -1
  for (let size = 2; size <= n; size <<= 1) {
    const half = size >> 1
    const step = n / size
    for (let start = 0; start < n; start += size) {
      for (let k = 0; k < half; k++) {
        const wr = cos[k * step]
        const wi = sign * sin[k * step]
        const a = start + k
        const b = a + half
        const tr = re[b] * wr - im[b] * wi
        const ti = re[b] * wi + im[b] * wr
        re[b] = re[a] - tr
        im[b] = im[a] - ti
        re[a] += tr
        im[a] += ti
      }
    }
  }

  if (inverse) {
    for (let i = 0; i < n; i++) {
      re[i] /= n
      im[i] /= n
    }
  }
}

/**
 * Linear (non-circular) autocorrelation r[τ] = Σ x[i]·x[i+τ] for
 * τ = 0..maxLag−1, via zero-padded FFT — O(n log n) instead of O(n·maxLag).
 */
export function autocorrelate(x: Float32Array, maxLag: number): Float64Array {
  const size = nextPow2(x.length + maxLag)
  const re = new Float64Array(size)
  const im = new Float64Array(size)
  re.set(x)
  fft(re, im)
  for (let i = 0; i < size; i++) {
    re[i] = re[i] * re[i] + im[i] * im[i]
    im[i] = 0
  }
  fft(re, im, true)
  return re.slice(0, maxLag)
}
