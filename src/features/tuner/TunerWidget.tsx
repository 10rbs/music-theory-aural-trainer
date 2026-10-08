import { useEffect, useRef, useState } from 'react'
import { IN_TUNE_CENTS } from '../../core/pitch/history'
import { CHROMATIC_PCS, FIFTHS_PCS, NOTE_NAMES, midiToFreq, pitchClassMidi } from '../../core/theory/notes'
import { startDrone, type Drone } from '../../shell/audio/drone'
import { playFreq } from '../../shell/audio/synth'
import { ensureAudioContext } from '../../shell/audio/context'
import { DropWidget } from '../../components/DropWidget'
import { useStore } from '../stats/store-context'
import { PitchGraph } from './PitchGraph'
import { NoteCircle } from './NoteCircle'
import { MicGate, TunerReadout } from './TunerReadout'
import { useTunerEngine } from './tuner-engine'

const A4_OPTIONS = [438, 439, 440, 441, 442, 443]
const OCTAVES = [2, 3, 4, 5]
const DEFAULT_OCTAVE = 3

type CircleMode = 'chromatic' | 'fifths'

export function TunerWidget() {
  const store = useStore()
  const engine = useTunerEngine()
  const { micState, a4, reading } = engine
  const [expanded, setExpanded] = useState(false)
  const [dronePc, setDronePc] = useState<number | null>(null)
  const [octave, setOctave] = useState(DEFAULT_OCTAVE)
  const [circleMode, setCircleMode] = useState<CircleMode>('chromatic')

  const droneRef = useRef<Drone | null>(null)

  useEffect(() => {
    void store.getSetting('droneOctave', DEFAULT_OCTAVE).then((o) => {
      if (OCTAVES.includes(o)) setOctave(o)
    })
    void store.getSetting<CircleMode>('circleMode', 'chromatic').then((m) => {
      if (m === 'chromatic' || m === 'fifths') setCircleMode(m)
    })
    return () => droneRef.current?.stop()
  }, [store])

  const droneFreq = (pc: number, oct: number, ref: number) =>
    midiToFreq(pitchClassMidi(pc, oct), ref)

  const retune = (oct: number, ref: number) => {
    if (dronePc !== null) droneRef.current?.setFreq(droneFreq(dronePc, oct, ref))
  }

  const changeA4 = (value: number) => {
    engine.setA4(value)
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

  const enable = () => {
    setExpanded(true) // surface the privacy note / any permission error
    void engine.start()
  }

  const inTune = reading !== null && Math.abs(reading.cents) <= IN_TUNE_CENTS
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
      onToggle={micActive ? engine.stop : enable}
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
      {!micActive && <MicGate micState={micState} onEnable={enable} />}

      {micActive && (
        <div className="tuner-active">
          <TunerReadout reading={reading} />
          <PitchGraph samples={engine.pitchHistory} now={engine.now} />
          <button className="tap-btn tuner-stop" onClick={engine.stop}>
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
