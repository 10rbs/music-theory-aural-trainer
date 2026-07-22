// Presentational staff block: the ♯/♭ key stepper on top, the octave +/− column
// to the left, and the notation. Shared by the daily practice view and the
// warm-up view; each owns its own state and persistence and passes callbacks.
// The key stepper is omitted for exercises that only transpose by octave.

import type { SpelledNote } from '../../core/assignments'
import type { KeySignature } from '../../core/notation/key-signature'
import type { Meter, RhythmEvent } from '../../core/notation/rhythm'
import { type Clef } from '../../core/notation/staff'
import { ScaleStaff } from './ScaleStaff'
import { RhythmStaff } from './RhythmStaff'

export interface OctaveControl {
  value: number
  canUp: boolean
  canDown: boolean
  onUp: () => void
  onDown: () => void
}

export interface KeyControl {
  name: string
  onSharper: () => void
  onFlatter: () => void
}

export function StaffWithControls({
  spelled,
  clef,
  label,
  keySig,
  rhythm,
  octave,
  keyControl,
}: {
  spelled: SpelledNote[]
  clef: Clef
  label: string
  keySig?: KeySignature
  /** when present, render rhythmic notation (RhythmStaff) instead of a scale run */
  rhythm?: { events: RhythmEvent[]; meter: Meter }
  octave: OctaveControl
  keyControl?: KeyControl
}) {
  return (
    <div className="staff-block">
      {keyControl && (
        <div className="key-controls" role="group" aria-label="Key">
          <button onClick={keyControl.onFlatter} aria-label="Key down (flatter)">
            ♭
          </button>
          <span aria-live="polite" title="Key">
            {keyControl.name}
          </span>
          <button onClick={keyControl.onSharper} aria-label="Key up (sharper)">
            ♯
          </button>
        </div>
      )}
      <div className="staff-row">
        <div className="octave-controls" role="group" aria-label="Octave shift">
          <button onClick={octave.onUp} disabled={!octave.canUp} aria-label="Octave up">
            +
          </button>
          <span aria-live="polite" title="Octave shift">
            {`${octave.value > 0 ? '+' : ''}${octave.value}`}
          </span>
          <button onClick={octave.onDown} disabled={!octave.canDown} aria-label="Octave down">
            −
          </button>
        </div>
        {rhythm ? (
          <RhythmStaff events={rhythm.events} meter={rhythm.meter} clef={clef} label={label} />
        ) : (
          <ScaleStaff spelled={spelled} clef={clef} label={label} keySig={keySig} />
        )}
      </div>
    </div>
  )
}
