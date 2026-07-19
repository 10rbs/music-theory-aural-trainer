import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/drill/$exerciseId')({
  component: DrillPage,
})

// Placeholder — M1 replaces this with the DrillRunner backed by the
// exercise registry (docs/ARCHITECTURE.md).
function DrillPage() {
  const { exerciseId } = Route.useParams()
  return (
    <section>
      <h2>Drill: {exerciseId}</h2>
      <p className="tagline">Coming in M1 — ported from the vanilla app (tag v0-vanilla).</p>
    </section>
  )
}
