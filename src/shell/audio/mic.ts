// Microphone capture adapter. Owns getUserMedia + AnalyserNode; pumps
// time-domain Float32Array frames to a callback on requestAnimationFrame.
// Pitch math stays pure in core/pitch/detect.ts.

import { ensureAudioContext } from './context'

export interface MicSession {
  sampleRate: number
  stop(): void
}

export type MicError = 'denied' | 'unavailable'

/**
 * Request the mic (must be called from a user gesture) and start pumping
 * frames. Browser DSP (echo cancellation, AGC, noise suppression) is disabled
 * so the tuner sees the raw instrument signal.
 */
export async function startMic(
  onFrame: (buf: Float32Array, sampleRate: number) => void,
): Promise<MicSession> {
  let stream: MediaStream
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    })
  } catch (e) {
    const err = e as DOMException
    throw new Error(
      (err.name === 'NotAllowedError' ? 'denied' : 'unavailable') satisfies MicError,
    )
  }

  const ctx = ensureAudioContext()
  const source = ctx.createMediaStreamSource(stream)
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 4096 // ~93ms at 44.1kHz — resolves low brass (F2 and below)
  source.connect(analyser)

  const buf = new Float32Array(analyser.fftSize)
  let raf = 0
  let stopped = false

  const pump = () => {
    if (stopped) return
    analyser.getFloatTimeDomainData(buf)
    onFrame(buf, ctx.sampleRate)
    raf = requestAnimationFrame(pump)
  }
  raf = requestAnimationFrame(pump)

  return {
    sampleRate: ctx.sampleRate,
    stop() {
      stopped = true
      cancelAnimationFrame(raf)
      source.disconnect()
      for (const track of stream.getTracks()) track.stop()
    },
  }
}
