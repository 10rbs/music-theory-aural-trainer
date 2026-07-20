import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ALL_SCALE_TYPES,
  dailyAssignment,
  shiftOctaves,
  type AssignmentItem,
} from '../../core/assignments'
import { type Clef } from '../../core/notation/staff'
import { melodic } from '../../core/playback/spec'
import { toLocalDateStr } from '../../core/streak'
import { playSpec } from '../../shell/audio/synth'
import {
  DEFAULT_PRACTICE_DISPLAY,
  type PracticeDisplay,
} from '../settings/SettingsWidget'
import { settingsEvents, statsEvents, useStore } from '../stats/store-context'
import { ScaleStaff } from './ScaleStaff'

const TEMPI = [60, 80, 100, 120, 144]

// octave-shift limits: at most ±2 from the clef's home register, and never
// past the piano's range (A0..C8)
const MAX_OCTAVE_SHIFT = 2
const MIN_MIDI = 21
const MAX_MIDI = 108

/** Persisted octave shifts, keyed by slot kind ("major" | "minor" | "mode"). */
type OctaveShifts = Record<string, number>

export function PracticeView() {
  const store = useStore()
  const today = toLocalDateStr(new Date())
  const [enabled, setEnabled] = useState<string[] | null>(null) // null until loaded
  const [clef, setClef] = useState<Clef>('treble')
  const [display, setDisplay] = useState<PracticeDisplay>(DEFAULT_PRACTICE_DISPLAY)
  const [octaves, setOctaves] = useState<OctaveShifts>({})
  const [done, setDone] = useState<Set<string>>(new Set())
  const [bpm, setBpm] = useState(100)

  const completionKey = `practice:${today}`

  useEffect(() => {
    void store.getSetting<string[]>(completionKey, []).then((ids) => setDone(new Set(ids)))
  }, [store, completionKey])

  // everything display-related lives in the header settings menu; load it and
  // re-read whenever it changes there
  useEffect(() => {
    const load = () => {
      void store.getSetting<string[]>('practiceScales', [...ALL_SCALE_TYPES]).then(setEnabled)
      void store.getSetting<Clef>('clef', 'treble').then(setClef)
      void store
        .getSetting<PracticeDisplay>('practiceDisplay', DEFAULT_PRACTICE_DISPLAY)
        .then(setDisplay)
      void store.getSetting<OctaveShifts>('practiceOctaves', {}).then(setOctaves)
    }
    load()
    settingsEvents.addEventListener('settings', load)
    return () => settingsEvents.removeEventListener('settings', load)
  }, [store])

  const items = useMemo<AssignmentItem[]>(
    () => (enabled ? dailyAssignment(today, enabled, clef) : []),
    [enabled, clef, today],
  )

  const setShift = useCallback(
    (kind: string, n: number) => {
      const next = { ...octaves, [kind]: n }
      setOctaves(next)
      void store.setSetting('practiceOctaves', next)
    },
    [octaves, store],
  )

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

      {allDone && <p className="feedback correct">All done for today — nice work! 🔥</p>}
      {enabled !== null && items.length === 0 && (
        <p className="tagline">No scale types enabled — pick at least one in ⚙ Settings.</p>
      )}

      <div className="practice-list">
        {items.map((baseItem) => {
          const isDone = done.has(baseItem.id)
          const kind = baseItem.id.split(':')[0]
          const rawShift = octaves[kind] ?? 0
          // a persisted shift may be out of range for this clef/tonic — clamp
          const shift = clampShift(baseItem, rawShift)
          const item = shiftOctaves(baseItem, shift)
          const canShiftDown = shift > -MAX_OCTAVE_SHIFT && item.midi[0] - 12 >= MIN_MIDI
          const canShiftUp = shift < MAX_OCTAVE_SHIFT && item.midi[7] + 12 <= MAX_MIDI
          return (
            <div key={item.id} className={`practice-item${isDone ? ' done' : ''}`}>
              <div className="practice-info">
                <h3>{item.title}</h3>
                {display.notation && (
                  <div className="staff-row">
                    <div className="octave-controls" role="group" aria-label="Octave shift">
                      <button
                        onClick={() => setShift(kind, shift + 1)}
                        disabled={!canShiftUp}
                        aria-label="Octave up"
                      >
                        +
                      </button>
                      <span aria-live="polite" title="Octave shift">
                        {`${shift > 0 ? '+' : ''}${shift}`}
                      </span>
                      <button
                        onClick={() => setShift(kind, shift - 1)}
                        disabled={!canShiftDown}
                        aria-label="Octave down"
                      >
                        −
                      </button>
                    </div>
                    <ScaleStaff spelled={item.spelled} clef={clef} label={item.title} />
                  </div>
                )}
                {display.noteNames && <p className="practice-notes">{item.notes.join(' ')}</p>}
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
        reference. Completing a scale counts toward your daily streak. Customize what these
        cards show in ⚙ Settings.
      </p>
    </section>
  )
}

/** Clamp a stored shift so the run stays within ±2 octaves and A0..C8. */
function clampShift(item: AssignmentItem, shift: number): number {
  let s = Math.max(-MAX_OCTAVE_SHIFT, Math.min(MAX_OCTAVE_SHIFT, shift))
  while (s < 0 && item.midi[0] + s * 12 < MIN_MIDI) s++
  while (s > 0 && item.midi[7] + s * 12 > MAX_MIDI) s--
  return s
}
