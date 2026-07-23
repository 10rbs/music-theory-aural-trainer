// The deep-dive Studies page: browse Arban's technique studies by category,
// pick one, and focus on it. Reuses the warm-up exercise model, the shared
// StaffWithControls (octave/key transpose), playback, and streak plumbing — but
// with a category → exercise selector instead of the daily routine's flat list,
// and its own persistence namespaces (studyOctaves/studyKeys, study:<date>) so
// it never clobbers the daily warm-up's state.

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  STUDY_CATEGORIES,
  arbanStudyLibrary,
  rekeyWarmup,
  shiftWarmup,
  type WarmupCategory,
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

export function StudiesView() {
  const store = useStore()
  const today = toLocalDateStr(new Date())
  const [clef, setClef] = useState<Clef>('treble')
  const [octaves, setOctaves] = useState<Shifts>({})
  const [keys, setKeys] = useState<Shifts>({})
  const [done, setDone] = useState<Set<string>>(new Set())
  const [cat, setCat] = useState<WarmupCategory>(STUDY_CATEGORIES[0].id)

  const library = useMemo(() => arbanStudyLibrary(clef), [clef])
  const [exerciseId, setExerciseId] = useState<string>(() => library[STUDY_CATEGORIES[0].id][0].id)

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

  const selectCategory = (id: WarmupCategory) => {
    setCat(id)
    setExerciseId(library[id][0].id) // focus the first study in the new category
  }

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
      const next = { ...keys, [id]: wrap12(n) }
      setKeys(next)
      void store.setSetting('studyKeys', next)
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
        exerciseId: 'warmup', // studies count toward the streak like warm-ups
        date: today,
        ts: Date.now(),
        correct: true,
        score: 1,
        detail: { item: ex.id, mode: 'study' },
      })
      .then(() => statsEvents.dispatchEvent(new Event('attempt')))
  }

  const catMeta = STUDY_CATEGORIES.find((c) => c.id === cat)!
  const exercises = library[cat]
  const baseEx = exercises.find((e) => e.id === exerciseId) ?? exercises[0]

  const keyOffset = keys[baseEx.id] ?? 0
  const keyed = rekeyWarmup(baseEx, keyOffset, clef)
  const shift = clampShift(keyed, octaves[baseEx.id] ?? 0)
  const ex = shiftWarmup(keyed, shift)
  const lo = Math.min(...ex.midi)
  const hi = Math.max(...ex.midi)
  const canUp = shift < MAX_OCTAVE_SHIFT && hi + 12 <= MAX_MIDI
  const canDown = shift > -MAX_OCTAVE_SHIFT && lo - 12 >= MIN_MIDI
  const isDone = done.has(baseEx.id)

  return (
    <section>
      <div className="drill-header">
        <h2>Arban studies</h2>
      </div>
      <p className="tagline warmup-intro">
        A deeper technique library, from the public-domain 1864 Arban method — long tones,
        flexibility, scales, thirds, arpeggios, and articulation. Pick a category, choose a study,
        and each one you complete counts toward your streak.
      </p>

      <div className="studies-cats" role="tablist" aria-label="Study category">
        {STUDY_CATEGORIES.map((c) => (
          <button
            key={c.id}
            role="tab"
            aria-selected={c.id === cat}
            className={`studies-cat-btn${c.id === cat ? ' is-active' : ''}`}
            onClick={() => selectCategory(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>
      <p className="tagline warmup-blurb">{catMeta.blurb}</p>

      <div className="studies-exercises" role="tablist" aria-label={`${catMeta.label} studies`}>
        {exercises.map((e) => (
          <button
            key={e.id}
            role="tab"
            aria-selected={e.id === baseEx.id}
            className={`studies-ex-btn${e.id === baseEx.id ? ' is-active' : ''}${
              done.has(e.id) ? ' done' : ''
            }`}
            onClick={() => setExerciseId(e.id)}
          >
            {e.title}
            {done.has(e.id) && <span aria-hidden> ✓</span>}
          </button>
        ))}
      </div>

      <div className={`practice-item studies-detail${isDone ? ' done' : ''}`}>
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
            rhythm={ex.rhythm}
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
