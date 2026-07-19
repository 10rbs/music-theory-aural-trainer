// Oscillator synth, ported from the v0-vanilla src/audio.js.
// Plays PlaybackSpecs from the functional core; owns all Web Audio side effects.

import type { PlaybackSpec } from '../../core/playback/spec'
import { midiToFreq } from '../../core/theory/notes'
import { ensureAudioContext } from './context'

const ATTACK = 0.02
const RELEASE = 0.08
const NOTE_GAIN = 0.22
const CHORD_GAIN = 0.16
const START_DELAY = 0.06

function playFreqAt(ctx: AudioContext, freq: number, startTime: number, duration: number, gain: number) {
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = 'triangle'
  osc.frequency.value = freq

  // simple attack / sustain / release envelope to avoid clicks
  g.gain.setValueAtTime(0, startTime)
  g.gain.linearRampToValueAtTime(gain, startTime + ATTACK)
  g.gain.setValueAtTime(gain, Math.max(startTime + ATTACK, startTime + duration - RELEASE))
  g.gain.linearRampToValueAtTime(0, startTime + duration)

  osc.connect(g)
  g.connect(ctx.destination)
  osc.start(startTime)
  osc.stop(startTime + duration + 0.05)
}

/** Play a single short tone at an exact frequency (e.g. note-circle hover preview). */
export function playFreq(freq: number, duration = 0.5): void {
  const ctx = ensureAudioContext()
  playFreqAt(ctx, freq, ctx.currentTime, duration, NOTE_GAIN)
}

/** Play a PlaybackSpec. Returns the total duration in seconds. */
export function playSpec(spec: PlaybackSpec): number {
  const ctx = ensureAudioContext()
  const secPerBeat = 60 / spec.bpm
  const start = ctx.currentTime + START_DELAY
  // small gap between melodic notes so repeated pitches articulate
  const gap = 0.08 * secPerBeat
  let end = 0

  for (const ev of spec.events) {
    const t = start + ev.startBeat * secPerBeat
    const dur = ev.durationBeats * secPerBeat - gap
    const gain = ev.midi.length > 1 ? CHORD_GAIN : NOTE_GAIN
    for (const m of ev.midi) {
      playFreqAt(ctx, midiToFreq(m), t, dur, gain)
    }
    end = Math.max(end, ev.startBeat * secPerBeat + ev.durationBeats * secPerBeat)
  }
  return end
}
