import { createFileRoute } from '@tanstack/react-router'
import { StudiesView } from '../features/studies/StudiesView'

export const Route = createFileRoute('/studies')({
  component: StudiesView,
})
