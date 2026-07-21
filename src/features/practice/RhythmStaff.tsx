// Rhythmic notation on a staff, rendered as hand-rolled SVG. Layout (values,
// stems, flags, beams, bar lines, and wrapping into systems) is pure in
// core/notation/rhythm.ts; this maps steps to pixels and draws heads, stems,
// flags, beams, rests, dots, bar lines and the time signature. A passage of more
// than one line is stacked as several systems. See docs/decisions/0001 and 0004.

import {
  rhythmLayout,
  SECONDARY_OFFSET,
  STEM_STEPS,
  type Beam,
  type Meter,
  type RhythmEvent,
  type RhythmGlyph,
  type RhythmSystem,
} from '../../core/notation/rhythm'
import { type Clef } from '../../core/notation/staff'
import { accidentalGlyph } from '../../core/theory/keys'
import { ClefGlyph, CLEF_OVERHANG } from './staff-glyphs'

const STEP = 4 // px per diatonic step
const PAD = 6
const SYSTEM_GAP = 16 // px between stacked staff lines
const HEAD_RX = 6
const HEAD_RY = 4.2
const STEM_DX = 5 // stem offset from head center
const TS_X = 48 // time-signature x — clear of the clef (incl. the bass-clef dots)

const beamMap = (sys: RhythmSystem) => new Map(sys.beams.map((b) => [b.id, b]))

const stemEndStep = (g: RhythmGlyph, beams: Map<number, Beam>) =>
  g.beamId !== null ? beams.get(g.beamId)!.beamStep : g.step + (g.stemUp ? STEM_STEPS : -STEM_STEPS)

export function RhythmStaff({
  events,
  meter,
  clef = 'treble',
  label,
}: {
  events: RhythmEvent[]
  meter: Meter
  clef?: Clef
  label: string
}) {
  const { systems, width } = rhythmLayout(events, meter, clef)

  // one vertical band, sized to the tallest content across every system, so all
  // staff lines are evenly spaced
  const marks: number[] = [8 + CLEF_OVERHANG, -CLEF_OVERHANG]
  for (const sys of systems) {
    const beams = beamMap(sys)
    for (const g of sys.glyphs) {
      marks.push(g.step, ...g.ledgerSteps)
      if (!g.isRest && g.value >= 2) marks.push(stemEndStep(g, beams))
    }
    for (const b of sys.beams) {
      marks.push(b.beamStep, b.beamStep + (b.stemUp ? -SECONDARY_OFFSET : SECONDARY_OFFSET))
    }
  }
  const maxStep = Math.max(...marks) + 2
  const minStep = Math.min(...marks) - 2
  const band = 2 * PAD + (maxStep - minStep) * STEP
  const height = systems.length * band + (systems.length - 1) * SYSTEM_GAP

  const yFor = (i: number) => (step: number) => i * (band + SYSTEM_GAP) + PAD + (maxStep - step) * STEP

  return (
    <svg
      className="rhythm-staff"
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: `${width}px`, maxWidth: '100%' }}
      role="img"
      aria-label={`${label}, ${clef} clef, ${meter.beats}/${meter.unit}${systems.length > 1 ? `, ${systems.length} lines` : ''}`}
    >
      {systems.map((sys, i) => (
        <System key={i} sys={sys} clef={clef} meter={meter} y={yFor(i)} />
      ))}
    </svg>
  )
}

function System({
  sys,
  clef,
  meter,
  y,
}: {
  sys: RhythmSystem
  clef: Clef
  meter: Meter
  y: (step: number) => number
}) {
  const beams = beamMap(sys)
  return (
    <g className="rhythm-system">
      <g className="staff-lines">
        {[0, 2, 4, 6, 8].map((s) => (
          <line key={s} x1={6} y1={y(s)} x2={sys.width - 6} y2={y(s)} />
        ))}
      </g>
      <ClefGlyph clef={clef} y={y} />

      {sys.showTimeSig && (
        <>
          <text className="staff-timesig" x={TS_X} y={y(6) + 4}>
            {meter.beats}
          </text>
          <text className="staff-timesig" x={TS_X} y={y(2) + 4}>
            {meter.unit}
          </text>
        </>
      )}

      {[...sys.barlines, sys.width - 4].map((bx, i) => (
        <line key={i} className="staff-barline" x1={bx} y1={y(8)} x2={bx} y2={y(0)} />
      ))}

      {sys.beams.map((b) => {
        const dx = b.stemUp ? STEM_DX : -STEM_DX
        const secStep = b.beamStep + (b.stemUp ? -SECONDARY_OFFSET : SECONDARY_OFFSET)
        return (
          <g key={b.id} className="staff-beam">
            <line x1={b.x0 + dx} y1={y(b.beamStep)} x2={b.x1 + dx} y2={y(b.beamStep)} />
            {b.secondary.map(([sx0, sx1], j) => (
              <line key={j} x1={sx0 + dx} y1={y(secStep)} x2={sx1 + dx} y2={y(secStep)} />
            ))}
          </g>
        )
      })}

      {sys.glyphs.map((g, i) =>
        g.isRest ? (
          <Rest key={i} x={g.x} value={g.value} dots={g.dots} y={y} />
        ) : (
          <Note key={i} g={g} stemEndStep={stemEndStep(g, beams)} y={y} />
        ),
      )}
    </g>
  )
}

