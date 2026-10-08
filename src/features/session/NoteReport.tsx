import { rateNote, type NoteSummary, type Rating } from '../../core/pitch/notes'
import { midiToName } from '../../core/theory/notes'

const signed = (n: number) => `${n > 0 ? '+' : ''}${n}`

function tuningWord(avgCents: number, rating: Rating) {
  if (rating === 'good') return 'in tune'
  return avgCents > 0 ? 'sharp' : 'flat'
}

function Metric({ label, value, note, rating }: { label: string; value: string; note: string; rating: Rating }) {
  return (
    <div className={`note-metric rating-${rating}`}>
      <span className="metric-label">
        <span className="rating-dot" aria-hidden="true" />
        {label}
      </span>
      <span className="metric-value">{value}</span>
      <span className="metric-note">{note}</span>
    </div>
  )
}

/**
 * Report for one finished note, plus chips for the last few notes so you can
 * flip back through a run of long tones.
 */
export function NoteReport({
  notes,
  selected,
  onSelect,
}: {
  notes: NoteSummary[]
  selected: NoteSummary | null
  onSelect: (startT: number) => void
}) {
  if (!selected) {
    return (
      <div className="note-report empty">
        Hold a note, then stop — its tuning and shape show up here.
      </div>
    )
  }
  const r = rateNote(selected)
  const avg = Math.round(selected.avgCents)

  return (
    <div className="note-report">
      <div className="note-report-head">
        <h2>{midiToName(selected.midi)}</h2>
        <span className="note-report-meta">
          {(selected.durationMs / 1000).toFixed(1)} s · {Math.round(selected.sustainDb)} dB
        </span>
      </div>
      <div className="note-metrics">
        <Metric
          label="Tuning"
          value={`${signed(avg)}¢`}
          note={tuningWord(avg, r.tuning)}
          rating={r.tuning}
        />
        <Metric
          label="Pitch steadiness"
          value={`±${selected.centsSpread.toFixed(1)}¢`}
          note="wander while held"
          rating={r.pitchSteadiness}
        />
        <Metric
          label="Attack"
          value={`${Math.round(selected.attackMs)} ms`}
          note="onset to full sound"
          rating={r.attack}
        />
        <Metric
          label="Evenness"
          value={`±${selected.levelSpreadDb.toFixed(1)} dB`}
          note="volume through sustain"
          rating={r.evenness}
        />
      </div>
      {notes.length > 1 && (
        <div className="note-chips" role="group" aria-label="Recent notes">
          {notes.map((n) => {
            const c = Math.round(n.avgCents)
            return (
              <button
                key={n.startT}
                className={`note-chip rating-${rateNote(n).tuning}${n === selected ? ' selected' : ''}`}
                onClick={() => onSelect(n.startT)}
              >
                {midiToName(n.midi)} {signed(c)}¢
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
