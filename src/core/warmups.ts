// Warm-up library — the technique counterpart to the daily ear-training scales.
// Pure generators for three brass practice phases: long tones (Sound), lip
// flexibility (Flexibility), and arpeggios (Technical). Each exercise is the
// same shape as a daily scale — spelled notes + MIDI + a PlaybackSpec — so it
// renders in ScaleStaff and plays through playSpec, and carries the octave/key
// transpose controls from M4.7.
//
// A few short exercises are transcribed in-house from the PUBLIC-DOMAIN 1864
// Arban method (Arban d. 1889) and tagged with provenance — see
// docs/decisions/0003. We encode the musical content ourselves; we never copy a
// modern (copyrighted) edition.

import type { SpelledNote } from './assignments'
import { MAJOR_KEYS, spellScaleDegrees, tonicName, type Tonic } from './theory/keys'
import { CHORDS, spellChord, type Chord } from './theory/chords'
import { transposeSpelled, type Interval } from './theory/transpose'
import { melodic, sustained, type PlaybackSpec } from './playback/spec'
import { rootMidi } from './register'
import { type Clef } from './notation/staff'

export type WarmupCategory = 'long-tones' | 'lip-flexibility' | 'arpeggios'

export const WARMUP_CATEGORIES: { id: WarmupCategory; label: string; blurb: string }[] = [
  {
    id: 'long-tones',
    label: 'Long tones',
    blurb: 'Sustained notes for tone and tuning — hold each full value, steady air, check the tuner.',
  },
  {
    id: 'lip-flexibility',
    label: 'Lip flexibility',
    blurb: 'Slur between partials on one valve/slide position — smooth, no tongue, keep the air moving.',
  },
  {
    id: 'arpeggios',
    label: 'Arpeggios',
    blurb: 'Broken chords, ascending and descending. Use ♯/♭ to take each one through every key.',
  },
]

/** Provenance for a curated (public-domain) exercise. */
export interface WarmupSource {
  work: string
  composer: string
  year: number
  publicDomain: true
  /** e.g. "transcribed in-house from the public-domain original" */
  note?: string
}

export interface WarmupExercise {
  id: string
  category: WarmupCategory
  title: string
  instruction?: string
  spelled: SpelledNote[]
  midi: number[]
  playback: PlaybackSpec
  /** which transpose controls the card shows */
  transposable: 'octave' | 'key'
  /** present for key-transposable exercises (arpeggios) */
  tonic?: Tonic
  /** chord short-name, so a key change can rebuild the arpeggio */
  chordShort?: string
  /** present on curated (Arban) items */
  source?: WarmupSource
}

const mod = (n: number, m: number) => ((n % m) + m) % m

const MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11, 12] as const
const C: Tonic = { letter: 'C', alter: 0 }
const B_FLAT: Tonic = { letter: 'B', alter: -1 }

const ARBAN: WarmupSource = {
  work: 'Grande méthode complète pour cornet à pistons',
  composer: 'J.-B. Arban',
  year: 1864,
  publicDomain: true,
  note: 'transcribed in-house from the public-domain original',
}

// ── Arpeggios ───────────────────────────────────────────────────────────────

/** A broken chord ascending to the octave and back down, spelled + played. */
function arpeggio(root: Tonic, chord: Chord, clef: Clef): WarmupExercise {
  const base = rootMidi(root, clef)
  const degrees = spellChord(root, chord.intervals)
  const byInterval = new Map(chord.intervals.map((iv, i) => [iv, degrees[i]]))
  byInterval.set(12, degrees[0]) // octave reuses the root spelling
  const up = [...chord.intervals, 12]
  const seq = [...up, ...up.slice(0, -1).reverse()] // up then back down
  const spelled = seq.map((iv) => ({ ...byInterval.get(iv)!, midi: base + iv }))
  const midi = spelled.map((n) => n.midi)
  return {
    id: `arp:${chord.short}`,
    category: 'arpeggios',
    title: `${tonicName(root)} ${chord.name}`,
    spelled,
    midi,
    playback: melodic(midi, 100),
    transposable: 'key',
    tonic: root,
    chordShort: chord.short,
  }
}

const chord = (short: string): Chord => CHORDS.find((c) => c.short === short)!

/** A broken chord from an explicit list of intervals-from-the-root (spelled). */
function brokenChord(root: Tonic, clef: Clef, up: readonly Interval[]): SpelledNote[] {
  const rootNote: SpelledNote = { ...root, midi: rootMidi(root, clef) }
  const asc = up.map((iv) => transposeSpelled(rootNote, iv))
  return [...asc, ...asc.slice(0, -1).reverse()] // up then back down
}

/** Arban-style major arpeggio study: C E G C E to the tenth and back. */
function arbanArpeggio(clef: Clef): WarmupExercise {
  const up: Interval[] = [
    { diatonic: 0, chromatic: 0 }, // C
    { diatonic: 2, chromatic: 4 }, // E
    { diatonic: 4, chromatic: 7 }, // G
    { diatonic: 7, chromatic: 12 }, // C (octave)
    { diatonic: 9, chromatic: 16 }, // E (tenth)
  ]
  const spelled = brokenChord(C, clef, up)
  const midi = spelled.map((n) => n.midi)
  return {
    id: 'arp:arban',
    category: 'arpeggios',
    title: 'Arban — major arpeggio study',
    spelled,
    midi,
    playback: melodic(midi, 100),
    transposable: 'octave',
    source: ARBAN,
  }
}

