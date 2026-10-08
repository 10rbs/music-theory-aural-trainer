import { useState } from 'react'
import { MicGate, TunerReadout } from '../tuner/TunerReadout'
import { useTunerEngine } from '../tuner/tuner-engine'
import { NoteReport } from './NoteReport'
import { SessionTimeline } from './SessionTimeline'

const WINDOW_MS = 10000

/**
 * The home screen: tuner + the shape of the sound on one timeline, and a
 * report for each note you finish — what used to take a tuner app and a
 * recording app side by side.
 */
export function SessionScreen() {
  const engine = useTunerEngine()
  const { micState, notes } = engine
  // null = follow the latest note; a startT pins an earlier one
  const [pinnedT, setPinnedT] = useState<number | null>(null)
  const selected = notes.find((n) => n.startT === pinnedT) ?? notes[0] ?? null
  const active = micState === 'active'

  return (
    <section className="session">
      {!active && <MicGate micState={micState} onEnable={() => void engine.start()} />}

      {active && (
        <>
          <TunerReadout reading={engine.reading} large />
          <SessionTimeline
            pitch={engine.pitchHistory}
            level={engine.levelHistory}
            notes={notes}
            now={engine.now}
            windowMs={WINDOW_MS}
            selectedT={selected?.startT ?? null}
          />
        </>
      )}

      {(active || notes.length > 0) && (
        <NoteReport
          notes={notes}
          selected={selected}
          onSelect={(t) => setPinnedT(t === notes[0]?.startT ? null : t)}
        />
      )}

      {active && (
        <div className="session-footer">
          <span className="session-a4">A4 = {engine.a4} Hz</span>
          <button className="tap-btn" onClick={engine.stop}>
            Stop listening
          </button>
        </div>
      )}
    </section>
  )
}
