// Lookahead click scheduler ("A Tale of Two Clocks" pattern).
// A coarse setInterval tick schedules every click falling inside the next
// LOOKAHEAD window at exact AudioContext timestamps. Never schedule audio
// with bare timers. Timing math is pure in core/rhythm/click-track.ts.

import { tickAt, type ClickTrackConfig, type Tick } from '../../core/rhythm/click-track'
import { ensureAudioContext } from './context'

const TIMER_INTERVAL_MS = 25
const LOOKAHEAD_S = 0.1

const CLICK_FREQ: Record<Tick['accent'], number> = {
  downbeat: 1568, // G6 — bright
  beat: 1047, // C6
  sub: 784, // G5 — quiet tock
}

const CLICK_GAIN: Record<Tick['accent'], number> = {
  downbeat: 0.5,
  beat: 0.35,
  sub: 0.18,
}

function scheduleClick(ctx: AudioContext, tick: Tick, when: number) {
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = 'square'
  osc.frequency.value = CLICK_FREQ[tick.accent]
  const gain = CLICK_GAIN[tick.accent]
  // very short percussive envelope
  g.gain.setValueAtTime(gain, when)
  g.gain.exponentialRampToValueAtTime(0.001, when + 0.03)
  osc.connect(g)
  g.connect(ctx.destination)
  osc.start(when)
  osc.stop(when + 0.05)
}

export interface RunningClickTrack {
  stop(): void
}

/**
 * Start an endless click track. `onTick` fires (via timeout aligned to the
 * audio clock) when each scheduled tick actually sounds — use it for visuals.
 */
export function startClickTrack(
  config: ClickTrackConfig,
  onTick?: (tick: Tick) => void,
): RunningClickTrack {
  const ctx = ensureAudioContext()
  const startTime = ctx.currentTime + 0.1
  let nextTickIndex = 0
  const visualTimeouts = new Set<ReturnType<typeof setTimeout>>()

  const timer = setInterval(() => {
    while (true) {
      const tick = tickAt(config, nextTickIndex)
      const when = startTime + tick.time
      if (when > ctx.currentTime + LOOKAHEAD_S) break
      scheduleClick(ctx, tick, when)
      if (onTick) {
        const delayMs = Math.max(0, (when - ctx.currentTime) * 1000)
        const t = setTimeout(() => {
          visualTimeouts.delete(t)
          onTick(tick)
        }, delayMs)
        visualTimeouts.add(t)
      }
      nextTickIndex++
    }
  }, TIMER_INTERVAL_MS)

  return {
    stop() {
      clearInterval(timer)
      for (const t of visualTimeouts) clearTimeout(t)
      visualTimeouts.clear()
    },
  }
}
