import { useEffect, useRef, useState } from 'react'
import { detectPitch } from '../../core/pitch/detect'
import { freqToNote } from '../../core/pitch/cents'
import { pushReading, type PitchSample } from '../../core/pitch/history'
import { CHROMATIC_PCS, FIFTHS_PCS, NOTE_NAMES, midiToFreq, pitchClassMidi } from '../../core/theory/notes'
import { startMic, type MicSession } from '../../shell/audio/mic'
import { startDrone, type Drone } from '../../shell/audio/drone'
import { playFreq } from '../../shell/audio/synth'
import { ensureAudioContext } from '../../shell/audio/context'
import { DropWidget } from '../../components/DropWidget'
import { useStore } from '../stats/store-context'
import { PitchGraph, GRAPH_WINDOW_MS } from './PitchGraph'
import { NoteCircle } from './NoteCircle'

type MicState = 'idle' | 'requesting' | 'active' | 'denied' | 'unavailable'

const A4_OPTIONS = [438, 439, 440, 441, 442, 443]
const SMOOTHING = 0.35 // EMA factor for the cents needle
const HOLD_FRAMES = 12 // keep last reading briefly through gaps between notes
const OCTAVES = [2, 3, 4, 5]
const DEFAULT_OCTAVE = 3

interface Reading {
  midi: number
  name: string
  cents: number
}

type CircleMode = 'chromatic' | 'fifths'

