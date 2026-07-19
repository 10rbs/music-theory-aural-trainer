import { describe, expect, test } from 'vitest'
import { advanceStreak, dayBefore, effectiveStreak, toLocalDateStr } from './streak'

describe('toLocalDateStr', () => {
  test('formats as YYYY-MM-DD in local time', () => {
    expect(toLocalDateStr(new Date(2026, 6, 18, 23, 30))).toBe('2026-07-18')
  })
})

describe('dayBefore', () => {
  test('simple case', () => {
    expect(dayBefore('2026-07-18')).toBe('2026-07-17')
  })

  test('crosses month boundaries', () => {
    expect(dayBefore('2026-07-01')).toBe('2026-06-30')
  })

  test('crosses year boundaries', () => {
    expect(dayBefore('2026-01-01')).toBe('2025-12-31')
  })
})

describe('advanceStreak', () => {
  test('first ever practice starts a streak of 1', () => {
    expect(advanceStreak({ streak: 0, lastPracticeDate: null }, '2026-07-18')).toEqual({
      streak: 1,
      lastPracticeDate: '2026-07-18',
    })
  })

  test('same-day practice does not change the streak', () => {
    const s = { streak: 3, lastPracticeDate: '2026-07-18' }
    expect(advanceStreak(s, '2026-07-18')).toBe(s)
  })

  test('consecutive-day practice extends the streak', () => {
    expect(advanceStreak({ streak: 3, lastPracticeDate: '2026-07-17' }, '2026-07-18')).toEqual({
      streak: 4,
      lastPracticeDate: '2026-07-18',
    })
  })

  test('a missed day resets the streak to 1', () => {
    expect(advanceStreak({ streak: 9, lastPracticeDate: '2026-07-15' }, '2026-07-18')).toEqual({
      streak: 1,
      lastPracticeDate: '2026-07-18',
    })
  })
})

describe('effectiveStreak', () => {
  test('practiced today: full streak', () => {
    expect(effectiveStreak({ streak: 5, lastPracticeDate: '2026-07-18' }, '2026-07-18')).toBe(5)
  })

  test('practiced yesterday: streak still alive', () => {
    expect(effectiveStreak({ streak: 5, lastPracticeDate: '2026-07-17' }, '2026-07-18')).toBe(5)
  })

  test('lapsed: reports 0', () => {
    expect(effectiveStreak({ streak: 5, lastPracticeDate: '2026-07-15' }, '2026-07-18')).toBe(0)
  })

  test('never practiced: 0', () => {
    expect(effectiveStreak({ streak: 0, lastPracticeDate: null }, '2026-07-18')).toBe(0)
  })
})
