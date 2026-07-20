// Daily scale practice assignments. Deterministic in the date — same date
// always yields the same assignment — with day-counter rotation so coverage
// through keys and scale types is even, not random. Which scale types are
// eligible is a user setting, passed in as `enabled` scale names.

import {
  MAJOR_KEYS,
  MINOR_KEYS,
  spellScale,
  spellScaleDegrees,
  tonicName,
  tonicPc,
  type Tonic,
} from './theory/keys'
import { type Clef } from './notation/staff'
import { SCALES, type Scale } from './theory/scales'

export interface SpelledNote {
  letter: string
  /** semitone offset from the natural letter, −2..2 */
  alter: number
  midi: number
}

export interface AssignmentItem {
  /** Stable id for completion tracking, e.g. "major:B♭". */
  id: string
  title: string // "B♭ Major"
  notes: string[] // spelled scale degrees
  /** MIDI numbers, ascending one octave from a comfortable register. */
  midi: number[]
  /** The same octave run with letter+alter spelling, for notation rendering. */
  spelled: SpelledNote[]
}

const scale = (name: string): Scale => SCALES.find((s) => s.name === name)!

const MAJOR_NAME = 'Major (Ionian)'
const MINOR_ROTATION = ['Natural Minor (Aeolian)', 'Harmonic Minor', 'Melodic Minor'] as const
const MODE_ROTATION = ['Dorian', 'Mixolydian'] as const

/** Every scale-type name, in settings-display order. All enabled by default. */
export const ALL_SCALE_TYPES: readonly string[] = SCALES.map((s) => s.name)

/** Days since 2026-01-01 (local date string), the rotation counter. */
export function dayNumber(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(2026, 0, 1)) / 86_400_000)
}

const mod = (n: number, m: number) => ((n % m) + m) % m

/**
 * Bottom of each clef's 12-semitone root window. Treble/alto/tenor put every
 * root at diatonic steps −5..1 relative to the clef's bottom line (treble:
 * G3..F♯4, the original register). Bass sits an octave above that mirror
 * (B♭2..A3) — mid trombone/euphonium range rather than tuba depths; the
 * octave-shift buttons cover players who want it lower.
 */
const ROOT_LO: Record<Clef, number> = {
  treble: 55, // G3..F♯4
  alto: 44, // A♭2..G3
  tenor: 41, // F2..E3
  bass: 46, // B♭2..A3
}

/** Pick a comfortable starting MIDI note for a tonic, in the clef's register. */
function rootMidi(tonic: Tonic, clef: Clef): number {
  const pc = tonicPc(tonic)
  const lo = ROOT_LO[clef]
  return lo + ((((pc - lo) % 12) + 12) % 12)
}

function item(kind: string, tonic: Tonic, s: Scale, clef: Clef, label?: string): AssignmentItem {
  const root = rootMidi(tonic, clef)
  const degrees = spellScaleDegrees(tonic, s.intervals)
  return {
    id: `${kind}:${tonicName(tonic)}`,
    title: `${tonicName(tonic)} ${label ?? s.name}`,
    notes: spellScale(tonic, s.intervals),
    midi: s.intervals.map((st) => root + st),
    // the octave entry (i = 7) reuses the tonic's spelling
    spelled: s.intervals.map((st, i) => ({ ...degrees[i % 7], midi: root + st })),
  }
}

/**
 * Shift an assignment's register by whole octaves — notation and playback
 * move together. Spelling, id, and title are untouched.
 */
export function shiftOctaves(item: AssignmentItem, octaves: number): AssignmentItem {
  if (octaves === 0) return item
  const d = octaves * 12
  return {
    ...item,
    midi: item.midi.map((m) => m + d),
    spelled: item.spelled.map((n) => ({ ...n, midi: n.midi + d })),
  }
}

/** Display name for a scale type — drops the parenthesized mode aliases. */
const typeLabel = (s: Scale) => s.name.replace(/ \((?:Ionian|Aeolian)\)$/, '')

/**
 * The day's scales — always three slots (major, minor, mode), each with its
 * own key rotation. A slot normally rotates through the enabled types of its
 * own category; if the whole category is disabled, the slot borrows from the
 * full enabled pool instead (with a per-slot offset so borrowed slots
 * differ), so the daily count stays at three. Only an empty `enabled` yields
 * an empty assignment.
 */
export function dailyAssignment(
  dateStr: string,
  enabled: readonly string[] = ALL_SCALE_TYPES,
  clef: Clef = 'treble',
): AssignmentItem[] {
  const day = dayNumber(dateStr)
  const pool = ALL_SCALE_TYPES.filter((n) => enabled.includes(n))
  if (pool.length === 0) return []

  // co-prime-ish strides so key and scale-type cycles drift against each other
  const majorKey = MAJOR_KEYS[mod(day, MAJOR_KEYS.length)]
  const minorKey = MINOR_KEYS[mod(day * 5, MINOR_KEYS.length)]
  const modeKey = MAJOR_KEYS[mod(day * 7 + 3, MAJOR_KEYS.length)]

  const pick = (category: readonly string[], slotOffset: number): Scale => {
    const own = category.filter((n) => pool.includes(n))
    return own.length > 0
      ? scale(own[mod(day, own.length)])
      : scale(pool[mod(day + slotOffset, pool.length)])
  }

  const majorType = pick([MAJOR_NAME], 0)
  const minorType = pick(MINOR_ROTATION, 1)
  const modeType = pick(MODE_ROTATION, 2)

  return [
    item('major', majorKey, majorType, clef, typeLabel(majorType)),
    item('minor', minorKey, minorType, clef, typeLabel(minorType)),
    item('mode', modeKey, modeType, clef, typeLabel(modeType)),
  ]
}
