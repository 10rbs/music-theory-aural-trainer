import { useEffect, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { EXERCISES } from '../core/exercises/registry'
import { ALL_SCALE_TYPES, dailyAssignment } from '../core/assignments'
import { toLocalDateStr } from '../core/streak'
import { BackupControls } from '../features/stats/BackupControls'
import { settingsEvents, useStore } from '../features/stats/store-context'
import type { ExerciseStats } from '../shell/storage/types'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const store = useStore()
  const today = toLocalDateStr(new Date())
  const [stats, setStats] = useState<Record<string, ExerciseStats>>({})
  const [practiceDone, setPracticeDone] = useState(0)
  const [practiceTotal, setPracticeTotal] = useState(() => dailyAssignment(today).length)
  const [warmupDone, setWarmupDone] = useState(0)

  useEffect(() => {
    let cancelled = false
    void Promise.all(
      EXERCISES.map(async (e) => [e.id, await store.getExerciseStats(e.id)] as const),
    ).then((entries) => {
      if (!cancelled) setStats(Object.fromEntries(entries))
    })
    void store.getSetting<string[]>(`practice:${today}`, []).then((ids) => {
      if (!cancelled) setPracticeDone(ids.length)
    })
    void store.getSetting<string[]>(`warmup:${today}`, []).then((ids) => {
      if (!cancelled) setWarmupDone(ids.length)
    })
    const loadTotal = () =>
      void store.getSetting<string[]>('practiceScales', [...ALL_SCALE_TYPES]).then((enabled) => {
        if (!cancelled) setPracticeTotal(dailyAssignment(today, enabled).length)
      })
    loadTotal()
    settingsEvents.addEventListener('settings', loadTotal)
    return () => {
      cancelled = true
      settingsEvents.removeEventListener('settings', loadTotal)
    }
  }, [store, today])

  return (
    <section>
      <p className="tagline">Train your ear. A few minutes a day.</p>
      <Link to="/practice" className="mode-card practice-card">
        <h2>Daily practice</h2>
        <p>Today's scales in notation, with reference playback.</p>
        <span className="mode-stat">
          {practiceTotal === 0
            ? 'No scale types enabled'
            : practiceDone >= practiceTotal
              ? 'Complete — nice work! ✓'
              : `${practiceDone}/${practiceTotal} scales done today`}
        </span>
      </Link>
      <Link to="/warmup" className="mode-card practice-card">
        <h2>Warm-up</h2>
        <p>Long tones, lip flexibility, and arpeggios — with Arban examples.</p>
        <span className="mode-stat">
          {warmupDone > 0 ? `${warmupDone} done today ✓` : 'Start your routine'}
        </span>
      </Link>
      <div className="mode-grid">
        {EXERCISES.map((e) => {
          const s = stats[e.id]
          return (
            <Link key={e.id} to="/drill/$exerciseId" params={{ exerciseId: e.id }} className="mode-card">
              <h2>{e.title}</h2>
              <p>{e.blurb}</p>
              <span className="mode-stat">
                {s && s.total > 0 ? `${s.correct}/${s.total} correct` : 'No attempts yet'}
              </span>
            </Link>
          )
        })}
      </div>
      <BackupControls />
    </section>
  )
}
