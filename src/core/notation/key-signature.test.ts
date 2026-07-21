import { describe, expect, test } from 'vitest'
import {
  inlineAlter,
  keySignature,
  keySignatureLayout,
  signatureMap,
} from './key-signature'
import { CLEFS, type Clef } from './staff'
import { SCALES } from '../theory/scales'
import { MAJOR_KEYS, MINOR_KEYS, type Tonic } from '../theory/keys'

const scale = (name: string) => SCALES.find((s) => s.name === name)!
const MAJOR = scale('Major (Ionian)')
const NAT_MINOR = scale('Natural Minor (Aeolian)')
const HARM_MINOR = scale('Harmonic Minor')
const MEL_MINOR = scale('Melodic Minor')
const DORIAN = scale('Dorian')
const MIXO = scale('Mixolydian')
const T = (letter: Tonic['letter'], alter: Tonic['alter'] = 0): Tonic => ({ letter, alter })

describe('keySignature — counts and type', () => {
  test('C major is empty', () => {
    expect(keySignature(T('C'), MAJOR)).toEqual({ type: 'none', count: 0, letters: [] })
  })

  test('D major is two sharps F C', () => {
    expect(keySignature(T('D'), MAJOR)).toEqual({ type: 'sharp', count: 2, letters: ['F', 'C'] })
  })

  test('B♭ major is two flats B E', () => {
    expect(keySignature(T('B', -1), MAJOR)).toEqual({ type: 'flat', count: 2, letters: ['B', 'E'] })
  })

  test('C♯ major is the seven-sharp limit', () => {
    expect(keySignature(T('C', 1), MAJOR)).toEqual({
      type: 'sharp',
      count: 7,
      letters: ['F', 'C', 'G', 'D', 'A', 'E', 'B'],
    })
  })

  test('A natural minor is empty (relative to C major)', () => {
    expect(keySignature(T('A'), NAT_MINOR)).toEqual({ type: 'none', count: 0, letters: [] })
  })

  test('harmonic minor uses the natural-minor signature — raised 7th stays inline', () => {
    // A harmonic minor still carries no signature; the G♯ is an accidental
    expect(keySignature(T('A'), HARM_MINOR)).toEqual({ type: 'none', count: 0, letters: [] })
    // C harmonic minor keeps C minor's three flats, not two
    expect(keySignature(T('C'), HARM_MINOR)).toEqual({
      type: 'flat',
      count: 3,
      letters: ['B', 'E', 'A'],
    })
  })

  test('melodic minor also uses the natural-minor signature', () => {
    expect(keySignature(T('A'), MEL_MINOR)).toEqual({ type: 'none', count: 0, letters: [] })
  })

  test('modes take their parent (relative-major) signature', () => {
    // D Dorian is white-notes → empty; A Mixolydian → D major's two sharps
    expect(keySignature(T('D'), DORIAN)).toEqual({ type: 'none', count: 0, letters: [] })
    expect(keySignature(T('A'), MIXO)).toEqual({ type: 'sharp', count: 2, letters: ['F', 'C'] })
  })

  test('every practical major/minor key yields a standard signature ≤ 7', () => {
    for (const key of MAJOR_KEYS) {
      const s = keySignature(key, MAJOR)
      // C major is the lone empty one; every other practical major has a real signature
      expect(s.count).toBeLessThanOrEqual(7)
      if (!(key.letter === 'C' && key.alter === 0)) expect(s.type).not.toBe('none')
    }
    for (const key of MINOR_KEYS) {
      expect(keySignature(key, HARM_MINOR).count).toBeLessThanOrEqual(7)
    }
  })
})

describe('keySignatureLayout — accidentals sit on the right letters', () => {
  const clefs: Clef[] = ['treble', 'bass', 'alto', 'tenor']
  const LETTERS = 'CDEFGAB'

  // Map a staff step back to its letter using the clef's bottom-line index —
  // this validates the hardcoded step tables against the intended letters.
  const letterAt = (clef: Clef, step: number) =>
    LETTERS[(((step + CLEFS[clef].bottomIndex) % 7) + 7) % 7]

  test('all seven sharps land on F C G D A E B in every clef', () => {
    const sig = keySignature(T('C', 1), MAJOR) // 7 sharps
    for (const clef of clefs) {
      const acc = keySignatureLayout(sig, clef)
      expect(acc.map((a) => a.letter)).toEqual(['F', 'C', 'G', 'D', 'A', 'E', 'B'])
      for (const a of acc) {
        expect(a.alter).toBe(1)
        expect(letterAt(clef, a.step)).toBe(a.letter)
      }
    }
  })

  test('all seven flats land on B E A D G C F in every clef', () => {
    const sig = keySignature(T('C', -1), MAJOR) // C♭ major, 7 flats
    for (const clef of clefs) {
      const acc = keySignatureLayout(sig, clef)
      expect(acc.map((a) => a.letter)).toEqual(['B', 'E', 'A', 'D', 'G', 'C', 'F'])
      for (const a of acc) {
        expect(a.alter).toBe(-1)
        expect(letterAt(clef, a.step)).toBe(a.letter)
      }
    }
  })

  test('treble two-sharp signature sits on F5 (top line) and C5 (3rd space)', () => {
    const acc = keySignatureLayout(keySignature(T('D'), MAJOR), 'treble')
    expect(acc).toEqual([
      { letter: 'F', alter: 1, step: 8 },
      { letter: 'C', alter: 1, step: 5 },
    ])
  })

  test('none-signature draws nothing', () => {
    expect(keySignatureLayout(keySignature(T('C'), MAJOR), 'treble')).toEqual([])
  })
})

describe('inlineAlter — suppression against a signature', () => {
  test('a note matching the signature needs no accidental', () => {
    const map = signatureMap(keySignature(T('B', -1), MAJOR)) // B♭, E♭
    expect(inlineAlter(map, { letter: 'B', alter: -1 })).toBeNull()
    expect(inlineAlter(map, { letter: 'E', alter: -1 })).toBeNull()
    expect(inlineAlter(map, { letter: 'C', alter: 0 })).toBeNull()
  })

  test('a raised 7th against an empty signature draws a sharp', () => {
    const map = signatureMap(keySignature(T('A'), HARM_MINOR)) // empty
    expect(inlineAlter(map, { letter: 'G', alter: 1 })).toBe(1)
  })

  test('a natural cancelling a signature flat draws ♮ (alter 0)', () => {
    const map = signatureMap(keySignature(T('C'), HARM_MINOR)) // B♭ E♭ A♭
    // C harmonic minor raises the 7th: A♭ → B♮, which must cancel the B♭
    expect(inlineAlter(map, { letter: 'B', alter: 0 })).toBe(0)
  })
})
