import type { ExerciseDef } from './types'
import { intervalId } from './interval-id'
import { chordQuality } from './chord-quality'
import { scaleId } from './scale-id'

export const EXERCISES: readonly ExerciseDef[] = [intervalId, chordQuality, scaleId]

export function getExercise(id: string): ExerciseDef | undefined {
  return EXERCISES.find((e) => e.id === id)
}
