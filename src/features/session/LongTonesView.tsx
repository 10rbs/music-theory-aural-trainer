import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Rating } from '../../core/pitch/notes'
import {
  applyNote,
  flatName,
  holdProgress,
  isDone,
  LIP_SLUR_SERIES,
  routineDetail,
  routineScore,
  skipStep,
  startRoutine,
  summarizeRoutine,
  targetOf,
  type LongToneState,
  type StepResult,
} from '../../core/session/longtones'
import { toLocalDateStr } from '../../core/streak'
import { statsEvents, useStore } from '../stats/store-context'
import { MicGate, TunerReadout } from '../tuner/TunerReadout'
import { useTunerEngine } from '../tuner/tuner-engine'
import { useReferenceTone } from './reference-tone'

const ROUTINE = LIP_SLUR_SERIES
const signed = (n: number) => `${n > 0 ? '+' : ''}${n}`
const secs = (ms: number) => (ms / 1000).toFixed(1)

/**
 * Guided long tones: one target at a time, held for ROUTINE.holdMs, using
 * the same tracker and ratings as the practice screen. Finished notes from
 * the shared engine drive a pure reducer (core/session/longtones.ts); the
 * view only decides which notes are new.
 */
export function LongTonesView() {
  const engine = useTunerEngine()
  const store = useStore()
  const { reference } = useReferenceTone()
  const [state, setState] = useState<LongToneState | null>(null)
  // notes that existed before the routine started (or were already applied)
  const seen = useRef(new WeakSet<object>())
  const recorded = useRef(false)

  const begin = () => {
    seen.current = new WeakSet(engine.notes)
    recorded.current = false
    setState(startRoutine(ROUTINE))
    if (engine.micState !== 'active') void engine.start()
  }

  // feed newly finished notes, oldest first
  useEffect(() => {
    if (!state || isDone(state)) return
    const fresh = engine.notes.filter((n) => !seen.current.has(n)).reverse()
    if (fresh.length === 0) return
    fresh.forEach((n) => seen.current.add(n))
    setState((s) => (s ? fresh.reduce(applyNote, s) : s))
  }, [engine.notes, state])

  // finished: log it once (counts toward the streak) and release the mic
  const done = state !== null && isDone(state)
  useEffect(() => {
    if (!state || !done || recorded.current) return
    recorded.current = true
    if (engine.micState === 'active') engine.stop()
    const sum = summarizeRoutine(state)
    if (sum.held === 0) return
    void store
      .recordAttempt({
        exerciseId: 'long-tones',
        date: toLocalDateStr(new Date()),
        ts: Date.now(),
        correct: sum.skipped === 0,
        score: routineScore(sum),
        detail: routineDetail(state),
      })
      .then(() => statsEvents.dispatchEvent(new Event('attempt')))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per completion
  }, [done])

  if (!state) {
    return (
      <section className="session long-tones">
        <h1>Long tones</h1>
        <p className="tagline">
          {ROUTINE.name}: {ROUTINE.steps.map(flatName).join(' · ')}. Hold each for {ROUTINE.holdMs / 1000} s
          — the next note comes up when you've held the last one long enough. Rest as long as you
          like between notes.
        </p>
        {engine.micState === 'denied' || engine.micState === 'unavailable' ? (
          <MicGate micState={engine.micState} onEnable={begin} />
        ) : (
          <button className="session-btn" onClick={begin}>
            ▶ Start long tones
          </button>
        )}
      </section>
    )
  }

  const target = targetOf(state)
  const progress = holdProgress(state, engine.currentNote, engine.now)
  const listening = engine.micState === 'active'

  return (
    <section className="session long-tones">
      <h1>Long tones</h1>
      <StepStrip state={state} />

      {target !== null ? (
        <>
          <div className="lt-target">
            <span className="lt-target-label">Hold</span>
            <span className="lt-target-note">{flatName(target)}</span>
            <span className="lt-target-meta">
              {ROUTINE.holdMs / 1000} s · step {state.step + 1} of {ROUTINE.steps.length}
            </span>
          </div>
          <HoldBar progress={progress} holdMs={ROUTINE.holdMs} />
          <p className="lt-hint" aria-live="polite">
            {hintText(state, progress)}
          </p>
          <TunerReadout reading={engine.reading} large />
          <div className="session-footer">
            {listening ? (
              <span className="session-a4">A4 = {engine.a4} Hz · listening</span>
            ) : (
              <button className="session-btn" onClick={() => void engine.start()}>
                🎤 Resume listening
              </button>
            )}
            <span className="lt-actions">
              <button className="tap-btn" onClick={() => setState(skipStep(state))}>
                Skip {flatName(target)}
              </button>
              <button
                className="tap-btn"
                onClick={() => {
                  if (listening) engine.stop()
                  setState(null)
                }}
              >
                End
              </button>
            </span>
          </div>
        </>
      ) : (
        <Summary state={state} onAgain={begin} />
      )}

      {state.results.some((r) => r !== null) && (
        <ResultsTable results={state.results} referenceBrightness={reference?.brightness ?? null} />
      )}
    </section>
  )
}

function hintText(state: LongToneState, progress: number | null): string {
  if (progress !== null) return progress >= 1 ? 'Good — let it go cleanly.' : 'On target — keep it steady.'
  const h = state.hint
  if (!h) return state.step === 0 ? 'Play when ready.' : 'Nice — rest, then the next one.'
  if (h.kind === 'short') return `That was ${secs(h.heldMs)} s — hold it the full ${ROUTINE.holdMs / 1000} s.`
  return `That was ${flatName(h.played)} — aim for ${flatName(targetOf(state)!)}.`
}

