import { describe, expect, test } from 'vitest'
import { beatsToValue, measureBeats, rhythmLayout, type RhythmEvent } from './rhythm'
import type { StaffNoteInput } from './staff'

// treble C4..C5 for pitched events
const N = (letter: string, midi: number): StaffNoteInput => ({ letter, alter: 0, midi })
const C4 = N('C', 60)
const note = (beats: number, n: StaffNoteInput = C4): RhythmEvent => ({ note: n, beats })
const rest = (beats: number): RhythmEvent => ({ beats })

describe('beatsToValue', () => {
  test('maps the bounded duration set', () => {
    expect(beatsToValue(4)).toEqual({ value: 1, dots: 0 }) // whole
    expect(beatsToValue(3)).toEqual({ value: 2, dots: 1 }) // dotted half
    expect(beatsToValue(2)).toEqual({ value: 2, dots: 0 }) // half
    expect(beatsToValue(1.5)).toEqual({ value: 4, dots: 1 }) // dotted quarter
    expect(beatsToValue(1)).toEqual({ value: 4, dots: 0 }) // quarter
    expect(beatsToValue(0.75)).toEqual({ value: 8, dots: 1 }) // dotted eighth
    expect(beatsToValue(0.5)).toEqual({ value: 8, dots: 0 }) // eighth
    expect(beatsToValue(0.25)).toEqual({ value: 16, dots: 0 }) // sixteenth
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

describe('rhythmLayout — bar lines', () => {
  test('4/4: a bar line after each four quarter beats', () => {
    const evs = [note(1), note(1), note(1), note(1), note(1), note(1), note(1), note(1)]
    const { barlines, glyphs } = rhythmLayout(evs, { beats: 4, unit: 4 })
    expect(glyphs).toHaveLength(8)
    expect(barlines).toHaveLength(1) // one internal division (closing bar is drawn at width)
    // it sits between the 4th and 5th note
    expect(barlines[0]).toBeGreaterThan(glyphs[3].x)
    expect(barlines[0]).toBeLessThan(glyphs[4].x)
  })

  test('3/4: two bar lines across three measures of three quarters', () => {
    const evs = Array.from({ length: 9 }, () => note(1))
    expect(rhythmLayout(evs, { beats: 3, unit: 4 }).barlines).toHaveLength(2)
  })

  test('6/8: bar line after three quarter-beats (six eighths)', () => {
    const evs = Array.from({ length: 12 }, () => note(0.5))
    const { barlines, glyphs } = rhythmLayout(evs, { beats: 6, unit: 8 })
    expect(barlines).toHaveLength(1)
    expect(barlines[0]).toBeGreaterThan(glyphs[5].x)
    expect(barlines[0]).toBeLessThan(glyphs[6].x)
  })
})

describe('rhythmLayout — beaming', () => {
  test('a run of eighths within a beat beams together', () => {
    // 4/4: four eighths = two beats → two beams of two
    const { beams, glyphs } = rhythmLayout([note(0.5), note(0.5), note(0.5), note(0.5)], { beats: 4, unit: 4 })
    expect(beams).toHaveLength(2)
    expect(glyphs[0].beamId).toBe(glyphs[1].beamId)
    expect(glyphs[2].beamId).toBe(glyphs[3].beamId)
    expect(glyphs[0].beamId).not.toBe(glyphs[2].beamId) // different beat → different beam
    expect(glyphs[0].flags).toBe(0) // beamed, not flagged
  })

  test('a rest breaks a beam', () => {
    const { beams, glyphs } = rhythmLayout([note(0.5), rest(0.5), note(0.5), note(0.5)], { beats: 4, unit: 4 })
    // first eighth is alone (rest breaks it) → flagged, no beam; last two beam? they are beat 2 (pos 1..2) same group
    expect(glyphs[0].beamId).toBeNull()
    expect(glyphs[0].flags).toBe(1)
    expect(beams).toHaveLength(1)
    expect(glyphs[2].beamId).toBe(glyphs[3].beamId)
  })

  test('a quarter between eighths is not beamed', () => {
    const { glyphs } = rhythmLayout([note(0.5), note(1), note(0.5)], { beats: 4, unit: 4 })
    expect(glyphs[1].beamId).toBeNull() // the quarter
    expect(glyphs[1].flags).toBe(0)
  })

  test('sixteenths get a secondary beam segment', () => {
    // four sixteenths = one beat → one beam, secondary spans them
    const { beams } = rhythmLayout([note(0.25), note(0.25), note(0.25), note(0.25)], { beats: 4, unit: 4 })
    expect(beams).toHaveLength(1)
    expect(beams[0].secondary).toHaveLength(1)
    const [x0, x1] = beams[0].secondary[0]
    expect(x1 - x0).toBeGreaterThan(10) // a full secondary beam, not a stub
  })

  test('a beamed dotted-eighth + sixteenth gets a short stub secondary beam', () => {
    const { beams, glyphs } = rhythmLayout(
      [note(0.75), note(0.25), note(0.75), note(0.25)],
      { beats: 4, unit: 4 },
    )
    expect(beams).toHaveLength(2) // one per beat
    expect(glyphs[0].beamId).toBe(glyphs[1].beamId)
    expect(beams[0].secondary).toHaveLength(1)
    const [x0, x1] = beams[0].secondary[0]
    expect(x1 - x0).toBeLessThan(10) // a stub, not a full beam
  })
})

describe('rhythmLayout — stems', () => {
  test('single note above the middle line stems down, below stems up', () => {
    const high = N('A', 81) // A5, well above middle
    const low = N('C', 60) // C4, below middle
    const { glyphs } = rhythmLayout([note(1, high), note(1, low)], { beats: 4, unit: 4 })
    expect(glyphs[0].stemUp).toBe(false)
    expect(glyphs[1].stemUp).toBe(true)
  })

  test('a beam takes one direction from the note furthest from the middle', () => {
    const high = N('A', 81) // A5, far above the middle line
    const near = N('G', 67) // G4, just below the middle
    const { glyphs, beams } = rhythmLayout([note(0.5, high), note(0.5, near)], { beats: 4, unit: 4 })
    expect(glyphs[0].stemUp).toBe(glyphs[1].stemUp) // one shared direction
    expect(beams[0].stemUp).toBe(false) // furthest note (A5) is high → stems down
  })
})

describe('rhythmLayout — a known 4/4 pattern', () => {
  test('quarter, two beamed eighths, half → values, one beam, one full measure', () => {
    const { glyphs, beams, barlines } = rhythmLayout(
      [note(1), note(0.5), note(0.5), note(2)],
      { beats: 4, unit: 4 },
    )
    expect(glyphs.map((g) => g.value)).toEqual([4, 8, 8, 2])
    expect(beams).toHaveLength(1)
    expect(glyphs[1].beamId).toBe(glyphs[2].beamId)
    expect(barlines).toHaveLength(0) // exactly one measure, no internal bar line
    expect(glyphs.every((g) => !g.isRest)).toBe(true)
  })
})
