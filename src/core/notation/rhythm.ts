// Rhythm notation layout — durations, rests, stems, flags, beams, bar lines and
// time signatures, for a single voice. Pure: this produces an abstract layout
// (staff steps vertically, px x horizontally, same split as staff.ts +
// ScaleStaff), and the SVG renderer in features/ maps steps to y and draws it.
//
// Durations are in quarter-note BEATS, the same unit as PlaybackSpec, so an
// exercise's playback and its notation come from one source. Bounded v1: whole
// through sixteenth + dotted, meters 4/4·3/4·2/4·6/8, beaming within a beat
// group. Triplets, ties across bar lines and multi-voice are out of scope — see
// docs/decisions/0004.

import { staffLayout, type Clef, type StaffNoteInput } from './staff'

export interface Meter {
  beats: number
  /** note value that gets the beat: 4 = quarter, 8 = eighth */
  unit: number
}

/** A note (with pitch) or, when `note` is absent, a rest. Duration in quarter beats. */
export interface RhythmEvent {
  note?: StaffNoteInput
  beats: number
}

export interface NoteValue {
  /** denominator: 1 whole, 2 half, 4 quarter, 8 eighth, 16 sixteenth */
  value: number
  dots: 0 | 1
}

export interface RhythmGlyph {
  isRest: boolean
  /** diatonic steps above the clef bottom line (rest sits at the middle line) */
  step: number
  alter: number
  value: number
  dots: 0 | 1
  stemUp: boolean
  /** flags when the note stands alone (not beamed): 1 for eighth, 2 for sixteenth */
  flags: number
  beamId: number | null
  /** horizontal center, px */
  x: number
  ledgerSteps: number[]
}

export interface Beam {
  id: number
  stemUp: boolean
  /** staff step of the (horizontal) beam line, where every stem in the group ends */
  beamStep: number
  x0: number
  x1: number
  /** secondary (sixteenth) beam segments as [x0, x1] px ranges */
  secondary: [number, number][]
}

export interface RhythmLayout {
  glyphs: RhythmGlyph[]
  beams: Beam[]
  /** x positions of internal bar lines (not the closing one at `width`) */
  barlines: number[]
  width: number
  meter: Meter
}

const EPS = 1e-6

// horizontal spacing (px). Heads are ~12px wide, so advances stay well clear of
// that to avoid a cramped, noisy look — even beamed sixteenths keep a gap.
const LEFT_PAD = 62 // clef + time signature, then the first note
const ADVANCE: Record<number, number> = { 1: 62, 2: 46, 4: 32, 8: 22, 16: 17 }
const DOT_EXTRA = 7
const BARLINE_GAP = 12
const TRAIL_PAD = 10

// vertical (staff steps); the renderer converts steps to px
const MIDDLE = 4 // middle staff line
const STEM_STEPS = 6 // ~3 line-spaces
const SECONDARY_OFFSET = 1.6

const VALUE_TABLE: readonly [number, number, 0 | 1][] = [
  [4, 1, 0],
  [3, 2, 1],
  [2, 2, 0],
  [1.5, 4, 1],
  [1, 4, 0],
  [0.75, 8, 1],
  [0.5, 8, 0],
  [0.25, 16, 0],
]

/** Note value + dots for a duration in quarter beats (bounded set). */
export function beatsToValue(beats: number): NoteValue {
  const row = VALUE_TABLE.find(([b]) => Math.abs(b - beats) < EPS)
  if (!row) throw new Error(`unsupported duration: ${beats} beats`)
  return { value: row[1], dots: row[2] }
}

/** Quarter-beats in one measure of this meter (4/4 → 4, 6/8 → 3, 3/4 → 3). */
export function measureBeats(meter: Meter): number {
  return meter.beats * (4 / meter.unit)
}

const isBeamable = (g: { isRest: boolean; value: number }) => !g.isRest && g.value >= 8
const flagsFor = (value: number) => (value === 16 ? 2 : value === 8 ? 1 : 0)

