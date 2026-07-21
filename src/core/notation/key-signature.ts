// Key signatures for scale notation. Two concerns, both pure:
//   1. THEORY — how many sharps/flats a (tonic, scale) carries, derived from
//      the scale's diatonic degrees (see Scale.signature for the harmonic/
//      melodic-minor exception).
//   2. LAYOUT — where each accidental sits on the staff, per clef, in the
//      standard order and octaves (the fixed engraving convention, as data).
// Plus the per-note decision: with a signature in force, a note only needs an
// inline accidental when it departs from the signature (a ♮ cancels one).

import { spellScaleDegrees, type Tonic } from '../theory/keys'
import type { Scale } from '../theory/scales'
import type { Clef } from './staff'

/** Standard order accidentals are added to a signature. */
const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'] as const
const FLAT_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F'] as const

export interface KeySignature {
  type: 'sharp' | 'flat' | 'none'
  /** number of accidentals, 0..7 */
  count: number
  /** the altered letters in signature order, e.g. ['F','C'] for D major */
  letters: string[]
}

const EMPTY: KeySignature = { type: 'none', count: 0, letters: [] }

/**
 * The key signature for a scale in a key. Reads the scale's signature-defining
 * degrees (its own, unless `Scale.signature` overrides — harmonic/melodic minor
 * borrow the natural-minor signature). Returns `none` for keys that don't
 * reduce to a standard all-sharp or all-flat signature (theoretical keys with
 * double accidentals, or a mix) — the caller then draws every accidental inline.
 */
export function keySignature(tonic: Tonic, scale: Scale): KeySignature {
  let degrees
  try {
    degrees = spellScaleDegrees(tonic, scale.signature ?? scale.intervals)
  } catch {
    return EMPTY // unspellable (double-accidental territory)
  }
  const altered = degrees.filter((d) => d.alter !== 0)
  if (altered.length === 0) return EMPTY
  // a standard signature is all sharps (+1) or all flats (−1)
  if (altered.every((d) => d.alter === 1)) {
    return orderedSignature('sharp', altered.map((d) => d.letter))
  }
  if (altered.every((d) => d.alter === -1)) {
    return orderedSignature('flat', altered.map((d) => d.letter))
  }
  return EMPTY
}

function orderedSignature(type: 'sharp' | 'flat', letters: string[]): KeySignature {
  const order = type === 'sharp' ? SHARP_ORDER : FLAT_ORDER
  const set = new Set(letters)
  const ordered = order.filter((l) => set.has(l))
  // a real signature is a prefix of the order (F, then F C, then F C G…); if
  // the altered letters don't line up that way it isn't a standard signature
  if (ordered.length !== letters.length) return EMPTY
  return { type, count: ordered.length, letters: [...ordered] }
}

// Staff steps (0 = bottom line, lines at even steps) for each accidental slot,
// per clef, in signature order. The standard engraving positions — encoded as
// data because the per-clef octave choices (esp. tenor) don't follow one tidy
// rule. Validated in the test against each clef's letters.
const SHARP_STEPS: Record<Clef, readonly number[]> = {
  treble: [8, 5, 9, 6, 3, 7, 4],
  bass: [6, 3, 7, 4, 1, 5, 2],
  alto: [7, 4, 8, 5, 2, 6, 3],
  tenor: [2, 6, 3, 7, 4, 8, 5],
}
const FLAT_STEPS: Record<Clef, readonly number[]> = {
  treble: [4, 7, 3, 6, 2, 5, 1],
  bass: [2, 5, 1, 4, 0, 3, -1],
  alto: [3, 6, 2, 5, 1, 4, 0],
  tenor: [5, 8, 4, 7, 3, 6, 2],
}

export interface SignatureAccidental {
  letter: string
  /** +1 sharp, −1 flat */
  alter: number
  /** diatonic steps above the clef's bottom line (as in staffLayout) */
  step: number
}

/** Positioned accidentals to draw after the clef, left to right. */
export function keySignatureLayout(sig: KeySignature, clef: Clef): SignatureAccidental[] {
  if (sig.type === 'none') return []
  const steps = sig.type === 'sharp' ? SHARP_STEPS[clef] : FLAT_STEPS[clef]
  const alter = sig.type === 'sharp' ? 1 : -1
  return sig.letters.map((letter, i) => ({ letter, alter, step: steps[i] }))
}

/** What the signature dictates for each letter (absent letter = natural). */
export function signatureMap(sig: KeySignature): Map<string, number> {
  const alter = sig.type === 'sharp' ? 1 : -1
  return new Map(sig.letters.map((l) => [l, alter]))
}

/**
 * The inline accidental a note needs given a signature already in force, or
 * `null` when the signature already covers it. Returns the alter to draw —
 * which may be 0, meaning a natural sign cancelling a signature accidental.
 */
export function inlineAlter(
  sigMap: Map<string, number>,
  note: { letter: string; alter: number },
): number | null {
  const fromSig = sigMap.get(note.letter) ?? 0
  return note.alter === fromSig ? null : note.alter
}
