import { describe, expect, test } from 'vitest'
import { MAJOR_KEYS, MINOR_KEYS, spellScale, tonicName, tonicPc, type Tonic } from './keys'
import { SCALES } from './scales'

const MAJOR = SCALES.find((s) => s.name === 'Major (Ionian)')!.intervals
const HARMONIC_MINOR = SCALES.find((s) => s.name === 'Harmonic Minor')!.intervals
const MELODIC_MINOR = SCALES.find((s) => s.name === 'Melodic Minor')!.intervals

const T = (letter: Tonic['letter'], alter: Tonic['alter'] = 0): Tonic => ({ letter, alter })

describe('tonic helpers', () => {
  test('names and pitch classes', () => {
    expect(tonicName(T('B', -1))).toBe('B♭')
    expect(tonicName(T('F', 1))).toBe('F♯')
    expect(tonicPc(T('C'))).toBe(0)
    expect(tonicPc(T('B', 1))).toBe(0) // B♯ wraps to C
    expect(tonicPc(T('C', -1))).toBe(11)
  })
})

describe('spellScale — majors', () => {
  test('C major: no accidentals', () => {
    expect(spellScale(T('C'), MAJOR)).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B'])
  })

  test('G major has F♯ (not G♭)', () => {
    expect(spellScale(T('G'), MAJOR)).toEqual(['G', 'A', 'B', 'C', 'D', 'E', 'F♯'])
  })

  test('F major has B♭ (not A♯)', () => {
    expect(spellScale(T('F'), MAJOR)).toEqual(['F', 'G', 'A', 'B♭', 'C', 'D', 'E'])
  })

  test('F♯ major spells E♯', () => {
    expect(spellScale(T('F', 1), MAJOR)).toEqual(['F♯', 'G♯', 'A♯', 'B', 'C♯', 'D♯', 'E♯'])
  })

  test('D♭ major spells G♭ (not F♯)', () => {
    expect(spellScale(T('D', -1), MAJOR)).toEqual(['D♭', 'E♭', 'F', 'G♭', 'A♭', 'B♭', 'C'])
  })

  test('every practical major key spells with 7 unique letters', () => {
    for (const key of MAJOR_KEYS) {
      const notes = spellScale(key, MAJOR)
      const letters = notes.map((n) => n[0])
      expect(new Set(letters).size).toBe(7)
    }
  })
})

describe('spellScale — minors', () => {
  test('A harmonic minor raises G to G♯', () => {
    expect(spellScale(T('A'), HARMONIC_MINOR)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G♯'])
  })

  test('C harmonic minor spells B♮ (raised 7th)', () => {
    expect(spellScale(T('C'), HARMONIC_MINOR)).toEqual(['C', 'D', 'E♭', 'F', 'G', 'A♭', 'B'])
  })

  test('A melodic minor raises 6th and 7th', () => {
    expect(spellScale(T('A'), MELODIC_MINOR)).toEqual(['A', 'B', 'C', 'D', 'E', 'F♯', 'G♯'])
  })

  test('G♯ harmonic minor needs F𝄪 (double sharp)', () => {
    expect(spellScale(T('G', 1), HARMONIC_MINOR)).toEqual([
      'G♯', 'A♯', 'B', 'C♯', 'D♯', 'E', 'F𝄪',
    ])
  })

  test('every practical minor key spells harmonic minor without throwing', () => {
    for (const key of MINOR_KEYS) {
      expect(() => spellScale(key, HARMONIC_MINOR)).not.toThrow()
    }
  })
})
