// Rhythm notation layout — durations, rests, stems, flags, beams, bar lines and
// time signatures, for a single voice. Pure: this produces an abstract layout
// (staff steps vertically, px x horizontally, same split as staff.ts +
// ScaleStaff), and the SVG renderer in features/ maps steps to y and draws it.
//
// A passage is laid out as one or more SYSTEMS (staff lines): whole measures are
// packed onto a line until it fills, then the next measures wrap to a new line —
// so longer passages read at a natural note size instead of shrinking. Each
// system carries the clef; the time signature is on the first line only.
//
// Durations are in quarter-note BEATS, the same unit as PlaybackSpec, so an
// exercise's playback and its notation come from one source. Bounded v1: whole
// through sixteenth + dotted, meters 4/4·3/4·2/4·6/8, beaming within a beat
// group. Triplets, ties across bar lines and multi-voice are out of scope — see
// docs/decisions/0004.

import { staffLayout, type Clef, type StaffNoteInput } from './staff'
import {
  inlineAlter,
  keySignatureLayout,
  signatureMap,
  type KeySignature,
  type SignatureAccidental,
} from './key-signature'

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
  /** the note's pitch alteration (−1 flat … +1 sharp); 0 for naturals/rests */
  alter: number
  /**
   * The inline accidental to draw, or `null` when none is needed — a key
   * signature already in force can suppress it (or demand a cancelling ♮, drawn
   * as accidental 0). Without a signature this is `alter` when non-zero, else null.
   */
  accidental: number | null
  value: number
  dots: 0 | 1
  stemUp: boolean
  /** flags when the note stands alone (not beamed): 1 for eighth, 2 for sixteenth */
  flags: number
  beamId: number | null
  /** horizontal center, px, relative to this system's left edge */
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

/** One staff line of a passage. */
export interface RhythmSystem {
  glyphs: RhythmGlyph[]
  beams: Beam[]
  /** x of internal bar lines (between measures); the closing bar is at `width` */
  barlines: number[]
  width: number
  /** the time signature is drawn on the first system only */
  showTimeSig: boolean
  /** key-signature accidentals drawn after the clef on this system (with x) */
  keySig: PositionedAccidental[]
  /** x for the time signature, placed after the clef and any key signature */
  timeSigX: number
}

/** A key-signature accidental with its horizontal position on the system. */
export interface PositionedAccidental extends SignatureAccidental {
  x: number
}

export interface RhythmLayout {
  systems: RhythmSystem[]
  /** widest system, px */
  width: number
  meter: Meter
}

const EPS = 1e-6

// horizontal spacing (px). Heads are ~12px wide, so advances stay well clear of
// that to avoid a cramped, noisy look — even beamed sixteenths keep a gap.
const CLEF_PAD = 44 // clef area at the start of every system
const TIMESIG_PAD = 18 // extra room for the time signature (first system only)
const TARGET_WIDTH = 560 // wrap to a new system past this (fits ~2 eighth-note bars)
// horizontal advance per note value — heads are ~12px, so these keep a clear gap
// (sixteenths ~10px, eighths ~14px) rather than the cramped earlier spacing
const ADVANCE: Record<number, number> = { 1: 68, 2: 50, 4: 36, 8: 26, 16: 22 }
const DOT_EXTRA = 7
const BARLINE_GAP = 12
const MEASURE_LEAD = 12 // padding before a measure's first note, so it clears the bar line
const TRAIL_PAD = 10

// vertical (staff steps); the renderer converts steps to px
const MIDDLE = 4 // middle staff line
const STEM_STEPS = 6 // ~3 line-spaces
const SECONDARY_OFFSET = 1.6

const SIG_DX = 9 // px between key-signature accidentals
const SIG_PAD = 6 // gap after the key signature, before the time sig / first note
const TS_X_PAD = 4 // time-signature x past the clef (+ any signature)

const NONE_SIG: KeySignature = { type: 'none', count: 0, letters: [] }

/** Same key signature? (by type + altered letters, in order) */
const sigEqual = (a: KeySignature, b: KeySignature) =>
  a.type === b.type &&
  a.letters.length === b.letters.length &&
  a.letters.every((l, i) => l === b.letters[i])

/** The key signature in force for measure `i` (a single signature covers all). */
function resolveSig(
  keySig: KeySignature | readonly KeySignature[] | undefined,
  i: number,
): KeySignature {
  if (!keySig) return NONE_SIG
  if (Array.isArray(keySig)) return keySig[i] ?? keySig[keySig.length - 1] ?? NONE_SIG
  return keySig as KeySignature
}

/** Clef + key-signature geometry at the head of a system. */
function systemHead(sig: KeySignature, clef: Clef, first: boolean) {
  const accs = keySignatureLayout(sig, clef)
  const keySig: PositionedAccidental[] = accs.map((a, i) => ({ ...a, x: CLEF_PAD + i * SIG_DX + 4 }))
  const sigEnd = accs.length ? CLEF_PAD + accs.length * SIG_DX + SIG_PAD : CLEF_PAD
  return { keySig, left: sigEnd + (first ? TIMESIG_PAD : 0), timeSigX: sigEnd + TS_X_PAD }
}

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

interface MeasureLayout {
  glyphs: RhythmGlyph[]
  beams: Beam[]
  /** total advance, px (x of the point just past the last note) */
  width: number
}

