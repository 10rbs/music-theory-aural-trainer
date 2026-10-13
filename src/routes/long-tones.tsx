import { createFileRoute } from '@tanstack/react-router'
import { LongTonesView } from '../features/session/LongTonesView'

export const Route = createFileRoute('/long-tones')({
  component: LongTonesView,
})
