import { describe, expect, test } from 'vitest'
import {
  beatsToValue,
  measureBeats,
  rhythmLayout,
  type RhythmEvent,
  type RhythmLayout,
} from './rhythm'
import type { StaffNoteInput } from './staff'
import type { KeySignature } from './key-signature'

// treble C4..C5 for pitched events
const N = (letter: string, midi: number): StaffNoteInput => ({ letter, alter: 0, midi })
const C4 = N('C', 60)
const note = (beats: number, n: StaffNoteInput = C4): RhythmEvent => ({ note: n, beats })
const rest = (beats: number): RhythmEvent => ({ beats })

// helpers across systems
const glyphs = (l: RhythmLayout) => l.systems.flatMap((s) => s.glyphs)
const beams = (l: RhythmLayout) => l.systems.flatMap((s) => s.beams)
const internalBarlines = (l: RhythmLayout) => l.systems.reduce((n, s) => n + s.barlines.length, 0)
/** total measures = internal dividers + one line-ending measure per system */
const measureCount = (l: RhythmLayout) => internalBarlines(l) + l.systems.length
// a single-system passage
const one = (l: RhythmLayout) => {
  expect(l.systems).toHaveLength(1)
  return l.systems[0]
}

describe('beatsToValue', () => {
  test('maps the bounded duration set', () => {
    expect(beatsToValue(4)).toEqual({ value: 1, dots: 0 })
    expect(beatsToValue(3)).toEqual({ value: 2, dots: 1 })
    expect(beatsToValue(2)).toEqual({ value: 2, dots: 0 })
    expect(beatsToValue(1.5)).toEqual({ value: 4, dots: 1 })
    expect(beatsToValue(1)).toEqual({ value: 4, dots: 0 })
    expect(beatsToValue(0.75)).toEqual({ value: 8, dots: 1 })
    expect(beatsToValue(0.5)).toEqual({ value: 8, dots: 0 })
    expect(beatsToValue(0.25)).toEqual({ value: 16, dots: 0 })
  })

  test('throws on an unsupported duration', () => {
    expect(() => beatsToValue(1 / 3)).toThrow()
  })
})

describe('measureBeats', () => {
  test('quarter-beats per measure', () => {
    expect(measureBeats({ beats: 4, unit: 4 })).toBe(4)
    expect(measureBeats({ beats: 3, unit: 4 })).toBe(3)
    expect(measureBeats({ beats: 2, unit: 4 })).toBe(2)
    expect(measureBeats({ beats: 6, unit: 8 })).toBe(3)
  })
})

describe('rhythmLayout — measures and bar lines', () => {
  test('4/4: two quarter-note measures fit one line with a bar line between', () => {
    const s = one(rhythmLayout(Array.from({ length: 8 }, () => note(1)), { beats: 4, unit: 4 }))
    expect(s.barlines).toHaveLength(1)
    expect(s.barlines[0]).toBeGreaterThan(s.glyphs[3].x)
    expect(s.barlines[0]).toBeLessThan(s.glyphs[4].x)
  })

  test('a measure leaves room after the bar line before its first note', () => {
    const s = one(rhythmLayout(Array.from({ length: 8 }, () => note(1)), { beats: 4, unit: 4 }))
    const firstOfSecond = s.glyphs[4] // first note of measure 2
    expect(firstOfSecond.x - s.barlines[0]).toBeGreaterThanOrEqual(15) // clears the bar line
  })

  test('3/4: three measures of three quarters', () => {
    const l = rhythmLayout(Array.from({ length: 9 }, () => note(1)), { beats: 3, unit: 4 })
    expect(measureCount(l)).toBe(3)
  })

  test('6/8: six eighths make one measure (three quarter-beats)', () => {
    const l = rhythmLayout(Array.from({ length: 6 }, () => note(0.5)), { beats: 6, unit: 8 })
    expect(measureCount(l)).toBe(1)
  })
})

