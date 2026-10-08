import { Link, Outlet, createRootRoute } from '@tanstack/react-router'
import { SettingsWidget } from '../features/settings/SettingsWidget'
import { StreakBadge } from '../features/stats/StreakBadge'
import { TunerWidget } from '../features/tuner/TunerWidget'
import { MetronomeWidget } from '../features/metronome/MetronomeWidget'
import { TunerEngineProvider } from '../features/tuner/tuner-engine'

export const Route = createRootRoute({
  component: RootLayout,
})

// Tuner and metronome live in the header on every page so they keep running
// (and sounding) across navigation. The tuner engine (mic + analysis) is
// shared by the header widget and the home practice screen.
function RootLayout() {
  return (
    <TunerEngineProvider>
      <div className="app">
        <header>
          <Link to="/" className="brand">
            <h1>Aural Trainer</h1>
          </Link>
          <nav>
            <Link to="/" activeOptions={{ exact: true }}>
              Tuner
            </Link>
            <Link to="/exercises">Exercises</Link>
            <Link to="/practice">Scales</Link>
            <Link to="/warmup">Warm-up</Link>
            <Link to="/studies">Studies</Link>
            <Link to="/workouts">Workouts</Link>
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
    </TunerEngineProvider>
  )
}
