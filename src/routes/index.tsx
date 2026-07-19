import { Link, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

// Drill list is hardcoded until the exercise registry lands in M1.
const DRILLS = [
  { id: 'interval-id', title: 'Intervals', blurb: 'Identify the distance between two notes.' },
  { id: 'chord-quality', title: 'Chords', blurb: 'Identify chord quality by ear.' },
  { id: 'scale-id', title: 'Scales', blurb: 'Identify the scale from an ascending run.' },
]

function Home() {
  return (
    <section>
      <p className="tagline">Train your ear. A few minutes a day.</p>
      <div className="mode-grid">
        {DRILLS.map((d) => (
          <Link key={d.id} to="/drill/$exerciseId" params={{ exerciseId: d.id }} className="mode-card">
            <h2>{d.title}</h2>
            <p>{d.blurb}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}
