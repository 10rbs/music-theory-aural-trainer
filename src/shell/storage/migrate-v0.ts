// One-time import of the v0-vanilla app's localStorage stats
// ('aural-trainer:stats:v1') so the user's streak and lifetime accuracy
// survive the rewrite. The old key is left untouched for rollback.

import { openDB } from 'idb'
import { dayBefore, toLocalDateStr, type StreakState } from '../../core/streak'
import type { ExerciseStats } from './types'

const V0_KEY = 'aural-trainer:stats:v1'
const MIGRATED_FLAG = 'migratedV0'

// v0 mode keys → new exercise ids
const MODE_MAP: Record<string, string> = {
  intervals: 'interval-id',
  chords: 'chord-quality',
  scales: 'scale-id',
}

interface V0Stats {
  streak?: number
  lastPracticeDate?: string | null
  modes?: Record<string, { correct?: number; total?: number }>
}

/**
 * v0 stored "today" as a UTC date string; the new app uses local dates.
 * If the stored UTC date is today or yesterday in UTC terms, we keep the streak
 * alive by translating it to the equivalent local date (favouring the user —
 * an off-by-one here should never silently kill a streak).
 */
function translateDate(utcDateStr: string, now: Date): string {
  const todayUtc = now.toISOString().slice(0, 10)
  const todayLocal = toLocalDateStr(now)
  if (utcDateStr === todayUtc) return todayLocal
  if (utcDateStr === dayBefore(todayUtc)) return dayBefore(todayLocal)
  return utcDateStr // stale either way; effectiveStreak will report 0
}

/** Runs before first render. Safe to call every startup — no-ops after the first. */
export async function migrateV0(now = new Date()): Promise<void> {
  // Same DB/schema as IdbProgressStore — openDB is idempotent.
  const db = await openDB('aural-trainer', 1, {
    upgrade(d) {
      const attempts = d.createObjectStore('attempts', { keyPath: 'id', autoIncrement: true })
      attempts.createIndex('by-exercise', 'exerciseId')
      attempts.createIndex('by-date', 'date')
      d.createObjectStore('kv')
    },
  })

  if (await db.get('kv', MIGRATED_FLAG)) {
    db.close()
    return
  }

  const raw = localStorage.getItem(V0_KEY)
  if (raw) {
    try {
      const v0 = JSON.parse(raw) as V0Stats
      const tx = db.transaction('kv', 'readwrite')

      if (v0.lastPracticeDate && typeof v0.streak === 'number') {
        const state: StreakState = {
          streak: v0.streak,
          lastPracticeDate: translateDate(v0.lastPracticeDate, now),
        }
        void tx.store.put(state, 'streak')
      }

      const legacy: Record<string, ExerciseStats> = {}
      for (const [mode, stats] of Object.entries(v0.modes ?? {})) {
        const id = MODE_MAP[mode] ?? mode
        legacy[id] = { correct: stats.correct ?? 0, total: stats.total ?? 0 }
      }
      void tx.store.put(legacy, 'legacyAggregates')
      await tx.done
    } catch {
      // corrupt v0 data — nothing worth failing startup over
    }
  }

  await db.put('kv', true, MIGRATED_FLAG)
  db.close()
}
