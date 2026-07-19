import { describe, expect, test } from 'vitest'
import { dailyAssignment, dayNumber } from './assignments'

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
})
