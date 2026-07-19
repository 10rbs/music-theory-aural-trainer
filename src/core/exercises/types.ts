// The exercise contract. Splits what-to-play / what-to-ask / how-to-grade so
// future drill types (dictation, rhythm, written theory) plug in without
// touching existing code. See docs/ARCHITECTURE.md.

import type { PlaybackSpec } from '../playback/spec'
import type { Rng } from './random'

export type Interaction =
  | 'multiple-choice'
  | 'pitch-match'
  | 'note-entry'
  | 'rhythm-tap'
  | 'written'

export interface Question<P = unknown> {
  exerciseId: string
  /** Absent for written-theory questions. */
  playback?: PlaybackSpec
  prompt: P
  /** Opaque to the UI; consumed by grade(). */
  answerKey: unknown
}

export interface GradeResult {
  correct: boolean
  /** 0..1 — allows partial credit for dictation/rubric scoring later. */
  score: number
  explanation?: string
}

export interface MultipleChoicePrompt {
  choices: readonly { id: string; label: string }[]
}

export interface ExerciseDef<P = unknown, R = unknown> {
  id: string
  title: string
  blurb: string
  interaction: Interaction
  next(rng: Rng): Question<P>
  grade(question: Question<P>, response: R): GradeResult
}
