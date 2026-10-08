// Microphone capture adapter. Owns getUserMedia + an AudioWorklet tap that
// streams contiguous mono chunks (CHUNK samples each) to a callback — the
// same samples feed live analysis and the rolling playback buffer (M6.2).
// Pitch/level math stays pure in core/.

import { ensureAudioContext } from './context'

export interface MicSession {
  sampleRate: number
  stop(): void
}

export type MicError = 'denied' | 'unavailable'

/** Samples per chunk — one analysis hop (~21 ms at 48 kHz). */
export const CHUNK = 1024

// Inlined as a Blob URL so it needs no base-path handling and works offline.
const WORKLET_SOURCE = `
class CaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super()
    this.size = options.processorOptions.chunk
    this.buf = new Float32Array(this.size)
    this.n = 0
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0]
    if (ch) {
      let i = 0
      while (i < ch.length) {
        const k = Math.min(ch.length - i, this.size - this.n)
        this.buf.set(ch.subarray(i, i + k), this.n)
        this.n += k
        i += k
        if (this.n === this.size) {
          this.port.postMessage(this.buf, [this.buf.buffer])
          this.buf = new Float32Array(this.size)
          this.n = 0
        }
      }
    }
    return true
  }
}
registerProcessor('capture-processor', CaptureProcessor)
`

const workletLoaded = new WeakMap<AudioContext, Promise<void>>()

function loadWorklet(ctx: AudioContext): Promise<void> {
  let p = workletLoaded.get(ctx)
  if (!p) {
    const url = URL.createObjectURL(new Blob([WORKLET_SOURCE], { type: 'application/javascript' }))
    p = ctx.audioWorklet.addModule(url).finally(() => URL.revokeObjectURL(url))
    workletLoaded.set(ctx, p)
  }
  return p
}

/**
 * Request the mic (must be called from a user gesture) and start streaming
 * chunks. Browser DSP (echo cancellation, AGC, noise suppression) is disabled
 * so analysis and playback see the raw instrument signal.
 */
export async function startMic(
  onChunk: (chunk: Float32Array, sampleRate: number) => void,
): Promise<MicSession> {
  const ctx = ensureAudioContext() // inside the gesture, before any await
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

  try {
    await loadWorklet(ctx)
  } catch {
    for (const track of stream.getTracks()) track.stop()
    throw new Error('unavailable' satisfies MicError)
  }

  const source = ctx.createMediaStreamSource(stream)
  const tap = new AudioWorkletNode(ctx, 'capture-processor', {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    outputChannelCount: [1],
    channelCount: 1,
    channelCountMode: 'explicit',
    processorOptions: { chunk: CHUNK },
  })
  // Some engines only pull nodes that reach the destination; route the
  // (silent) output through a muted gain so the tap keeps running.
  const mute = ctx.createGain()
  mute.gain.value = 0
  source.connect(tap)
  tap.connect(mute).connect(ctx.destination)

  let stopped = false
  tap.port.onmessage = (e: MessageEvent<Float32Array>) => {
    if (!stopped) onChunk(e.data, ctx.sampleRate)
  }

  return {
    sampleRate: ctx.sampleRate,
    stop() {
      stopped = true
      tap.port.onmessage = null
      source.disconnect()
      tap.disconnect()
      mute.disconnect()
      for (const track of stream.getTracks()) track.stop()
    },
  }
}
