// Pure metronome timing math. The shell's lookahead scheduler asks
// "what is tick N and when does it sound?" — no clocks or audio here.

export interface TimeSignature {
  beats: number // beats per bar
  /** Note value of one beat, e.g. 4 = quarter, 2 = half (cut time), 8 = compound eighths. */
  unit: number
  label: string
  /** For compound meters (6/8): which beat indices carry a secondary accent. */
  accents?: readonly number[]
}

export const TIME_SIGNATURES: readonly TimeSignature[] = [
  { beats: 2, unit: 4, label: '2/4' },
  { beats: 3, unit: 4, label: '3/4' },
  { beats: 4, unit: 4, label: '4/4' },
  { beats: 2, unit: 2, label: '2/2 (cut)' },
  { beats: 6, unit: 8, label: '6/8', accents: [3] },
]

export interface Subdivision {
  /** Ticks per beat: 1 = none, 2 = eighths, 3 = triplets, 4 = sixteenths. */
  perBeat: number
  label: string
}

export const SUBDIVISIONS: readonly Subdivision[] = [
  { perBeat: 1, label: 'Beat' },
  { perBeat: 2, label: 'Eighths' },
  { perBeat: 3, label: 'Triplets' },
  { perBeat: 4, label: 'Sixteenths' },
]

export type Accent = 'downbeat' | 'beat' | 'sub'

export interface Tick {
  /** Seconds from the start of the click track. */
  time: number
  accent: Accent
  /** Beat index within the bar (0-based) — drives the visual indicator. */
  beatInBar: number
  bar: number
}

export interface ClickTrackConfig {
  bpm: number
  signature: TimeSignature
  subdivision: Subdivision
}

export const MIN_BPM = 30
export const MAX_BPM = 260

export function clampBpm(bpm: number): number {
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(bpm)))
}

/** Duration of one beat in seconds. bpm always refers to the beat unit. */
export function secondsPerBeat(bpm: number): number {
  return 60 / bpm
}

/** The Nth tick (0-based) of an endless click track. */
export function tickAt(config: ClickTrackConfig, n: number): Tick {
  const { bpm, signature, subdivision } = config
  const ticksPerBeat = subdivision.perBeat

  const beatIndex = Math.floor(n / ticksPerBeat) // global beat number
  const tickInBeat = n % ticksPerBeat
  const beatInBar = beatIndex % signature.beats
  const bar = Math.floor(beatIndex / signature.beats)

  let accent: Accent
  if (tickInBeat !== 0) {
    accent = 'sub'
  } else if (beatInBar === 0) {
    accent = 'downbeat'
  } else if (signature.accents?.includes(beatInBar)) {
    accent = 'downbeat' // secondary accent voiced like a downbeat, lighter would also work
  } else {
    accent = 'beat'
  }

  const time = (n / ticksPerBeat) * secondsPerBeat(bpm)
  return { time, accent, beatInBar, bar }
}

/** Average of the last few tap intervals → bpm, or null if unusable. */
export function tapTempo(tapTimesMs: readonly number[]): number | null {
  if (tapTimesMs.length < 2) return null
  const recent = tapTimesMs.slice(-5)
  const intervals: number[] = []
  for (let i = 1; i < recent.length; i++) {
    const dt = recent[i] - recent[i - 1]
    if (dt <= 0 || dt > 3000) return null // stale or bogus taps
    intervals.push(dt)
  }
  const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length
  return clampBpm(60000 / avg)
}
