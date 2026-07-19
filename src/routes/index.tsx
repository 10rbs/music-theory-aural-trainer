import { useEffect, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { EXERCISES } from '../core/exercises/registry'
import { useStore } from '../features/stats/store-context'
import type { ExerciseStats } from '../shell/storage/types'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const store = useStore()
  const [stats, setStats] = useState<Record<string, ExerciseStats>>({})

  useEffect(() => {
    let cancelled = false
    void Promise.all(
      EXERCISES.map(async (e) => [e.id, await store.getExerciseStats(e.id)] as const),
    ).then((entries) => {
      if (!cancelled) setStats(Object.fromEntries(entries))
    })
    return () => {
      cancelled = true
    }
  }, [store])

  return (
    <section>
      <p className="tagline">Train your ear. A few minutes a day.</p>
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
    </section>
  )
}
