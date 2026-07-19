import { IN_TUNE_CENTS, toSegments, type PitchSample } from '../../core/pitch/history'

const W = 300
const H = 120
export const GRAPH_WINDOW_MS = 8000

/** Scrolling cents-over-time trace (TE-style): right edge = now, center = in tune. */
export function PitchGraph({ samples, now }: { samples: PitchSample[]; now: number }) {
  const segments = toSegments(samples, now, GRAPH_WINDOW_MS, W, H)
  const bandHalf = (IN_TUNE_CENTS / 50) * (H / 2)

  return (
    <svg
      className="pitch-graph"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Pitch history"
    >
      <rect x={0} y={H / 2 - bandHalf} width={W} height={bandHalf * 2} className="pitch-band" />
      <line x1={0} y1={H / 2} x2={W} y2={H / 2} className="pitch-center" />
      {segments.map((seg, i) =>
        seg.points.length === 1 ? (
          <circle
            key={i}
            cx={seg.points[0].x}
            cy={seg.points[0].y}
            r={2}
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
    </svg>
  )
}
