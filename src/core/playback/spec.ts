// What to play, as data. The shell's audio adapter turns this into sound;
// future notation rendering can consume the same spec.

export interface PlaybackEvent {
  /** MIDI numbers sounding together at this event (chord = several). */
  midi: readonly number[]
  startBeat: number
  durationBeats: number
}

export interface PlaybackSpec {
  events: readonly PlaybackEvent[]
  bpm: number
}

/** One note after another, each one beat long. */
export function melodic(midis: readonly number[], bpm = 100): PlaybackSpec {
  return {
    bpm,
    events: midis.map((m, i) => ({ midi: [m], startBeat: i, durationBeats: 1 })),
  }
}

/** All notes together as a single sustained event. */
export function harmonic(midis: readonly number[], bpm = 100, durationBeats = 2.5): PlaybackSpec {
  return {
    bpm,
    events: [{ midi: midis, startBeat: 0, durationBeats }],
  }
}

/** One note after another, each held for `beatsEach` beats — long tones, slurs. */
export function sustained(midis: readonly number[], bpm = 60, beatsEach = 4): PlaybackSpec {
  return {
    bpm,
    events: midis.map((m, i) => ({ midi: [m], startBeat: i * beatsEach, durationBeats: beatsEach })),
  }
}
