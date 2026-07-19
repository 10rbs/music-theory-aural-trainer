import { createFileRoute } from '@tanstack/react-router'
import { PracticeView } from '../features/practice/PracticeView'

export const Route = createFileRoute('/practice')({
  component: PracticeView,
})