function worst(r: StepResult): Rating {
  const all = Object.values(r.ratings)
  return all.includes('off') ? 'off' : all.includes('ok') ? 'ok' : 'good'
}

function StepStrip({ state }: { state: LongToneState }) {
  return (
    <ol className="lt-steps" aria-label="Routine">
      {state.routine.steps.map((midi, i) => {
        const r = state.results[i]
        const status =
          i === state.step ? 'current' : i > state.step ? 'upcoming' : r ? `rating-${worst(r)}` : 'skipped'
        return (
          <li key={i} className={`lt-step ${status}`} aria-current={i === state.step ? 'step' : undefined}>
            {r && <span className="rating-dot" aria-hidden="true" />}
            {flatName(midi)}
            {r === null && <span className="sr-only"> (skipped)</span>}
          </li>
        )
      })}
    </ol>
  )
}

function HoldBar({ progress, holdMs }: { progress: number | null; holdMs: number }) {
  const p = progress ?? 0
  return (
    <div className="lt-hold">
      <div
        className={`lt-hold-track${p >= 1 ? ' full' : ''}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={holdMs / 1000}
        aria-valuenow={Math.round((p * holdMs) / 100) / 10}
        aria-label="Hold time"
      >
        <div className="lt-hold-fill" style={{ width: `${p * 100}%` }} />
      </div>
      <span className="lt-hold-text">
        {progress === null
          ? '—'
          : p >= 1
            ? '✓ Held — release when ready'
            : `${secs(p * holdMs)} / ${holdMs / 1000} s`}
      </span>
    </div>
  )
}

function Summary({ state, onAgain }: { state: LongToneState; onAgain: () => void }) {
  const sum = summarizeRoutine(state)
  const fmt = (x: number | null, unit: string, prefix = '') => (x === null ? '—' : `${prefix}${x.toFixed(1)}${unit}`)
  return (
    <div className="note-report lt-summary">
      <div className="note-report-head">
        <h2>Done</h2>
        <span className="note-report-meta">
          {sum.held} of {state.routine.steps.length} held{sum.skipped ? ` · ${sum.skipped} skipped` : ''}
        </span>
      </div>
      <div className="note-metrics">
        <div className="note-metric">
          <span className="metric-label">Good ratings</span>
          <span className="metric-value">
            {sum.goodRatings} / {sum.totalRatings}
          </span>
          <span className="metric-note">across all four checks</span>
        </div>
        <div className="note-metric">
          <span className="metric-label">Tuning</span>
          <span className="metric-value">{fmt(sum.meanTuningCents, '¢', '±')}</span>
          <span className="metric-note">average distance from centre</span>
        </div>
        <div className="note-metric">
          <span className="metric-label">Pitch steadiness</span>
          <span className="metric-value">{fmt(sum.meanSpreadCents, '¢', '±')}</span>
          <span className="metric-note">average wander</span>
        </div>
        <div className="note-metric">
          <span className="metric-label">Evenness</span>
          <span className="metric-value">{fmt(sum.meanLevelSpreadDb, ' dB', '±')}</span>
          <span className="metric-note">average volume wobble</span>
        </div>
      </div>
      <div className="lt-actions lt-summary-actions">
        <button className="session-btn" onClick={onAgain}>
          ↻ Again
        </button>
        <span className="session-a4">Your last minute is on the Tuner screen for playback.</span>
      </div>
    </div>
  )
}

function ResultsTable({
  results,
  referenceBrightness,
}: {
  results: (StepResult | null)[]
  referenceBrightness: number | null
}) {
  return (
    <div className="lt-table-wrap">
      <table className="lt-table">
        <thead>
          <tr>
            <th scope="col">Note</th>
            <th scope="col">Held</th>
            <th scope="col">Tuning</th>
            <th scope="col">Steadiness</th>
            <th scope="col">Attack</th>
            <th scope="col">Evenness</th>
            <th scope="col">Brightness{referenceBrightness !== null ? ' vs ref' : ''}</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => {
            if (!r) {
              return (
                <tr key={i} className="lt-skipped">
                  <td colSpan={7}>skipped</td>
                </tr>
              )
            }
            const { note, ratings } = r
            const b = note.tone?.brightness
            return (
              <tr key={i}>
                <th scope="row">{flatName(r.midi)}</th>
                <td>{secs(note.durationMs)} s</td>
                <Cell rating={ratings.tuning}>{signed(Math.round(note.avgCents))}¢</Cell>
                <Cell rating={ratings.pitchSteadiness}>±{note.centsSpread.toFixed(1)}¢</Cell>
                <Cell rating={ratings.attack}>{Math.round(note.attackMs)} ms</Cell>
                <Cell rating={ratings.evenness}>±{note.levelSpreadDb.toFixed(1)} dB</Cell>
                <td>
                  {b === undefined
                    ? '—'
                    : referenceBrightness === null
                      ? b.toFixed(1)
                      : `${b.toFixed(1)} (${signed(Number((b - referenceBrightness).toFixed(1)))})`}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Cell({ rating, children }: { rating: Rating; children: ReactNode }) {
  return (
    <td className={`rating-${rating}`}>
      <span className="rating-dot" aria-hidden="true" /> <span className="lt-cell-value">{children}</span>
      <span className="sr-only"> ({rating})</span>
    </td>
  )
}
