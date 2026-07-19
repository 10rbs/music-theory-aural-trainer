import { useEffect, useState } from 'react'
import { dailyAssignment, type AssignmentItem } from '../../core/assignments'
import { melodic } from '../../core/playback/spec'
import { toLocalDateStr } from '../../core/streak'
import { playSpec } from '../../shell/audio/synth'
import { statsEvents, useStore } from '../stats/store-context'

const TEMPI = [60, 80, 100, 120, 144]

export function PracticeView() {
  const store = useStore()
  const today = toLocalDateStr(new Date())
  const [items] = useState<AssignmentItem[]>(() => dailyAssignment(today))
  const [done, setDone] = useState<Set<string>>(new Set())
  const [bpm, setBpm] = useState(100)

  const completionKey = `practice:${today}`

  useEffect(() => {
    void store.getSetting<string[]>(completionKey, []).then((ids) => setDone(new Set(ids)))
  }, [store, completionKey])

  const play = (item: AssignmentItem) => {
    // ascending + descending, top note not repeated
    const up = item.midi
    const down = [...item.midi].reverse().slice(1)
    playSpec(melodic([...up, ...down], bpm))
  }

  const markDone = (item: AssignmentItem) => {
    if (done.has(item.id)) return
    const next = new Set(done).add(item.id)
    setDone(next)
    void store.setSetting(completionKey, [...next])
    const now = new Date()
    void store
      .recordAttempt({
        exerciseId: 'scale-practice',
        date: today,
        ts: now.getTime(),
        correct: true,
        score: 1,
        detail: { item: item.id },
      })
      .then(() => statsEvents.dispatchEvent(new Event('attempt')))
  }

  const allDone = items.every((i) => done.has(i.id))

  return (
    <section>
      <div className="drill-header">
        <h2>Today's scales</h2>
        <label className="practice-tempo">
          Tempo
          <select value={bpm} onChange={(e) => setBpm(Number(e.target.value))}>
            {TEMPI.map((t) => (
              <option key={t} value={t}>
                {t} BPM
              </option>
            ))}
          </select>
        </label>
      </div>

      {allDone && <p className="feedback correct">All done for today — nice work! 🔥</p>}

      <div className="practice-list">
        {items.map((item) => {
          const isDone = done.has(item.id)
          return (
            <div key={item.id} className={`practice-item${isDone ? ' done' : ''}`}>
              <div className="practice-info">
                <h3>{item.title}</h3>
                <p className="practice-notes">{item.notes.join(' ')}</p>
              </div>
              <div className="practice-actions">
                <button className="tap-btn" onClick={() => play(item)}>
                  ▶ Listen
                </button>
                <button
                  className={`done-btn${isDone ? ' is-done' : ''}`}
                  onClick={() => markDone(item)}
                  disabled={isDone}
                >
                  {isDone ? '✓ Done' : 'Mark done'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <p className="tagline practice-hint">
        Play each scale on your instrument (ascending and descending), using Listen as a
        reference. Completing a scale counts toward your daily streak.
      </p>
    </section>
  )
}
