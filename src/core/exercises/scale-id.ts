import { SCALES } from '../theory/scales'
import { melodic } from '../playback/spec'
import type { ExerciseDef, MultipleChoicePrompt } from './types'
import { choiceSet, gradeChoice } from './multiple-choice'
import { randomInt, ROOT_MIN } from './random'

const NUM_CHOICES = 4
const SCALE_BPM = 180 // ascending run, quicker than interval playback

const items = SCALES.map((s) => ({ id: s.name, label: s.name }))

export const scaleId: ExerciseDef<MultipleChoicePrompt, string> = {
  id: 'scale-id',
  title: 'Scales',
  blurb: 'Identify the scale from an ascending run.',
  interaction: 'multiple-choice',
  next(rng) {
    const scale = SCALES[randomInt(rng, 0, SCALES.length - 1)]
    return {
      exerciseId: 'scale-id',
      playback: melodic(scale.intervals.map((st) => ROOT_MIN + st), SCALE_BPM),
      prompt: { choices: choiceSet(rng, items, scale.name, NUM_CHOICES) },
      answerKey: scale.name,
    }
  },
  grade(q, response) {
    return gradeChoice(q, response, String(q.answerKey))
  },
}
