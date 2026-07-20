// Staff layout math for a run of spelled notes, for any clef. Pure — the SVG
// renderer in features/ maps diatonic steps to pixels. A "step" is one
// diatonic position (line or space) above the clef's bottom staff line, so
// lines sit at even steps 0/2/4/6/8 regardless of clef.

export type Clef = 'treble' | 'alto' | 'tenor' | 'bass'

interface ClefDef {
  /** diatonic index (octave*7 + letter) of the bottom staff line */
  bottomIndex: number
  /** MIDI number of the natural note on the bottom staff line */
  bottomMidi: number
}

const LETTER_INDEX: Record<string, number> = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 }
const idx = (letter: string, octave: number) => octave * 7 + LETTER_INDEX[letter]

export const CLEFS: Record<Clef, ClefDef> = {
  treble: { bottomIndex: idx('E', 4), bottomMidi: 64 }, // E4
  alto: { bottomIndex: idx('F', 3), bottomMidi: 53 }, // F3 (C clef on middle line)
  tenor: { bottomIndex: idx('D', 3), bottomMidi: 50 }, // D3 (C clef on 4th line)
  bass: { bottomIndex: idx('G', 2), bottomMidi: 43 }, // G2
}

export interface StaffNoteInput {
  letter: string
  /** semitone offset from the natural letter, −2..2 */
  alter: number
  /** sounding MIDI number — octave is derived from it and `alter` */
  midi: number
}

export interface StaffNote {
  /** diatonic steps above the clef's bottom line; may be negative */
  step: number
  alter: number
  /** even steps where ledger lines are needed for this note */
  ledgerSteps: number[]
}

export function staffLayout(notes: readonly StaffNoteInput[], clef: Clef = 'treble'): StaffNote[] {
  const { bottomIndex } = CLEFS[clef]
  return notes.map(({ letter, alter, midi }) => {
    // written octave comes from the natural letter's pitch, not the sounding
    // pitch: C♭4 sounds B3 (midi 59) but sits on the C4 position
    const octave = Math.floor((midi - alter) / 12) - 1
    const step = octave * 7 + LETTER_INDEX[letter] - bottomIndex
    return { step, alter, ledgerSteps: ledgerSteps(step) }
  })
}

function ledgerSteps(step: number): number[] {
  const out: number[] = []
  for (let s = -2; s >= step; s -= 2) out.push(s)
  for (let s = 10; s <= step; s += 2) out.push(s)
  return out
}
