import { CHORDS } from '../theory/chords'
import { harmonic } from '../playback/spec'
import type { ExerciseDef, MultipleChoicePrompt } from './types'
import { choiceSet, gradeChoice } from './multiple-choice'
import { randomInt, randomRoot } from './random'

const NUM_CHOICES = 4

const items = CHORDS.map((c) => ({ id: c.short, label: c.name }))

export const chordQuality: ExerciseDef<MultipleChoicePrompt, string> = {
  id: 'chord-quality',
  title: 'Chords',
  blurb: 'Identify chord quality by ear.',
  interaction: 'multiple-choice',
  next(rng) {
    // sit a bit lower so extended chords stay in range
    const root = randomRoot(rng) - 5
    const chord = CHORDS[randomInt(rng, 0, CHORDS.length - 1)]
    return {
      exerciseId: 'chord-quality',
      playback: harmonic(chord.intervals.map((st) => root + st)),
      prompt: { choices: choiceSet(rng, items, chord.short, NUM_CHOICES) },
      answerKey: chord.short,
    }
  },
  grade(q, response) {
    const label = items.find((i) => i.id === q.answerKey)!.label
    return gradeChoice(q, response, label)
  },
}
