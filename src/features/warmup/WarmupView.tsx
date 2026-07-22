import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  WARMUP_CATEGORIES,
  rekeyWarmup,
  shiftWarmup,
  warmupLibrary,
  type WarmupExercise,
} from '../../core/warmups'
import { type Clef } from '../../core/notation/staff'
import { tonicName } from '../../core/theory/keys'
import { toLocalDateStr } from '../../core/streak'
import { playSpec } from '../../shell/audio/synth'
import { settingsEvents, statsEvents, useStore } from '../stats/store-context'
import { StaffWithControls } from '../practice/StaffWithControls'

const MAX_OCTAVE_SHIFT = 2
const MIN_MIDI = 21
const MAX_MIDI = 108

const wrap12 = (n: number) => ((n % 12) + 12) % 12

/** Persisted per-exercise shifts, keyed by exercise id. */
type Shifts = Record<string, number>

export function WarmupView() {
  const store = useStore()
  const today = toLocalDateStr(new Date())
  const [clef, setClef] = useState<Clef>('treble')
  const [octaves, setOctaves] = useState<Shifts>({})
  const [keys, setKeys] = useState<Shifts>({})
  const [done, setDone] = useState<Set<string>>(new Set())

  const completionKey = `warmup:${today}`

  useEffect(() => {
    void store.getSetting<string[]>(completionKey, []).then((ids) => setDone(new Set(ids)))
  }, [store, completionKey])

  useEffect(() => {
    const load = () => {
      void store.getSetting<Clef>('clef', 'treble').then(setClef)
      void store.getSetting<Shifts>('warmupOctaves', {}).then(setOctaves)
      void store.getSetting<Shifts>('warmupKeys', {}).then(setKeys)
    }
    load()
    settingsEvents.addEventListener('settings', load)
    return () => settingsEvents.removeEventListener('settings', load)
  }, [store])

  const library = useMemo(() => warmupLibrary(clef), [clef])

  const setShift = useCallback(
    (id: string, n: number) => {
      const next = { ...octaves, [id]: n }
      setOctaves(next)
      void store.setSetting('warmupOctaves', next)
    },
    [octaves, store],
  )

  const setKey = useCallback(
    (id: string, n: number) => {
      const next = { ...keys, [id]: wrap12(n) }
      setKeys(next)
      void store.setSetting('warmupKeys', next)
    },
    [keys, store],
  )

  const markDone = (ex: WarmupExercise) => {
    if (done.has(ex.id)) return
    const next = new Set(done).add(ex.id)
    setDone(next)
    void store.setSetting(completionKey, [...next])
    void store
      .recordAttempt({
        exerciseId: 'warmup',
        date: today,
        ts: Date.now(),
        correct: true,
        score: 1,
        detail: { item: ex.id },
      })
      .then(() => statsEvents.dispatchEvent(new Event('attempt')))
  }

  return (
    <section>
      <div className="drill-header">
        <h2>Warm-up</h2>
      </div>
      <p className="tagline warmup-intro">
        A daily brass routine — long tones, flexibility, arpeggios. Listen for a reference, play
        along, and each one you complete counts toward your streak.
      </p>

      {WARMUP_CATEGORIES.map((cat) => (
        <div key={cat.id} className="warmup-category">
          <h3 className="warmup-category-title">{cat.label}</h3>
          <p className="tagline warmup-blurb">{cat.blurb}</p>
          <div className="practice-list">
            {library[cat.id].map((baseEx) => {
              const isDone = done.has(baseEx.id)
              const keyOffset = keys[baseEx.id] ?? 0
              const keyed = rekeyWarmup(baseEx, keyOffset, clef)
              const rawShift = octaves[baseEx.id] ?? 0
              const shift = clampShift(keyed, rawShift)
              const ex = shiftWarmup(keyed, shift)
              const lo = Math.min(...ex.midi)
              const hi = Math.max(...ex.midi)
              const canUp = shift < MAX_OCTAVE_SHIFT && hi + 12 <= MAX_MIDI
              const canDown = shift > -MAX_OCTAVE_SHIFT && lo - 12 >= MIN_MIDI
              return (
                <div key={ex.id} className={`practice-item${isDone ? ' done' : ''}`}>
                  <div className="practice-info">
                    <h4 className="warmup-title">{ex.title}</h4>
                    {ex.source && (
                      <p className="warmup-source">
                        {ex.source.composer} · {ex.source.year} · public domain
                      </p>
                    )}
                    <StaffWithControls
                      spelled={ex.spelled}
                      clef={clef}
                      label={ex.title}
                      octave={{
                        value: shift,
                        canUp,
                        canDown,
                        onUp: () => setShift(baseEx.id, shift + 1),
                        onDown: () => setShift(baseEx.id, shift - 1),
                      }}
                      keyControl={
                        ex.transposable === 'key' && ex.tonic
                          ? {
                              name: tonicName(ex.tonic),
                              onSharper: () => setKey(baseEx.id, keyOffset + 1),
                              onFlatter: () => setKey(baseEx.id, keyOffset - 1),
                            }
                          : undefined
                      }
                    />
                    {ex.instruction && <p className="warmup-instruction">{ex.instruction}</p>}
                  </div>
                  <div className="practice-actions">
                    <button className="tap-btn" onClick={() => playSpec(ex.playback)}>
                      ▶ Listen
                    </button>
                    <button
                      className={`done-btn${isDone ? ' is-done' : ''}`}
                      onClick={() => markDone(ex)}
                      disabled={isDone}
                    >
                      {isDone ? '✓ Done' : 'Mark done'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </section>
  )
}

/** Clamp a stored octave shift to ±2 and the piano range (A0..C8). */
function clampShift(ex: WarmupExercise, shift: number): number {
  let s = Math.max(-MAX_OCTAVE_SHIFT, Math.min(MAX_OCTAVE_SHIFT, shift))
  const lo = Math.min(...ex.midi)
  const hi = Math.max(...ex.midi)
  while (s < 0 && lo + s * 12 < MIN_MIDI) s++
  while (s > 0 && hi + s * 12 > MAX_MIDI) s--
  return s
}
