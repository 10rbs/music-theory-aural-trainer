// Generic drill loop: question → play → answer → feedback → next.
// Interaction-specific panels render by ExerciseDef.interaction; M1 ships
// multiple-choice only.

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ExerciseDef, GradeResult, MultipleChoicePrompt, Question } from '../../core/exercises/types'
import { seededRng, type Rng } from '../../core/exercises/random'
import { toLocalDateStr } from '../../core/streak'
import { playSpec } from '../../shell/audio/synth'
import { statsEvents, useStore } from '../stats/store-context'
import { MultipleChoicePanel } from './MultipleChoicePanel'

interface DrillState {
  question: Question
  result: GradeResult | null
  sessionCorrect: number
  sessionTotal: number
}

export function DrillRunner({ exercise }: { exercise: ExerciseDef }) {
  const store = useStore()
  // one RNG for the session, seeded from the clock at mount
  const rngRef = useRef<Rng>(null as unknown as Rng)
  rngRef.current ??= seededRng(Date.now() >>> 0)

  const [state, setState] = useState<DrillState>(() => ({
    question: exercise.next(rngRef.current),
    result: null,
    sessionCorrect: 0,
    sessionTotal: 0,
  }))

  const play = useCallback((q: Question) => {
    if (q.playback) playSpec(q.playback)
  }, [])

  // Auto-play each new question. StrictMode double-invokes effects in dev;
  // the tiny duplicate overlap is harmless and absent in production.
  useEffect(() => {
    play(state.question)
  }, [state.question, play])

  const answer = (response: string) => {
    if (state.result) return
    const result = exercise.grade(state.question, response)
    setState((s) => ({
      ...s,
      result,
      sessionCorrect: s.sessionCorrect + (result.correct ? 1 : 0),
      sessionTotal: s.sessionTotal + 1,
    }))
    const now = new Date()
    void store
      .recordAttempt({
        exerciseId: exercise.id,
        date: toLocalDateStr(now),
        ts: now.getTime(),
        correct: result.correct,
        score: result.score,
      })
      .then(() => statsEvents.dispatchEvent(new Event('attempt')))
  }

  const next = () => {
    setState((s) => ({
      ...s,
      question: exercise.next(rngRef.current),
      result: null,
    }))
  }

  return (
    <div>
      <div className="drill-header">
        <h2>{exercise.title}</h2>
        <span className="session-score">
          Session: {state.sessionCorrect}/{state.sessionTotal}
        </span>
      </div>

      <button className="play-btn" onClick={() => play(state.question)}>
        &#9654; Play again
      </button>

      {exercise.interaction === 'multiple-choice' && (
        <MultipleChoicePanel
          key={state.sessionTotal} /* remount per question to clear selection */
          prompt={state.question.prompt as MultipleChoicePrompt}
          answerKey={state.question.answerKey as string}
          result={state.result}
          onAnswer={answer}
        />
      )}

      <p className={`feedback ${state.result ? (state.result.correct ? 'correct' : 'incorrect') : ''}`}>
        {state.result?.explanation ?? ''}
      </p>

      {state.result && (
        <button className="next-btn" onClick={next}>
          Next &rarr;
        </button>
      )}
    </div>
  )
}
