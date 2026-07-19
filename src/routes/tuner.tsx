import { createFileRoute } from '@tanstack/react-router'
import { TunerView } from '../features/tuner/TunerView'

export const Route = createFileRoute('/tuner')({
  component: TunerView,
})
