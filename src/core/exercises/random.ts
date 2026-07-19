// Seedable RNG so exercise generators are deterministic in tests.

export type Rng = () => number // returns [0, 1)

/** mulberry32 — tiny, good-enough PRNG for drills. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function randomInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1))
}

export function shuffle<T>(rng: Rng, arr: readonly T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Comfortable root note range: G3 (55) to C5 (72). */
export const ROOT_MIN = 55
export const ROOT_MAX = 72

export function randomRoot(rng: Rng): number {
  return randomInt(rng, ROOT_MIN, ROOT_MAX)
}
