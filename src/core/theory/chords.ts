import { LETTERS, LETTER_PC, tonicPc, type SpelledDegree, type Tonic } from './keys'

export interface Chord {
  name: string
  short: string
  intervals: readonly number[]
}

export const CHORDS: readonly Chord[] = [
  { name: 'Major', short: 'maj', intervals: [0, 4, 7] },
  { name: 'Minor', short: 'min', intervals: [0, 3, 7] },
  { name: 'Diminished', short: 'dim', intervals: [0, 3, 6] },
  { name: 'Augmented', short: 'aug', intervals: [0, 4, 8] },
  { name: 'Major 7th', short: 'maj7', intervals: [0, 4, 7, 11] },
  { name: 'Dominant 7th', short: 'dom7', intervals: [0, 4, 7, 10] },
  { name: 'Minor 7th', short: 'min7', intervals: [0, 3, 7, 10] },
]

const LETTER_LIST: readonly string[] = LETTERS

/**
 * Spell a chord's tones (root, 3rd, 5th, 7th…) from `intervals` (semitones
 * from the root). Each successive chord tone takes the next letter a third up
 * (root letter, +2, +4, +6), and the accidental is whatever makes that letter
 * sound at the right pitch — so E♭ major → E♭ G B♭ and G7 → G B D F, never
 * enharmonic slop. Companion to `spellScaleDegrees` in keys.ts.
 */
export function spellChord(root: Tonic, intervals: readonly number[]): SpelledDegree[] {
  const startIdx = LETTER_LIST.indexOf(root.letter)
  const t0 = tonicPc(root)
  return intervals.map((semis, i) => {
    const letter = LETTERS[(startIdx + 2 * i) % 7]
    const targetPc = (t0 + semis) % 12
    let alter = (targetPc - LETTER_PC[letter]) % 12
    if (alter > 6) alter -= 12
    if (alter < -6) alter += 12
    return { letter, alter }
  })
}
