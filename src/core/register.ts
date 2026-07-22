// Where a tonic sits, per clef. Shared by daily scales (assignments.ts) and
// warm-ups (warmups.ts) so both anchor runs to the same comfortable register.

import { tonicPc, type Tonic } from './theory/keys'
import { type Clef } from './notation/staff'

/**
 * Bottom of each clef's 12-semitone root window. Treble/alto/tenor put every
 * root at diatonic steps −5..1 relative to the clef's bottom line (treble:
 * G3..F♯4, the original register). Bass sits an octave above that mirror
 * (B♭2..A3) — mid trombone/euphonium range rather than tuba depths; the
 * octave-shift buttons cover players who want it lower.
 */
export const ROOT_LO: Record<Clef, number> = {
  treble: 55, // G3..F♯4
  alto: 44, // A♭2..G3
  tenor: 41, // F2..E3
  bass: 46, // B♭2..A3
}

/** Pick a comfortable starting MIDI note for a tonic, in the clef's register. */
export function rootMidi(tonic: Tonic, clef: Clef): number {
  const pc = tonicPc(tonic)
  const lo = ROOT_LO[clef]
  return lo + ((((pc - lo) % 12) + 12) % 12)
}
