import { describe, expect, test } from 'vitest'
import {
  WARMUP_CATEGORIES,
  rekeyWarmup,
  shiftWarmup,
  warmupLibrary,
  type WarmupExercise,
} from './warmups'
import { MAJOR_KEYS } from './theory/keys'

const names = (ex: WarmupExercise) =>
  ex.spelled.map((n) => n.letter + (n.alter === 1 ? '♯' : n.alter === -1 ? '♭' : ''))
const find = (clef: 'treble' | 'bass', cat: keyof ReturnType<typeof warmupLibrary>, id: string) =>
  warmupLibrary(clef)[cat].find((e) => e.id === id)!

describe('warmupLibrary', () => {
  test('every category has exercises, keyed by the category ids', () => {
    const lib = warmupLibrary('treble')
    for (const c of WARMUP_CATEGORIES) expect(lib[c.id].length).toBeGreaterThan(0)
    expect(Object.keys(lib).sort()).toEqual(WARMUP_CATEGORIES.map((c) => c.id).sort())
  })

  test('exercise notation and playback line up', () => {
    for (const list of Object.values(warmupLibrary('treble'))) {
      for (const ex of list) {
        expect(ex.spelled.map((n) => n.midi)).toEqual(ex.midi)
        expect(ex.playback.events.flatMap((e) => e.midi)).toEqual(ex.midi)
      }
    }
  })
})

describe('arpeggios', () => {
  test('C major arpeggio ascends the triad and comes back down', () => {
    const ex = find('treble', 'arpeggios', 'arp:maj')
    expect(names(ex)).toEqual(['C', 'E', 'G', 'C', 'G', 'E', 'C'])
    expect(ex.transposable).toBe('key')
  })

  test('C dominant-7th arpeggio spells the flat 7 (B♭, not A♯)', () => {
    expect(names(find('treble', 'arpeggios', 'arp:dom7'))).toContain('B♭')
  })
})

describe('rekeyWarmup — arpeggios through the keys', () => {
  test('steps the root around the major key list, keeping id, re-spelling correctly', () => {
    const cMaj = find('treble', 'arpeggios', 'arp:maj')
    const eFlat = rekeyWarmup(cMaj, 9, 'treble') // C(0) → +9 → E♭
    expect(eFlat.tonic).toEqual(MAJOR_KEYS[9]) // E♭
    expect(names(eFlat)).toEqual(['E♭', 'G', 'B♭', 'E♭', 'B♭', 'G', 'E♭'])
    expect(eFlat.id).toBe(cMaj.id) // stable slot
  })

  test('re-anchors to the clef register for every key (bass)', () => {
    const cMaj = find('bass', 'arpeggios', 'arp:maj')
    for (let o = 0; o < 12; o++) {
      const ex = rekeyWarmup(cMaj, o, 'bass')
      expect(ex.midi[0]).toBeGreaterThanOrEqual(46)
      expect(ex.midi[0]).toBeLessThanOrEqual(57)
    }
  })

  test('octave-only exercises pass through unchanged', () => {
    const longTone = warmupLibrary('treble')['long-tones'][0]
    expect(rekeyWarmup(longTone, 3, 'treble')).toBe(longTone)
  })
})

describe('articulation — rhythmic exercises', () => {
  test('single tonguing is eight eighth notes filling one 4/4 measure', () => {
    const ex = find('treble', 'articulation', 'artic:single')
    expect(ex.rhythm).toBeDefined()
    expect(ex.rhythm!.meter).toEqual({ beats: 4, unit: 4 })
    expect(ex.rhythm!.events).toHaveLength(ex.spelled.length)
    expect(ex.rhythm!.events.map((e) => e.beats)).toEqual(Array(8).fill(0.5))
    expect(ex.rhythm!.events.reduce((s, e) => s + e.beats, 0)).toBe(4) // one measure
  })

  test('dotted pattern alternates dotted-eighth and sixteenth', () => {
    const ex = find('treble', 'articulation', 'artic:dotted')
    expect(ex.rhythm!.events.map((e) => e.beats)).toEqual([0.75, 0.25, 0.75, 0.25, 0.75, 0.25, 0.75, 0.25])
  })

  test('the Arban study is sixteen sixteenths and carries provenance', () => {
    const ex = find('treble', 'articulation', 'artic:arban')
    expect(ex.rhythm!.events).toHaveLength(16)
    expect(ex.rhythm!.events.every((e) => e.beats === 0.25)).toBe(true)
    expect(ex.source?.year).toBe(1864)
  })

  test('shiftWarmup moves the rhythm notes together with midi', () => {
    const ex = find('treble', 'articulation', 'artic:single')
    const up = shiftWarmup(ex, 1)
    expect(up.rhythm!.events.map((e) => e.note!.midi)).toEqual(
      ex.rhythm!.events.map((e) => e.note!.midi + 12),
    )
    expect(up.midi).toEqual(ex.midi.map((m) => m + 12))
  })
})

describe('lip flexibility — harmonic-series partials over B♭', () => {
  test('two-partial slur is fundamental, octave, fundamental', () => {
    const ex = find('treble', 'lip-flexibility', 'slur:121')
    expect(names(ex)).toEqual(['B♭', 'B♭', 'B♭'])
    expect(ex.midi).toEqual([58, 70, 58]) // B♭3, B♭4, B♭3
  })

  test('three-partial slur reaches the fifth above the octave (F)', () => {
    const ex = find('treble', 'lip-flexibility', 'slur:12321')
    expect(names(ex)).toEqual(['B♭', 'B♭', 'F', 'B♭', 'B♭'])
    expect(ex.midi[2]).toBe(77) // F5 = B♭3 + 19
  })
})

describe('shiftWarmup — octave displacement moves notation and playback together', () => {
  test('adds whole octaves to midi and playback, leaves spelling', () => {
    const ex = find('treble', 'long-tones', 'long:desc5')
    const up = shiftWarmup(ex, 1)
    expect(up.midi).toEqual(ex.midi.map((m) => m + 12))
    expect(up.playback.events.flatMap((e) => e.midi)).toEqual(ex.midi.map((m) => m + 12))
    expect(names(up)).toEqual(names(ex))
    expect(shiftWarmup(ex, 0)).toBe(ex)
  })
})

describe('Arban provenance', () => {
  test('curated items carry public-domain 1864 provenance', () => {
    const lib = warmupLibrary('treble')
    const arban = Object.values(lib)
      .flat()
      .filter((e) => e.id.endsWith(':arban'))
    expect(arban.length).toBeGreaterThanOrEqual(3)
    for (const ex of arban) {
      expect(ex.source).toBeDefined()
      expect(ex.source!.publicDomain).toBe(true)
      expect(ex.source!.year).toBe(1864)
      expect(ex.source!.composer).toContain('Arban')
    }
  })

  test('generative exercises have no source', () => {
    expect(find('treble', 'arpeggios', 'arp:maj').source).toBeUndefined()
  })
})
