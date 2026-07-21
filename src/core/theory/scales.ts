export interface Scale {
  name: string
  intervals: readonly number[]
  /**
   * Intervals whose diatonic spelling defines the KEY SIGNATURE, when that
   * differs from the scale itself. Harmonic/melodic minor take the natural
   * minor signature; their raised 6th/7th are then drawn as inline accidentals
   * rather than folded into the signature. Absent = the scale is diatonic and
   * its own degrees are the signature.
   */
  signature?: readonly number[]
}

const NATURAL_MINOR = [0, 2, 3, 5, 7, 8, 10, 12] as const

export const SCALES: readonly Scale[] = [
  { name: 'Major (Ionian)', intervals: [0, 2, 4, 5, 7, 9, 11, 12] },
  { name: 'Natural Minor (Aeolian)', intervals: [...NATURAL_MINOR] },
  { name: 'Harmonic Minor', intervals: [0, 2, 3, 5, 7, 8, 11, 12], signature: NATURAL_MINOR },
  { name: 'Melodic Minor', intervals: [0, 2, 3, 5, 7, 9, 11, 12], signature: NATURAL_MINOR },
  { name: 'Dorian', intervals: [0, 2, 3, 5, 7, 9, 10, 12] },
  { name: 'Mixolydian', intervals: [0, 2, 4, 5, 7, 9, 10, 12] },
]
