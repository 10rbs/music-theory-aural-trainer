// @vitest-environment jsdom
// Exercises the real IDB code paths against fake-indexeddb.

import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, test } from 'vitest'
import { IdbProgressStore } from './idb-store'
import { migrateV0 } from './migrate-v0'
import type { Attempt } from './types'

function attempt(over: Partial<Attempt> = {}): Attempt {
  return {
    exerciseId: 'interval-id',
    date: '2026-07-18',
    ts: 1_752_800_000_000,
    correct: true,
    score: 1,
    ...over,
  }
}

beforeEach(() => {
  // fresh DB and localStorage per test
  indexedDB = new IDBFactory()
  localStorage.clear()
})

describe('IdbProgressStore', () => {
  test('records attempts and derives per-exercise stats', async () => {
    const store = new IdbProgressStore()
    await store.recordAttempt(attempt())
    await store.recordAttempt(attempt({ correct: false, score: 0 }))
    await store.recordAttempt(attempt({ exerciseId: 'scale-id' }))

    expect(await store.getExerciseStats('interval-id')).toEqual({ correct: 1, total: 2 })
    expect(await store.getExerciseStats('scale-id')).toEqual({ correct: 1, total: 1 })
    expect(await store.getExerciseStats('chord-quality')).toEqual({ correct: 0, total: 0 })
  })

  test('first attempt of a day advances the streak; same-day attempts do not', async () => {
    const store = new IdbProgressStore()
    await store.recordAttempt(attempt({ date: '2026-07-17' }))
    await store.recordAttempt(attempt({ date: '2026-07-18' }))
    await store.recordAttempt(attempt({ date: '2026-07-18' }))
    expect(await store.getStreak('2026-07-18')).toBe(2)
  })

  test('lapsed streak reads as 0', async () => {
    const store = new IdbProgressStore()
    await store.recordAttempt(attempt({ date: '2026-07-10' }))
    expect(await store.getStreak('2026-07-18')).toBe(0)
  })

  test('settings round-trip with fallback', async () => {
    const store = new IdbProgressStore()
    expect(await store.getSetting('a4', 440)).toBe(440)
    await store.setSetting('a4', 442)
    expect(await store.getSetting('a4', 440)).toBe(442)
  })

  test('export → import restores attempts and streak', async () => {
    const store = new IdbProgressStore()
    await store.recordAttempt(attempt({ date: '2026-07-17' }))
    await store.recordAttempt(attempt({ date: '2026-07-18', correct: false, score: 0 }))
    const backup = await store.exportAll()

    indexedDB = new IDBFactory() // simulate a wiped browser
    const restored = new IdbProgressStore()
    await restored.importAll(backup)

    expect(await restored.getExerciseStats('interval-id')).toEqual({ correct: 1, total: 2 })
    expect(await restored.getStreak('2026-07-18')).toBe(2)
  })
})

describe('migrateV0', () => {
  const NOW = new Date(2026, 6, 18, 20, 0) // 2026-07-18 local

  test('imports v0 streak and per-mode aggregates', async () => {
    localStorage.setItem(
      'aural-trainer:stats:v1',
      JSON.stringify({
        streak: 6,
        lastPracticeDate: NOW.toISOString().slice(0, 10), // practiced "today" in v0 UTC terms
        modes: {
          intervals: { correct: 40, total: 50 },
          chords: { correct: 10, total: 20 },
        },
      }),
    )

    await migrateV0(NOW)
    const store = new IdbProgressStore()

    expect(await store.getStreak('2026-07-18')).toBe(6)
    expect(await store.getExerciseStats('interval-id')).toEqual({ correct: 40, total: 50 })
    expect(await store.getExerciseStats('chord-quality')).toEqual({ correct: 10, total: 20 })
    // legacy aggregates + new attempts combine
    await store.recordAttempt(attempt())
    expect(await store.getExerciseStats('interval-id')).toEqual({ correct: 41, total: 51 })
  })

  test('runs only once', async () => {
    localStorage.setItem(
      'aural-trainer:stats:v1',
      JSON.stringify({ streak: 2, lastPracticeDate: NOW.toISOString().slice(0, 10), modes: {} }),
    )
    await migrateV0(NOW)
    // v0 data changes afterwards — must NOT be re-imported
    localStorage.setItem(
      'aural-trainer:stats:v1',
      JSON.stringify({ streak: 99, lastPracticeDate: NOW.toISOString().slice(0, 10), modes: {} }),
    )
    await migrateV0(NOW)
    const store = new IdbProgressStore()
    expect(await store.getStreak('2026-07-18')).toBe(2)
  })

  test('no v0 data: no-op, flag still set', async () => {
    await migrateV0(NOW)
    const store = new IdbProgressStore()
    expect(await store.getStreak('2026-07-18')).toBe(0)
  })

  test('leaves the v0 localStorage key untouched (rollback safety)', async () => {
    const raw = JSON.stringify({ streak: 1, lastPracticeDate: '2026-07-18', modes: {} })
    localStorage.setItem('aural-trainer:stats:v1', raw)
    await migrateV0(NOW)
    expect(localStorage.getItem('aural-trainer:stats:v1')).toBe(raw)
  })

  test('corrupt v0 data does not throw', async () => {
    localStorage.setItem('aural-trainer:stats:v1', '{not json')
    await expect(migrateV0(NOW)).resolves.toBeUndefined()
  })

  test('stale v0 streak stays stale after translation', async () => {
    localStorage.setItem(
      'aural-trainer:stats:v1',
      JSON.stringify({ streak: 8, lastPracticeDate: '2026-07-01', modes: {} }),
    )
    await migrateV0(NOW)
    const store = new IdbProgressStore()
    expect(await store.getStreak('2026-07-18')).toBe(0)
  })
})
