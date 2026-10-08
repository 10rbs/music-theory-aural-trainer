import { useEffect, useRef, useState } from 'react'
import {
  centerView,
  clampView,
  followPlayhead,
  formatClock,
  noteAt,
  pitchAt,
  xToTime,
} from '../../core/session/review'
import { midiToName } from '../../core/theory/notes'
import { playTake, type TakePlayback } from '../../shell/audio/take-player'
import { MicGate, TunerReadout } from '../tuner/TunerReadout'
import { useTunerEngine, type Take } from '../tuner/tuner-engine'
import { NoteReport } from './NoteReport'
import { SessionTimeline } from './SessionTimeline'
import { TakeOverview } from './TakeOverview'

const WINDOW_MS = 10000
/** Lead-in before a note when jumping to it, so playback catches the attack. */
const PRE_ROLL_MS = 300

/**
 * The home screen: tuner + the shape of the sound on one timeline, and a
 * report for each note you finish — what used to take a tuner app and a
 * recording app side by side. Stopping turns the last minute into a take you
 * can scrub through and play back.
 */
export function SessionScreen() {
  const engine = useTunerEngine()
  const { micState, take } = engine

  if (micState === 'active') return <LiveView />
  if (take && micState !== 'requesting') {
    // keyed by take so review state resets for each new take
    return (
      <ReviewView
        key={`${take.startMs}-${take.endMs}`}
        take={take}
        onListen={() => void engine.start()}
      />
    )
  }
  return (
    <section className="session">
      <MicGate micState={micState} onEnable={() => void engine.start()} />
    </section>
  )
}

function LiveView() {
  const engine = useTunerEngine()
  const { notes } = engine
  // null = follow the latest note; a startT pins an earlier one
  const [pinnedT, setPinnedT] = useState<number | null>(null)
  const selected = notes.find((n) => n.startT === pinnedT) ?? notes[0] ?? null

  return (
    <section className="session">
      <TunerReadout reading={engine.reading} large />
      <SessionTimeline
        pitch={engine.pitchHistory}
        level={engine.levelHistory}
        notes={notes}
        now={engine.now}
        windowMs={WINDOW_MS}
        selectedT={selected?.startT ?? null}
      />
      <NoteReport
        notes={notes}
        selected={selected}
        onSelect={(t) => setPinnedT(t === notes[0]?.startT ? null : t)}
      />
      <div className="session-footer">
        <span className="session-a4">A4 = {engine.a4} Hz · keeping the last minute for playback</span>
        <button className="session-btn" onClick={engine.stop}>
          ⏸ Stop &amp; review
        </button>
      </div>
    </section>
  )
}

function ReviewView({ take, onListen }: { take: Take; onListen: () => void }) {
  // start parked just before the last note, the one you most likely want to hear
  const initialT = Math.max(take.startMs, (take.notes[0]?.startT ?? take.startMs) - PRE_ROLL_MS)
  const [playhead, setPlayhead] = useState(initialT)
  const [viewEnd, setViewEnd] = useState(() => centerView(initialT, WINDOW_MS, take))
  const [playing, setPlaying] = useState(false)
  const playback = useRef<TakePlayback | null>(null)
  const raf = useRef(0)

  const halt = () => {
    cancelAnimationFrame(raf.current)
    playback.current?.stop()
    playback.current = null
  }
  useEffect(() => halt, [])

  const play = (from: number) => {
    if (!take.buffer) return
    halt()
    const startAt = from >= take.endMs - 50 ? take.startMs : from // at the end → from the top
    playback.current = playTake(take.buffer, (startAt - take.startMs) / 1000, () => {
      halt()
      setPlaying(false)
      setPlayhead(take.endMs)
    })
    setPlaying(true)
    const tick = () => {
      if (!playback.current) return
      const t = take.startMs + playback.current.position() * 1000
      setPlayhead(t)
      setViewEnd((v) => followPlayhead(v, t, WINDOW_MS, take))
      raf.current = requestAnimationFrame(tick)
    }
    tick()
  }

  const pause = () => {
    halt()
    setPlaying(false)
  }

  const seek = (t: number) => {
    setPlayhead(t)
    if (playing) play(t)
  }

  const jumpTo = (t: number) => {
    seek(t)
    setViewEnd(centerView(t, WINDOW_MS, take))
  }

  const under = noteAt(take.notes, playhead)
  const p = under ? pitchAt(take.pitch, playhead) : null
  const reading = under
    ? { midi: under.midi, name: midiToName(under.midi), cents: p?.cents ?? Math.round(under.avgCents) }
    : null
  // the note under the playhead, else one about to start (parked in its
  // pre-roll), else the most recent one before it
  const upcoming = take.notes.find((n) => n.startT > playhead && n.startT - playhead <= PRE_ROLL_MS + 50)
  const selected =
    under ?? upcoming ?? take.notes.find((n) => n.endT < playhead) ?? take.notes[take.notes.length - 1] ?? null
  const view = clampView(viewEnd, WINDOW_MS, take)

  return (
    <section className="session reviewing">
      <TunerReadout reading={reading} large />
      <SessionTimeline
        pitch={take.pitch}
        level={take.level}
        notes={take.notes}
        now={view}
        windowMs={WINDOW_MS}
        selectedT={selected?.startT ?? null}
        playheadT={playhead}
        onSeek={(f) => seek(xToTime(f * 600, 600, view, WINDOW_MS, take))}
      />
      <TakeOverview
        level={take.level}
        startMs={take.startMs}
        endMs={take.endMs}
        viewEnd={view}
        windowMs={WINDOW_MS}
        playheadT={playhead}
        onSeek={jumpTo}
      />
      <div className="transport">
        <button
          className="session-btn transport-play"
          onClick={() => (playing ? pause() : play(playhead))}
          disabled={!take.buffer}
          aria-label={playing ? 'Pause' : 'Play from playhead'}
        >
          {playing ? '⏸ Pause' : '▶ Play'}
        </button>
        <span className="transport-clock">
          {formatClock(playhead - take.startMs)} / {formatClock(take.endMs - take.startMs)}
        </span>
        <span className="transport-hint">Tap the timeline to choose where to play from</span>
      </div>
      <NoteReport
        notes={take.notes}
        selected={selected}
        onSelect={(t) => jumpTo(Math.max(take.startMs, t - PRE_ROLL_MS))}
      />
      <div className="session-footer">
        <span className="session-a4">
          Reviewing your last {Math.round((take.endMs - take.startMs) / 1000)} s
        </span>
        <button
          className="session-btn"
          onClick={() => {
            halt()
            onListen()
          }}
        >
          🎤 Listen again
        </button>
      </div>
    </section>
  )
}
