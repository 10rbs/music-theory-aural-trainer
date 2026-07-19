// Shared helpers for multiple-choice exercises.

import type { GradeResult, MultipleChoicePrompt, Question } from './types'
import { shuffle, type Rng } from './random'

interface Item {
  id: string
  label: string
}

/** Correct item + (count-1) distractors, shuffled. */
export function choiceSet(rng: Rng, all: readonly Item[], correctId: string, count: number): Item[] {
  const correct = all.find((i) => i.id === correctId)
  if (!correct) throw new Error(`choiceSet: unknown correct id ${correctId}`)
  const others = all.filter((i) => i.id !== correctId)
  const distractors = shuffle(rng, others).slice(0, Math.min(count, all.length) - 1)
  return shuffle(rng, [correct, ...distractors])
}

export function gradeChoice(
  q: Question<MultipleChoicePrompt>,
  response: string,
  explainLabel: string,
): GradeResult {
  const correct = response === q.answerKey
  return {
    correct,
    score: correct ? 1 : 0,
    explanation: correct ? `Correct - ${explainLabel}` : `Not quite - that was ${explainLabel}`,
  }
}
