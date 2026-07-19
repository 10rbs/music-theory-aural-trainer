import { INTERVALS } from '../theory/intervals'
import { melodic } from '../playback/spec'
import type { ExerciseDef, MultipleChoicePrompt } from './types'
import { choiceSet, gradeChoice } from './multiple-choice'
import { randomInt, randomRoot } from './random'

const NUM_CHOICES = 4

const items = INTERVALS.map((iv) => ({ id: iv.short, label: `${iv.name} (${iv.short})` }))

export const intervalId: ExerciseDef<MultipleChoicePrompt, string> = {
  id: 'interval-id',
  title: 'Intervals',
  blurb: 'Identify the distance between two notes.',
  interaction: 'multiple-choice',
  next(rng) {
    const root = randomRoot(rng)
    const interval = INTERVALS[randomInt(rng, 0, INTERVALS.length - 1)]
    return {
      exerciseId: 'interval-id',
      playback: melodic([root, root + interval.semitones]),
      prompt: { choices: choiceSet(rng, items, interval.short, NUM_CHOICES) },
      answerKey: interval.short,
    }
  },
  grade(q, response) {
    const label = items.find((i) => i.id === q.answerKey)!.label
    return gradeChoice(q, response, label)
  },
}
