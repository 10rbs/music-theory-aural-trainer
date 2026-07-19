import { useEffect, useRef, useState } from 'react'
import {
  clampBpm,
  tapTempo,
  MAX_BPM,
  MIN_BPM,
  SUBDIVISIONS,
  TIME_SIGNATURES,
} from '../../core/rhythm/click-track'
import { startClickTrack, type RunningClickTrack } from '../../shell/audio/scheduler'
import { DropWidget } from '../../components/DropWidget'
import { useStore } from '../stats/store-context'

interface MetronomeSettings {
  bpm: number
  sigIndex: number
  subIndex: number
}

const DEFAULTS: MetronomeSettings = { bpm: 100, sigIndex: 2 /* 4/4 */, subIndex: 0 }

export function MetronomeWidget() {
  const store = useStore()
  const [bpm, setBpm] = useState(DEFAULTS.bpm)
  const [sigIndex, setSigIndex] = useState(DEFAULTS.sigIndex)
  const [subIndex, setSubIndex] = useState(DEFAULTS.subIndex)
  const [loaded, setLoaded] = useState(false)
  const [running, setRunning] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [activeBeat, setActiveBeat] = useState(-1)

  const trackRef = useRef<RunningClickTrack | null>(null)
  const tapsRef = useRef<number[]>([])

  const signature = TIME_SIGNATURES[sigIndex]
  const subdivision = SUBDIVISIONS[subIndex]

  useEffect(() => {
    void store.getSetting<MetronomeSettings>('metronome', DEFAULTS).then((s) => {
      setBpm(clampBpm(s.bpm))
      setSigIndex(s.sigIndex < TIME_SIGNATURES.length ? s.sigIndex : DEFAULTS.sigIndex)
      setSubIndex(s.subIndex < SUBDIVISIONS.length ? s.subIndex : DEFAULTS.subIndex)
      setLoaded(true)
    })
    return () => trackRef.current?.stop()
  }, [store])

  useEffect(() => {
    if (loaded) void store.setSetting('metronome', { bpm, sigIndex, subIndex })
  }, [store, loaded, bpm, sigIndex, subIndex])

  const stop = () => {
    trackRef.current?.stop()
    trackRef.current = null
    setRunning(false)
    setActiveBeat(-1)
  }

  const start = () => {
    trackRef.current?.stop()
    trackRef.current = startClickTrack({ bpm, signature, subdivision }, (tick) => {
      if (tick.accent !== 'sub') setActiveBeat(tick.beatInBar)
    })
    setRunning(true)
  }

  // Restart with new settings while running.
  useEffect(() => {
    if (running) start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bpm, sigIndex, subIndex])

  const tap = () => {
    const now = performance.now()
    // reset the window after a long pause
    if (tapsRef.current.length && now - tapsRef.current[tapsRef.current.length - 1] > 3000) {
      tapsRef.current = []
    }
    tapsRef.current.push(now)
    const t = tapTempo(tapsRef.current)
    if (t) setBpm(t)
  }

  return (
    <DropWidget
      pill={
        <>
          <span className={`widget-dot${running ? ' running' : ''}${activeBeat === 0 ? ' downbeat' : ''}`} />
          ♩ {bpm}
        </>
      }
      active={running}
      onToggle={running ? stop : start}
      expanded={expanded}
      setExpanded={setExpanded}
      toggleLabel={running ? 'Stop metronome' : 'Start metronome'}
      panelLabel="Metronome settings"
    >
      <div className="metro-bpm">
        <button className="bpm-nudge" onClick={() => setBpm((b) => clampBpm(b - 5))} aria-label="Slower">
          −5
        </button>
        <div className="bpm-value">
          <span className="bpm-number">{bpm}</span>
          <span className="bpm-label">BPM</span>
        </div>
        <button className="bpm-nudge" onClick={() => setBpm((b) => clampBpm(b + 5))} aria-label="Faster">
          +5
        </button>
      </div>

      <input
        type="range"
        min={MIN_BPM}
        max={MAX_BPM}
        value={bpm}
        onChange={(e) => setBpm(clampBpm(Number(e.target.value)))}
        aria-label="Tempo"
      />

      <div className="metro-row">
        <label>
          Time
          <select value={sigIndex} onChange={(e) => setSigIndex(Number(e.target.value))}>
            {TIME_SIGNATURES.map((s, i) => (
              <option key={s.label} value={i}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Subdivide
          <select value={subIndex} onChange={(e) => setSubIndex(Number(e.target.value))}>
            {SUBDIVISIONS.map((s, i) => (
              <option key={s.label} value={i}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <button className="tap-btn" onClick={tap}>
          Tap
        </button>
      </div>

      <div className="beat-dots" aria-hidden>
        {Array.from({ length: signature.beats }, (_, i) => (
          <span key={i} className={`beat-dot${i === activeBeat ? ' active' : ''}${i === 0 ? ' downbeat' : ''}`} />
        ))}
      </div>

      <button className="play-btn panel-play" onClick={running ? stop : start}>
        {running ? '■ Stop' : '▶ Start'}
      </button>
    </DropWidget>
  )
}
