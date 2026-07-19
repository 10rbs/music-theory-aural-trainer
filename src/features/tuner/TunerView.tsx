import { useEffect, useRef, useState } from 'react'
import { detectPitch } from '../../core/pitch/detect'
import { freqToNote } from '../../core/pitch/cents'
import { startMic, type MicSession } from '../../shell/audio/mic'
import { useStore } from '../stats/store-context'

type MicState = 'idle' | 'requesting' | 'active' | 'denied' | 'unavailable'

const A4_OPTIONS = [438, 439, 440, 441, 442, 443]
const SMOOTHING = 0.35 // EMA factor for the cents needle
const HOLD_FRAMES = 12 // keep last reading briefly through gaps between notes

interface Reading {
  name: string
  cents: number
}

export function TunerView() {
  const store = useStore()
  const [micState, setMicState] = useState<MicState>('idle')
  const [a4, setA4] = useState(440)
  const [reading, setReading] = useState<Reading | null>(null)

  const sessionRef = useRef<MicSession | null>(null)
  const a4Ref = useRef(a4)
  a4Ref.current = a4
  const smoothedCents = useRef<number | null>(null)
  const silentFrames = useRef(0)

  useEffect(() => {
    void store.getSetting('a4', 440).then(setA4)
    return () => sessionRef.current?.stop()
  }, [store])

  const changeA4 = (value: number) => {
    setA4(value)
    void store.setSetting('a4', value)
  }

  const enable = async () => {
    setMicState('requesting')
    try {
      sessionRef.current = await startMic((buf, sampleRate) => {
        const pitch = detectPitch(buf, sampleRate)
        if (!pitch) {
          if (++silentFrames.current > HOLD_FRAMES) {
            smoothedCents.current = null
            setReading(null)
          }
          return
        }
        silentFrames.current = 0
        const note = freqToNote(pitch.freq, a4Ref.current)
        if (!note) return
        smoothedCents.current =
          smoothedCents.current === null
            ? note.cents
            : smoothedCents.current + SMOOTHING * (note.cents - smoothedCents.current)
        setReading({ name: note.name, cents: Math.round(smoothedCents.current) })
      })
      setMicState('active')
    } catch (e) {
      setMicState((e as Error).message === 'denied' ? 'denied' : 'unavailable')
    }
  }

  const disable = () => {
    sessionRef.current?.stop()
    sessionRef.current = null
    setMicState('idle')
    setReading(null)
  }

  const inTune = reading !== null && Math.abs(reading.cents) <= 5

  return (
    <section>
      {micState !== 'active' && (
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
          <button className="play-btn" onClick={enable} disabled={micState === 'requesting'}>
            {micState === 'requesting' ? 'Requesting…' : '🎤 Enable microphone'}
          </button>
        </div>
      )}

      {micState === 'active' && (
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
            <div className="tuner-cents">{reading ? `${reading.cents > 0 ? '+' : ''}${reading.cents} cents` : 'Play a note'}</div>
          </div>

          <div className="metro-row">
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
            <button className="tap-btn" onClick={disable}>
              Stop
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
