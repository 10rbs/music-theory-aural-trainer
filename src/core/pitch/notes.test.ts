import { describe, expect, test } from 'vitest'
import {
  flushTracker,
  initialTracker,
  rateNote,
  summarizeNote,
  trackNote,
  type Frame,
  type NoteSummary,
} from './notes'

const STEP = 16 // ~60 fps

/** Build frames every STEP ms from `from` (inclusive) to `to` (exclusive). */
function run(
  from: number,
  to: number,
  f: Partial<Omit<Frame, 't'>> | ((t: number) => Partial<Omit<Frame, 't'>>),
): Frame[] {
  const out: Frame[] = []
  for (let t = from; t < to; t += STEP) {
    const p = typeof f === 'function' ? f(t) : f
    out.push({ t, db: -20, midi: 69, cents: 0, ...p })
  }
  return out
}
const silence = (from: number, to: number) => run(from, to, { db: -70, midi: null, cents: null })

function feed(frames: Frame[]): NoteSummary[] {
  let state = initialTracker
  const notes: NoteSummary[] = []
  for (const f of frames) {
    const step = trackNote(state, f)
    state = step.state
    if (step.finished) notes.push(step.finished)
  }
  const tail = flushTracker(state)
  if (tail) notes.push(tail)
  return notes
}

describe('trackNote segmentation', () => {
  test('a held note followed by silence yields one note', () => {
    const notes = feed([...run(0, 1000, {}), ...silence(1000, 1300)])
    expect(notes).toHaveLength(1)
    expect(notes[0].midi).toBe(69)
    expect(notes[0].durationMs).toBeGreaterThan(950)
  })

  test('tongued repeats on the same pitch split at the silence', () => {
    const notes = feed([
      ...run(0, 400, {}),
      ...silence(400, 480),
      ...run(480, 900, {}),
      ...silence(900, 1200),
    ])
    expect(notes).toHaveLength(2)
  })

  test('a slur to a new pitch starts a new note without silence', () => {
    const notes = feed([...run(0, 500, { midi: 69 }), ...run(500, 1000, { midi: 71 }), ...silence(1000, 1200)])
    expect(notes.map((n) => n.midi)).toEqual([69, 71])
  })

  test('a brief pitch blip (e.g. an octave error) folds back into the note', () => {
    const notes = feed([
      ...run(0, 400, { midi: 69 }),
      ...run(400, 440, { midi: 81 }),
      ...run(440, 800, { midi: 69 }),
      ...silence(800, 1000),
    ])
    expect(notes).toHaveLength(1)
    expect(notes[0].midi).toBe(69)
  })

  test('pitch dropouts while still sounding do not end the note', () => {
    const notes = feed([
      ...run(0, 300, {}),
      ...run(300, 450, { midi: null, cents: null }), // loud but unclear
      ...run(450, 800, {}),
      ...silence(800, 1000),
    ])
    expect(notes).toHaveLength(1)
  })

  test('very short notes are dropped as noise', () => {
    expect(feed([...run(0, 80, {}), ...silence(80, 400)])).toEqual([])
  })

  test('flushTracker closes a note still in progress', () => {
    expect(feed(run(0, 600, {}))).toHaveLength(1)
  })

  test('loud unpitched lead-in counts toward the attack', () => {
    const notes = feed([
      ...run(0, 100, { db: -35, midi: null, cents: null }),
      ...run(100, 800, {}),
      ...silence(800, 1000),
    ])
    expect(notes[0].startT).toBe(0)
  })
})

describe('summarizeNote', () => {
  test('averages tuning over the sustain, ignoring a scoop on the attack', () => {
    const frames = [
      ...run(0, 100, (t) => ({ db: -40 + (t / 100) * 10, cents: -30 })), // quiet, flat scoop
      ...run(100, 1000, { db: -20, cents: 4 }),
    ]
    const n = summarizeNote(frames, 69)!
    expect(n.avgCents).toBeCloseTo(4)
    expect(n.centsSpread).toBeCloseTo(0)
  })

  test('measures attack as onset → sustain level', () => {
    const frames = [
      ...run(0, 160, (t) => ({ db: -50 + (t / 160) * 30 })), // ramps up to -20
      ...run(160, 1000, { db: -20 }),
    ]
    const n = summarizeNote(frames, 69)!
    expect(n.attackMs).toBeGreaterThanOrEqual(128)
    expect(n.attackMs).toBeLessThanOrEqual(160)
  })

  test('a wobbly sustain has a larger level spread than a steady one', () => {
    const steady = summarizeNote(run(0, 1000, { db: -20 }), 69)!
    const wobbly = summarizeNote(run(0, 1000, (t) => ({ db: -20 + 2 * Math.sin(t / 50) })), 69)!
    expect(steady.levelSpreadDb).toBeCloseTo(0)
    expect(wobbly.levelSpreadDb).toBeGreaterThan(1)
  })

  test('pitch wander shows up as cents spread', () => {
    const n = summarizeNote(run(0, 1000, (t) => ({ cents: 10 * Math.sin(t / 80) })), 69)!
    expect(n.centsSpread).toBeGreaterThan(5)
  })

  test('trims leading/trailing silence from the duration', () => {
    const n = summarizeNote([...silence(0, 200), ...run(200, 700, {}), ...silence(700, 900)], 69)!
    expect(n.startT).toBe(200)
    expect(n.durationMs).toBeLessThan(500)
  })

  test('returns null with no on-pitch frames', () => {
    expect(summarizeNote(run(0, 500, { midi: null, cents: null }), 69)).toBeNull()
  })
})

describe('rateNote', () => {
  const base: NoteSummary = {
    midi: 69,
    startT: 0,
    endT: 1000,
    durationMs: 1000,
    avgCents: 0,
    centsSpread: 0,
    attackMs: 50,
    sustainDb: -20,
    levelSpreadDb: 0.5,
  }

  test('a clean note rates good across the board', () => {
    expect(rateNote(base)).toEqual({
      tuning: 'good',
      pitchSteadiness: 'good',
      attack: 'good',
      evenness: 'good',
    })
  })

  test('sharp and flat rate symmetrically', () => {
    expect(rateNote({ ...base, avgCents: 10 }).tuning).toBe('ok')
    expect(rateNote({ ...base, avgCents: -10 }).tuning).toBe('ok')
    expect(rateNote({ ...base, avgCents: -25 }).tuning).toBe('off')
  })

  test('slow attack and uneven sustain are flagged', () => {
    const r = rateNote({ ...base, attackMs: 300, levelSpreadDb: 2 })
    expect(r.attack).toBe('off')
    expect(r.evenness).toBe('ok')
  })
})
