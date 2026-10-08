import { IN_TUNE_CENTS, toSegments, type PitchSample } from '../../core/pitch/history'
import { toEnvelopeShapes, type LevelSample } from '../../core/pitch/level'
import { rateNote, type NoteSummary } from '../../core/pitch/notes'
import { midiToName } from '../../core/theory/notes'

const W = 600
const PITCH_H = 150
const LABEL_H = 24 // note-name strip between the lanes
const SHAPE_H = 110
const H = PITCH_H + LABEL_H + SHAPE_H

/**
 * Pitch and shape of the sound on one scrolling time axis (right edge = now):
 * top lane is the cents trace (center = in tune), bottom lane is the
 * amplitude envelope mirrored like a recording app's waveform. Finished notes
 * are labelled between the lanes so each blob lines up with its tuning.
 */
export function SessionTimeline({
  pitch,
  level,
  notes,
  now,
  windowMs,
  selectedT,
}: {
  pitch: PitchSample[]
  level: LevelSample[]
  notes: NoteSummary[]
  now: number
  windowMs: number
  selectedT: number | null
}) {
  const segments = toSegments(pitch, now, windowMs, W, PITCH_H)
  const shapes = toEnvelopeShapes(level, now, windowMs, W, SHAPE_H)
  const bandHalf = (IN_TUNE_CENTS / 50) * (PITCH_H / 2)
  const xOf = (t: number) => ((t - (now - windowMs)) / windowMs) * W
  const visible = notes.filter((n) => n.endT >= now - windowMs)

  return (
    <svg
      className="session-timeline"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Pitch and note shape over time"
    >
      {/* pitch lane */}
      <rect x={0} y={0} width={W} height={PITCH_H} className="lane-bg" />
      <rect x={0} y={PITCH_H / 2 - bandHalf} width={W} height={bandHalf * 2} className="pitch-band" />
      <line x1={0} y1={PITCH_H / 2} x2={W} y2={PITCH_H / 2} className="pitch-center" />
      <text x={6} y={14} className="lane-label">
        pitch · +50¢
      </text>
      <text x={6} y={PITCH_H - 6} className="lane-label">
        −50¢
      </text>
      {segments.map((seg, i) =>
        seg.points.length === 1 ? (
          <circle
            key={i}
            cx={seg.points[0].x}
            cy={seg.points[0].y}
            r={2.5}
            className={`pitch-trace${seg.inTune ? ' in-tune' : ''}`}
          />
        ) : (
          <polyline
            key={i}
            points={seg.points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
            className={`pitch-trace${seg.inTune ? ' in-tune' : ''}`}
          />
        ),
      )}

      {/* note labels */}
      {visible.map((n) => {
        const x = Math.max(xOf(n.startT), 0)
        const width = Math.max(xOf(n.endT) - x, 2)
        const r = rateNote(n).tuning
        const cents = Math.round(n.avgCents)
        return (
          <g key={n.startT} className={`note-mark rating-${r}${n.startT === selectedT ? ' selected' : ''}`}>
            <rect x={x} y={PITCH_H + 4} width={width} height={LABEL_H - 8} rx={3} />
            <text x={x + 4} y={PITCH_H + LABEL_H / 2 + 4}>
              {midiToName(n.midi)} {cents > 0 ? '+' : ''}
              {cents}¢
            </text>
          </g>
        )
      })}

      {/* shape lane */}
      <g transform={`translate(0 ${PITCH_H + LABEL_H})`}>
        <rect x={0} y={0} width={W} height={SHAPE_H} className="lane-bg" />
        <line x1={0} y1={SHAPE_H / 2} x2={W} y2={SHAPE_H / 2} className="shape-center" />
        <text x={6} y={14} className="lane-label">
          shape
        </text>
        {shapes.map((shape, i) => (
          <polygon
            key={i}
            points={shape.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
            className="shape-fill"
          />
        ))}
      </g>
    </svg>
  )
}
