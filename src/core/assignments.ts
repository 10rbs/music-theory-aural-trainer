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
import { P8, times, transposeSpelled } from './theory/transpose'
import { type Clef } from './notation/staff'
import { SCALES, type Scale } from './theory/scales'

export interface SpelledNote {
  letter: string
  /** semitone offset from the natural letter, −2..2 */
  alter: number
  midi: number
}

export interface AssignmentItem {
  /** Stable id for completion tracking, e.g. "major:B♭". Survives octave and
   *  key changes so a slot stays the same slot however the player transposes it. */
  id: string
  /** Which daily slot this is: "major" | "minor" | "mode". */
  kind: string
  title: string // "B♭ Major"
  /** The scale-type label used in the title, e.g. "Major", "Harmonic Minor". */
  label: string
  /** The key this run is currently spelled in — moves when the key button does. */
  tonic: Tonic
  /** The scale type — kept so the run can be re-spelled in another key. */
  scale: Scale
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
  const displayLabel = label ?? s.name
  return {
    id: `${kind}:${tonicName(tonic)}`,
    kind,
    title: `${tonicName(tonic)} ${displayLabel}`,
    label: displayLabel,
    tonic,
    scale: s,
    notes: spellScale(tonic, s.intervals),
    midi: s.intervals.map((st) => root + st),
    // the octave entry (i = 7) reuses the tonic's spelling
    spelled: s.intervals.map((st, i) => ({ ...degrees[i % 7], midi: root + st })),
  }
}

/**
 * Shift an assignment's register by whole octaves — notation and playback move
 * together. This is octave displacement, the third transposition operation:
 * the spelling (letter + accidental) is invariant, only the octave moves.
 */
export function shiftOctaves(item: AssignmentItem, octaves: number): AssignmentItem {
  if (octaves === 0) return item
  const iv = times(P8, octaves)
  return {
    ...item,
    midi: item.midi.map((m) => m + iv.chromatic),
    spelled: item.spelled.map((n) => transposeSpelled(n, iv)),
  }
}

/** Circle-of-fifths key list a slot's key button steps through. */
const KEY_LIST: Record<string, readonly Tonic[]> = {
  major: MAJOR_KEYS,
  mode: MAJOR_KEYS,
  minor: MINOR_KEYS,
}

/**
 * Re-spell a scale in another key, `offset` steps around its slot's key list
 * (each step ≈ a fifth = one more/less sharp or flat). The register is
 * re-anchored to the clef, so only the key changes — id and slot are kept so
 * completion tracking is unaffected. Wraps through all twelve practical keys.
 */
export function rekeyAssignment(base: AssignmentItem, offset: number, clef: Clef): AssignmentItem {
  if (offset === 0) return base
  const keys = KEY_LIST[base.kind] ?? MAJOR_KEYS
  const i = keys.findIndex((k) => k.letter === base.tonic.letter && k.alter === base.tonic.alter)
  const tonic = keys[mod((i < 0 ? 0 : i) + offset, keys.length)]
  return { ...item(base.kind, tonic, base.scale, clef, base.label), id: base.id }
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
