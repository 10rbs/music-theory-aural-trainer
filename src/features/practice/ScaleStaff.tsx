// One-octave scale run on a staff, rendered as hand-rolled SVG. Layout math
// (steps, ledger lines, key-signature positions) is pure in core/notation/;
// this component only maps steps to pixels. The viewBox grows vertically to fit
// whatever ledger-line range the run needs (octave shifts can push it well off
// the staff) and horizontally to make room for the key signature. See
// docs/decisions/0001-notation-rendering.md.

import type { SpelledNote } from '../../core/assignments'
import {
  inlineAlter,
  keySignatureLayout,
  signatureMap,
  type KeySignature,
} from '../../core/notation/key-signature'
import { staffLayout, type Clef } from '../../core/notation/staff'
import { accidentalGlyph } from '../../core/theory/keys'
import { ClefGlyph, CLEF_OVERHANG } from './staff-glyphs'

const STEP = 4 // px per diatonic step; staff lines every 2 steps
const PAD = 6 // px of breathing room above/below the outermost marks

const CLEF_END = 44 // right edge of the clef area
const SIG_DX = 9 // px between key-signature accidentals
const SIG_X0 = CLEF_END + 4 // first key-signature accidental center
const NOTE_GAP = 16 // px between the signature and the first note
const NOTE_DX = 30

const NATURAL = '♮'
const NONE: KeySignature = { type: 'none', count: 0, letters: [] }

export function ScaleStaff({
  spelled,
  clef,
  label,
  keySig = NONE,
}: {
  spelled: SpelledNote[]
  clef: Clef
  label: string
  keySig?: KeySignature
}) {
  const notes = staffLayout(spelled, clef)
  const sig = keySignatureLayout(keySig, clef)
  const sigMap = signatureMap(keySig)

  const noteX0 = CLEF_END + sig.length * SIG_DX + NOTE_GAP
  const width = noteX0 + 7 * NOTE_DX + 22

  // fit the staff, the clef's overhang, every note, and any key-signature
  // accidentals that sit off the staff (+1 step so glyphs aren't shaved)
  const marks = [...notes.map((n) => n.step), ...sig.map((a) => a.step)]
  const maxStep = Math.max(8 + CLEF_OVERHANG, Math.max(...marks) + 2)
  const minStep = Math.min(0 - CLEF_OVERHANG, Math.min(...marks) - 2)
  const y = (step: number) => PAD + (maxStep - step) * STEP
  const height = 2 * PAD + (maxStep - minStep) * STEP

  const sigLabel = keySig.type === 'none' ? '' : `, ${keySig.count} ${keySig.type}${keySig.count > 1 ? 's' : ''}`

  return (
    <svg
      className="scale-staff"
      viewBox={`0 0 ${width} ${height}`}
      style={{ aspectRatio: `${width} / ${height}` }}
      role="img"
      aria-label={`${label}, ${clef} clef${sigLabel}`}
    >
      <g className="staff-lines">
        {[0, 2, 4, 6, 8].map((s) => (
          <line key={s} x1={6} y1={y(s)} x2={width - 6} y2={y(s)} />
        ))}
      </g>
      <ClefGlyph clef={clef} y={y} />
      <g className="staff-keysig">
        {sig.map((a, i) => (
          <text key={i} className="staff-accidental" x={SIG_X0 + i * SIG_DX} y={y(a.step) + 4}>
            {accidentalGlyph(a.alter)}
          </text>
        ))}
      </g>
      {notes.map((n, i) => {
        const cx = noteX0 + i * NOTE_DX
        const inline = inlineAlter(sigMap, spelled[i])
        return (
          <g key={i} className="staff-note">
            {n.ledgerSteps.map((s) => (
              <line key={s} className="staff-ledger" x1={cx - 10} y1={y(s)} x2={cx + 10} y2={y(s)} />
            ))}
            {inline !== null && (
              <text className="staff-accidental" x={cx - 14} y={y(n.step) + 4}>
                {inline === 0 ? NATURAL : accidentalGlyph(inline)}
              </text>
            )}
            <ellipse className="staff-head" cx={cx} cy={y(n.step)} rx={6} ry={4.2} />
          </g>
        )
      })}
    </svg>
  )
}
