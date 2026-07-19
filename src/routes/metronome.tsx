import { createFileRoute } from '@tanstack/react-router'
import { MetronomeView } from '../features/metronome/MetronomeView'

export const Route = createFileRoute('/metronome')({
  component: MetronomeView,
})
