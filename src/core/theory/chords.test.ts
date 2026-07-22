import { describe, expect, test } from 'vitest'
import { CHORDS, spellChord } from './chords'
import { type Tonic } from './keys'

const T = (letter: Tonic['letter'], alter: Tonic['alter'] = 0): Tonic => ({ letter, alter })
const chord = (short: string) => CHORDS.find((c) => c.short === short)!.intervals
const names = (root: Tonic, short: string) =>
  spellChord(root, chord(short)).map((d) => d.letter + (d.alter === 1 ? '♯' : d.alter === -1 ? '♭' : ''))

describe('spellChord — stacked thirds, correct accidentals', () => {
  test('C major → C E G', () => {
    expect(names(T('C'), 'maj')).toEqual(['C', 'E', 'G'])
  })

  test('E♭ major → E♭ G B♭ (not D♯/A♯)', () => {
    expect(names(T('E', -1), 'maj')).toEqual(['E♭', 'G', 'B♭'])
  })

  test('C minor → C E♭ G', () => {
    expect(names(T('C'), 'min')).toEqual(['C', 'E♭', 'G'])
  })

  test('G dominant 7th → G B D F', () => {
    expect(names(T('G'), 'dom7')).toEqual(['G', 'B', 'D', 'F'])
  })

  test('A diminished → A C E♭', () => {
    expect(names(T('A'), 'dim')).toEqual(['A', 'C', 'E♭'])
  })

  test('B major 7th → B D♯ F♯ A♯', () => {
    expect(names(T('B'), 'maj7')).toEqual(['B', 'D♯', 'F♯', 'A♯'])
  })

  test('every chord tone takes a distinct letter a third apart', () => {
    const letters = spellChord(T('F', 1), chord('dom7')).map((d) => d.letter)
    expect(new Set(letters).size).toBe(letters.length)
  })
})
