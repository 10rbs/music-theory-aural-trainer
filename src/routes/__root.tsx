import { Link, Outlet, createRootRoute } from '@tanstack/react-router'
import { SettingsWidget } from '../features/settings/SettingsWidget'
import { StreakBadge } from '../features/stats/StreakBadge'
import { TunerWidget } from '../features/tuner/TunerWidget'
import { MetronomeWidget } from '../features/metronome/MetronomeWidget'

export const Route = createRootRoute({
  component: RootLayout,
})

// Tuner and metronome live in the header on every page so they keep running
// (and sounding) across navigation.
function RootLayout() {
  return (
    <div className="app">
      <header>
        <Link to="/" className="brand">
          <h1>Aural Trainer</h1>
        </Link>
        <nav>
          <Link to="/practice">Practice</Link>
        </nav>
        <div className="header-widgets">
          <TunerWidget />
          <MetronomeWidget />
          <SettingsWidget />
          <StreakBadge />
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
