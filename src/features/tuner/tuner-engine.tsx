// One mic session + analysis pipeline for the whole app. The header tuner
// widget and the practice screen both read from it, so starting the tuner in
// one place shows up in the other and it keeps running across navigation.
//
// Mic chunks land in a rolling ring buffer (the last CAPTURE_MS of audio,
// memory only). Every chunk is one analysis hop over that same buffer:
// detectPitch + frameDb (core) → smoothed reading, pitch/level histories and
// the note tracker. Frames are stamped in sample time, so when listening
// stops the histories line up exactly with the captured audio for review.

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { createRing, readRing, ringStart, writeRing, type Ring } from '../../core/capture/ring'
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
import { CHUNK, startMic, type MicSession } from '../../shell/audio/mic'
import { makeTakeBuffer } from '../../shell/audio/take-player'
import { useStore } from '../stats/store-context'

export type MicState = 'idle' | 'requesting' | 'active' | 'denied' | 'unavailable'

export interface Reading {
  midi: number
  name: string
  cents: number
}

/** A stopped session: the captured audio plus its analysis, on one clock (ms). */
export interface Take {
  buffer: AudioBuffer | null
  startMs: number
  endMs: number
  pitch: PitchSample[]
  level: LevelSample[]
  notes: NoteSummary[]
}

export interface TunerEngine {
  micState: MicState
  a4: number
  setA4: (value: number) => void
  reading: Reading | null
  pitchHistory: PitchSample[]
  levelHistory: LevelSample[]
  /** Timestamp of the latest frame — the live timeline's right edge. */
  now: number
  /** Completed notes, most recent first. */
  notes: NoteSummary[]
  /** The last stopped session, for review/playback. Cleared on start. */
  take: Take | null
  start: () => Promise<void>
  stop: () => void
}

/** Rolling capture length — histories and audio both cover this. */
export const CAPTURE_MS = 60000
/** Pitch analysis window (~85–93 ms; resolves low brass). */
const FRAME = 4096
const MAX_NOTES = 60
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
  const [take, setTake] = useState<Take | null>(null)

  const sessionRef = useRef<MicSession | null>(null)
  const a4Ref = useRef(a4)
  a4Ref.current = a4
  const ringRef = useRef<Ring | null>(null)
  const sampleRateRef = useRef(48000)
  const smoothed = useRef<number | null>(null)
  const silentFrames = useRef(0)
  const pitchRef = useRef<PitchSample[]>([])
  const levelRef = useRef<LevelSample[]>([])
  const notesRef = useRef<NoteSummary[]>([])
  const trackerRef = useRef<TrackerState>(initialTracker)

  useEffect(() => {
    void store.getSetting('a4', 440).then(setA4State)
    return () => sessionRef.current?.stop()
  }, [store])

  const addNote = (n: NoteSummary | null) => {
    if (!n) return
    notesRef.current = [n, ...notesRef.current].slice(0, MAX_NOTES)
    setNotes(notesRef.current)
  }

  const onChunk = (chunk: Float32Array, sampleRate: number) => {
    const ring = ringRef.current
    if (!ring) return
    sampleRateRef.current = sampleRate
    writeRing(ring, chunk)
    if (ring.written < FRAME) return

    // One hop: the frame is centered FRAME/2 behind the newest sample, so
    // its pitch window and level chunk describe the same instant.
    const win = readRing(ring, ring.written - FRAME, ring.written)
    const t = ((ring.written - FRAME / 2) / sampleRate) * 1000
    const db = frameDb(win.subarray(FRAME / 2 - CHUNK / 2, FRAME / 2 + CHUNK / 2))
    const pitch = detectPitch(win, sampleRate)
    const note = pitch ? freqToNote(pitch.freq, a4Ref.current) : null

    levelRef.current = pushLevel(levelRef.current, { t, db }, t, CAPTURE_MS)
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
      pitchRef.current = pushReading(pitchRef.current, { t, cents }, t, CAPTURE_MS)
      setReading({ midi: note.midi, name: note.name, cents })
      setPitchHistory(pitchRef.current)
    }
    setLevelHistory(levelRef.current)
    setNow(t) // keep the timeline scrolling through silence
  }

  const start = async () => {
    if (sessionRef.current) return
    setMicState('requesting')
    setTake(null)
    ringRef.current = null
    trackerRef.current = initialTracker
    smoothed.current = null
    pitchRef.current = []
    levelRef.current = []
    notesRef.current = []
    setNotes([])
    setPitchHistory([])
    setLevelHistory([])
    setNow(0)
    try {
      const session = await startMic(onChunk)
      ringRef.current = createRing(Math.ceil((session.sampleRate * CAPTURE_MS) / 1000))
      sessionRef.current = session
      setMicState('active')
    } catch (e) {
      setMicState((e as Error).message === 'denied' ? 'denied' : 'unavailable')
    }
  }

  const stop = () => {
    if (!sessionRef.current) return
    sessionRef.current.stop()
    sessionRef.current = null
    addNote(flushTracker(trackerRef.current))
    trackerRef.current = initialTracker

    const ring = ringRef.current
    ringRef.current = null // free the capture; the take owns its copy
    if (ring) {
      const sr = sampleRateRef.current
      const startMs = (ringStart(ring) / sr) * 1000
      const keep = <T extends { t: number }>(xs: T[]) => xs.filter((x) => x.t >= startMs)
      setTake({
        buffer: makeTakeBuffer(readRing(ring, ringStart(ring), ring.written), sr),
        startMs,
        endMs: (ring.written / sr) * 1000,
        pitch: keep(pitchRef.current),
        level: keep(levelRef.current),
        notes: notesRef.current.filter((n) => n.startT >= startMs),
      })
    }
    smoothed.current = null
    setMicState('idle')
    setReading(null)
  }

  const setA4 = (value: number) => {
    setA4State(value)
    void store.setSetting('a4', value)
  }

  return (
    <EngineContext.Provider
      value={{
        micState,
        a4,
        setA4,
        reading,
        pitchHistory,
        levelHistory,
        now,
        notes,
        take,
        start,
        stop,
      }}
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
