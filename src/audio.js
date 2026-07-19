// Minimal Web Audio synth for playing notes, intervals, chords, and scales.
// No external dependencies - uses native oscillators only.

export class Synth {
  constructor() {
    this.ctx = null;
  }

  ensureCtx() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  _playFreqAt(freq, startTime, duration, gain) {
    const ctx = this.ensureCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;

    // simple attack / sustain / release envelope to avoid clicks
    const attack = 0.02;
    const release = 0.08;
    g.gain.setValueAtTime(0, startTime);
    g.gain.linearRampToValueAtTime(gain, startTime + attack);
    g.gain.setValueAtTime(gain, Math.max(startTime + attack, startTime + duration - release));
    g.gain.linearRampToValueAtTime(0, startTime + duration);

    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  /** Play a sequence of frequencies one after another (melodic). */
  playMelodic(freqs, noteDuration = 0.55, gap = 0.05, gain = 0.22) {
    const ctx = this.ensureCtx();
    const start = ctx.currentTime + 0.06;
    freqs.forEach((f, i) => {
      this._playFreqAt(f, start + i * (noteDuration + gap), noteDuration, gain);
    });
    return freqs.length * (noteDuration + gap);
  }

  /** Play a group of frequencies together (harmonic / chord). */
  playHarmonic(freqs, duration = 1.6, gain = 0.16) {
    const ctx = this.ensureCtx();
    const start = ctx.currentTime + 0.06;
    freqs.forEach((f) => this._playFreqAt(f, start, duration, gain));
    return duration;
  }
}
