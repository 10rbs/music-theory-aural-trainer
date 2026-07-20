import { useEffect, useMemo, useState } from 'react'
import { ALL_SCALE_TYPES, dailyAssignment, type AssignmentItem } from '../../core/assignments'
import { type Clef } from '../../core/notation/staff'
import { melodic } from '../../core/playback/spec'
import { toLocalDateStr } from '../../core/streak'
import { playSpec } from '../../shell/audio/synth'
import { settingsEvents, statsEvents, useStore } from '../stats/store-context'
import { ScaleStaff } from './ScaleStaff'

const TEMPI = [60, 80, 100, 120, 144]

const TYPE_LABELS: Record<string, string> = {
  'Major (Ionian)': 'Major',
  'Natural Minor (Aeolian)': 'Natural minor',
  'Harmonic Minor': 'Harmonic minor',
  'Melodic Minor': 'Melodic minor',
  Dorian: 'Dorian',
  Mixolydian: 'Mixolydian',
}

export function PracticeView() {
  const store = useStore()
  const today = toLocalDateStr(new Date())
  const [enabled, setEnabled] = useState<string[] | null>(null) // null until loaded
  const [clef, setClef] = useState<Clef>('treble')
  const [done, setDone] = useState<Set<string>>(new Set())
  const [bpm, setBpm] = useState(100)

  const completionKey = `practice:${today}`

  useEffect(() => {
    void store.getSetting<string[]>('practiceScales', [...ALL_SCALE_TYPES]).then(setEnabled)
    void store.getSetting<string[]>(completionKey, []).then((ids) => setDone(new Set(ids)))
  }, [store, completionKey])

  // clef comes from the header settings menu; re-read when it changes there
  useEffect(() => {
    const load = () => void store.getSetting<Clef>('clef', 'treble').then(setClef)
    load()
    settingsEvents.addEventListener('settings', load)
    return () => settingsEvents.removeEventListener('settings', load)
  }, [store])

  const items = useMemo<AssignmentItem[]>(
    () => (enabled ? dailyAssignment(today, enabled, clef) : []),
    [enabled, clef, today],
  )

  const toggleType = (name: string) => {
    if (!enabled) return
    const next = enabled.includes(name)
      ? enabled.filter((n) => n !== name)
      : ALL_SCALE_TYPES.filter((n) => n === name || enabled.includes(n)) // keep canonical order
    setEnabled(next)
    void store.setSetting('practiceScales', next)
  }

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

  const allDone = items.length > 0 && items.every((i) => done.has(i.id))

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

      <details className="scale-settings">
        <summary>Scale types</summary>
        <div className="scale-settings-options">
          {ALL_SCALE_TYPES.map((name) => (
            <label key={name}>
              <input
                type="checkbox"
                checked={enabled?.includes(name) ?? true}
                onChange={() => toggleType(name)}
              />
              {TYPE_LABELS[name] ?? name}
            </label>
          ))}
        </div>
      </details>

      {allDone && <p className="feedback correct">All done for today — nice work! 🔥</p>}
      {enabled !== null && items.length === 0 && (
        <p className="tagline">No scale types selected — enable at least one above.</p>
      )}

      <div className="practice-list">
        {items.map((item) => {
          const isDone = done.has(item.id)
          return (
            <div key={item.id} className={`practice-item${isDone ? ' done' : ''}`}>
              <div className="practice-info">
                <h3>{item.title}</h3>
                <ScaleStaff spelled={item.spelled} clef={clef} label={item.title} />
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
        Play each scale on your instrument (ascending and descending), using Listen and the
        notation as a reference. Completing a scale counts toward your daily streak.
      </p>
    </section>
  )
}
