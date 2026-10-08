import { createFileRoute } from '@tanstack/react-router'
import { SessionScreen } from '../features/session/SessionScreen'

export const Route = createFileRoute('/')({
  component: SessionScreen,
})
