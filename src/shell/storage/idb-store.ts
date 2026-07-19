// IndexedDB-backed ProgressStore. Schema changes bump DB_VERSION with an
// upgrade function; attempts are never rewritten.

import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import { advanceStreak, effectiveStreak, type StreakState } from '../../core/streak'
import type { Attempt, Backup, ExerciseStats, ProgressStore } from './types'

const DB_NAME = 'aural-trainer'
const DB_VERSION = 1

interface TrainerDB extends DBSchema {
  attempts: {
    key: number
    value: Attempt
    indexes: { 'by-exercise': string; 'by-date': string }
  }
  kv: {
    key: string
    value: unknown
  }
}

const STREAK_KEY = 'streak'
// v0 aggregates imported from localStorage — see migrate-v0.ts
const LEGACY_KEY = 'legacyAggregates'

export class IdbProgressStore implements ProgressStore {
  private dbPromise: Promise<IDBPDatabase<TrainerDB>>

  constructor() {
    this.dbPromise = openDB<TrainerDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const attempts = db.createObjectStore('attempts', { keyPath: 'id', autoIncrement: true })
        attempts.createIndex('by-exercise', 'exerciseId')
        attempts.createIndex('by-date', 'date')
        db.createObjectStore('kv')
      },
    })
  }

  async recordAttempt(a: Attempt): Promise<void> {
    const db = await this.dbPromise
    const tx = db.transaction(['attempts', 'kv'], 'readwrite')
    void tx.objectStore('attempts').add(a)
    const kv = tx.objectStore('kv')
    const state = ((await kv.get(STREAK_KEY)) as StreakState | undefined) ?? {
      streak: 0,
      lastPracticeDate: null,
    }
    void kv.put(advanceStreak(state, a.date), STREAK_KEY)
    await tx.done
  }

  async getExerciseStats(exerciseId: string): Promise<ExerciseStats> {
    const db = await this.dbPromise
    const attempts = await db.getAllFromIndex('attempts', 'by-exercise', exerciseId)
    const legacy = ((await db.get('kv', LEGACY_KEY)) as Record<string, ExerciseStats> | undefined)?.[
      exerciseId
    ] ?? { correct: 0, total: 0 }
    return {
      correct: legacy.correct + attempts.filter((a) => a.correct).length,
      total: legacy.total + attempts.length,
    }
  }

  async getStreak(today: string): Promise<number> {
    const db = await this.dbPromise
    const state = (await db.get('kv', STREAK_KEY)) as StreakState | undefined
    if (!state) return 0
    return effectiveStreak(state, today)
  }

  async getSetting<T>(key: string, fallback: T): Promise<T> {
    const db = await this.dbPromise
    const v = (await db.get('kv', `setting:${key}`)) as T | undefined
    return v === undefined ? fallback : v
  }

  async setSetting<T>(key: string, value: T): Promise<void> {
    const db = await this.dbPromise
    await db.put('kv', value, `setting:${key}`)
  }

  async exportAll(): Promise<Backup> {
    const db = await this.dbPromise
    const attempts = await db.getAll('attempts')
    const kv: Record<string, unknown> = {}
    let cursor = await db.transaction('kv').store.openCursor()
    while (cursor) {
      kv[String(cursor.key)] = cursor.value
      cursor = await cursor.continue()
    }
    return { version: 1, exportedAt: Date.now(), attempts, kv }
  }

  async importAll(b: Backup): Promise<void> {
    const db = await this.dbPromise
    const tx = db.transaction(['attempts', 'kv'], 'readwrite')
    const attempts = tx.objectStore('attempts')
    for (const a of b.attempts) {
      const { id: _id, ...rest } = a
      void attempts.add(rest as Attempt)
    }
    const kv = tx.objectStore('kv')
    for (const [k, v] of Object.entries(b.kv)) {
      void kv.put(v, k)
    }
    await tx.done
  }
}
