// A single-active-playback store shared by every exercise card, so:
//   - only one exercise sounds at a time (starting one stops the previous),
//   - the play control can show pause while it runs and can't be spammed into
//     overlapping playback, and
//   - the button resets to play when the piece finishes on its own.
// Module-level state + useSyncExternalStore keeps every card in sync without a
// provider. Mirrors the settingsEvents/statsEvents pattern elsewhere.

import { useSyncExternalStore } from 'react'
import { playSpec, type Playback } from '../../shell/audio/synth'
import type { PlaybackSpec } from '../../core/playback/spec'

let playingId: string | null = null
let current: Playback | null = null
let endTimer: ReturnType<typeof setTimeout> | undefined

const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

function halt() {
  if (endTimer) clearTimeout(endTimer)
  endTimer = undefined
  current?.stop()
  current = null
}

/** Stop whatever is playing (no-op if nothing is). */
export function stopPlayback() {
  if (playingId === null) return
  halt()
  playingId = null
  emit()
}

/** Toggle playback for `id`: start it (stopping any other), or stop it if it's the one playing. */
export function togglePlayback(id: string, spec: PlaybackSpec) {
  if (playingId === id) {
    stopPlayback()
    return
  }
  halt() // stop any other exercise first
  current = playSpec(spec)
  playingId = id
  emit()
  // reset to "play" when it finishes on its own (small tail so the last note rings)
  endTimer = setTimeout(
    () => {
      if (playingId === id) {
        current = null
        playingId = null
        emit()
      }
    },
    Math.ceil(current.duration * 1000) + 250,
  )
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** The id of the exercise currently playing, or null. Re-renders on change. */
export function usePlayingId(): string | null {
  return useSyncExternalStore(subscribe, () => playingId)
}