describe('rhythmLayout — wrapping onto systems', () => {
  // 48 eighths = six 4/4 measures — enough to wrap past the width target
  const sixMeasures = () => rhythmLayout(Array.from({ length: 48 }, () => note(0.5)), { beats: 4, unit: 4 })

  test('a long passage wraps onto multiple lines, packing several bars per line', () => {
    const l = sixMeasures()
    expect(l.systems.length).toBeGreaterThan(1)
    expect(glyphs(l)).toHaveLength(48)
    // bars now pack onto a line (an internal bar line) rather than one-per-line
    expect(l.systems.some((s) => s.barlines.length >= 1)).toBe(true)
  })

  test('only the first system shows the time signature; every system has a clef', () => {
    const l = sixMeasures()
    expect(l.systems.length).toBeGreaterThan(1)
    expect(l.systems[0].showTimeSig).toBe(true)
    expect(l.systems.slice(1).every((s) => !s.showTimeSig)).toBe(true)
  })

  test('beam ids stay unique across systems', () => {
    const ids = beams(sixMeasures()).map((b) => b.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('rhythmLayout — beaming (within a measure)', () => {
  test('a run of eighths within a beat beams together', () => {
    const s = one(rhythmLayout([note(0.5), note(0.5), note(0.5), note(0.5)], { beats: 4, unit: 4 }))
    expect(s.beams).toHaveLength(2)
    expect(s.glyphs[0].beamId).toBe(s.glyphs[1].beamId)
    expect(s.glyphs[2].beamId).toBe(s.glyphs[3].beamId)
    expect(s.glyphs[0].beamId).not.toBe(s.glyphs[2].beamId)
    expect(s.glyphs[0].flags).toBe(0)
  })

  test('a rest breaks a beam', () => {
    const s = one(rhythmLayout([note(0.5), rest(0.5), note(0.5), note(0.5)], { beats: 4, unit: 4 }))
    expect(s.glyphs[0].beamId).toBeNull()
    expect(s.glyphs[0].flags).toBe(1)
    expect(s.beams).toHaveLength(1)
    expect(s.glyphs[2].beamId).toBe(s.glyphs[3].beamId)
  })

  test('a quarter between eighths is not beamed', () => {
    const s = one(rhythmLayout([note(0.5), note(1), note(0.5)], { beats: 4, unit: 4 }))
    expect(s.glyphs[1].beamId).toBeNull()
    expect(s.glyphs[1].flags).toBe(0)
  })

  test('sixteenths get a full secondary beam', () => {
    const s = one(rhythmLayout([note(0.25), note(0.25), note(0.25), note(0.25)], { beats: 4, unit: 4 }))
    expect(s.beams).toHaveLength(1)
    expect(s.beams[0].secondary).toHaveLength(1)
    const [x0, x1] = s.beams[0].secondary[0]
    expect(x1 - x0).toBeGreaterThan(10)
  })

  test('a beamed dotted-eighth + sixteenth gets a short stub secondary beam', () => {
    const s = one(
      rhythmLayout([note(0.75), note(0.25), note(0.75), note(0.25)], { beats: 4, unit: 4 }),
    )
    expect(s.beams).toHaveLength(2)
    expect(s.glyphs[0].beamId).toBe(s.glyphs[1].beamId)
    expect(s.beams[0].secondary).toHaveLength(1)
    const [x0, x1] = s.beams[0].secondary[0]
    expect(x1 - x0).toBeLessThan(10)
  })
})

describe('rhythmLayout — stems', () => {
  test('single note above the middle line stems down, below stems up', () => {
    const high = N('A', 81)
    const low = N('C', 60)
    const s = one(rhythmLayout([note(1, high), note(1, low)], { beats: 4, unit: 4 }))
    expect(s.glyphs[0].stemUp).toBe(false)
    expect(s.glyphs[1].stemUp).toBe(true)
  })

  test('a beam takes one direction from the note furthest from the middle', () => {
    const high = N('A', 81)
    const near = N('G', 67)
    const s = one(rhythmLayout([note(0.5, high), note(0.5, near)], { beats: 4, unit: 4 }))
    expect(s.glyphs[0].stemUp).toBe(s.glyphs[1].stemUp)
    expect(s.beams[0].stemUp).toBe(false)
  })
})

describe('rhythmLayout — a known 4/4 measure', () => {
  test('quarter, two beamed eighths, half → values, one beam, one measure', () => {
    const s = one(rhythmLayout([note(1), note(0.5), note(0.5), note(2)], { beats: 4, unit: 4 }))
    expect(s.glyphs.map((g) => g.value)).toEqual([4, 8, 8, 2])
    expect(s.beams).toHaveLength(1)
    expect(s.glyphs[1].beamId).toBe(s.glyphs[2].beamId)
    expect(s.barlines).toHaveLength(0)
    expect(s.glyphs.every((g) => !g.isRest)).toBe(true)
  })
})

describe('rhythmLayout — key signatures', () => {
  const m44 = { beats: 4, unit: 4 } as const
  const ONE_SHARP: KeySignature = { type: 'sharp', count: 1, letters: ['F'] }
  const THREE_FLAT: KeySignature = { type: 'flat', count: 3, letters: ['B', 'E', 'A'] }
  const NONE: KeySignature = { type: 'none', count: 0, letters: [] }
  const Fsharp: StaffNoteInput = { letter: 'F', alter: 1, midi: 66 }
  const Fnat: StaffNoteInput = { letter: 'F', alter: 0, midi: 65 }
  const measure = (n: StaffNoteInput) => [note(1, n), note(1, C4), note(1, C4), note(1, C4)]

  test('no signature: an F♯ draws its accidental inline; the system has none', () => {
    const s = one(rhythmLayout(measure(Fsharp), m44))
    expect(s.glyphs[0].accidental).toBe(1)
    expect(s.keySig).toHaveLength(0)
  })

  test('with the signature, the covered F♯ is suppressed and drawn once after the clef', () => {
    const s = one(rhythmLayout(measure(Fsharp), m44, 'treble', ONE_SHARP))
    expect(s.glyphs[0].accidental).toBeNull() // covered by the signature
    expect(s.keySig).toHaveLength(1)
    expect(s.keySig[0]).toMatchObject({ letter: 'F', alter: 1 })
  })

  test('a natural against the signature draws a cancelling ♮ (accidental 0)', () => {
    const s = one(rhythmLayout(measure(Fnat), m44, 'treble', ONE_SHARP))
    expect(s.glyphs[0].accidental).toBe(0)
  })

  test('the signature reserves horizontal room (notes start further right)', () => {
    const bare = one(rhythmLayout(measure(C4), m44)).glyphs[0].x
    const keyed = one(rhythmLayout(measure(C4), m44, 'treble', THREE_FLAT)).glyphs[0].x
    expect(keyed).toBeGreaterThan(bare)
  })

  test('a per-measure key change starts a fresh system carrying the new signature', () => {
    const two = [...measure(C4), ...measure(Fsharp)] // C major, then G major
    const l = rhythmLayout(two, m44, 'treble', [NONE, ONE_SHARP])
    expect(l.systems).toHaveLength(2) // the change forces a line break
    expect(l.systems[0].keySig).toHaveLength(0)
    expect(l.systems[1].keySig).toHaveLength(1)
    expect(l.systems[0].showTimeSig).toBe(true) // time sig on the first line only
    expect(l.systems[1].showTimeSig).toBe(false)
  })
})
