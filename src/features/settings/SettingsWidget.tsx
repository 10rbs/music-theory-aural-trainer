// Header settings menu: global display preferences (clef, theme). Values are
// persisted in the kv store (so they ride along in backups); the theme is
// also mirrored to localStorage so main.tsx can apply it before first paint.

import { useEffect, useState } from 'react'
import { DropWidget } from '../../components/DropWidget'
import type { Clef } from '../../core/notation/staff'
import { settingsEvents, useStore } from '../stats/store-context'

export type Theme = 'dark' | 'light'

export const THEME_CACHE_KEY = 'aural-trainer:theme'

const CLEF_LABELS: Record<Clef, string> = {
  treble: 'Treble',
  alto: 'Alto',
  tenor: 'Tenor',
  bass: 'Bass',
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
}

export function SettingsWidget() {
  const store = useStore()
  const [expanded, setExpanded] = useState(false)
  const [clef, setClef] = useState<Clef>('treble')
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    void store.getSetting<Clef>('clef', 'treble').then(setClef)
    void store.getSetting<Theme>('theme', 'dark').then((t) => {
      setTheme(t)
      applyTheme(t)
    })
  }, [store])

  const changeClef = (value: Clef) => {
    setClef(value)
    void store.setSetting('clef', value)
    settingsEvents.dispatchEvent(new Event('settings'))
  }

  const changeTheme = (value: Theme) => {
    setTheme(value)
    applyTheme(value)
    localStorage.setItem(THEME_CACHE_KEY, value)
    void store.setSetting('theme', value)
    settingsEvents.dispatchEvent(new Event('settings'))
  }

  return (
    <DropWidget
      pill={<span aria-hidden>⚙</span>}
      active={false}
      onToggle={() => setExpanded(!expanded)}
      expanded={expanded}
      setExpanded={setExpanded}
      toggleLabel="Settings"
      panelLabel="Settings panel"
      panelClassName="settings-panel"
    >
      <label className="settings-row">
        Clef
        <select value={clef} onChange={(e) => changeClef(e.target.value as Clef)}>
          {(Object.keys(CLEF_LABELS) as Clef[]).map((c) => (
            <option key={c} value={c}>
              {CLEF_LABELS[c]}
            </option>
          ))}
        </select>
      </label>
      <div className="settings-row" role="group" aria-label="Theme">
        Theme
        <div className="theme-toggle">
          {(['dark', 'light'] as const).map((t) => (
            <button
              key={t}
              className={theme === t ? 'selected' : ''}
              onClick={() => changeTheme(t)}
            >
              {t === 'dark' ? 'Dark' : 'Light'}
            </button>
          ))}
        </div>
      </div>
    </DropWidget>
  )
}
