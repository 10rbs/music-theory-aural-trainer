// Note segmentation + per-note summaries for the practice screen.
// A pure reducer over analysis frames: the shell feeds one frame per
// animation frame; when a note ends, a NoteSummary falls out.
//
// The same reducer will run offline over a recorded take (M6.2), so live and
// playback summaries agree.

import { toneOf, type Tone, type ToneFrame } from './timbre'

export interface Frame {
  t: number // ms, caller-supplied
  db: number // frame level, dBFS (see level.ts)
  midi: number | null // detected note, null when unpitched/silent
  cents: number | null // unrounded offset from `midi`
  /** Spectrum split for tone colour (pitched frames only). */
  tone?: ToneFrame
}

export interface NoteSummary {
  midi: number
  startT: number
  endT: number
  durationMs: number
  /** Mean tuning over the sustain (10% trimmed each end), cents. */
  avgCents: number
  /** Std-dev of tuning over the sustain (10% trimmed each end), cents — pitch steadiness. */
  centsSpread: number
  /** Onset → reaching the sustain level, ms. */
  attackMs: number
  /** Median level of the note, dBFS. */
  sustainDb: number
  /** Std-dev of level over the sustain, dB — how even the tone is held. */
  levelSpreadDb: number
  /** Tone colour averaged over the sustain; null if no frame carried a spectrum. */
  tone: Tone | null
}

/** Frames at or below this are silence for segmentation purposes. */
export const SOUND_DB = -48
/** No pitched frame for this long ends the note (pitch detection can drop out mid-note). */
export const PITCH_GAP_MS = 250
/** Silence for this long ends the note (separates tongued repeats). */
export const SILENCE_MS = 60
/** A different pitch held this long starts a new note (slurs); shorter is a blip. */
export const CHANGE_MS = 80
/** Loud-but-unpitched lead-in kept as part of the attack. */
export const PREROLL_MS = 300
/** Shorter notes are dropped as noise. */
export const MIN_NOTE_MS = 150
/** Within this many dB of the median counts as "at sustain level". */
export const SUSTAIN_WINDOW_DB = 3

export interface TrackerState {
  note: Frame[] | null
  noteMidi: number | null
  /** Frames at a different pitch, not yet committed as a new note. */
  pending: Frame[]
  preroll: Frame[]
  lastPitchedT: number
  lastSoundingT: number
}

export const initialTracker: TrackerState = {
  note: null,
  noteMidi: null,
  pending: [],
  preroll: [],
  lastPitchedT: -Infinity,
  lastSoundingT: -Infinity,
}

export interface TrackerStep {
  state: TrackerState
  /** Set on the frame where a note ended (and was long enough to count). */
  finished: NoteSummary | null
}

function startNote(frames: Frame[], midi: number, t: number): TrackerState {
  return {
    note: frames,
    noteMidi: midi,
    pending: [],
    preroll: [],
    lastPitchedT: t,
    lastSoundingT: t,
  }
}

/** Feed one frame. Returns the next state and any note that just ended. */
export function trackNote(state: TrackerState, f: Frame): TrackerStep {
  const pitched = f.midi !== null && f.cents !== null
  const sounding = f.db > SOUND_DB

  if (state.note === null || state.noteMidi === null) {
    if (pitched) return { state: startNote([...state.preroll, f], f.midi!, f.t), finished: null }
    const preroll = sounding ? [...state.preroll.filter((p) => f.t - p.t <= PREROLL_MS), f] : []
    return { state: { ...state, preroll }, finished: null }
  }

  const lastSoundingT = sounding ? f.t : state.lastSoundingT

  if (pitched && f.midi === state.noteMidi) {
    // back on (or still on) the note — a brief excursion folds back in
    return {
      state: {
        ...state,
        note: [...state.note, ...state.pending, f],
        pending: [],
        lastPitchedT: f.t,
        lastSoundingT,
      },
      finished: null,
    }
  }

  if (pitched) {
    const sameCandidate = state.pending.length > 0 && state.pending[0].midi === f.midi
    const pending = sameCandidate ? [...state.pending, f] : [f]
    const note = sameCandidate ? state.note : [...state.note, ...state.pending]
    if (f.t - pending[0].t >= CHANGE_MS) {
      // the new pitch stuck — close the old note, the pending frames start the next
      return {
        state: startNote(pending, f.midi!, f.t),
        finished: summarizeNote(note, state.noteMidi),
      }
    }
    return { state: { ...state, note, pending, lastPitchedT: f.t, lastSoundingT }, finished: null }
  }

  // unpitched frame inside a note: attack noise, release tail, or a dropout
  const note = [...state.note, ...state.pending, f]
  if (f.t - lastSoundingT >= SILENCE_MS || f.t - state.lastPitchedT > PITCH_GAP_MS) {
    return { state: initialTracker, finished: summarizeNote(note, state.noteMidi) }
  }
  return { state: { ...state, note, pending: [], lastSoundingT }, finished: null }
}

