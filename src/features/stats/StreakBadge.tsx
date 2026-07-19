import { useEffect, useState } from 'react'
import { toLocalDateStr } from '../../core/streak'
import { statsEvents, useStore } from './store-context'

/** 🔥 n day streak — refreshes on every recorded attempt. */
export function StreakBadge() {
  const store = useStore()
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    let cancelled = false
    const read = () => {
      void store.getStreak(toLocalDateStr(new Date())).then((s) => {
        if (!cancelled) setStreak(s)
      })
    }
    read()
    statsEvents.addEventListener('attempt', read)
    return () => {
      cancelled = true
      statsEvents.removeEventListener('attempt', read)
    }
  }, [store])

  return (
    <div className="streak-badge" title="Practice every day to keep your streak">
      <span aria-hidden>🔥</span>
      <span>{streak}</span>
      <span className="streak-label">day streak</span>
    </div>
  )
}
