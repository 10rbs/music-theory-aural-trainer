// Ported from the v0-vanilla browser test runner (tests/theory.test.js).

import { describe, expect, test } from 'vitest'
import { midiToName, midiToFreq, pitchClassMidi, CHROMATIC_PCS, FIFTHS_PCS, NOTE_NAMES } from './notes'
import { INTERVALS } from './intervals'
import { CHORDS } from './chords'
import { SCALES } from './scales'

describe('midiToName', () => {
  test('maps middle C (60) to C4', () => {
    expect(midiToName(60)).toBe('C4')
  })

  test('maps A4 (69) to A4', () => {
    expect(midiToName(69)).toBe('A4')
  })

  test('wraps negative MIDI numbers correctly', () => {
    expect(midiToName(-1)).toBe('B-2')
  })
})

describe('midiToFreq', () => {
  test('maps A4 (69) to 440 Hz', () => {
    expect(midiToFreq(69)).toBeCloseTo(440, 3)
  })

  test('maps one octave up to double the frequency', () => {
    expect(midiToFreq(81)).toBeCloseTo(880, 3)
  })

  test('respects a custom A4 reference', () => {
    expect(midiToFreq(69, 442)).toBeCloseTo(442, 3)
  })
})

describe('pitchClassMidi', () => {
  test('C4 is MIDI 60', () => {
    expect(pitchClassMidi(0, 4)).toBe(60)
  })

  test('A4 is MIDI 69 and round-trips through midiToName', () => {
    expect(pitchClassMidi(9, 4)).toBe(69)
    expect(midiToName(pitchClassMidi(9, 4))).toBe('A4')
  })

  test('B3 is MIDI 59 (octave boundary below middle C)', () => {
    expect(pitchClassMidi(11, 3)).toBe(59)
  })
})

describe('note circle orders', () => {
  test('both orders cover all 12 pitch classes exactly once', () => {
    expect([...CHROMATIC_PCS].sort((a, b) => a - b)).toEqual(Array.from({ length: 12 }, (_, i) => i))
    expect([...FIFTHS_PCS].sort((a, b) => a - b)).toEqual(Array.from({ length: 12 }, (_, i) => i))
  })

  test('fifths order steps a perfect fifth (7 semitones) each time, starting at C', () => {
    expect(FIFTHS_PCS[0]).toBe(0)
    for (let i = 1; i < 12; i++) {
      expect((FIFTHS_PCS[i] - FIFTHS_PCS[i - 1] + 12) % 12).toBe(7)
    }
  })

  test('fifths order spells C G D A E B …', () => {
    expect(FIFTHS_PCS.slice(0, 6).map((pc) => NOTE_NAMES[pc])).toEqual(['C', 'G', 'D', 'A', 'E', 'B'])
  })
})

describe('theory tables', () => {
  test('every interval spans 1 to 12 semitones', () => {
    for (const interval of INTERVALS) {
      expect(interval.semitones).toBeGreaterThanOrEqual(1)
      expect(interval.semitones).toBeLessThanOrEqual(12)
    }
  })

  test('every chord starts on the root (0 semitones)', () => {
    for (const chord of CHORDS) {
      expect(chord.intervals[0]).toBe(0)
    }
  })

  test('every scale starts on the root and spans a full octave', () => {
    for (const scale of SCALES) {
      expect(scale.intervals[0]).toBe(0)
      expect(scale.intervals[scale.intervals.length - 1]).toBe(12)
    }
  })
})
