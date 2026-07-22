// Shared hand-drawn clef glyphs + the vertical reach they need, used by both
// ScaleStaff and RhythmStaff. Drawn as strokes to match the app's aesthetic;
// the caller passes a `y(step)` mapping from staff steps to pixels. See
// docs/decisions/0001-notation-rendering.md.

import { type Clef } from '../../core/notation/staff'

// vertical reach of the clef glyphs in steps beyond the staff (treble's tail
// and top curl stick out ~2.5 steps either side)
export const CLEF_OVERHANG = 3

// The fixed paths assume the staff's top line at y=10; they get translated to
// the live frame at render time. Treble: bowl around the G line (y 34), spine,
// top curl, tail hook.
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

export function ClefGlyph({ clef, y }: { clef: Clef; y: (step: number) => number }) {
  // the fixed paths assume top line at y=10; shift them to the live frame
  const dy = y(8) - 10
  switch (clef) {
    case 'treble':
      return <path className="staff-clef" d={TREBLE_PATH} transform={`translate(0 ${dy})`} />
    case 'bass':
      return (
        <g transform={`translate(0 ${dy})`}>
          <path className="staff-clef" d={BASS_PATH} />
          <circle className="staff-clef-dot" cx={14.5} cy={18} r={2.4} />
          <circle className="staff-clef-dot" cx={33} cy={14.5} r={1.7} />
          <circle className="staff-clef-dot" cx={33} cy={21.5} r={1.7} />
        </g>
      )
    case 'alto':
    case 'tenor': {
      // alto: C clef on the middle line; tenor: on the 4th line
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