// ── Long tones ──────────────────────────────────────────────────────────────

/** Sustained notes over the given scale-degree indices of C major. */
function longTonePattern(
  id: string,
  title: string,
  degreeIdx: readonly number[],
  clef: Clef,
  source?: WarmupSource,
): WarmupExercise {
  const base = rootMidi(C, clef)
  const degs = spellScaleDegrees(C, MAJOR_INTERVALS)
  const spelled = degreeIdx.map((i) => ({ ...degs[i], midi: base + MAJOR_INTERVALS[i] }))
  const midi = spelled.map((n) => n.midi)
  return {
    id,
    category: 'long-tones',
    title,
    instruction: 'Hold each note full value — steady air, watch the tuner.',
    spelled,
    midi,
    playback: sustained(midi, 60, 4),
    transposable: 'octave',
    source,
  }
}

// ── Lip flexibility ─────────────────────────────────────────────────────────

// partials 1..5 over a fundamental, as intervals from it (equal-tempered)
const PARTIALS: readonly Interval[] = [
  { diatonic: 0, chromatic: 0 }, // 1: unison
  { diatonic: 7, chromatic: 12 }, // 2: octave
  { diatonic: 11, chromatic: 19 }, // 3: octave + fifth
  { diatonic: 14, chromatic: 24 }, // 4: two octaves
  { diatonic: 16, chromatic: 28 }, // 5: two octaves + major third
]

/** Slur through a sequence of partials (1-based) over a B♭ fundamental. */
function slurPattern(
  id: string,
  title: string,
  partialSeq: readonly number[],
  clef: Clef,
  source?: WarmupSource,
): WarmupExercise {
  const fundamental: SpelledNote = { ...B_FLAT, midi: rootMidi(B_FLAT, clef) }
  const spelled = partialSeq.map((p) => transposeSpelled(fundamental, PARTIALS[p - 1]))
  const midi = spelled.map((n) => n.midi)
  return {
    id,
    category: 'lip-flexibility',
    title,
    instruction: 'Slur smoothly between partials — no tongue, keep the air moving.',
    spelled,
    midi,
    playback: sustained(midi, 92, 1.5),
    transposable: 'octave',
    source,
  }
}

// ── Library ─────────────────────────────────────────────────────────────────

/** The full warm-up library, grouped by category, in the given clef register. */
export function warmupLibrary(clef: Clef): Record<WarmupCategory, WarmupExercise[]> {
  return {
    'long-tones': [
      longTonePattern('long:desc5', 'Descending five-note long tones', [4, 3, 2, 1, 0], clef),
      longTonePattern('long:arban', 'Arban — sustained scale', [0, 1, 2, 3, 4, 3, 2, 1, 0], clef, ARBAN),
    ],
    'lip-flexibility': [
      slurPattern('slur:121', 'Two-partial slur', [1, 2, 1], clef),
      slurPattern('slur:12321', 'Three-partial slur', [1, 2, 3, 2, 1], clef),
      slurPattern('slur:arban', 'Arban — slur study', [1, 2, 3, 2, 1, 2, 1], clef, ARBAN),
    ],
    arpeggios: [
      arpeggio(C, chord('maj'), clef),
      arpeggio(C, chord('min'), clef),
      arpeggio(C, chord('dom7'), clef),
      arbanArpeggio(clef),
    ],
  }
}

/**
 * Re-spell a key-transposable arpeggio `offset` steps around the practical key
 * list (each step ≈ a fifth). Register re-anchors to the clef; id and slot are
 * kept. Non-key exercises pass through unchanged. Mirrors rekeyAssignment.
 */
export function rekeyWarmup(ex: WarmupExercise, offset: number, clef: Clef): WarmupExercise {
  if (offset === 0 || ex.transposable !== 'key' || !ex.tonic || !ex.chordShort) return ex
  const i = MAJOR_KEYS.findIndex((k) => k.letter === ex.tonic!.letter && k.alter === ex.tonic!.alter)
  const tonic = MAJOR_KEYS[mod((i < 0 ? 0 : i) + offset, MAJOR_KEYS.length)]
  return { ...arpeggio(tonic, chord(ex.chordShort), clef), id: ex.id }
}

/**
 * Shift an exercise by whole octaves — notation and playback move together,
 * spelling is invariant. (Octave displacement, per docs/decisions/0002.)
 */
export function shiftWarmup(ex: WarmupExercise, octaves: number): WarmupExercise {
  if (octaves === 0) return ex
  const d = octaves * 12
  return {
    ...ex,
    midi: ex.midi.map((m) => m + d),
    spelled: ex.spelled.map((n) => ({ ...n, midi: n.midi + d })),
    playback: {
      ...ex.playback,
      events: ex.playback.events.map((e) => ({ ...e, midi: e.midi.map((m) => m + d) })),
    },
  }
}
