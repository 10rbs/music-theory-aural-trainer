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
import { CLEFS, type Clef } from './notation/staff'
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
 * Pick a comfortable starting MIDI note for a tonic, in the clef's register.
 * The window [bottomMidi − 9, bottomMidi + 2] puts every root at diatonic
 * steps −5..1 relative to the clef's bottom line (treble: G3..F♯4, the
 * original register), so the run reads the same on any clef.
 */
function rootMidi(tonic: Tonic, clef: Clef): number {
  const pc = tonicPc(tonic)
  const lo = CLEFS[clef].bottomMidi - 9
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

/**
 * The day's scales — up to three slots: a major, a minor (type rotates), and
 * a mode. `enabled` filters which scale types are eligible; a slot with no
 * enabled types is dropped, and rotation cycles the remaining types evenly.
 */
export function dailyAssignment(
  dateStr: string,
  enabled: readonly string[] = ALL_SCALE_TYPES,
  clef: Clef = 'treble',
): AssignmentItem[] {
  const day = dayNumber(dateStr)
  // co-prime-ish strides so key and scale-type cycles drift against each other
  const majorKey = MAJOR_KEYS[mod(day, MAJOR_KEYS.length)]
  const minorKey = MINOR_KEYS[mod(day * 5, MINOR_KEYS.length)]
  const modeKey = MAJOR_KEYS[mod(day * 7 + 3, MAJOR_KEYS.length)]

  const minors = MINOR_ROTATION.filter((n) => enabled.includes(n))
  const modes = MODE_ROTATION.filter((n) => enabled.includes(n))

  const items: AssignmentItem[] = []
  if (enabled.includes(MAJOR_NAME)) {
    items.push(item('major', majorKey, scale(MAJOR_NAME), clef, 'Major'))
  }
  if (minors.length > 0) {
    const minorType = scale(minors[mod(day, minors.length)])
    items.push(item('minor', minorKey, minorType, clef, minorType.name.replace(' (Aeolian)', '')))
  }
  if (modes.length > 0) {
    items.push(item('mode', modeKey, scale(modes[mod(day, modes.length)]), clef))
  }
  return items
}
