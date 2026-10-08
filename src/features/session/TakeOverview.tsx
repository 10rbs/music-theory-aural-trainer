import { useRef, type PointerEvent } from 'react'
import { toEnvelopeShapes, type LevelSample } from '../../core/pitch/level'

const W = 600
const H = 36

/**
 * The whole take's shape at a glance, with the main timeline's current view
 * highlighted. Tap or drag to jump there.
 */
export function TakeOverview({
  level,
  startMs,
  endMs,
  viewEnd,
  windowMs,
  playheadT,
  onSeek,
}: {
  level: LevelSample[]
  startMs: number
  endMs: number
  viewEnd: number
  windowMs: number
  playheadT: number
  onSeek: (t: number) => void
}) {
  const span = Math.max(endMs - startMs, 1)
  const xOf = (t: number) => ((t - startMs) / span) * W
  const shapes = toEnvelopeShapes(level, endMs, span, W, H)
  const dragging = useRef(false)
  const seek = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const f = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    onSeek(startMs + f * span)
  }
  const viewX = Math.max(0, xOf(viewEnd - windowMs))

  return (
    <svg
      className="take-overview"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Whole take overview"
      onPointerDown={(e) => {
        dragging.current = true
        e.currentTarget.setPointerCapture(e.pointerId)
        seek(e)
      }}
      onPointerMove={(e) => dragging.current && seek(e)}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
    >
      <rect x={0} y={0} width={W} height={H} className="lane-bg" />
      {shapes.map((shape, i) => (
        <polygon
          key={i}
          points={shape.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
          className="shape-fill"
        />
      ))}
      <rect x={viewX} y={0} width={xOf(viewEnd) - viewX} height={H} className="overview-view" />
      <line x1={xOf(playheadT)} y1={0} x2={xOf(playheadT)} y2={H} className="playhead" />
    </svg>
  )
}
