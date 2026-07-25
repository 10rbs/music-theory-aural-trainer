// One exercise card — provenance, the staff with octave/key transpose controls,
// the instruction, and Listen / Mark done. Shared by the Studies browser (one
// focused card) and the Workouts page (a stacked list). Transpose resolution
// (applying the persisted offsets + range headroom) lives in core/warmups
// (`resolveWarmup`), so this component is purely presentational.

import { resolveWarmup, type WarmupExercise } from '../../core/warmups'
import { type Clef } from '../../core/notation/staff'
import { tonicName } from '../../core/theory/keys'
import { playSpec } from '../../shell/audio/synth'
import { StaffWithControls } from '../practice/StaffWithControls'

export interface ExerciseCardProps {
  base: WarmupExercise
  clef: Clef
  /** raw persisted octave shift for this exercise */
  octave: number
  /** raw persisted key offset for this exercise */
  keyOffset: number
  done: boolean
  /** render the key signature (false → draw accidentals inline) */
  showKeySig: boolean
  onOctave: (id: string, next: number) => void
  onKey: (id: string, next: number) => void
  onMarkDone: (ex: WarmupExercise) => void
  /** 1-based position number, shown in workout lists */
  index?: number
}

export function ExerciseCard({
  base,
  clef,
  octave,
  keyOffset,
  done,
  showKeySig,
  onOctave,
  onKey,
  onMarkDone,
  index,
}: ExerciseCardProps) {
  const { ex, shift, keyOffset: ko, canOctaveUp, canOctaveDown } = resolveWarmup(
    base,
    clef,
    octave,
    keyOffset,
  )

  return (
    <div className={`practice-item studies-detail${done ? ' done' : ''}`}>
      <div className="practice-info">
        <div className="exercise-head">
          <h4 className="warmup-title">
            {index !== undefined && <span className="exercise-num">{index}. </span>}
            {ex.title}
          </h4>
          <div className="exercise-controls">
            <button
              className="icon-btn play"
              onClick={() => playSpec(ex.playback)}
              aria-label={`Play ${ex.title}`}
              title="Play"
            >
              <span aria-hidden>▶</span>
            </button>
            <button
              className={`icon-btn check${done ? ' is-done' : ''}`}
              onClick={() => onMarkDone(ex)}
              disabled={done}
              aria-label={done ? 'Completed' : 'Mark done'}
              title={done ? 'Done' : 'Mark done'}
            >
              <span aria-hidden>{done ? '✓' : '○'}</span>
            </button>
          </div>
        </div>
        {ex.source && (
          <p className="warmup-source">
            {ex.source.composer} · {ex.source.year} · public domain
          </p>
        )}
        <StaffWithControls
          spelled={ex.spelled}
          clef={clef}
          label={ex.title}
          keySig={showKeySig ? ex.keySig : undefined}
          rhythm={ex.rhythm}
          octave={{
            value: shift,
            canUp: canOctaveUp,
            canDown: canOctaveDown,
            onUp: () => onOctave(base.id, shift + 1),
            onDown: () => onOctave(base.id, shift - 1),
          }}
          keyControl={
            ex.transposable === 'key' && ex.tonic
              ? {
                  name: tonicName(ex.tonic),
                  onSharper: () => onKey(base.id, ko + 1),
                  onFlatter: () => onKey(base.id, ko - 1),
                }
              : undefined
          }
        />
        {ex.instruction && <p className="warmup-instruction">{ex.instruction}</p>}
      </div>
    </div>
  )
}
