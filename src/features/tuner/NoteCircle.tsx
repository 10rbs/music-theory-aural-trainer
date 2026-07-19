import { NOTE_NAMES } from '../../core/theory/notes'

const SIZE = 240
const C = SIZE / 2
const RING_R = 96
const NOTE_R = 19

interface NoteCircleProps {
  /** Pitch class of the running drone, or null. */
  dronePc: number | null
  /** Pitch class currently heard by the mic, or null. */
  detectedPc: number | null
  onTap: (pc: number) => void
}

/** TE-style circle of the 12 pitch classes. Tap a note to toggle its drone. */
export function NoteCircle({ dronePc, detectedPc, onTap }: NoteCircleProps) {
  return (
    <svg className="note-circle" viewBox={`0 0 ${SIZE} ${SIZE}`} role="group" aria-label="Drone note circle">
      <circle cx={C} cy={C} r={RING_R} className="note-ring" />
      {NOTE_NAMES.map((name, pc) => {
        const angle = (pc / 12) * 2 * Math.PI - Math.PI / 2 // C at 12 o'clock, clockwise
        const x = C + RING_R * Math.cos(angle)
        const y = C + RING_R * Math.sin(angle)
        const cls = `note-btn${pc === dronePc ? ' droning' : ''}${pc === detectedPc ? ' heard' : ''}`
        return (
          <g
            key={name}
            className={cls}
            onClick={() => onTap(pc)}
            role="button"
            aria-label={`Drone ${name}`}
            aria-pressed={pc === dronePc}
          >
            <circle cx={x} cy={y} r={NOTE_R} />
            <text x={x} y={y} textAnchor="middle" dominantBaseline="central">
              {name}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
