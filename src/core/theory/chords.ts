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
