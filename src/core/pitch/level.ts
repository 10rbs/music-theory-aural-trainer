// Loudness (amplitude envelope) math for the "shape of the note" lane.
// Pure functions: the shell hands in time-domain frames and timestamps.

export interface LevelSample {
  t: number // caller-supplied timestamp, ms
  db: number // dBFS, floored at FLOOR_DB
}

/** Bottom of the displayed range — anything quieter draws as silence. */
export const FLOOR_DB = -60

/** RMS level of a time-domain frame in dBFS, floored at FLOOR_DB. */
export function frameDb(buf: Float32Array): number {
  let sumSq = 0
  for (let i = 0; i < buf.length; i++) sumSq += buf[i] * buf[i]
  const rms = buf.length > 0 ? Math.sqrt(sumSq / buf.length) : 0
  if (rms <= 0) return FLOOR_DB
  return Math.max(FLOOR_DB, 20 * Math.log10(rms))
}

/** Append a sample and drop everything older than the window. Returns a new array. */
export function pushLevel(
  samples: LevelSample[],
  sample: LevelSample,
  now: number,
  windowMs: number,
): LevelSample[] {
  const cutoff = now - windowMs
  return [...samples.filter((s) => s.t >= cutoff), sample]
}

/**
 * Map level samples to closed SVG polygons for a w×h lane, mirrored about the
 * center line like a recording app's waveform overview: louder = taller.
 * x scrolls with time (right edge = now). Silence (at the floor) or a gap
 * longer than gapMs between samples breaks the shape into separate polygons,
 * so each played note reads as its own blob.
 */
export function toEnvelopeShapes(
  samples: LevelSample[],
  now: number,
  windowMs: number,
  w: number,
  h: number,
  gapMs = 250,
): { x: number; y: number }[][] {
  const shapes: { x: number; y: number }[][] = []
  let top: { x: number; y: number }[] = []
  let prevT = -Infinity

  const flush = () => {
    if (top.length > 0) {
      const bottom = top.map((p) => ({ x: p.x, y: h - p.y })).reverse()
      shapes.push([...top, ...bottom])
    }
    top = []
  }

  for (const s of samples) {
    if (s.t < now - windowMs || s.t > now) continue
    const amp = Math.max(0, Math.min(1, (s.db - FLOOR_DB) / -FLOOR_DB))
    if (amp === 0 || s.t - prevT > gapMs) flush()
    prevT = s.t
    if (amp === 0) continue
    const x = ((s.t - (now - windowMs)) / windowMs) * w
    top.push({ x, y: (h / 2) * (1 - amp) })
  }
  flush()
  return shapes
}
