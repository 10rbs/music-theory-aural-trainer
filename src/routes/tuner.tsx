import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/tuner')({
  component: TunerPage,
})

// Placeholder — M3 adds mic capture + pitch detection (docs/ROADMAP.md).
function TunerPage() {
  return (
    <section>
      <h2>Tuner</h2>
      <p className="tagline">Chromatic tuner coming in M3.</p>
    </section>
  )
}
