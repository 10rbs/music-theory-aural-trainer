import { describe, expect, test } from 'vitest'
import {
  invert,
  M2,
  M6,
  P4,
  P5,
  P8,
  times,
  transposeSpelled,
  transposeTonic,
  type SpelledPitch,
} from './transpose'
import { spellScale, type Tonic } from './keys'
import { SCALES } from './scales'

const MAJOR = SCALES.find((s) => s.name === 'Major (Ionian)')!.intervals
const T = (letter: Tonic['letter'], alter: Tonic['alter'] = 0): Tonic => ({ letter, alter })
// C major degrees as spelled+sounding pitches from C4
const N = (letter: string, alter: number, midi: number): SpelledPitch => ({ letter, alter, midi })

describe('transposeSpelled — diatonic, not chromatic', () => {
  test('up a fifth: C4 → G4, B4 → F♯5 (letter drives the accidental)', () => {
    expect(transposeSpelled(N('C', 0, 60), P5)).toEqual(N('G', 0, 67))
    expect(transposeSpelled(N('B', 0, 71), P5)).toEqual(N('F', 1, 78))
  })

  test('a minor third up from C is E♭, never D♯', () => {
    // minor third = 2 letter-steps, 3 semitones
    expect(transposeSpelled(N('C', 0, 60), { diatonic: 2, chromatic: 3 })).toEqual(N('E', -1, 63))
  })

  test('down a fifth: C4 → F3', () => {
    expect(transposeSpelled(N('C', 0, 60), invert(P5))).toEqual(N('F', 0, 53))
  })

  test('octave displacement keeps letter and accidental, moves only the octave', () => {
    expect(transposeSpelled(N('E', -1, 63), P8)).toEqual(N('E', -1, 75))
    expect(transposeSpelled(N('E', -1, 63), invert(P8))).toEqual(N('E', -1, 51))
  })

  test('B♭ instrument (written up a major 2nd): concert C sounds, player reads D', () => {
    expect(transposeSpelled(N('C', 0, 60), M2)).toEqual(N('D', 0, 62))
    // concert E♭ → written F
    expect(transposeSpelled(N('E', -1, 63), M2)).toEqual(N('F', 0, 65))
  })

  test('transposing a whole scale note-by-note re-spells it correctly', () => {
    // C major up a fifth is G major, including B → F♯
    const cMajor = [
      N('C', 0, 60), N('D', 0, 62), N('E', 0, 64), N('F', 0, 65),
      N('G', 0, 67), N('A', 0, 69), N('B', 0, 71),
    ]
    const up = cMajor.map((n) => transposeSpelled(n, P5))
    expect(up.map((n) => n.letter + (n.alter === 1 ? '♯' : n.alter === -1 ? '♭' : ''))).toEqual(
      spellScale(T('G'), MAJOR),
    )
    // C major down a fifth is F major, including B♭
    const down = cMajor.map((n) => transposeSpelled(n, invert(P5)))
    expect(down.map((n) => n.letter + (n.alter === -1 ? '♭' : ''))).toEqual(spellScale(T('F'), MAJOR))
  })

  test('throws past double accidentals', () => {
    // A♯4 up a major 6th would need a triple-sharp letter
    expect(() => transposeSpelled(N('A', 1, 70), { diatonic: 5, chromatic: 11 })).toThrow()
  })
})

describe('transposeTonic — octave-free key moves', () => {
  test('a fifth up walks the sharp side of the circle', () => {
    let t: { letter: string; alter: number } = T('C')
    const seen: string[] = []
    for (let i = 0; i < 7; i++) {
      seen.push(t.letter + (t.alter === 1 ? '♯' : ''))
      t = transposeTonic(t as Tonic, P5)
    }
    expect(seen).toEqual(['C', 'G', 'D', 'A', 'E', 'B', 'F♯'])
  })

  test('a fifth down walks the flat side', () => {
    expect(transposeTonic(T('C'), invert(P5))).toEqual({ letter: 'F', alter: 0 })
    expect(transposeTonic(T('F'), invert(P5))).toEqual({ letter: 'B', alter: -1 })
    expect(transposeTonic(T('B', -1), invert(P5))).toEqual({ letter: 'E', alter: -1 })
  })

  test('times() stacks: two fifths from C is D', () => {
    expect(transposeTonic(T('C'), times(P5, 2))).toEqual({ letter: 'D', alter: 0 })
  })
})

describe('interval helpers', () => {
  test('P4 is the inversion of P5 within the octave (letters + semitones)', () => {
    expect(invert(P5)).toEqual({ diatonic: -4, chromatic: -7 })
    expect(P4).toEqual({ diatonic: 3, chromatic: 5 })
  })

  test('M6 is the E♭ transposition interval', () => {
    // concert C → written A for an E♭ instrument
    expect(transposeSpelled(N('C', 0, 60), M6)).toEqual(N('A', 0, 69))
  })
})
