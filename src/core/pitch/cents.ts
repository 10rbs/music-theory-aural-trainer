// Frequency → nearest equal-tempered note + cents offset, relative to a
// configurable A4 reference (bands often tune to 441/442).

import { midiToName } from '../theory/notes'

export interface NoteReading {
  midi: number
  name: string // e.g. "A4"
  cents: number // −50..+50 offset from the named note
}

export function freqToNote(freq: number, a4 = 440): NoteReading | null {
  if (freq <= 0 || !Number.isFinite(freq)) return null
  const midiFloat = 69 + 12 * Math.log2(freq / a4)
  const midi = Math.round(midiFloat)
  if (midi < 0 || midi > 127) return null
  return {
    midi,
    name: midiToName(midi),
    cents: Math.round((midiFloat - midi) * 100),
  }
}