export function rhythmLayout(
  events: readonly RhythmEvent[],
  meter: Meter,
  clef: Clef = 'treble',
  keySig?: KeySignature | readonly KeySignature[],
): RhythmLayout {
  const mBeats = measureBeats(meter)
  const compound = meter.unit === 8 && meter.beats % 3 === 0
  const groupSize = compound ? 1.5 : 1

  // split events into whole measures (v1 assumes clean division — no ties)
  const measures: RhythmEvent[][] = []
  let cur: RhythmEvent[] = []
  let acc = 0
  for (const ev of events) {
    cur.push(ev)
    acc += ev.beats
    if (acc >= mBeats - EPS) {
      measures.push(cur)
      cur = []
      acc = 0
    }
  }
  if (cur.length) measures.push(cur)

  // the key signature in force per measure (drives inline suppression + breaks)
  const sigs = measures.map((_, i) => resolveSig(keySig, i))

  // lay each measure out locally (x from 0); beam ids stay unique across the piece
  let beamBase = 0
  const measureLayouts = measures.map((evs, i) => {
    const ml = layoutMeasure(evs, groupSize, clef, beamBase, signatureMap(sigs[i]))
    beamBase += ml.beams.length
    return ml
  })

  // pack measures onto systems that fit TARGET_WIDTH (at least one measure each);
  // a key-signature change also starts a fresh system so the new signature shows.
  const systems: RhythmSystem[] = []
  let bucket: { m: MeasureLayout; sig: KeySignature }[] = []
  const flush = () => {
    if (!bucket.length) return
    const first = systems.length === 0
    const head = systemHead(bucket[0].sig, clef, first)
    let x = head.left
    const glyphs: RhythmGlyph[] = []
    const beams: Beam[] = []
    const barlines: number[] = []
    bucket.forEach(({ m }, mi) => {
      const dx = x
      for (const g of m.glyphs) glyphs.push({ ...g, x: g.x + dx })
      for (const b of m.beams) {
        beams.push({
          ...b,
          x0: b.x0 + dx,
          x1: b.x1 + dx,
          secondary: b.secondary.map(([a, c]) => [a + dx, c + dx] as [number, number]),
        })
      }
      x += m.width
      if (mi < bucket.length - 1) {
        barlines.push(x + BARLINE_GAP / 2)
        x += BARLINE_GAP
      }
    })
    systems.push({
      glyphs,
      beams,
      barlines,
      width: x + TRAIL_PAD,
      showTimeSig: first,
      keySig: head.keySig,
      timeSigX: head.timeSigX,
    })
    bucket = []
  }

  for (let i = 0; i < measureLayouts.length; i++) {
    const m = measureLayouts[i]
    const sig = sigs[i]
    if (bucket.length && !sigEqual(sig, bucket[0].sig)) flush() // key change → new line
    const left = systemHead(bucket.length ? bucket[0].sig : sig, clef, systems.length === 0).left
    const content = bucket.reduce((s, b) => s + b.m.width, 0) + Math.max(0, bucket.length - 1) * BARLINE_GAP
    const added = (bucket.length ? BARLINE_GAP : 0) + m.width
    if (bucket.length && left + content + added + TRAIL_PAD > TARGET_WIDTH) flush()
    bucket.push({ m, sig })
  }
  flush()

  const width = Math.max(...systems.map((s) => s.width))
  return { systems, width, meter }
}

/** Lay a single measure out with x starting at 0. */
function layoutMeasure(
  evs: readonly RhythmEvent[],
  groupSize: number,
  clef: Clef,
  beamBase: number,
  sigMap: Map<string, number>,
): MeasureLayout {
  const glyphs: RhythmGlyph[] = []
  const groupKey: number[] = []
  let x = MEASURE_LEAD // leave room after the bar line before the first note
  let pos = 0
  for (const ev of evs) {
    const nv = beatsToValue(ev.beats)
    const group = Math.floor(pos / groupSize + EPS)
    let step = MIDDLE
    let alter = 0
    let accidental: number | null = null
    let ledgerSteps: number[] = []
    if (ev.note) {
      const [sl] = staffLayout([ev.note], clef)
      step = sl.step
      alter = ev.note.alter
      ledgerSteps = sl.ledgerSteps
      accidental = inlineAlter(sigMap, ev.note) // suppressed when the signature covers it
    }
    glyphs.push({
      isRest: !ev.note,
      step,
      alter,
      accidental,
      value: nv.value,
      dots: nv.dots,
      stemUp: step < MIDDLE,
      flags: 0,
      beamId: null,
      x,
      ledgerSteps,
    })
    groupKey.push(group)
    x += ADVANCE[nv.value] + (nv.dots ? DOT_EXTRA : 0)
    pos += ev.beats
  }
  const beams = assignBeams(glyphs, groupKey, beamBase)
  for (const g of glyphs) {
    if (g.beamId === null && !g.isRest) {
      g.flags = flagsFor(g.value)
      g.stemUp = g.step < MIDDLE
    }
  }
  return { glyphs, beams, width: x }
}

/** Group consecutive beamable notes sharing a beat group into beams (≥2 notes). */
function assignBeams(glyphs: RhythmGlyph[], groupKey: number[], idBase: number): Beam[] {
  const beams: Beam[] = []
  let i = 0
  let next = 0
  while (i < glyphs.length) {
    if (!isBeamable(glyphs[i])) {
      i++
      continue
    }
    let j = i + 1
    while (j < glyphs.length && isBeamable(glyphs[j]) && groupKey[j] === groupKey[i]) j++
    const run = glyphs.slice(i, j)
    if (run.length >= 2) {
      const id = idBase + next++
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
