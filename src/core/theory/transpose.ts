// Diatonic transposition of spelled pitches. An interval carries BOTH how many
// letter-names to move (`diatonic`) and how many semitones (`chromatic`), the
// way MusicXML's <transpose> element does — so "up a minor third from C" lands
// on E♭, never D♯. Rolling our own semitone-only math would spell key
// signatures wrong; this keeps letters and accidentals honest.
//
// This is the shared primitive for the three transposition operations that
// users conflate (instrument transposition, practice transposition into other
// keys, octave displacement) and the foundation for transposable etudes later.

import { LETTERS, LETTER_PC, tonicPc, type Tonic } from './keys'

// LETTERS typed as a plain string list so we can look up an arbitrary letter
const LETTER_LIST: readonly string[] = LETTERS

export interface Interval {
  /** letter-names to move: a 2nd = 1, a 3rd = 2, a 5th = 4, an octave = 7. */
  diatonic: number
  /** semitones to move. */
  chromatic: number
}

/** Named intervals, ascending. Negate for the descending direction. */
export const P5: Interval = { diatonic: 4, chromatic: 7 } // perfect fifth (one step round the circle)
export const P4: Interval = { diatonic: 3, chromatic: 5 } // perfect fourth
export const P8: Interval = { diatonic: 7, chromatic: 12 } // octave
export const M2: Interval = { diatonic: 1, chromatic: 2 } // B♭ instrument reads up a major 2nd
export const M6: Interval = { diatonic: 5, chromatic: 9 } // E♭ instrument reads up a major 6th
export const P5_DOWN: Interval = { diatonic: -4, chromatic: -7 }

export function invert(iv: Interval): Interval {
  return { diatonic: -iv.diatonic, chromatic: -iv.chromatic }
}

/** Stack an interval `n` times (n may be negative). `times(P5, 2)` = a major 9th. */
export function times(iv: Interval, n: number): Interval {
  return { diatonic: iv.diatonic * n, chromatic: iv.chromatic * n }
}

const mod = (n: number, m: number) => ((n % m) + m) % m

/** The accidental (−2..2) that makes `letter` sound at pitch class `targetPc`. */
function alterFor(letter: string, targetPc: number): number {
  let a = mod(targetPc - LETTER_PC[letter], 12)
  if (a > 6) a -= 12
  return a
}

export interface SpelledPitch {
  letter: string
  /** semitone offset from the natural letter, −2..2 */
  alter: number
  /** sounding MIDI number */
  midi: number
}

/**
 * Transpose a spelled+sounding pitch by `iv`. The new letter comes from the
 * diatonic move; the new accidental is whatever makes that letter sound at the
 * transposed pitch. Throws past double-accidentals (a key so remote we don't
 * spell it).
 */
export function transposeSpelled(note: SpelledPitch, iv: Interval): SpelledPitch {
  const letter = LETTERS[mod(LETTER_LIST.indexOf(note.letter) + iv.diatonic, 7)]
  const midi = note.midi + iv.chromatic
  const alter = alterFor(letter, mod(midi, 12))
  if (Math.abs(alter) > 2) {
    throw new Error(`unspellable transposition of ${note.letter} by ${iv.diatonic}/${iv.chromatic}`)
  }
  return { letter, alter, midi }
}

export interface SpelledTonic {
  letter: string
  /** semitone offset from the natural letter; may exceed ±1 for remote keys */
  alter: number
}

/**
 * Transpose a tonic (pitch-class only, octave-free). Used to move a scale to a
 * different key — the register is re-anchored separately. Throws past
 * double-accidentals.
 */
export function transposeTonic(t: Tonic, iv: Interval): SpelledTonic {
  const letter = LETTERS[mod(LETTER_LIST.indexOf(t.letter) + iv.diatonic, 7)]
  const alter = alterFor(letter, mod(tonicPc(t) + iv.chromatic, 12))
  if (Math.abs(alter) > 2) {
    throw new Error(`unspellable transposition of tonic ${t.letter}`)
  }
  return { letter, alter }
}
