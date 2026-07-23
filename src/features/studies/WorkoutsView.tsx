// The Workouts page: guided full-page routines. Pick a workout, then work down
// the stacked list of studies; a progress bar tracks how many are done. Shares
// state + persistence with the Studies browser (useStudyState), so completing a
// study here also marks it done there and counts toward the streak.

import { useMemo, useState } from 'react'
import { WORKOUTS, buildWorkout } from '../../core/warmups'
import { ExerciseCard } from './ExerciseCard'
import { useStudyState } from './use-study-state'

export function WorkoutsView() {
  const { clef, octaves, keys, done, setShift, setKey, markDone } = useStudyState()
  const [workoutId, setWorkoutId] = useState<string>(WORKOUTS[0].id)

  const built = useMemo(() => buildWorkout(workoutId, clef), [workoutId, clef])
  if (!built) return null

  const { workout, exercises } = built
  const doneCount = exercises.filter((e) => done.has(e.id)).length
  const total = exercises.length
  const allDone = total > 0 && doneCount === total

  return (
    <section>
      <div className="drill-header">
        <h2>Workouts</h2>
      </div>
      <p className="tagline warmup-intro">
        Guided full-page routines — work through each one top to bottom. Every study you complete
        counts toward your streak, and shows done in the Studies browser too.
      </p>

      <div className="studies-cats" role="tablist" aria-label="Workout">
        {WORKOUTS.map((w) => (
          <button
            key={w.id}
            role="tab"
            aria-selected={w.id === workoutId}
            className={`studies-cat-btn${w.id === workoutId ? ' is-active' : ''}`}
            onClick={() => setWorkoutId(w.id)}
          >
            {w.title}
          </button>
        ))}
      </div>

      <div className="workout-head">
        <p className="tagline warmup-blurb">{workout.description}</p>
        <div className="workout-progress" aria-label={`${doneCount} of ${total} done`}>
          <div className="workout-bar">
            <span style={{ width: `${(doneCount / total) * 100}%` }} />
          </div>
          <span className={`workout-count${allDone ? ' is-complete' : ''}`}>
            {allDone ? 'Workout complete ✓' : `${doneCount}/${total} done`}
          </span>
        </div>
      </div>

      <div className="practice-list">
        {exercises.map((ex, i) => (
          <ExerciseCard
            key={ex.id}
            base={ex}
            clef={clef}
            index={i + 1}
            octave={octaves[ex.id] ?? 0}
            keyOffset={keys[ex.id] ?? 0}
            done={done.has(ex.id)}
            onOctave={setShift}
            onKey={setKey}
            onMarkDone={markDone}
          />
        ))}
      </div>
    </section>
  )
}
