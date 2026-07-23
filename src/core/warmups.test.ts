import { describe, expect, test } from 'vitest'
import {
  MAX_OCTAVE_SHIFT,
  STUDY_CATEGORIES,
  WARMUP_CATEGORIES,
  WORKOUTS,
  arbanStudyLibrary,
  buildWorkout,
  rekeyWarmup,
  resolveWarmup,
  shiftWarmup,
  warmupLibrary,
  type WarmupExercise,
} from './warmups'
import { MAJOR_KEYS } from './theory/keys'

const names = (ex: WarmupExercise) =>
  ex.spelled.map((n) => n.letter + (n.alter === 1 ? '♯' : n.alter === -1 ? '♭' : ''))
const find = (clef: 'treble' | 'bass', cat: keyof ReturnType<typeof warmupLibrary>, id: string) =>
  warmupLibrary(clef)[cat].find((e) => e.id === id)!
const findStudy = (id: string) =>
  Object.values(arbanStudyLibrary('treble'))
    .flat()
    .find((e) => e.id === id)!

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
  test('single tonguing is sixteen eighth notes filling two 4/4 measures', () => {
    const ex = find('treble', 'articulation', 'artic:single')
    expect(ex.rhythm).toBeDefined()
    expect(ex.rhythm!.meter).toEqual({ beats: 4, unit: 4 })
    expect(ex.rhythm!.events).toHaveLength(ex.spelled.length)
    expect(ex.rhythm!.events.map((e) => e.beats)).toEqual(Array(16).fill(0.5))
    expect(ex.rhythm!.events.reduce((s, e) => s + e.beats, 0)).toBe(8) // two measures
  })

  test('dotted pattern alternates dotted-eighth and sixteenth across two measures', () => {
    const ex = find('treble', 'articulation', 'artic:dotted')
    expect(ex.rhythm!.events).toHaveLength(16)
    expect(ex.rhythm!.events.map((e) => e.beats)).toEqual(
      Array.from({ length: 8 }, () => [0.75, 0.25]).flat(),
    )
  })

  test('the Arban study is thirty-two sixteenths and carries provenance', () => {
    const ex = find('treble', 'articulation', 'artic:arban')
    expect(ex.rhythm!.events).toHaveLength(32)
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

describe('arbanStudyLibrary — the deep-dive studies page', () => {
  test('every study category has exercises, keyed by the category ids', () => {
    const lib = arbanStudyLibrary('treble')
    for (const c of STUDY_CATEGORIES) expect(lib[c.id].length).toBeGreaterThan(0)
    expect(Object.keys(lib).sort()).toEqual(STUDY_CATEGORIES.map((c) => c.id).sort())
  })

  test('notation, playback, and midi line up for every study', () => {
    for (const list of Object.values(arbanStudyLibrary('treble'))) {
      for (const ex of list) {
        expect(ex.spelled.map((n) => n.midi)).toEqual(ex.midi)
        // playback includes only sounding notes (rests advance time silently)
        expect(ex.playback.events.flatMap((e) => e.midi)).toEqual(ex.midi)
      }
    }
  })

  test('major scale study is a one-octave scale up and down, two measures + rest', () => {
    const ex = findStudy('scale:major')
    expect(names(ex)).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C', 'B', 'A', 'G', 'F', 'E', 'D', 'C'])
    expect(ex.midi).toEqual([60, 62, 64, 65, 67, 69, 71, 72, 71, 69, 67, 65, 64, 62, 60])
    expect(ex.rhythm!.meter).toEqual({ beats: 4, unit: 4 })
    expect(ex.rhythm!.events).toHaveLength(16) // 15 eighths + a closing eighth rest
    expect(ex.rhythm!.events.filter((e) => !e.note)).toHaveLength(1)
    expect(ex.rhythm!.events.reduce((s, e) => s + e.beats, 0)).toBe(8) // two 4/4 measures
    expect(ex.source?.year).toBe(1864)
  })

  test('study in thirds spells broken thirds and reaches the ninth (D above the octave)', () => {
    const ex = findStudy('thirds:major')
    expect(names(ex)).toEqual(['C', 'E', 'D', 'F', 'E', 'G', 'F', 'A', 'G', 'B', 'A', 'C', 'B', 'D', 'C'])
    expect(ex.midi).toEqual([60, 64, 62, 65, 64, 67, 65, 69, 67, 71, 69, 72, 71, 74, 72])
    expect(ex.midi.at(-2)).toBe(74) // multi-octave scaleNotes: the 9th degree, D5
    expect(ex.source?.year).toBe(1864)
  })

  test('extended flexibility slur climbs to the fifth partial (D) and carries provenance', () => {
    const ex = findStudy('slur:12345')
    expect(ex.midi).toEqual([58, 70, 77, 82, 86, 82, 77, 70, 58])
    expect(names(ex).at(4)).toBe('D') // 5th partial over B♭ = D6
    expect(ex.source?.year).toBe(1864)
  })

  test('curated studies carry public-domain 1864 provenance; generative ones do not', () => {
    const curated = ['scale:major', 'thirds:major', 'slur:12345', 'slur:arban', 'arp:arban']
    for (const id of curated) {
      const src = findStudy(id).source
      expect(src?.publicDomain).toBe(true)
      expect(src?.composer).toContain('Arban')
    }
    expect(findStudy('arp:maj').source).toBeUndefined()
    expect(findStudy('scale:minor').source).toBeUndefined() // generative
  })
})

describe('studies — new content, etudes, and workouts (M4.11)', () => {
  test('natural minor scale study spells the lowered 3rd, 6th, 7th', () => {
    const ex = findStudy('scale:minor')
    expect(names(ex)).toEqual(
      ['C', 'D', 'E♭', 'F', 'G', 'A♭', 'B♭', 'C', 'B♭', 'A♭', 'G', 'F', 'E♭', 'D', 'C'],
    )
    expect(ex.midi).toEqual([60, 62, 63, 65, 67, 68, 70, 72, 70, 68, 67, 65, 63, 62, 60])
  })

  test('more arpeggios: diminished, maj7 and min7 join the library', () => {
    const arps = arbanStudyLibrary('treble').arpeggios.map((e) => e.id)
    expect(arps).toEqual(expect.arrayContaining(['arp:dim', 'arp:maj7', 'arp:min7']))
    expect(findStudy('arp:min7').transposable).toBe('key') // still key-transposable
  })

  test('scale-cycle etude runs four keys, spelling each key correctly, over eight measures', () => {
    const ex = findStudy('etude:scale-cycle')
    expect(ex.spelled).toHaveLength(60) // 4 keys × 15 notes
    expect(ex.rhythm!.events).toHaveLength(64) // + one breath rest per key
    expect(ex.rhythm!.events.reduce((s, e) => s + e.beats, 0)).toBe(32) // eight 4/4 measures
    const spelled = new Set(names(ex))
    expect(spelled).toContain('F♯') // G, D, A
    expect(spelled).toContain('C♯') // D, A
    expect(spelled).toContain('G♯') // A
    expect(spelled.has('E♯') || spelled.has('B♯')).toBe(false) // no theoretical spellings
    expect(ex.source?.year).toBe(1864)
  })

  test('articulation endurance etude is sixty-four sixteenths across four measures', () => {
    const ex = findStudy('etude:artic')
    expect(ex.rhythm!.events).toHaveLength(64)
    expect(ex.rhythm!.events.every((e) => e.beats === 0.25)).toBe(true)
    expect(ex.rhythm!.events.reduce((s, e) => s + e.beats, 0)).toBe(16)
    expect(ex.category).toBe('etudes')
  })

  test('resolveWarmup clamps octave shift and reports headroom', () => {
    const base = findStudy('scale:major')
    const flat = resolveWarmup(base, 'treble', 0, 0)
    expect(flat.ex.midi).toEqual(base.midi) // no-op passes through
    const shifted = resolveWarmup(base, 'treble', 1, 0)
    expect(shifted.shift).toBe(1)
    expect(shifted.ex.midi).toEqual(base.midi.map((m) => m + 12))
    const clamped = resolveWarmup(base, 'treble', 9, 0)
    expect(clamped.shift).toBeLessThanOrEqual(MAX_OCTAVE_SHIFT)
    expect(clamped.canOctaveUp).toBe(false) // at the ceiling
  })

  test('resolveWarmup applies the key offset for key-transposable exercises', () => {
    const cMaj = findStudy('arp:maj')
    const r = resolveWarmup(cMaj, 'treble', 0, 9) // C → +9 → E♭
    expect(r.keyOffset).toBe(9)
    expect(r.ex.tonic).toEqual(MAJOR_KEYS[9])
  })

  test('every workout resolves all of its items, in order', () => {
    for (const w of WORKOUTS) {
      const built = buildWorkout(w.id, 'treble')!
      expect(built.exercises).toHaveLength(w.itemIds.length) // no dangling ids
      expect(built.exercises.map((e) => e.id)).toEqual([...w.itemIds])
    }
    expect(buildWorkout('does-not-exist', 'treble')).toBeUndefined()
  })
})
