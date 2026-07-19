import { Link, Outlet, createRootRoute } from '@tanstack/react-router'
import { StreakBadge } from '../features/stats/StreakBadge'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <div className="app">
      <header>
        <Link to="/" className="brand">
          <h1>Aural Trainer</h1>
        </Link>
        <nav>
          <Link to="/tuner">Tuner</Link>
          <Link to="/metronome">Metronome</Link>
          <Link to="/practice">Practice</Link>
        </nav>
        <StreakBadge />
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
