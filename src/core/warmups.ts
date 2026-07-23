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
import { keySignature, type KeySignature } from './notation/key-signature'
import { type Meter, type RhythmEvent } from './notation/rhythm'

// The daily routine uses the first four; the deep-dive Studies page (M4.10) adds
// 'scales' and 'thirds'. Widening the union keeps one WarmupExercise shape for both.
export type WarmupCategory =
  | 'long-tones'
  | 'lip-flexibility'
  | 'arpeggios'
  | 'articulation'
  | 'scales'
  | 'thirds'
  | 'etudes'

/** The subset the daily routine uses (scales/thirds are Studies-page only). */
type DailyCategory = 'long-tones' | 'lip-flexibility' | 'arpeggios' | 'articulation'

export const WARMUP_CATEGORIES: { id: DailyCategory; label: string; blurb: string }[] = [
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
  {
    id: 'articulation',
    label: 'Articulation',
    blurb: 'Tonguing patterns — attack each note cleanly, keep the air steady behind the tongue.',
  },
]

/**
 * Categories for the deep-dive Studies page — the daily four plus scales and
 * thirds. Same shape as WARMUP_CATEGORIES; the Studies page renders these in
 * order and pulls exercises from `arbanStudyLibrary`.
 */
export const STUDY_CATEGORIES: { id: WarmupCategory; label: string; blurb: string }[] = [
  {
    id: 'long-tones',
    label: 'Long tones',
    blurb: 'Build the sound first — full value on every note, steady air, tuner on.',
  },
  {
    id: 'lip-flexibility',
    label: 'Lip flexibility',
    blurb: 'Slur between partials on one position — smooth turns, no tongue, from two partials up to five.',
  },
  {
    id: 'scales',
    label: 'Scales',
    blurb: 'Even, connected scale work — the foundation of the Arban method.',
  },
  {
    id: 'thirds',
    label: 'Thirds',
    blurb: 'Broken thirds up the scale — the first of Arban’s interval studies.',
  },
  {
    id: 'arpeggios',
    label: 'Arpeggios',
    blurb: 'Broken chords ascending and descending. Use ♯/♭ to take each one through every key.',
  },
  {
    id: 'articulation',
    label: 'Articulation',
    blurb: 'Tonguing studies — clean attacks, steady air, light and even at speed.',
  },
  {
    id: 'etudes',
    label: 'Etudes',
    blurb: 'Longer, full-page passages that wrap across several lines — put it all together.',
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
  /** rhythmic notation (articulation) — rendered by RhythmStaff instead of ScaleStaff */
  rhythm?: { events: RhythmEvent[]; meter: Meter }
  /**
   * Key signature for staves that should show one — a single signature, or one
   * per measure for a passage that changes key (the scale-cycle etude). Absent
   * means draw every accidental inline (chords, chromatic exercises).
   */
  keySig?: KeySignature | readonly KeySignature[]
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

// ── Articulation ────────────────────────────────────────────────────────────

const FOUR_FOUR: Meter = { beats: 4, unit: 4 }

const MINOR_INTERVALS = [0, 2, 3, 5, 7, 8, 10, 12] as const

/** Key signature for a major / natural-minor scale in a key. */
const majorSig = (t: Tonic): KeySignature => keySignature(t, { name: 'major', intervals: MAJOR_INTERVALS })
const minorSig = (t: Tonic): KeySignature => keySignature(t, { name: 'minor', intervals: MINOR_INTERVALS })

/**
 * Diatonic scale notes at the given degree indices, anchored to `tonic` in the
 * clef register. Index 7 is the octave tonic; indices ≥ 7 wrap into higher
 * octaves (the thirds study reaches the ninth degree), reusing each degree's
 * key-correct spelling — so G major spells F♯, C minor spells E♭/A♭/B♭.
 */
function diatonicNotes(
  clef: Clef,
  tonic: Tonic,
  intervals: readonly number[],
  indices: readonly number[],
): SpelledNote[] {
  const base = rootMidi(tonic, clef)
  const degs = spellScaleDegrees(tonic, intervals) // 7 degrees (octave entry ignored)
  return indices.map((i) => {
    const oct = Math.floor(i / 7)
    const d = i % 7
    return { ...degs[d], midi: base + intervals[d] + 12 * oct }
  })
}

/** C-major convenience wrapper over `diatonicNotes` (the common case). */
function scaleNotes(clef: Clef, indices: readonly number[]): SpelledNote[] {
  return diatonicNotes(clef, C, MAJOR_INTERVALS, indices)
}

/** Build a PlaybackSpec from rhythm events — rests advance time but make no sound. */
function rhythmPlayback(events: readonly RhythmEvent[], bpm: number): PlaybackSpec {
  const evs = []
  let start = 0
  for (const e of events) {
    if (e.note) evs.push({ midi: [e.note.midi], startBeat: start, durationBeats: e.beats })
    start += e.beats
  }
  return { bpm, events: evs }
}

function articulation(
  id: string,
  title: string,
  notes: SpelledNote[],
  beats: readonly number[],
  bpm: number,
  instruction: string,
  source?: WarmupSource,
): WarmupExercise {
  const events: RhythmEvent[] = notes.map((n, i) => ({ note: n, beats: beats[i] }))
  return {
    id,
    category: 'articulation',
    title,
    instruction,
    spelled: notes,
    midi: notes.map((n) => n.midi),
    playback: rhythmPlayback(events, bpm),
    rhythm: { events, meter: FOUR_FOUR },
    transposable: 'octave',
    source,
  }
}

// ascending then descending one octave (16 scale-degree indices), the shape of
// a two-measure tonguing passage
const OCTAVE_UP_DOWN = [0, 1, 2, 3, 4, 5, 6, 7, 7, 6, 5, 4, 3, 2, 1, 0] as const
const repeat = <T,>(xs: readonly T[], n: number): T[] => Array.from({ length: n }, () => xs).flat()

// ── Studies (the deep-dive /studies page) ────────────────────────────────────
// Longer engine-safe passages rendered as rhythmic notation (RhythmStaff wraps
// onto multiple systems at a natural note size). Single voice, no tuplets/ties —
// within the bounded rhythm engine (docs/decisions/0004).

const EIGHTH = 0.5

/**
 * Beats for a run played in eighths that ends on a quarter — a clean phrase
 * ending (the held tonic) instead of a lone eighth followed by a rest. n notes
 * → (n−1) eighths + one quarter, which lands on whole beats for odd n.
 */
const endOnQuarter = (n: number): number[] => [...repeat([EIGHTH], n - 1), 1]

/** Ascend degrees 0..n then descend back to 0 (top not repeated): 2n+1 notes. */
function scaleUpDown(n = 7): number[] {
  const up = Array.from({ length: n + 1 }, (_, i) => i)
  return [...up, ...up.slice(0, -1).reverse()]
}

/** Broken thirds up one octave: (0,2)(1,3)…(6,8) then the octave tonic (15 notes). */
function thirdsUp(): number[] {
  const out: number[] = []
  for (let d = 0; d <= 6; d++) out.push(d, d + 2)
  out.push(7)
  return out
}

/**
 * A rhythmic study from spelled notes + a matching beats array, with optional
 * trailing rests (beats, no note) that round the passage out to whole measures.
 * Same shape as `articulation` but any category and rest-aware.
 */
function rhythmicStudy(
  id: string,
  category: WarmupCategory,
  title: string,
  notes: SpelledNote[],
  beats: readonly number[],
  bpm: number,
  instruction: string,
  trailingRests: readonly number[] = [],
  source?: WarmupSource,
  keySig?: KeySignature,
): WarmupExercise {
  const events: RhythmEvent[] = [
    ...notes.map((n, i) => ({ note: n, beats: beats[i] })),
    ...trailingRests.map((b) => ({ beats: b })),
  ]
  return {
    id,
    category,
    title,
    instruction,
    spelled: notes,
    midi: notes.map((n) => n.midi),
    playback: rhythmPlayback(events, bpm),
    rhythm: { events, meter: FOUR_FOUR },
    transposable: 'octave',
    source,
    keySig,
  }
}

/** Arban — one-octave major scale, up and down in even eighths (two measures). */
function majorScaleStudy(clef: Clef): WarmupExercise {
  const notes = scaleNotes(clef, scaleUpDown())
  return rhythmicStudy(
    'scale:major',
    'scales',
    'Major scale — one octave',
    notes,
    endOnQuarter(notes.length), // 14 eighths + a held quarter (no trailing rest)
    96,
    'Even eighth notes, ascending and descending — land on the held tonic.',
    [],
    ARBAN,
    majorSig(C), // C major — no accidentals
  )
}

/** Arban — broken thirds up the major scale, even eighths (two measures). */
function thirdsStudy(clef: Clef): WarmupExercise {
  const notes = scaleNotes(clef, thirdsUp())
  return rhythmicStudy(
    'thirds:major',
    'thirds',
    'Study in thirds',
    notes,
    endOnQuarter(notes.length),
    88,
    'Broken thirds up the scale — keep each pair even and connected.',
    [],
    ARBAN,
    majorSig(C),
  )
}

/** Natural minor scale, one octave up and down in even eighths (two measures). */
function minorScaleStudy(clef: Clef): WarmupExercise {
  const notes = diatonicNotes(clef, C, MINOR_INTERVALS, scaleUpDown())
  return rhythmicStudy(
    'scale:minor',
    'scales',
    'Natural minor scale — one octave',
    notes,
    endOnQuarter(notes.length),
    96,
    'C natural minor — even eighths up and down. The 3rd, 6th, and 7th sit in the key signature.',
    [],
    undefined, // generative — no provenance
    minorSig(C), // three flats (B♭ E♭ A♭)
  )
}

// ── Etudes (longer, full-page passages) ──────────────────────────────────────
// Multi-measure studies that wrap across several staff systems at natural note
// size. Still single-voice, no tuplets/ties.

/** Keys for the scale-cycle etude: C, G, D, A — up the circle of fifths. */
const CYCLE_KEYS: readonly Tonic[] = [
  { letter: 'C', alter: 0 },
  { letter: 'G', alter: 0 },
  { letter: 'D', alter: 0 },
  { letter: 'A', alter: 0 },
]

/** A full-page scale etude: one-octave scales through four keys, even eighths. */
function scaleCycleEtude(clef: Clef): WarmupExercise {
  const events: RhythmEvent[] = []
  const spelled: SpelledNote[] = []
  for (const tonic of CYCLE_KEYS) {
    const notes = diatonicNotes(clef, tonic, MAJOR_INTERVALS, scaleUpDown())
    notes.forEach((n, i) => {
      // each key: 14 eighths then a held quarter — two clean measures, no rest
      events.push({ note: n, beats: i < notes.length - 1 ? EIGHTH : 1 })
      spelled.push(n)
    })
  }
  return {
    id: 'etude:scale-cycle',
    category: 'etudes',
    title: 'Scale cycle — C · G · D · A',
    instruction:
      'Four keys in a row, even eighths — each takes its own key signature (C, then 1, 2, 3 sharps).',
    spelled,
    midi: spelled.map((n) => n.midi),
    playback: rhythmPlayback(events, 100),
    rhythm: { events, meter: FOUR_FOUR },
    transposable: 'octave',
    source: ARBAN,
    // one signature per measure; each key is two measures, so the signature
    // changes every two — the renderer starts a fresh line at each change.
    keySig: CYCLE_KEYS.flatMap((t) => [majorSig(t), majorSig(t)]),
  }
}

/** A full-page tonguing etude: the octave up-and-down in sixteenths, ×4 (four measures). */
function articulationEtude(clef: Clef): WarmupExercise {
  const notes = scaleNotes(clef, repeat(OCTAVE_UP_DOWN, 4))
  return rhythmicStudy(
    'etude:artic',
    'etudes',
    'Articulation endurance',
    notes,
    repeat([0.25], notes.length), // 64 sixteenths = four 4/4 measures
    92,
    'Four measures of even single tonguing — stay light and relaxed; build endurance.',
  )
}

const F_MAJOR: Tonic = { letter: 'F', alter: 0 }
const ARP_FIGURE = [0, 2, 4, 7, 9, 7, 4, 2, 0, 2, 4, 7, 4, 2, 0] as const // broken F-major triad
const SCALE_DOWN_UP = [7, 6, 5, 4, 3, 2, 1, 0, 1, 2, 3, 4, 5, 6, 7] as const

/**
 * An eight-bar F-major etude read continuously: four two-bar phrases — scale,
 * thirds, arpeggio, scale — each in even eighths ending on a held quarter, under
 * one key signature. A longer, single-key study (no forced line breaks) built
 * in-house from the method's scale/arpeggio material.
 */
function fMajorEtude(clef: Clef): WarmupExercise {
  const phrases = [scaleUpDown(), thirdsUp(), [...ARP_FIGURE], [...SCALE_DOWN_UP]]
  const events: RhythmEvent[] = []
  const spelled: SpelledNote[] = []
  for (const degrees of phrases) {
    const notes = diatonicNotes(clef, F_MAJOR, MAJOR_INTERVALS, degrees)
    notes.forEach((n, i) => {
      events.push({ note: n, beats: i < notes.length - 1 ? EIGHTH : 1 }) // phrase ends on a quarter
      spelled.push(n)
    })
  }
  return {
    id: 'etude:fmajor',
    category: 'etudes',
    title: 'F major study — scales, thirds & arpeggio',
    instruction: 'Eight continuous bars in F major — connect the phrases, breathe on the held notes.',
    spelled,
    midi: spelled.map((n) => n.midi),
    playback: rhythmPlayback(events, 92),
    rhythm: { events, meter: FOUR_FOUR },
    transposable: 'octave',
    source: ARBAN,
    keySig: majorSig(F_MAJOR), // one flat, held across all eight bars
  }
}

// ── Library ─────────────────────────────────────────────────────────────────

/** The full warm-up library, grouped by category, in the given clef register. */
export function warmupLibrary(clef: Clef): Record<DailyCategory, WarmupExercise[]> {
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
    articulation: [
      articulation(
        'artic:single',
        'Single tonguing',
        scaleNotes(clef, OCTAVE_UP_DOWN),
        repeat([0.5], 16), // sixteen eighths — two 4/4 measures
        100,
        'Tongue each note evenly — Ta, Ta, Ta. Keep the air steady behind the tongue.',
      ),
      articulation(
        'artic:dotted',
        'Dotted articulation',
        scaleNotes(clef, OCTAVE_UP_DOWN),
        repeat([0.75, 0.25], 8), // dotted-eighth + sixteenth on every beat, two measures
        88,
        'Long–short: a dotted eighth then a sixteenth on every beat.',
      ),
      articulation(
        'artic:arban',
        'Arban — sixteenth-note study',
        scaleNotes(clef, [...OCTAVE_UP_DOWN, ...OCTAVE_UP_DOWN]),
        repeat([0.25], 32), // thirty-two sixteenths — two measures
        84,
        'Even, light single tongue up and back down — stay relaxed at speed.',
        ARBAN,
      ),
    ],
  }
}

/**
 * The deep-dive study library, grouped by STUDY_CATEGORIES, in the clef
 * register. A fuller set than the daily routine: more flexibility slurs, the
 * scale and thirds studies, and every arpeggio. Curated items (scales, thirds,
 * the longer slur, and the Arban arpeggio/sixteenth/long-tone studies) carry
 * public-domain 1864 provenance — transcribed in-house, per docs/decisions/0003.
 */
export function arbanStudyLibrary(clef: Clef): Record<WarmupCategory, WarmupExercise[]> {
  return {
    'long-tones': [
      longTonePattern('long:arban', 'Sustained scale', [0, 1, 2, 3, 4, 3, 2, 1, 0], clef, ARBAN),
      longTonePattern('long:desc5', 'Descending five-note', [4, 3, 2, 1, 0], clef),
    ],
    'lip-flexibility': [
      slurPattern('slur:121', 'Two-partial slur', [1, 2, 1], clef),
      slurPattern('slur:12321', 'Three-partial slur', [1, 2, 3, 2, 1], clef),
      slurPattern('slur:1234', 'Four-partial slur', [1, 2, 3, 4, 3, 2, 1], clef),
      slurPattern('slur:135', 'Wide-interval slur (1–3–5)', [1, 3, 5, 3, 1], clef),
      slurPattern('slur:arban', 'Arban — slur study', [1, 2, 3, 2, 1, 2, 1], clef, ARBAN),
      slurPattern('slur:12345', 'Extended flexibility study', [1, 2, 3, 4, 5, 4, 3, 2, 1], clef, ARBAN),
    ],
    scales: [majorScaleStudy(clef), minorScaleStudy(clef)],
    thirds: [thirdsStudy(clef)],
    arpeggios: [
      arpeggio(C, chord('maj'), clef),
      arpeggio(C, chord('min'), clef),
      arpeggio(C, chord('dim'), clef),
      arpeggio(C, chord('dom7'), clef),
      arpeggio(C, chord('maj7'), clef),
      arpeggio(C, chord('min7'), clef),
      arbanArpeggio(clef),
    ],
    articulation: [
      articulation(
        'artic:dotted',
        'Dotted articulation',
        scaleNotes(clef, OCTAVE_UP_DOWN),
        repeat([0.75, 0.25], 8),
        88,
        'Long–short: a dotted eighth then a sixteenth on every beat.',
      ),
      articulation(
        'artic:arban',
        'Arban — sixteenth-note study',
        scaleNotes(clef, [...OCTAVE_UP_DOWN, ...OCTAVE_UP_DOWN]),
        repeat([0.25], 32),
        84,
        'Even, light single tongue up and back down — stay relaxed at speed.',
        ARBAN,
      ),
    ],
    etudes: [fMajorEtude(clef), scaleCycleEtude(clef), articulationEtude(clef)],
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
    rhythm: ex.rhythm && {
      ...ex.rhythm,
      events: ex.rhythm.events.map((e) =>
        e.note ? { ...e, note: { ...e.note, midi: e.note.midi + d } } : e,
      ),
    },
  }
}

// ── Transpose resolution ─────────────────────────────────────────────────────
// The Studies and Workouts views share this: given raw persisted octave/key
// offsets, produce the transposed exercise plus whether the octave buttons can
// still move (kept in core so the range math is tested, not re-derived per view).

export const MAX_OCTAVE_SHIFT = 2
const MIN_MIDI = 21 // A0
const MAX_MIDI = 108 // C8

/** Clamp an octave shift to ±2 and keep every note inside the piano range. */
export function clampOctaveShift(ex: WarmupExercise, shift: number): number {
  let s = Math.max(-MAX_OCTAVE_SHIFT, Math.min(MAX_OCTAVE_SHIFT, shift))
  const lo = Math.min(...ex.midi)
  const hi = Math.max(...ex.midi)
  while (s < 0 && lo + s * 12 < MIN_MIDI) s++
  while (s > 0 && hi + s * 12 > MAX_MIDI) s--
  return s
}

export interface ResolvedWarmup {
  ex: WarmupExercise
  shift: number
  keyOffset: number
  canOctaveUp: boolean
  canOctaveDown: boolean
}

/** Apply persisted key + octave offsets and report remaining octave headroom. */
export function resolveWarmup(
  base: WarmupExercise,
  clef: Clef,
  rawOctave: number,
  rawKey: number,
): ResolvedWarmup {
  const keyOffset = mod(rawKey, 12)
  const keyed = rekeyWarmup(base, keyOffset, clef)
  const shift = clampOctaveShift(keyed, rawOctave)
  const ex = shiftWarmup(keyed, shift)
  const lo = Math.min(...ex.midi)
  const hi = Math.max(...ex.midi)
  return {
    ex,
    shift,
    keyOffset,
    canOctaveUp: shift < MAX_OCTAVE_SHIFT && hi + 12 <= MAX_MIDI,
    canOctaveDown: shift > -MAX_OCTAVE_SHIFT && lo - 12 >= MIN_MIDI,
  }
}

// ── Workouts (guided full-page routines) ─────────────────────────────────────
// A workout is an ordered list of study ids presented as one page. Completion
// reuses the Studies page's per-item done-set (study:<date>), so a study marked
// done in a workout shows done in the browser too.

export interface Workout {
  id: string
  title: string
  description: string
  itemIds: readonly string[]
}

export const WORKOUTS: readonly Workout[] = [
  {
    id: 'flexibility',
    title: 'Flexibility workout',
    description: 'Open up the range — slurs from two partials up to five, then a long-tone cooldown.',
    itemIds: ['slur:121', 'slur:12321', 'slur:1234', 'slur:12345', 'long:desc5'],
  },
  {
    id: 'technique',
    title: 'Technique workout',
    description: 'Scales, thirds, an arpeggio, and a tonguing study — a full technical round.',
    itemIds: ['scale:major', 'scale:minor', 'thirds:major', 'arp:maj', 'artic:arban'],
  },
  {
    id: 'daily',
    title: 'Daily warm-up',
    description: 'A short everyday routine: long tones, a slur, a scale, an arpeggio, light tonguing.',
    itemIds: ['long:arban', 'slur:12321', 'scale:major', 'arp:maj', 'artic:dotted'],
  },
]

/** Resolve a workout's item ids to exercises from the study library, in order. */
export function buildWorkout(
  id: string,
  clef: Clef,
): { workout: Workout; exercises: WarmupExercise[] } | undefined {
  const workout = WORKOUTS.find((w) => w.id === id)
  if (!workout) return undefined
  const byId = new Map(
    Object.values(arbanStudyLibrary(clef))
      .flat()
      .map((e) => [e.id, e] as const),
  )
  const exercises = workout.itemIds
    .map((iid) => byId.get(iid))
    .filter((e): e is WarmupExercise => e !== undefined)
  return { workout, exercises }
}
