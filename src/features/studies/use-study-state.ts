// Shared state for the Studies and Workouts pages: the clef, per-exercise octave
// and key shifts, and today's completion set — all persisted under the study
// namespaces (studyOctaves / studyKeys / study:<date>) so the two pages stay in
// sync (a study marked done in a workout shows done in the browser, and vice
// versa). Completing a study records a `warmup` attempt so it counts toward the
// streak, exactly like the daily warm-up.

import { useCallback, useEffect, useState } from 'react'
import { type WarmupExercise } from '../../core/warmups'
import { type Clef } from '../../core/notation/staff'
import { toLocalDateStr } from '../../core/streak'
import { settingsEvents, statsEvents, useStore } from '../stats/store-context'

/** Persisted per-exercise shifts, keyed by exercise id. */
type Shifts = Record<string, number>

const mod12 = (n: number) => ((n % 12) + 12) % 12

export interface StudyState {
  clef: Clef
  octaves: Shifts
  keys: Shifts
  done: Set<string>
  setShift: (id: string, n: number) => void
  setKey: (id: string, n: number) => void
  markDone: (ex: WarmupExercise) => void
}

export function useStudyState(): StudyState {
  const store = useStore()
  const today = toLocalDateStr(new Date())
  const [clef, setClef] = useState<Clef>('treble')
  const [octaves, setOctaves] = useState<Shifts>({})
  const [keys, setKeys] = useState<Shifts>({})
  const [done, setDone] = useState<Set<string>>(new Set())

  const completionKey = `study:${today}`

  useEffect(() => {
    void store.getSetting<string[]>(completionKey, []).then((ids) => setDone(new Set(ids)))
  }, [store, completionKey])

  useEffect(() => {
    const load = () => {
      void store.getSetting<Clef>('clef', 'treble').then(setClef)
      void store.getSetting<Shifts>('studyOctaves', {}).then(setOctaves)
      void store.getSetting<Shifts>('studyKeys', {}).then(setKeys)
    }
    load()
    settingsEvents.addEventListener('settings', load)
    return () => settingsEvents.removeEventListener('settings', load)
  }, [store])

  const setShift = useCallback(
    (id: string, n: number) => {
      const next = { ...octaves, [id]: n }
      setOctaves(next)
      void store.setSetting('studyOctaves', next)
    },
    [octaves, store],
  )

  const setKey = useCallback(
    (id: string, n: number) => {
      const next = { ...keys, [id]: mod12(n) }
      setKeys(next)
      void store.setSetting('studyKeys', next)
    },
    [keys, store],
  )

  const markDone = useCallback(
    (ex: WarmupExercise) => {
      if (done.has(ex.id)) return
      const next = new Set(done).add(ex.id)
      setDone(next)
      void store.setSetting(completionKey, [...next])
      void store
        .recordAttempt({
          exerciseId: 'warmup', // studies/workouts count toward the streak
          date: today,
          ts: Date.now(),
          correct: true,
          score: 1,
          detail: { item: ex.id, mode: 'study' },
        })
        .then(() => statsEvents.dispatchEvent(new Event('attempt')))
    },
    [done, store, completionKey, today],
  )

  return { clef, octaves, keys, done, setShift, setKey, markDone }
}
