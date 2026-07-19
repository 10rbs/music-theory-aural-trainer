import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/metronome')({
  component: MetronomePage,
})

// Placeholder — M2 adds the lookahead scheduler + click engine (docs/ROADMAP.md).
function MetronomePage() {
  return (
    <section>
      <h2>Metronome</h2>
      <p className="tagline">Metronome coming in M2.</p>
    </section>
  )
}