/** The note in progress, if any — for live "how long have I held this" displays. */
export function currentNote(state: TrackerState): { midi: number; startT: number } | null {
  if (state.note === null || state.noteMidi === null || state.note.length === 0) return null
  return { midi: state.noteMidi, startT: state.note[0].t }
}

/** End any note in progress (e.g. the mic was stopped). */
export function flushTracker(state: TrackerState): NoteSummary | null {
  if (state.note === null || state.noteMidi === null) return null
  return summarizeNote([...state.note, ...state.pending], state.noteMidi)
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
const stdev = (xs: number[]) => {
  const m = mean(xs)
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)))
}
/**
 * Drop the most extreme `frac` of values at each end. Tuning frames near a
 * slur see both pitches in one analysis window and report in-between cents;
 * trimming keeps those few frames from reading as pitch wander.
 */
const trimmed = (xs: number[], frac = 0.1) => {
  const s = [...xs].sort((a, b) => a - b)
  const k = Math.floor(s.length * frac)
  return k > 0 ? s.slice(k, s.length - k) : s
}
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

/**
 * Summarize a note's frames. Leading/trailing silence is trimmed; tuning and
 * evenness are measured over the sustain (attack and release excluded) so a
 * normal scoop-in or taper doesn't read as bad tuning. Returns null for
 * notes shorter than MIN_NOTE_MS or with no pitched frames.
 */
export function summarizeNote(frames: Frame[], midi: number): NoteSummary | null {
  let first = 0
  let last = frames.length - 1
  while (first <= last && frames[first].db <= SOUND_DB) first++
  while (last >= first && frames[last].db <= SOUND_DB) last--
  const body = frames.slice(first, last + 1)
  if (body.length === 0) return null

  const startT = body[0].t
  const endT = body[body.length - 1].t
  if (endT - startT < MIN_NOTE_MS) return null

  const sustainDb = median(body.map((f) => f.db))
  const atLevel = (f: Frame) => f.db >= sustainDb - SUSTAIN_WINDOW_DB
  const attackIdx = body.findIndex(atLevel)
  let releaseIdx = body.length - 1
  while (releaseIdx > attackIdx && !atLevel(body[releaseIdx])) releaseIdx--
  const sustain = body.slice(attackIdx, releaseIdx + 1)

  const onPitch = (fs: Frame[]) =>
    fs.filter((f) => f.midi === midi && f.cents !== null).map((f) => f.cents!)
  const sustainCents = onPitch(sustain)
  const cents = trimmed(sustainCents.length >= 3 ? sustainCents : onPitch(body))
  if (cents.length === 0) return null

  const tones = (fs: Frame[]) => fs.filter((f) => f.midi === midi && f.tone).map((f) => f.tone!)
  const sustainTones = tones(sustain)

  return {
    midi,
    startT,
    endT,
    durationMs: endT - startT,
    avgCents: mean(cents),
    centsSpread: stdev(cents),
    attackMs: body[attackIdx].t - startT,
    sustainDb,
    levelSpreadDb: stdev(sustain.map((f) => f.db)),
    tone: toneOf(sustainTones.length >= 3 ? sustainTones : tones(body)),
  }
}

export type Rating = 'good' | 'ok' | 'off'

export interface NoteRatings {
  tuning: Rating
  pitchSteadiness: Rating
  attack: Rating
  evenness: Rating
}

/**
 * Coarse traffic-light ratings. Thresholds are starting guesses for brass
 * long tones — tune them against real playing. Level (and so attack) is
 * metered per ~21 ms capture chunk, which bounds attack resolution.
 */
export const RATING_THRESHOLDS = {
  tuningCents: [5, 15],
  pitchSpreadCents: [4, 10],
  attackMs: [80, 200],
  levelSpreadDb: [1, 2.5],
} as const

function rate(value: number, [good, ok]: readonly [number, number]): Rating {
  return value <= good ? 'good' : value <= ok ? 'ok' : 'off'
}

export function rateNote(n: NoteSummary): NoteRatings {
  const t = RATING_THRESHOLDS
  return {
    tuning: rate(Math.abs(n.avgCents), t.tuningCents),
    pitchSteadiness: rate(n.centsSpread, t.pitchSpreadCents),
    attack: rate(n.attackMs, t.attackMs),
    evenness: rate(n.levelSpreadDb, t.levelSpreadDb),
  }
}
