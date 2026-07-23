// The deep-dive Studies page: browse Arban's technique studies by category, pick
// one, and focus on it. Category → exercise selector; the chosen study renders
// as a single ExerciseCard. State + persistence come from useStudyState (shared
// with the Workouts page); transpose resolution lives in core (resolveWarmup).

import { useMemo, useState } from 'react'
import { STUDY_CATEGORIES, arbanStudyLibrary, type WarmupCategory } from '../../core/warmups'
import { ExerciseCard } from './ExerciseCard'
import { useStudyState } from './use-study-state'

export function StudiesView() {
  const { clef, octaves, keys, done, showKeySig, setShift, setKey, markDone } = useStudyState()
  const [cat, setCat] = useState<WarmupCategory>(STUDY_CATEGORIES[0].id)

  const library = useMemo(() => arbanStudyLibrary(clef), [clef])
  const [exerciseId, setExerciseId] = useState<string>(() => library[STUDY_CATEGORIES[0].id][0].id)

  const selectCategory = (id: WarmupCategory) => {
    setCat(id)
    setExerciseId(library[id][0].id) // focus the first study in the new category
  }

  const catMeta = STUDY_CATEGORIES.find((c) => c.id === cat)!
  const exercises = library[cat]
  const baseEx = exercises.find((e) => e.id === exerciseId) ?? exercises[0]

  return (
    <section>
      <div className="drill-header">
        <h2>Arban studies</h2>
      </div>
      <p className="tagline warmup-intro">
        A deeper technique library, from the public-domain 1864 Arban method — long tones,
        flexibility, scales, thirds, arpeggios, articulation, and full-page etudes. Pick a category,
        choose a study, and each one you complete counts toward your streak.
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

      <ExerciseCard
        base={baseEx}
        clef={clef}
        octave={octaves[baseEx.id] ?? 0}
        keyOffset={keys[baseEx.id] ?? 0}
        done={done.has(baseEx.id)}
        showKeySig={showKeySig}
        onOctave={setShift}
        onKey={setKey}
        onMarkDone={markDone}
      />
    </section>
  )
}
