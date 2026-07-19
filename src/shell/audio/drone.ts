// Sustained drone oscillator for the tuner's note circle. One drone at a
// time; switching notes glides the frequency instead of restarting.

import { ensureAudioContext } from './context'

const ATTACK = 0.02
const RELEASE = 0.08
const GAIN = 0.22
const GLIDE = 0.04 // time constant for note-to-note frequency glides

export interface Drone {
  setFreq(freq: number): void
  stop(): void
}

/** Start a sustained drone. Must be called from a user gesture. */
export function startDrone(freq: number): Drone {
  const ctx = ensureAudioContext()
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = 'triangle'
  osc.frequency.value = freq

  g.gain.setValueAtTime(0, ctx.currentTime)
  g.gain.linearRampToValueAtTime(GAIN, ctx.currentTime + ATTACK)

  osc.connect(g)
  g.connect(ctx.destination)
  osc.start()

  return {
    setFreq(f: number) {
      osc.frequency.setTargetAtTime(f, ctx.currentTime, GLIDE)
    },
    stop() {
      const now = ctx.currentTime
      g.gain.cancelScheduledValues(now)
      g.gain.setValueAtTime(g.gain.value, now)
      g.gain.linearRampToValueAtTime(0, now + RELEASE)
      osc.stop(now + RELEASE + 0.05)
    },
  }
}
