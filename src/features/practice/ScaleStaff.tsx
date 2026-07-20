// One-octave scale run on a staff, rendered as hand-rolled SVG. Layout math
// (steps, ledger lines) is pure in core/notation/staff.ts; this component
// only maps steps to pixels. See docs/decisions/0001-notation-rendering.md.

import type { SpelledNote } from '../../core/assignments'
import { staffLayout, type Clef } from '../../core/notation/staff'
import { accidentalGlyph } from '../../core/theory/keys'

const STEP = 4 // px per diatonic step; staff lines every 2 steps
const TOP_LINE_Y = 10 // y of step 8 (top line)
const y = (step: number) => TOP_LINE_Y + (8 - step) * STEP

const NOTE_X0 = 68 // first note head center
const NOTE_DX = 30
const WIDTH = NOTE_X0 + 7 * NOTE_DX + 22
const HEIGHT = 76

// Minimal line-art clefs, drawn as strokes to match the app's aesthetic.
// Treble: bowl around the G line (y 34), spine, top curl, tail hook.
const TREBLE_PATH =
  'M 23 34 C 26 31, 28 34, 26 38 C 24 42, 16 42, 14 37 ' +
  'C 12 31, 18 25, 23 20 C 27 16, 29 12, 28 7 C 27 3, 23 3, 22 8 L 25 52 C 26 58, 20 61, 17 57'
// Bass: comma sweep starting from a head on the F line (y 18), plus two dots.
const BASS_PATH = 'M 13 20 C 10 12, 18 6, 24 9 C 30 12, 30 21, 24 29 C 21 33, 17 36, 13 39'
// C clef (alto/tenor): vertical bar + two curls meeting at the clef line;
// drawn centered on y 0 and translated to the right line per clef.
const C_CLEF_BAR = 'M 13 -16 L 13 16'
const C_CLEF_CURLS =
  'M 17 0 C 24 0, 27 -4, 25 -10 C 24 -14, 18 -14, 18 -9 ' +
  'M 17 0 C 24 0, 27 4, 25 10 C 24 14, 18 14, 18 9'

function ClefGlyph({ clef }: { clef: Clef }) {
  switch (clef) {
    case 'treble':
      return <path className="staff-clef" d={TREBLE_PATH} />
    case 'bass':
      return (
        <g>
          <path className="staff-clef" d={BASS_PATH} />
          <circle className="staff-clef-dot" cx={14.5} cy={18} r={2.4} />
          <circle className="staff-clef-dot" cx={33} cy={14.5} r={1.7} />
          <circle className="staff-clef-dot" cx={33} cy={21.5} r={1.7} />
        </g>
      )
    case 'alto':
    case 'tenor': {
      // alto: C clef on the middle line (y 26); tenor: on the 4th line (y 18)
      const cy = clef === 'alto' ? y(4) : y(6)
      return (
        <g className="staff-clef-group" transform={`translate(0 ${cy})`}>
          <path className="staff-clef" d={C_CLEF_BAR} />
          <path className="staff-clef" d={C_CLEF_CURLS} />
        </g>
      )
    }
  }
}

export function ScaleStaff({
  spelled,
  clef,
  label,
}: {
  spelled: SpelledNote[]
  clef: Clef
  label: string
}) {
  const notes = staffLayout(spelled, clef)
  return (
    <svg
      className="scale-staff"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={`${label}, ${clef} clef`}
    >
      <g className="staff-lines">
        {[0, 2, 4, 6, 8].map((s) => (
          <line key={s} x1={6} y1={y(s)} x2={WIDTH - 6} y2={y(s)} />
        ))}
      </g>
      <ClefGlyph clef={clef} />
      {notes.map((n, i) => {
        const cx = NOTE_X0 + i * NOTE_DX
        return (
          <g key={i} className="staff-note">
            {n.ledgerSteps.map((s) => (
              <line key={s} className="staff-ledger" x1={cx - 10} y1={y(s)} x2={cx + 10} y2={y(s)} />
            ))}
            {n.alter !== 0 && (
              <text className="staff-accidental" x={cx - 14} y={y(n.step) + 4}>
                {accidentalGlyph(n.alter)}
              </text>
            )}
            <ellipse className="staff-head" cx={cx} cy={y(n.step)} rx={6} ry={4.2} />
          </g>
        )
      })}
    </svg>
  )
}