function Note({
  g,
  stemEndStep,
  y,
}: {
  g: RhythmGlyph
  stemEndStep: number
  y: (step: number) => number
}) {
  const cx = g.x
  const cy = y(g.step)
  const open = g.value <= 2 // half + whole are open heads
  const stemX = cx + (g.stemUp ? STEM_DX : -STEM_DX)
  return (
    <g className="staff-note">
      {g.ledgerSteps.map((s) => (
        <line key={s} className="staff-ledger" x1={cx - 10} y1={y(s)} x2={cx + 10} y2={y(s)} />
      ))}
      {g.alter !== 0 && (
        <text className="staff-accidental" x={cx - 14} y={cy + 4}>
          {accidentalGlyph(g.alter)}
        </text>
      )}
      <ellipse
        className={open ? 'staff-head' : 'staff-head-filled'}
        cx={cx}
        cy={cy}
        rx={HEAD_RX}
        ry={HEAD_RY}
      />
      {g.dots === 1 && <circle className="staff-dot" cx={cx + HEAD_RX + 4} cy={cy} r={1.5} />}
      {g.value >= 2 && <line className="staff-stem" x1={stemX} y1={cy} x2={stemX} y2={y(stemEndStep)} />}
      {g.beamId === null && g.flags > 0 && (
        <Flags x={stemX} yTip={y(stemEndStep)} stemUp={g.stemUp} count={g.flags} />
      )}
    </g>
  )
}

/** Unbeamed eighth/sixteenth flags, drawn at the stem tip. */
function Flags({ x, yTip, stemUp, count }: { x: number; yTip: number; stemUp: boolean; count: number }) {
  const dir = stemUp ? 1 : -1 // flags curl downward from an up-stem tip
  return (
    <g className="staff-flag">
      {Array.from({ length: count }, (_, k) => {
        const yy = yTip + dir * (k * 5)
        return <path key={k} d={`M ${x} ${yy} q 7 3 5 11`} />
      })}
    </g>
  )
}

/** Simplified but recognizable rest shapes, centered near the middle line. */
function Rest({ x, value, dots, y }: { x: number; value: number; dots: 0 | 1; y: (s: number) => number }) {
  const dot = dots === 1 ? <circle className="staff-dot" cx={x + 7} cy={y(5)} r={1.5} /> : null
  if (value === 1)
    return (
      <g className="staff-rest">
        <rect x={x - 5} y={y(6)} width={10} height={3} />
        {dot}
      </g>
    )
  if (value === 2)
    return (
      <g className="staff-rest">
        <rect x={x - 5} y={y(4) - 3} width={10} height={3} />
        {dot}
      </g>
    )
  if (value === 4)
    return (
      <g className="staff-rest">
        <path
          className="staff-rest-stroke"
          d={`M ${x - 3} ${y(7)} L ${x + 3} ${y(5.5)} L ${x - 3} ${y(4)} L ${x + 3} ${y(2.5)} q -6 1 -1 -2`}
        />
        {dot}
      </g>
    )
  return (
    <g className="staff-rest">
      <line className="staff-rest-stroke" x1={x + 3} y1={y(6)} x2={x - 3} y2={y(2)} />
      {Array.from({ length: value === 16 ? 2 : 1 }, (_, k) => (
        <circle key={k} cx={x + 3} cy={y(6 - k * 1.6)} r={1.7} />
      ))}
      {dot}
    </g>
  )
}
