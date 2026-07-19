// Daily scale practice assignments. Deterministic in the date — same date
// always yields the same assignment — with day-counter rotation so coverage
// through keys and scale types is even, not random.

import { MAJOR_KEYS, MINOR_KEYS, spellScale, tonicName, tonicPc, type Tonic } from './theory/keys'
import { SCALES, type Scale } from './theory/scales'

export interface AssignmentItem {
  /** Stable id for completion tracking, e.g. "major:B♭". */
  id: string
  title: string // "B♭ Major"
  notes: string[] // spelled scale degrees
  /** MIDI numbers, ascending one octave from a comfortable register. */
  midi: number[]
}

const scale = (name: string): Scale => SCALES.find((s) => s.name === name)!

const MINOR_ROTATION = ['Natural Minor (Aeolian)', 'Harmonic Minor', 'Melodic Minor'] as const
const MODE_ROTATION = ['Dorian', 'Mixolydian'] as const

/** Days since 2026-01-01 (local date string), the rotation counter. */
export function dayNumber(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(2026, 0, 1)) / 86_400_000)
}

/** Pick a comfortable starting MIDI note (G3..F#4) for a tonic. */
function rootMidi(tonic: Tonic): number {
  const pc = tonicPc(tonic)
  // 55 = G3; walk up to the first octave placement in [55, 66]
  const candidate = 48 + pc // C3-based
  return candidate < 55 ? candidate + 12 : candidate
}

function item(kind: string, tonic: Tonic, s: Scale, label?: string): AssignmentItem {
  const root = rootMidi(tonic)
  return {
    id: `${kind}:${tonicName(tonic)}`,
    title: `${tonicName(tonic)} ${label ?? s.name}`,
    notes: spellScale(tonic, s.intervals),
    midi: s.intervals.map((st) => root + st),
  }
}

/** The day's three scales: a major, a minor (type rotates), and a mode. */
export function dailyAssignment(dateStr: string): AssignmentItem[] {
  const day = dayNumber(dateStr)
  // co-prime-ish strides so key and scale-type cycles drift against each other
  const majorKey = MAJOR_KEYS[((day % MAJOR_KEYS.length) + MAJOR_KEYS.length) % MAJOR_KEYS.length]
  const minorKey = MINOR_KEYS[(((day * 5) % MINOR_KEYS.length) + MINOR_KEYS.length) % MINOR_KEYS.length]
  const minorType = scale(MINOR_ROTATION[((day % 3) + 3) % 3])
  const modeKey = MAJOR_KEYS[(((day * 7 + 3) % MAJOR_KEYS.length) + MAJOR_KEYS.length) % MAJOR_KEYS.length]
  const modeType = scale(MODE_ROTATION[((day % 2) + 2) % 2])

  return [
    item('major', majorKey, scale('Major (Ionian)'), 'Major'),
    item('minor', minorKey, minorType, minorType.name.replace(' (Aeolian)', '')),
    item('mode', modeKey, modeType),
  ]
}
