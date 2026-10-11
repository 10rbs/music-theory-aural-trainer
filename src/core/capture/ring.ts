// Fixed-capacity sample ring buffer for the rolling capture (M6.2).
// Deterministic and DOM-free; it mutates the ring passed in (copying ~60 s
// of audio per write would be absurd) but touches nothing else.
// Samples are addressed by absolute index: sample i is the i-th sample
// written since the ring was created.

export interface Ring {
  data: Float32Array
  /** Total samples ever written. */
  written: number
}

export function createRing(capacity: number): Ring {
  return { data: new Float32Array(capacity), written: 0 }
}

/** Oldest absolute sample index still held. */
export function ringStart(ring: Ring): number {
  return Math.max(0, ring.written - ring.data.length)
}

export function writeRing(ring: Ring, chunk: Float32Array): void {
  const cap = ring.data.length
  // a chunk larger than the ring: only its tail survives
  const src = chunk.length > cap ? chunk.subarray(chunk.length - cap) : chunk
  const skipped = chunk.length - src.length
  const at = (ring.written + skipped) % cap
  const first = Math.min(src.length, cap - at)
  ring.data.set(src.subarray(0, first), at)
  ring.data.set(src.subarray(first), 0)
  ring.written += chunk.length
}

/**
 * Copy absolute samples [from, to) out in chronological order. The range is
 * clamped to what the ring still holds.
 */
export function readRing(ring: Ring, from: number, to: number): Float32Array {
  const start = Math.max(from, ringStart(ring))
  const end = Math.min(to, ring.written)
  if (end <= start) return new Float32Array(0)
  const cap = ring.data.length
  const out = new Float32Array(end - start)
  const at = start % cap
  const first = Math.min(out.length, cap - at)
  out.set(ring.data.subarray(at, at + first), 0)
  out.set(ring.data.subarray(0, out.length - first), first)
  return out
}
