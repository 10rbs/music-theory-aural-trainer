import { describe, expect, test } from 'vitest'
import { EXERCISES, getExercise } from './registry'
import { seededRng } from './random'
import type { MultipleChoicePrompt } from './types'

describe('registry', () => {
  test('exposes the three M1 drills', () => {
    expect(EXERCISES.map((e) => e.id)).toEqual(['interval-id', 'chord-quality', 'scale-id'])
  })

  test('getExercise returns undefined for unknown ids', () => {
    expect(getExercise('nope')).toBeUndefined()
  })
})

describe.each(EXERCISES.map((e) => [e.id] as const))('%s', (id) => {
  const def = getExercise(id)!

  test('generates deterministic questions from a seed', () => {
    const a = def.next(seededRng(42))
    const b = def.next(seededRng(42))
    expect(a).toEqual(b)
  })

  test('question shape: playback events, 4 unique choices, answer among them', () => {
    for (let seed = 0; seed < 50; seed++) {
      const q = def.next(seededRng(seed))
      expect(q.exerciseId).toBe(id)
      expect(q.playback!.events.length).toBeGreaterThan(0)
      const prompt = q.prompt as MultipleChoicePrompt
      expect(prompt.choices).toHaveLength(4)
      const ids = prompt.choices.map((c) => c.id)
      expect(new Set(ids).size).toBe(4)
      expect(ids).toContain(q.answerKey)
    }
  })

  test('grades the right answer as correct with score 1', () => {
    const q = def.next(seededRng(7))
    const result = def.grade(q, q.answerKey)
    expect(result.correct).toBe(true)
    expect(result.score).toBe(1)
    expect(result.explanation).toMatch(/^Correct/)
  })

  test('grades a wrong answer as incorrect with the answer in the explanation', () => {
    const q = def.next(seededRng(7))
    const prompt = q.prompt as MultipleChoicePrompt
    const wrong = prompt.choices.find((c) => c.id !== q.answerKey)!
    const result = def.grade(q, wrong.id)
    expect(result.correct).toBe(false)
    expect(result.score).toBe(0)
    expect(result.explanation).toMatch(/^Not quite/)
  })

  test('all playback midi values are within a sane range', () => {
    for (let seed = 0; seed < 50; seed++) {
      const q = def.next(seededRng(seed))
      for (const ev of q.playback!.events) {
        for (const m of ev.midi) {
          expect(m).toBeGreaterThanOrEqual(36) // C2
          expect(m).toBeLessThanOrEqual(96) // C7
        }
      }
    }
  })
})
