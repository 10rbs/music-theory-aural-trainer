export interface Scale {
  name: string
  intervals: readonly number[]
}

export const SCALES: readonly Scale[] = [
  { name: 'Major (Ionian)', intervals: [0, 2, 4, 5, 7, 9, 11, 12] },
  { name: 'Natural Minor (Aeolian)', intervals: [0, 2, 3, 5, 7, 8, 10, 12] },
  { name: 'Harmonic Minor', intervals: [0, 2, 3, 5, 7, 8, 11, 12] },
  { name: 'Melodic Minor', intervals: [0, 2, 3, 5, 7, 9, 11, 12] },
  { name: 'Dorian', intervals: [0, 2, 3, 5, 7, 9, 10, 12] },
  { name: 'Mixolydian', intervals: [0, 2, 4, 5, 7, 9, 10, 12] },
]
