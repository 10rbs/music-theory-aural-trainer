import { describe, expect, test } from 'vitest'
import { ALL_SCALE_TYPES, dailyAssignment, dayNumber, shiftOctaves } from './assignments'

describe('dayNumber', () => {
  test('epoch day and rollover', () => {
    expect(dayNumber('2026-01-01')).toBe(0)
    expect(dayNumber('2026-01-02')).toBe(1)
    expect(dayNumber('2026-02-01')).toBe(31)
    expect(dayNumber('2025-12-31')).toBe(-1) // dates before the epoch still work
  })
})

describe('dailyAssignment', () => {
  test('same date → identical assignment', () => {
    expect(dailyAssignment('2026-07-19')).toEqual(dailyAssignment('2026-07-19'))
  })

  test('different dates → different assignments (usually)', () => {
    const a = dailyAssignment('2026-07-19')
    const b = dailyAssignment('2026-07-20')
    expect(a.map((i) => i.id)).not.toEqual(b.map((i) => i.id))
  })

  test('always three items: major, minor, mode', () => {
    for (let d = 1; d <= 28; d++) {
      const items = dailyAssignment(`2026-07-${String(d).padStart(2, '0')}`)
      expect(items).toHaveLength(3)
      expect(items[0].id).toMatch(/^major:/)
      expect(items[1].id).toMatch(/^minor:/)
      expect(items[2].id).toMatch(/^mode:/)
    }
  })

  test('majors cover all 12 keys over 12 days', () => {
    const seen = new Set<string>()
    for (let d = 0; d < 12; d++) {
      const date = new Date(Date.UTC(2026, 2, 1 + d)).toISOString().slice(0, 10)
      seen.add(dailyAssignment(date)[0].id)
    }
    expect(seen.size).toBe(12)
  })

  test('minor types rotate through all three over 3 days', () => {
    const titles = [1, 2, 3].map(
      (d) => dailyAssignment(`2026-07-0${d}`)[1].title.split(' ').slice(1).join(' '),
    )
    expect(new Set(titles).size).toBe(3)
  })

  test('items have 8 midi notes (octave run) matching 7 spelled degrees + octave', () => {
    for (const it of dailyAssignment('2026-07-19')) {
      expect(it.notes).toHaveLength(7)
      expect(it.midi).toHaveLength(8)
      expect(it.midi[7] - it.midi[0]).toBe(12)
      // playable register: G3 (55) up to ~F#5
      expect(it.midi[0]).toBeGreaterThanOrEqual(55)
      expect(it.midi[0]).toBeLessThanOrEqual(66)
    }
  })

  test('spelled run matches midi and repeats the tonic spelling at the octave', () => {
    for (const it of dailyAssignment('2026-07-19')) {
      expect(it.spelled).toHaveLength(8)
      expect(it.spelled.map((n) => n.midi)).toEqual(it.midi)
      const { letter, alter } = it.spelled[0]
      expect(it.spelled[7]).toEqual({ letter, alter, midi: it.midi[0] + 12 })
      // letters ascend diatonically: each degree takes the next letter name
      const letters = 'CDEFGAB'
      for (let i = 1; i < 7; i++) {
        expect(letters.indexOf(it.spelled[i].letter)).toBe(
          (letters.indexOf(it.spelled[i - 1].letter) + 1) % 7,
        )
      }
    }
  })
})

describe('dailyAssignment with enabled scale types', () => {
  test('default (all types) matches the explicit full list', () => {
    expect(dailyAssignment('2026-07-19', ALL_SCALE_TYPES)).toEqual(dailyAssignment('2026-07-19'))
  })

  test('disabling a whole slot drops it', () => {
    const noMajor = dailyAssignment('2026-07-19', ALL_SCALE_TYPES.filter((n) => n !== 'Major (Ionian)'))
    expect(noMajor).toHaveLength(2)
    expect(noMajor.map((i) => i.id.split(':')[0])).toEqual(['minor', 'mode'])

    const onlyMajor = dailyAssignment('2026-07-19', ['Major (Ionian)'])
    expect(onlyMajor).toHaveLength(1)
    expect(onlyMajor[0].id).toMatch(/^major:/)
  })

  test('minor rotation cycles only the enabled types', () => {
    const enabled = ['Harmonic Minor', 'Melodic Minor']
    const titles = new Set<string>()
    for (let d = 1; d <= 4; d++) {
      const [minor] = dailyAssignment(`2026-07-0${d}`, enabled)
      const type = minor.title.split(' ').slice(1).join(' ')
      expect(enabled).toContain(type === 'Harmonic Minor' ? 'Harmonic Minor' : 'Melodic Minor')
      titles.add(type)
    }
    expect(titles).toEqual(new Set(['Harmonic Minor', 'Melodic Minor']))
  })

  test('no enabled types → empty assignment', () => {
    expect(dailyAssignment('2026-07-19', [])).toEqual([])
  })
})

describe('shiftOctaves', () => {
  test('moves notation and playback together, leaves identity fields alone', () => {
    const [item] = dailyAssignment('2026-07-19')
    const up = shiftOctaves(item, 1)
    expect(up.midi).toEqual(item.midi.map((m) => m + 12))
    expect(up.spelled.map((n) => n.midi)).toEqual(item.spelled.map((n) => n.midi + 12))
    expect(up.spelled.map((n) => [n.letter, n.alter])).toEqual(
      item.spelled.map((n) => [n.letter, n.alter]),
    )
    expect(up.id).toBe(item.id)
    expect(up.title).toBe(item.title)
    expect(up.notes).toEqual(item.notes)

    const down = shiftOctaves(item, -2)
    expect(down.midi[0]).toBe(item.midi[0] - 24)
  })

  test('zero shift returns the item unchanged', () => {
    const [item] = dailyAssignment('2026-07-19')
    expect(shiftOctaves(item, 0)).toBe(item)
  })
})

describe('dailyAssignment clef register', () => {
  test('treble default is unchanged from the clef-less days (G3..F♯4 roots)', () => {
    expect(dailyAssignment('2026-07-19', ALL_SCALE_TYPES, 'treble')).toEqual(
      dailyAssignment('2026-07-19'),
    )
  })

  test('each clef keeps roots inside its 12-semitone register window', () => {
    // bass is deliberately an octave above its treble-mirror window (B♭2..A3,
    // trombone range) — see ROOT_LO in assignments.ts
    const windows = { treble: [55, 66], alto: [44, 55], tenor: [41, 52], bass: [46, 57] } as const
    for (const [clef, [lo, hi]] of Object.entries(windows)) {
      for (let d = 1; d <= 28; d++) {
        const date = `2026-07-${String(d).padStart(2, '0')}`
        for (const it of dailyAssignment(date, ALL_SCALE_TYPES, clef as never)) {
          expect(it.midi[0]).toBeGreaterThanOrEqual(lo)
          expect(it.midi[0]).toBeLessThanOrEqual(hi)
        }
      }
    }
  })

  test('clef changes register but not ids, titles, or spelling', () => {
    const treble = dailyAssignment('2026-07-19')
    const bass = dailyAssignment('2026-07-19', ALL_SCALE_TYPES, 'bass')
    expect(bass.map((i) => i.id)).toEqual(treble.map((i) => i.id))
    expect(bass.map((i) => i.notes)).toEqual(treble.map((i) => i.notes))
    for (let i = 0; i < treble.length; i++) {
      // same pitch classes, whole octaves apart
      expect((treble[i].midi[0] - bass[i].midi[0]) % 12).toBe(0)
      expect(bass[i].midi[0]).toBeLessThanOrEqual(treble[i].midi[0])
    }
  })
})
