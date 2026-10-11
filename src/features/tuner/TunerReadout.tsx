import { IN_TUNE_CENTS } from '../../core/pitch/history'
import type { Reading } from './tuner-engine'

/** Big note name + cents needle. Shared by the header panel and the practice screen. */
export function TunerReadout({ reading, large = false }: { reading: Reading | null; large?: boolean }) {
  const inTune = reading !== null && Math.abs(reading.cents) <= IN_TUNE_CENTS
  return (
    <div className={`tuner-readout${large ? ' large' : ''}`}>
      <div className={`tuner-note${inTune ? ' in-tune' : ''}`}>{reading ? reading.name : '–'}</div>

      <div className="tuner-scale">
        <div className="tuner-ticks">
          {[-50, -25, 0, 25, 50].map((t) => (
            <span key={t} className={`tuner-tick${t === 0 ? ' zero' : ''}`}>
              {t > 0 ? `+${t}` : t}
            </span>
          ))}
        </div>
        <div className="tuner-track">
          <div
            className={`tuner-needle${inTune ? ' in-tune' : ''}`}
            style={{
              left: `${50 + Math.max(-50, Math.min(50, reading?.cents ?? 0))}%`,
              opacity: reading ? 1 : 0.25,
            }}
          />
          <div className="tuner-center" />
        </div>
        <div className="tuner-cents">
          {reading ? `${reading.cents > 0 ? '+' : ''}${reading.cents} cents` : 'Play a note'}
        </div>
      </div>
    </div>
  )
}

/** Mic opt-in + permission-error copy. Shared by the header panel and the practice screen. */
export function MicGate({
  micState,
  onEnable,
}: {
  micState: 'idle' | 'requesting' | 'active' | 'denied' | 'unavailable'
  onEnable: () => void
}) {
  return (
    <div className="tuner-gate">
      <p className="tagline">
        The tuner listens through your microphone. Audio stays on this device: the last minute
        is held in memory so you can play it back, then discarded — nothing is saved or sent
        anywhere.
      </p>
      {micState === 'denied' && (
        <p className="tuner-error">
          Microphone access was blocked. Allow it in your browser's site settings (the icon next
          to the address bar), then try again.
        </p>
      )}
      {micState === 'unavailable' && (
        <p className="tuner-error">No microphone found, or it couldn't be started.</p>
      )}
      <button className="play-btn panel-play" onClick={onEnable} disabled={micState === 'requesting'}>
        {micState === 'requesting' ? 'Requesting…' : '🎤 Enable microphone'}
      </button>
    </div>
  )
}
