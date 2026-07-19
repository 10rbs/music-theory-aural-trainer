import { INTERVALS, CHORDS, SCALES, midiToFreq } from './theory.js';

// Comfortable root note range: G3 (55) to C5 (72).
const ROOT_MIN = 55;
const ROOT_MAX = 72;

export function randomRoot() {
  return ROOT_MIN + Math.floor(Math.random() * (ROOT_MAX - ROOT_MIN + 1));
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function choiceSet(all, correctIndex, count) {
  const others = all.filter((_, i) => i !== correctIndex);
  const distractors = shuffle(others).slice(0, count - 1);
  return shuffle([all[correctIndex], ...distractors]);
}

/** Generates a new interval question: { freqs, playMode, answer, choices } */
export function nextIntervalQuestion(numChoices = 4) {
  const root = randomRoot();
  const idx = Math.floor(Math.random() * INTERVALS.length);
  const interval = INTERVALS[idx];
  const freqs = [midiToFreq(root), midiToFreq(root + interval.semitones)];
  const choices = choiceSet(INTERVALS, idx, Math.min(numChoices, INTERVALS.length));
  return {
    mode: 'intervals',
    freqs,
    playStyle: 'melodic',
    answer: interval,
    choices,
    label: (c) => `${c.name} (${c.short})`,
  };
}

/** Generates a new chord quality question. */
export function nextChordQuestion(numChoices = 4) {
  const root = randomRoot() - 5; // sit a bit lower so extended chords stay in range
  const idx = Math.floor(Math.random() * CHORDS.length);
  const chord = CHORDS[idx];
  const freqs = chord.intervals.map((st) => midiToFreq(root + st));
  const choices = choiceSet(CHORDS, idx, Math.min(numChoices, CHORDS.length));
  return {
    mode: 'chords',
    freqs,
    playStyle: 'harmonic',
    answer: chord,
    choices,
    label: (c) => c.name,
  };
}

/** Generates a new scale-type question. */
export function nextScaleQuestion(numChoices = 4) {
  const root = ROOT_MIN;
  const idx = Math.floor(Math.random() * SCALES.length);
  const scale = SCALES[idx];
  const freqs = scale.intervals.map((st) => midiToFreq(root + st));
  const choices = choiceSet(SCALES, idx, Math.min(numChoices, SCALES.length));
  return {
    mode: 'scales',
    freqs,
    playStyle: 'melodic',
    answer: scale,
    choices,
    label: (c) => c.name,
  };
}
