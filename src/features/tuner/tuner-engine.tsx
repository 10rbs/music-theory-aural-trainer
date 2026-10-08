// One mic session + analysis pipeline for the whole app. The header tuner
// widget and the practice screen both read from it, so starting the tuner in
// one place shows up in the other and it keeps running across navigation.
// Per frame: detectPitch + frameDb (core) → smoothed reading, pitch/level
// histories for the timeline lanes, and the note tracker for summaries.

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { detectPitch } from '../../core/pitch/detect'
import { freqToNote } from '../../core/pitch/cents'
import { pushReading, type PitchSample } from '../../core/pitch/history'
import { frameDb, pushLevel, type LevelSample } from '../../core/pitch/level'
import {
  flushTracker,
  initialTracker,
  trackNote,
  type NoteSummary,
  type TrackerState,
} from '../../core/pitch/notes'
import { startMic, type MicSession } from '../../shell/audio/mic'
import { useStore } from '../stats/store-context'

export type MicState = 'idle' | 'requesting' | 'active' | 'denied' | 'unavailable'

export interface Reading {
  midi: number
  name: string
  cents: number
}

export interface TunerEngine {
  micState: MicState
  a4: number
  setA4: (value: number) => void
  reading: Reading | null
  pitchHistory: PitchSample[]
  levelHistory: LevelSample[]
  /** Timestamp of the latest frame — the timeline's right edge. */
  now: number
  /** Completed notes, most recent first. */
  notes: NoteSummary[]
  start: () => Promise<void>
  stop: () => void
}

/** Longest timeline any view draws; histories are trimmed to this. */
export const HISTORY_MS = 12000
const MAX_NOTES = 8
const SMOOTHING = 0.35 // EMA factor for the needle/trace
const HOLD_FRAMES = 12 // keep last reading briefly through gaps between notes

const EngineContext = createContext<TunerEngine | null>(null)

export function TunerEngineProvider({ children }: { children: ReactNode }) {
  const store = useStore()
  const [micState, setMicState] = useState<MicState>('idle')
  const [a4, setA4State] = useState(440)
  const [reading, setReading] = useState<Reading | null>(null)
  const [pitchHistory, setPitchHistory] = useState<PitchSample[]>([])
  const [levelHistory, setLevelHistory] = useState<LevelSample[]>([])
  const [now, setNow] = useState(0)
  const [notes, setNotes] = useState<NoteSummary[]>([])

  const sessionRef = useRef<MicSession | null>(null)
  const a4Ref = useRef(a4)
  a4Ref.current = a4
  const smoothed = useRef<number | null>(null)
  const silentFrames = useRef(0)
  const pitchRef = useRef<PitchSample[]>([])
  const levelRef = useRef<LevelSample[]>([])
  const trackerRef = useRef<TrackerState>(initialTracker)

  useEffect(() => {
    void store.getSetting('a4', 440).then(setA4State)
    return () => sessionRef.current?.stop()
  }, [store])

  const addNote = (n: NoteSummary | null) => {
    if (n) setNotes((prev) => [n, ...prev].slice(0, MAX_NOTES))
  }

  const onFrame = (buf: Float32Array, sampleRate: number) => {
    const t = performance.now()
    const db = frameDb(buf)
    const pitch = detectPitch(buf, sampleRate)
    const note = pitch ? freqToNote(pitch.freq, a4Ref.current) : null

    levelRef.current = pushLevel(levelRef.current, { t, db }, t, HISTORY_MS)
    const step = trackNote(trackerRef.current, {
      t,
      db,
      midi: note?.midi ?? null,
      cents: note?.exactCents ?? null,
    })
    trackerRef.current = step.state
    addNote(step.finished)

    if (!note) {
      if (++silentFrames.current > HOLD_FRAMES) {
        smoothed.current = null
        setReading(null)
      }
    } else {
      silentFrames.current = 0
      smoothed.current =
        smoothed.current === null
          ? note.cents
          : smoothed.current + SMOOTHING * (note.cents - smoothed.current)
      const cents = Math.round(smoothed.current)
      pitchRef.current = pushReading(pitchRef.current, { t, cents }, t, HISTORY_MS)
      setReading({ midi: note.midi, name: note.name, cents })
      setPitchHistory(pitchRef.current)
    }
    setLevelHistory(levelRef.current)
    setNow(t) // keep the timeline scrolling through silence
  }

  const start = async () => {
    if (sessionRef.current) return
    setMicState('requesting')
    try {
      sessionRef.current = await startMic(onFrame)
      setMicState('active')
    } catch (e) {
      setMicState((e as Error).message === 'denied' ? 'denied' : 'unavailable')
    }
  }

  const stop = () => {
    sessionRef.current?.stop()
    sessionRef.current = null
    addNote(flushTracker(trackerRef.current))
    trackerRef.current = initialTracker
    smoothed.current = null
    pitchRef.current = []
    levelRef.current = []
    setMicState('idle')
    setReading(null)
    setPitchHistory([])
    setLevelHistory([])
  }

  const setA4 = (value: number) => {
    setA4State(value)
    void store.setSetting('a4', value)
  }

  return (
    <EngineContext.Provider
      value={{ micState, a4, setA4, reading, pitchHistory, levelHistory, now, notes, start, stop }}
    >
      {children}
    </EngineContext.Provider>
  )
}

export function useTunerEngine(): TunerEngine {
  const engine = useContext(EngineContext)
  if (!engine) throw new Error('useTunerEngine must be used within a TunerEngineProvider')
  return engine
}
