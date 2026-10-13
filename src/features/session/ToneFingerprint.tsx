import { HARMONIC_FLOOR_DB, type ReferenceTone, type Tone } from '../../core/pitch/timbre'
import { midiToFlatName } from '../../core/theory/notes'

const W = 360
const H = 130
const PAD_L = 30 // y-axis labels
const PAD_B = 18 // x-axis labels
const PLOT_H = H - PAD_B - 6
const GAP = 4

const yOf = (db: number) => 6 + PLOT_H * (db / HARMONIC_FLOOR_DB)
const fmtDb = (db: number) => `${Math.round(db)} dB`

/** Bar path with 4px rounded top corners, square at the baseline. */
function barPath(x: number, w: number, top: number, base: number) {
  const r = Math.min(4, w / 2, (base - top) / 2)
  if (r <= 0) return `M${x},${base}h${w}`
  return `M${x},${base}V${top + r}Q${x},${top} ${x + r},${top}H${x + w - r}Q${x + w},${top} ${x + w},${top + r}V${base}Z`
}

function delta(value: number, ref: number | undefined, fmt: (n: number) => string) {
  if (ref === undefined) return null
  const d = value - ref
  return `${d >= 0 ? '+' : '−'}${fmt(Math.abs(d))} vs ref`
}

/**
 * Tone colour for one note: harmonic strengths as bars (relative to the
 * strongest), the saved reference as tick marks over them, and the three
 * derived numbers. Descriptive, not graded — compare against yourself.
 */
export function ToneFingerprint({
  tone,
  midi,
  reference,
  onSave,
  onClear,
}: {
  tone: Tone
  midi: number
  reference: ReferenceTone | null
  onSave: () => void
  onClear: () => void
}) {
  const n = tone.harmonics.length
  const slot = (W - PAD_L) / n
  const barW = slot - GAP
  const base = yOf(HARMONIC_FLOOR_DB)
  const pct = (x: number) => `${Math.round(x * 100)}%`

  return (
    <div className="tone-section">
      <div className="tone-head">
        <h3>Tone colour</h3>
        <div className="tone-legend" aria-hidden="true">
          <span className="legend-swatch bar" /> This note
          {reference && (
            <>
              <span className="legend-swatch tick" /> Reference ({midiToFlatName(reference.midi)}, {reference.savedOn})
            </>
          )}
        </div>
      </div>

      <svg
        className="tone-fingerprint"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Harmonic strengths: ${tone.harmonics.map((d, i) => `${i + 1}: ${fmtDb(d)}`).join(', ')}`}
      >
        {[0, -20, -40].map((db) => (
          <g key={db}>
            <line x1={PAD_L} x2={W} y1={yOf(db)} y2={yOf(db)} className="fp-grid" />
            <text x={PAD_L - 4} y={yOf(db) + 4} className="fp-axis" textAnchor="end">
              {db}
            </text>
          </g>
        ))}
        {tone.harmonics.map((db, i) => {
          const x = PAD_L + i * slot + GAP / 2
          const refDb = reference?.harmonics[i]
          return (
            <g key={i}>
              <path d={barPath(x, barW, yOf(db), base)} className="fp-bar">
                <title>
                  {`Harmonic ${i + 1}: ${fmtDb(db)}${refDb !== undefined ? ` (reference ${fmtDb(refDb)})` : ''}`}
                </title>
              </path>
              {refDb !== undefined && (
                <line x1={x - 1} x2={x + barW + 1} y1={yOf(refDb)} y2={yOf(refDb)} className="fp-ref" />
              )}
              <text x={x + barW / 2} y={H - 4} className="fp-axis" textAnchor="middle">
                {i + 1}
              </text>
            </g>
          )
        })}
      </svg>

      <div className="note-metrics tone-metrics">
        <div className="note-metric">
          <span className="metric-label">Brightness</span>
          <span className="metric-value">{tone.brightness.toFixed(1)}</span>
          <span className="metric-note">
            {delta(tone.brightness, reference?.brightness, (d) => d.toFixed(1)) ?? 'avg harmonic, by power'}
          </span>
        </div>
        <div className="note-metric">
          <span className="metric-label">Richness</span>
          <span className="metric-value">{pct(tone.richness)}</span>
          <span className="metric-note">
            {delta(tone.richness, reference?.richness, pct) ?? 'energy above the fundamental'}
          </span>
        </div>
        <div className="note-metric">
          <span className="metric-label">Airiness</span>
          <span className="metric-value">{pct(tone.airiness)}</span>
          <span className="metric-note">
            {delta(tone.airiness, reference?.airiness, pct) ?? 'noise between harmonics'}
          </span>
        </div>
      </div>

      <div className="tone-actions">
        <button className="tap-btn" onClick={onSave}>
          ★ Save {midiToFlatName(midi)} as reference tone
        </button>
        {reference && (
          <button className="tap-btn" onClick={onClear}>
            Clear reference
          </button>
        )}
      </div>
    </div>
  )
}
