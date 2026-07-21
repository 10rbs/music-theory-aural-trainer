// Header settings menu: global display preferences (clef, theme) and daily
// practice customization (eligible scale types, notation/note-name
// visibility). Values are persisted in the kv store (so they ride along in
// backups); the theme is also mirrored to localStorage so main.tsx can apply
// it before first paint.

import { useEffect, useState } from 'react'
import { DropWidget } from '../../components/DropWidget'
import { ALL_SCALE_TYPES } from '../../core/assignments'
import type { Clef } from '../../core/notation/staff'
import { settingsEvents, useStore } from '../stats/store-context'

export type Theme = 'dark' | 'light'

export const THEME_CACHE_KEY = 'aural-trainer:theme'

/** What the daily-practice cards show. Stored under the `practiceDisplay` setting. */
export interface PracticeDisplay {
  notation: boolean
  keySignature: boolean
  noteNames: boolean
}

export const DEFAULT_PRACTICE_DISPLAY: PracticeDisplay = {
  notation: true,
  keySignature: true,
  noteNames: true,
}

const CLEF_LABELS: Record<Clef, string> = {
  treble: 'Treble',
  alto: 'Alto',
  tenor: 'Tenor',
  bass: 'Bass',
}

const TYPE_LABELS: Record<string, string> = {
  'Major (Ionian)': 'Major',
  'Natural Minor (Aeolian)': 'Natural minor',
  'Harmonic Minor': 'Harmonic minor',
  'Melodic Minor': 'Melodic minor',
  Dorian: 'Dorian',
  Mixolydian: 'Mixolydian',
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
}

export function SettingsWidget() {
  const store = useStore()
  const [expanded, setExpanded] = useState(false)
  const [clef, setClef] = useState<Clef>('treble')
  const [theme, setTheme] = useState<Theme>('light')
  const [scaleTypes, setScaleTypes] = useState<string[]>([...ALL_SCALE_TYPES])
  const [display, setDisplay] = useState<PracticeDisplay>(DEFAULT_PRACTICE_DISPLAY)

  useEffect(() => {
    void store.getSetting<Clef>('clef', 'treble').then(setClef)
    void store.getSetting<Theme>('theme', 'light').then((t) => {
      setTheme(t)
      applyTheme(t)
    })
    void store.getSetting<string[]>('practiceScales', [...ALL_SCALE_TYPES]).then(setScaleTypes)
    void store
      .getSetting<PracticeDisplay>('practiceDisplay', DEFAULT_PRACTICE_DISPLAY)
      .then((d) => setDisplay({ ...DEFAULT_PRACTICE_DISPLAY, ...d }))
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

  const toggleScaleType = (name: string) => {
    const next = scaleTypes.includes(name)
      ? scaleTypes.filter((n) => n !== name)
      : ALL_SCALE_TYPES.filter((n) => n === name || scaleTypes.includes(n)) // keep canonical order
    setScaleTypes(next)
    void store.setSetting('practiceScales', next)
    settingsEvents.dispatchEvent(new Event('settings'))
  }

  const toggleDisplay = (key: keyof PracticeDisplay) => {
    const next = { ...display, [key]: !display[key] }
    setDisplay(next)
    void store.setSetting('practiceDisplay', next)
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
          {(['light', 'dark'] as const).map((t) => (
            <button
              key={t}
              className={theme === t ? 'selected' : ''}
              onClick={() => changeTheme(t)}
            >
              {t === 'light' ? 'Light' : 'Dark'}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-section" role="group" aria-label="Daily practice">
        <h4>Daily practice</h4>
        <div className="settings-checks">
          <label>
            <input
              type="checkbox"
              checked={display.notation}
              onChange={() => toggleDisplay('notation')}
            />
            Notation
          </label>
          <label>
            <input
              type="checkbox"
              checked={display.keySignature}
              onChange={() => toggleDisplay('keySignature')}
              disabled={!display.notation}
            />
            Key signature
          </label>
          <label>
            <input
              type="checkbox"
              checked={display.noteNames}
              onChange={() => toggleDisplay('noteNames')}
            />
            Note names
          </label>
        </div>
        <h4>Scale types</h4>
        <div className="settings-checks">
          {ALL_SCALE_TYPES.map((name) => (
            <label key={name}>
              <input
                type="checkbox"
                checked={scaleTypes.includes(name)}
                onChange={() => toggleScaleType(name)}
              />
              {TYPE_LABELS[name] ?? name}
            </label>
          ))}
        </div>
      </div>
    </DropWidget>
  )
}
