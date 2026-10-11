// Plays a captured take from an offset. Thin wrapper over AudioBuffer +
// AudioBufferSourceNode; the caller derives the playhead from position().

import { ensureAudioContext } from './context'

export interface TakePlayback {
  /** Seconds into the buffer right now. */
  position(): number
  stop(): void
}

export function makeTakeBuffer(samples: Float32Array, sampleRate: number): AudioBuffer | null {
  if (samples.length === 0) return null
  const buffer = ensureAudioContext().createBuffer(1, samples.length, sampleRate)
  buffer.copyToChannel(samples as Float32Array<ArrayBuffer>, 0)
  return buffer
}

/** Start playback at offsetSec (call from a user gesture). onEnded fires on natural end only. */
export function playTake(buffer: AudioBuffer, offsetSec: number, onEnded: () => void): TakePlayback {
  const ctx = ensureAudioContext()
  const src = ctx.createBufferSource()
  src.buffer = buffer
  src.connect(ctx.destination)
  const offset = Math.max(0, Math.min(offsetSec, buffer.duration))
  const startedAt = ctx.currentTime
  let stopped = false
  src.onended = () => {
    if (!stopped) onEnded()
  }
  src.start(0, offset)
  return {
    position: () => Math.min(buffer.duration, offset + (ctx.currentTime - startedAt)),
    stop() {
      stopped = true
      src.onended = null
      try {
        src.stop()
      } catch {
        // already stopped
      }
      src.disconnect()
    },
  }
}
