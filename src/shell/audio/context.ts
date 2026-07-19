// Lazy singleton AudioContext. Must be created/resumed inside a user gesture
// (iOS Safari requirement) — callers invoke ensureAudioContext from click handlers.

let ctx: AudioContext | null = null

export function ensureAudioContext(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext()
  }
  if (ctx.state === 'suspended') {
    void ctx.resume()
  }
  return ctx
}