export function TunerWidget() {
  const store = useStore()
  const [micState, setMicState] = useState<MicState>('idle')
  const [a4, setA4] = useState(440)
  const [reading, setReading] = useState<Reading | null>(null)
  const [history, setHistory] = useState<PitchSample[]>([])
  const [graphNow, setGraphNow] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const [dronePc, setDronePc] = useState<number | null>(null)
  const [octave, setOctave] = useState(DEFAULT_OCTAVE)
  const [circleMode, setCircleMode] = useState<CircleMode>('chromatic')

  const sessionRef = useRef<MicSession | null>(null)
  const droneRef = useRef<Drone | null>(null)
  const a4Ref = useRef(a4)
  a4Ref.current = a4
  const smoothedCents = useRef<number | null>(null)
  const silentFrames = useRef(0)
  const historyRef = useRef<PitchSample[]>([])

  useEffect(() => {
    void store.getSetting('a4', 440).then(setA4)
    void store.getSetting('droneOctave', DEFAULT_OCTAVE).then((o) => {
      if (OCTAVES.includes(o)) setOctave(o)
    })
    void store.getSetting<CircleMode>('circleMode', 'chromatic').then((m) => {
      if (m === 'chromatic' || m === 'fifths') setCircleMode(m)
    })
    return () => {
      sessionRef.current?.stop()
      droneRef.current?.stop()
    }
  }, [store])

  const droneFreq = (pc: number, oct: number, ref: number) =>
    midiToFreq(pitchClassMidi(pc, oct), ref)

  const retune = (oct: number, ref: number) => {
    if (dronePc !== null) droneRef.current?.setFreq(droneFreq(dronePc, oct, ref))
  }

  const changeA4 = (value: number) => {
    setA4(value)
    void store.setSetting('a4', value)
    retune(octave, value)
  }

  const changeCircleMode = (mode: CircleMode) => {
    setCircleMode(mode)
    void store.setSetting('circleMode', mode)
  }

  const changeOctave = (value: number) => {
    setOctave(value)
    void store.setSetting('droneOctave', value)
    retune(value, a4)
  }

  const previewNote = (pc: number) => {
    if (pc === dronePc) return // already sounding
    playFreq(droneFreq(pc, octave, a4))
  }

  const tapNote = (pc: number) => {
    if (dronePc === pc) {
      droneRef.current?.stop()
      droneRef.current = null
      setDronePc(null)
      return
    }
    const f = droneFreq(pc, octave, a4)
    if (droneRef.current) droneRef.current.setFreq(f)
    else droneRef.current = startDrone(f)
    setDronePc(pc)
  }

  const enable = async () => {
    setMicState('requesting')
    setExpanded(true) // surface the privacy note / any permission error
    try {
      sessionRef.current = await startMic((buf, sampleRate) => {
        const t = performance.now()
        const pitch = detectPitch(buf, sampleRate)
        if (!pitch) {
          if (++silentFrames.current > HOLD_FRAMES) {
            smoothedCents.current = null
            setReading(null)
          }
          setGraphNow(t) // keep the trace scrolling through silence
          return
        }
        silentFrames.current = 0
        const note = freqToNote(pitch.freq, a4Ref.current)
        if (!note) return
        smoothedCents.current =
          smoothedCents.current === null
            ? note.cents
            : smoothedCents.current + SMOOTHING * (note.cents - smoothedCents.current)
        const cents = Math.round(smoothedCents.current)
        historyRef.current = pushReading(historyRef.current, { t, cents }, t, GRAPH_WINDOW_MS)
        setReading({ midi: note.midi, name: note.name, cents })
        setHistory(historyRef.current)
        setGraphNow(t)
      })
      setMicState('active')
    } catch (e) {
      setMicState((e as Error).message === 'denied' ? 'denied' : 'unavailable')
    }
  }

  const disable = () => {
    sessionRef.current?.stop()
    sessionRef.current = null
    smoothedCents.current = null
    historyRef.current = []
    setMicState('idle')
    setReading(null)
    setHistory([])
  }

  const inTune = reading !== null && Math.abs(reading.cents) <= 5
  const micActive = micState === 'active'

  const pillText = micActive
    ? reading
      ? `${reading.name} ${reading.cents > 0 ? '+' : ''}${reading.cents}¢`
      : 'listening…'
    : 'Tuner'

  return (
    <DropWidget
      pill={
        <>
          <span className={`widget-dot${micActive || dronePc !== null ? ' running' : ''}`} />
          🎤 <span className={inTune ? 'pill-in-tune' : ''}>{pillText}</span>
        </>
      }
      active={micActive || dronePc !== null}
      onToggle={micActive ? disable : () => void enable()}
      expanded={expanded}
      setExpanded={(v) => {
        // The expand click is a user gesture — warm the AudioContext so
        // hover previews (which aren't gestures) can sound right away.
        if (v) ensureAudioContext()
        setExpanded(v)
      }}
      toggleLabel={micActive ? 'Stop tuner' : 'Start tuner'}
      panelLabel="Tuner panel"
      panelClassName="tuner-panel"
    >
      {!micActive && (
        <div className="tuner-gate">
          <p className="tagline">
            The tuner listens through your microphone. Audio is processed entirely on this
            device — nothing is recorded or sent anywhere.
          </p>
          {micState === 'denied' && (
            <p className="tuner-error">
              Microphone access was blocked. Allow it in your browser's site settings (the
              icon next to the address bar), then try again.
            </p>
          )}
          {micState === 'unavailable' && (
            <p className="tuner-error">No microphone found, or it couldn't be started.</p>
          )}
          <button className="play-btn panel-play" onClick={() => void enable()} disabled={micState === 'requesting'}>
            {micState === 'requesting' ? 'Requesting…' : '🎤 Enable microphone'}
          </button>
        </div>
      )}

      {micActive && (
        <div className="tuner-active">
          <div className={`tuner-note${inTune ? ' in-tune' : ''}`}>
            {reading ? reading.name : '–'}
          </div>

          <div className="tuner-scale">
            <div className="tuner-ticks">
              {[-50, -25, 0, 25, 50].map((t) => (
                <span key={t} className={`tuner-tick${t === 0 ? ' zero' : ''}`}>
                  {t > 0 ? `+${t}` : t}
                </span>
              ))}
            </div>
            <div className="tuner-track">
              <div
                className={`tuner-needle${inTune ? ' in-tune' : ''}`}
                style={{
                  left: `${50 + Math.max(-50, Math.min(50, reading?.cents ?? 0))}%`,
                  opacity: reading ? 1 : 0.25,
                }}
              />
              <div className="tuner-center" />
            </div>
            <div className="tuner-cents">
              {reading ? `${reading.cents > 0 ? '+' : ''}${reading.cents} cents` : 'Play a note'}
            </div>
          </div>

          <PitchGraph samples={history} now={graphNow} />

          <button className="tap-btn tuner-stop" onClick={disable}>
            Stop listening
          </button>
        </div>
      )}

      <div className="drone-section">
        <div className="circle-mode" role="group" aria-label="Note circle order">
          <button
            className={circleMode === 'chromatic' ? 'selected' : ''}
            onClick={() => changeCircleMode('chromatic')}
          >
            Chromatic
          </button>
          <button
            className={circleMode === 'fifths' ? 'selected' : ''}
            onClick={() => changeCircleMode('fifths')}
          >
            Circle of 5ths
          </button>
        </div>
        <NoteCircle
          order={circleMode === 'fifths' ? FIFTHS_PCS : CHROMATIC_PCS}
          dronePc={dronePc}
          detectedPc={reading ? reading.midi % 12 : null}
          onTap={tapNote}
          onPreview={previewNote}
        />
        <div className="drone-status">
          {dronePc !== null
            ? `Drone: ${NOTE_NAMES[dronePc]}${octave} — tap the note again to stop`
            : 'Tap a note for a drone'}
        </div>
        <div className="metro-row">
          <label>
            Octave
            <select value={octave} onChange={(e) => changeOctave(Number(e.target.value))}>
              {OCTAVES.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
          <label>
            A4 reference
            <select value={a4} onChange={(e) => changeA4(Number(e.target.value))}>
              {A4_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {v} Hz
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </DropWidget>
  )
}
