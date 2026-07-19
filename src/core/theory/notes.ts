// Note naming and frequency math. Pure functions only.

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const

export function midiToName(midi: number): string {
  const name = NOTE_NAMES[((midi % 12) + 12) % 12]
  const octave = Math.floor(midi / 12) - 1
  return `${name}${octave}`
}

export function midiToFreq(midi: number, a4 = 440): number {
  return a4 * Math.pow(2, (midi - 69) / 12)
}

/** MIDI number for a pitch class (0 = C … 11 = B) in a given octave (C4 = 60). */
export function pitchClassMidi(pc: number, octave: number): number {
  return (octave + 1) * 12 + pc
}

/** Pitch classes in chromatic order (C at the top of the note circle). */
export const CHROMATIC_PCS: readonly number[] = Array.from({ length: 12 }, (_, i) => i)

/** Pitch classes in circle-of-fifths order: C G D A E B F# C# G# D# A# F. */
export const FIFTHS_PCS: readonly number[] = Array.from({ length: 12 }, (_, i) => (i * 7) % 12)