export function rhythmLayout(
  events: readonly RhythmEvent[],
  meter: Meter,
  clef: Clef = 'treble',
): RhythmLayout {
  const mBeats = measureBeats(meter)
  const compound = meter.unit === 8 && meter.beats % 3 === 0
  const groupSize = compound ? 1.5 : 1

  const glyphs: RhythmGlyph[] = []
  const groupKey: number[] = [] // beat-group id per glyph, for beaming
  const barlines: number[] = []

  let x = LEFT_PAD
  let pos = 0 // cumulative quarter-beats
  let measure = 0

  for (const ev of events) {
    const nv = beatsToValue(ev.beats)
    const m = Math.floor(pos / mBeats + EPS)
    if (m > measure) {
      barlines.push(x - BARLINE_GAP / 2)
      x += BARLINE_GAP
      measure = m
    }
    const inMeasure = pos - m * mBeats
    const group = m * 1000 + Math.floor(inMeasure / groupSize + EPS)

    let step = MIDDLE
    let alter = 0
    let ledgerSteps: number[] = []
    if (ev.note) {
      const [sl] = staffLayout([ev.note], clef)
      step = sl.step
      alter = ev.note.alter
      ledgerSteps = sl.ledgerSteps
    }

    glyphs.push({
      isRest: !ev.note,
      step,
      alter,
      value: nv.value,
      dots: nv.dots,
      stemUp: step < MIDDLE, // provisional; beams override
      flags: 0,
      beamId: null,
      x,
      ledgerSteps,
    })
    groupKey.push(group)
    x += ADVANCE[nv.value] + (nv.dots ? DOT_EXTRA : 0)
    pos += ev.beats
  }

  const beams = assignBeams(glyphs, groupKey)

  // notes not in a beam get flags and the single-note stem rule
  for (const g of glyphs) {
    if (g.beamId === null && !g.isRest) {
      g.flags = flagsFor(g.value)
      g.stemUp = g.step < MIDDLE
    }
  }

  return { glyphs, beams, barlines, width: x + TRAIL_PAD, meter }
}

/** Group consecutive beamable notes sharing a beat group into beams (≥2 notes). */
function assignBeams(glyphs: RhythmGlyph[], groupKey: number[]): Beam[] {
  const beams: Beam[] = []
  let i = 0
  let nextId = 0
  while (i < glyphs.length) {
    if (!isBeamable(glyphs[i])) {
      i++
      continue
    }
    let j = i + 1
    while (j < glyphs.length && isBeamable(glyphs[j]) && groupKey[j] === groupKey[i]) j++
    const run = glyphs.slice(i, j)
    if (run.length >= 2) {
      const id = nextId++
      // stem direction: away from the note furthest from the middle line
      const extreme = run.reduce((a, b) => (Math.abs(b.step - MIDDLE) > Math.abs(a.step - MIDDLE) ? b : a))
      const stemUp = extreme.step < MIDDLE
      const steps = run.map((g) => g.step)
      const beamStep = stemUp ? Math.max(...steps) + STEM_STEPS : Math.min(...steps) - STEM_STEPS
      for (const g of run) {
        g.beamId = id
        g.stemUp = stemUp
      }
      beams.push({
        id,
        stemUp,
        beamStep,
        x0: run[0].x,
        x1: run[run.length - 1].x,
        secondary: secondaryBeams(run),
      })
    }
    i = j
  }
  return beams
}

const STUB = 7 // px, a partial (stub) secondary beam for a lone sixteenth

/**
 * Secondary (sixteenth) beam segments as [x0,x1] px ranges: a full segment over
 * each run of ≥2 consecutive sixteenths, and a short stub for a lone sixteenth
 * (e.g. the sixteenth in a beamed dotted-eighth + sixteenth), pointing back
 * toward its beamed neighbour.
 */
function secondaryBeams(run: RhythmGlyph[]): [number, number][] {
  const out: [number, number][] = []
  let k = 0
  while (k < run.length) {
    if (run[k].value !== 16) {
      k++
      continue
    }
    let l = k + 1
    while (l < run.length && run[l].value === 16) l++
    if (l - k >= 2) {
      out.push([run[k].x, run[l - 1].x]) // full secondary beam
    } else if (k > 0) {
      out.push([run[k].x - STUB, run[k].x]) // stub toward the previous note
    } else {
      out.push([run[k].x, run[k].x + STUB]) // stub toward the next note
    }
    k = l
  }
  return out
}

export { SECONDARY_OFFSET, STEM_STEPS }
