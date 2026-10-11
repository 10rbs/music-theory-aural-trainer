// Review-mode (paused take) timeline math: playhead ↔ x, view scrolling,
// what's under the playhead. All times are take-clock ms (sample time).

import type { PitchSample } from '../pitch/history'
import type { NoteSummary } from '../pitch/notes'

export interface TakeSpan {
  startMs: number
  endMs: number
}

/** Map an x position in a w-wide lane (right edge = viewEnd) to a time, clamped to the take. */
export function xToTime(x: number, w: number, viewEnd: number, windowMs: number, take: TakeSpan): number {
  const t = viewEnd - windowMs + (x / w) * windowMs
  return Math.max(take.startMs, Math.min(take.endMs, t))
}

/** Keep the view's right edge where a full window fits inside the take where possible. */
export function clampView(viewEnd: number, windowMs: number, take: TakeSpan): number {
  const min = Math.min(take.startMs + windowMs, take.endMs)
  return Math.max(min, Math.min(take.endMs, viewEnd))
}

/** Center the view on t (used when jumping via the overview strip or a note chip). */
export function centerView(t: number, windowMs: number, take: TakeSpan): number {
  return clampView(t + windowMs / 2, windowMs, take)
}

/**
 * Page the view to follow a moving playhead: once the playhead nears the
 * right edge (or falls off either side), jump so it sits a quarter in.
 */
export function followPlayhead(viewEnd: number, playhead: number, windowMs: number, take: TakeSpan): number {
  const left = viewEnd - windowMs
  if (playhead >= left && playhead <= viewEnd - windowMs * 0.1) return viewEnd
  return clampView(playhead + windowMs * 0.75, windowMs, take)
}

/** The pitch sample nearest t, if one lies within toleranceMs (samples sorted by t). */
export function pitchAt(samples: PitchSample[], t: number, toleranceMs = 60): PitchSample | null {
  let lo = 0
  let hi = samples.length - 1
  if (hi < 0) return null
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (samples[mid].t < t) lo = mid + 1
    else hi = mid
  }
  const candidates = [samples[lo], samples[lo - 1]].filter(Boolean)
  const best = candidates.reduce((a, b) => (Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a))
  return Math.abs(best.t - t) <= toleranceMs ? best : null
}

/** The note sounding at t, if any. */
export function noteAt(notes: NoteSummary[], t: number): NoteSummary | null {
  return notes.find((n) => n.startT <= t && t <= n.endT) ?? null
}

/** "m:ss.t" for the transport readout. */
export function formatClock(ms: number): string {
  const tenths = Math.max(0, Math.floor(ms / 100))
  const m = Math.floor(tenths / 600)
  const s = Math.floor((tenths % 600) / 10)
  return `${m}:${String(s).padStart(2, '0')}.${tenths % 10}`
}
