// Plain-JS test suite for src/theory.js — no test framework, no dependencies.
// Run via tests/run.html (open through the same local server as the app).

import { midiToName, midiToFreq, INTERVALS, CHORDS, SCALES } from '../src/theory.js';

const results = [];

function test(name, fn) {
  try {
    fn();
    results.push({ name, pass: true });
  } catch (e) {
    results.push({ name, pass: false, error: e.message });
  }
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg || 'assertion failed'}: expected ${expected}, got ${actual}`);
  }
}

function assertClose(actual, expected, tolerance, msg) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${msg || 'assertion failed'}: expected ~${expected}, got ${actual}`);
  }
}

test('midiToName maps middle C (60) to C4', () => {
  assertEqual(midiToName(60), 'C4');
});

test('midiToName maps A4 (69) to A4', () => {
  assertEqual(midiToName(69), 'A4');
});

test('midiToName wraps negative MIDI numbers correctly', () => {
  assertEqual(midiToName(-1), 'B-2');
});

test('midiToFreq maps A4 (69) to 440 Hz', () => {
  assertClose(midiToFreq(69), 440, 0.001);
});

test('midiToFreq maps one octave up to double the frequency', () => {
  assertClose(midiToFreq(81), 880, 0.001);
});

test('every interval spans 1 to 12 semitones', () => {
  for (const interval of INTERVALS) {
    if (interval.semitones < 1 || interval.semitones > 12) {
      throw new Error(`${interval.name} has out-of-range semitones: ${interval.semitones}`);
    }
  }
});

test('every chord starts on the root (0 semitones)', () => {
  for (const chord of CHORDS) {
    assertEqual(chord.intervals[0], 0, `${chord.name} should start on the root`);
  }
});

test('every scale starts on the root and spans a full octave', () => {
  for (const scale of SCALES) {
    assertEqual(scale.intervals[0], 0, `${scale.name} should start on the root`);
    assertEqual(scale.intervals[scale.intervals.length - 1], 12, `${scale.name} should end on the octave`);
  }
});

export { results };
