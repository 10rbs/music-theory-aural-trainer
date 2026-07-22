import { createFileRoute } from '@tanstack/react-router'
import { WorkoutsView } from '../features/studies/WorkoutsView'

export const Route = createFileRoute('/workouts')({
  component: WorkoutsView,
})
