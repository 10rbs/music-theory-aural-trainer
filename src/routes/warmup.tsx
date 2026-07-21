import { createFileRoute } from '@tanstack/react-router'
import { WarmupView } from '../features/warmup/WarmupView'

export const Route = createFileRoute('/warmup')({
  component: WarmupView,
})
