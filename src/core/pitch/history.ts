// Pitch-history buffer math for the tuner's scrolling cents graph.
// Pure functions: time is always passed in, never read from a clock.

export interface PitchSample {
  t: number // caller-supplied timestamp, ms
  cents: number // −50..+50 offset from the nearest note
}

export interface PitchSegment {
  points: { x: number; y: number }[]
  inTune: boolean
}

export const IN_TUNE_CENTS = 5
/** Silence longer than this breaks the trace into separate segments. */
export const GAP_MS = 250

/** Append a sample and drop everything older than the window. Returns a new array. */
export function pushReading(
  samples: PitchSample[],
  sample: PitchSample,
  now: number,
  windowMs: number,
): PitchSample[] {
  const cutoff = now - windowMs
  return [...samples.filter((s) => s.t >= cutoff), sample]
}

/**
 * Map samples to SVG-space segments for a w×h viewport where x scrolls with
 * time (right edge = now) and y spans +50 cents (top) to −50 (bottom).
 * A new segment starts at silence gaps (> gapMs between samples) and whenever
 * the in-tune state flips, so each segment can be stroked in a single color.
 */
export function toSegments(
  samples: PitchSample[],
  now: number,
  windowMs: number,
  w: number,
  h: number,
  gapMs = GAP_MS,
): PitchSegment[] {
  const segments: PitchSegment[] = []
  let current: PitchSegment | null = null
  let prevT = -Infinity

  for (const s of samples) {
    if (s.t < now - windowMs || s.t > now) continue
    const cents = Math.max(-50, Math.min(50, s.cents))
    const inTune = Math.abs(cents) <= IN_TUNE_CENTS
    const x = ((s.t - (now - windowMs)) / windowMs) * w
    const y = (h / 2) * (1 - cents / 50)

    if (!current || s.t - prevT > gapMs || inTune !== current.inTune) {
      current = { points: [], inTune }
      segments.push(current)
    }
    current.points.push({ x, y })
    prevT = s.t
  }
  return segments
}
