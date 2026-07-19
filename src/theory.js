// Core music theory data used across drills.

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function midiToName(midi) {
  const name = NOTE_NAMES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}`;
}

export function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export const INTERVALS = [
  { name: 'Minor 2nd', short: 'm2', semitones: 1 },
  { name: 'Major 2nd', short: 'M2', semitones: 2 },
  { name: 'Minor 3rd', short: 'm3', semitones: 3 },
  { name: 'Major 3rd', short: 'M3', semitones: 4 },
  { name: 'Perfect 4th', short: 'P4', semitones: 5 },
  { name: 'Tritone', short: 'TT', semitones: 6 },
  { name: 'Perfect 5th', short: 'P5', semitones: 7 },
  { name: 'Minor 6th', short: 'm6', semitones: 8 },
  { name: 'Major 6th', short: 'M6', semitones: 9 },
  { name: 'Minor 7th', short: 'm7', semitones: 10 },
  { name: 'Major 7th', short: 'M7', semitones: 11 },
  { name: 'Octave', short: 'P8', semitones: 12 },
];

export const CHORDS = [
  { name: 'Major', short: 'maj', intervals: [0, 4, 7] },
  { name: 'Minor', short: 'min', intervals: [0, 3, 7] },
  { name: 'Diminished', short: 'dim', intervals: [0, 3, 6] },
  { name: 'Augmented', short: 'aug', intervals: [0, 4, 8] },
  { name: 'Major 7th', short: 'maj7', intervals: [0, 4, 7, 11] },
  { name: 'Dominant 7th', short: 'dom7', intervals: [0, 4, 7, 10] },
  { name: 'Minor 7th', short: 'min7', intervals: [0, 3, 7, 10] },
];

export const SCALES = [
  { name: 'Major (Ionian)', intervals: [0, 2, 4, 5, 7, 9, 11, 12] },
  { name: 'Natural Minor (Aeolian)', intervals: [0, 2, 3, 5, 7, 8, 10, 12] },
  { name: 'Harmonic Minor', intervals: [0, 2, 3, 5, 7, 8, 11, 12] },
  { name: 'Melodic Minor', intervals: [0, 2, 3, 5, 7, 9, 11, 12] },
  { name: 'Dorian', intervals: [0, 2, 3, 5, 7, 9, 10, 12] },
  { name: 'Mixolydian', intervals: [0, 2, 4, 5, 7, 9, 10, 12] },
];
