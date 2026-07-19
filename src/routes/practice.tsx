import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/practice')({
  component: PracticePage,
})

// Placeholder — M4 adds date-seeded daily scale assignments (docs/ROADMAP.md).
function PracticePage() {
  return (
    <section>
      <h2>Daily Practice</h2>
      <p className="tagline">Scale practice routines coming in M4.</p>
    </section>
  )
}
