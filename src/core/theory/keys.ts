// Proper enharmonic note spelling for heptatonic scales. Each scale degree
// takes the next letter name; the accidental is whatever makes the pitch
// right (F# major gets E#, A harmonic minor gets G#, never enharmonic slop).
// Prerequisite for written-theory drills (M5+).

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const
export const LETTER_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

export interface Tonic {
  letter: (typeof LETTERS)[number]
  /** −1 = flat, 0 = natural, 1 = sharp */
  alter: -1 | 0 | 1
}

export function tonicName(t: Tonic): string {
  return t.letter + (t.alter === 1 ? '♯' : t.alter === -1 ? '♭' : '')
}

export function tonicPc(t: Tonic): number {
  return (((LETTER_PC[t.letter] + t.alter) % 12) + 12) % 12
}

const ACCIDENTALS: Record<number, string> = {
  [-2]: '𝄫',
  [-1]: '♭',
   [0]: '',
  [1]: '♯',
  [2]: '𝄪',
}

/** Glyph for an alteration (−2..2), '' for natural. */
export function accidentalGlyph(alter: number): string {
  return ACCIDENTALS[alter] ?? '?'
}

export interface SpelledDegree {
  letter: (typeof LETTERS)[number]
  /** semitone offset from the natural letter, −2..2 */
  alter: number
}

/**
 * Spell a heptatonic scale from `intervals` (semitones from the tonic,
 * starting at 0, seven degrees — the octave entry may be included and is
 * ignored). Returns 7 letter+alter pairs, e.g. F♯ major → F♯ G♯ A♯ B C♯ D♯ E♯.
 */
export function spellScaleDegrees(tonic: Tonic, intervals: readonly number[]): SpelledDegree[] {
  const degrees = intervals.filter((_, i) => i < 7)
  const startIdx = LETTERS.indexOf(tonic.letter)
  const t0 = tonicPc(tonic)

  return degrees.map((semis, i) => {
    const letter = LETTERS[(startIdx + i) % 7]
    // pitch class the degree must sound at
    const targetPc = (t0 + semis) % 12
    // how far the natural letter is from the target, wrapped to −2..+2
    let alter = (targetPc - LETTER_PC[letter]) % 12
    if (alter > 6) alter -= 12
    if (alter < -6) alter += 12
    if (ACCIDENTALS[alter] === undefined) {
      // out of double-accidental range — theoretical key we don't support
      throw new Error(`unspellable degree ${i} of ${tonicName(tonic)}`)
    }
    return { letter, alter }
  })
}

/** Note names for a heptatonic scale — `spellScaleDegrees` as display strings. */
export function spellScale(tonic: Tonic, intervals: readonly number[]): string[] {
  return spellScaleDegrees(tonic, intervals).map((d) => d.letter + ACCIDENTALS[d.alter])
}

/** Circle of fifths through the practical majors: C G D A E B F♯ D♭ A♭ E♭ B♭ F. */
export const MAJOR_KEYS: readonly Tonic[] = [
  { letter: 'C', alter: 0 },
  { letter: 'G', alter: 0 },
  { letter: 'D', alter: 0 },
  { letter: 'A', alter: 0 },
  { letter: 'E', alter: 0 },
  { letter: 'B', alter: 0 },
  { letter: 'F', alter: 1 },
  { letter: 'D', alter: -1 },
  { letter: 'A', alter: -1 },
  { letter: 'E', alter: -1 },
  { letter: 'B', alter: -1 },
  { letter: 'F', alter: 0 },
]

/** Relative-minor tonics in the same circle order: a e b f♯ c♯ g♯ d♯/e♭ b♭ f c g d. */
export const MINOR_KEYS: readonly Tonic[] = [
  { letter: 'A', alter: 0 },
  { letter: 'E', alter: 0 },
  { letter: 'B', alter: 0 },
  { letter: 'F', alter: 1 },
  { letter: 'C', alter: 1 },
  { letter: 'G', alter: 1 },
  { letter: 'E', alter: -1 }, // d♯ minor is 6 sharps + double-sharp territory; e♭ minor is friendlier
  { letter: 'B', alter: -1 },
  { letter: 'F', alter: 0 },
  { letter: 'C', alter: 0 },
  { letter: 'G', alter: 0 },
  { letter: 'D', alter: 0 },
]
