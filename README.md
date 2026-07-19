# Aural Trainer

A dependency-free ear training web app: interval, chord, and scale recognition drills with a daily practice streak.

## Why no build step

This is plain HTML/CSS/JS using native Web Audio API and ES modules — no React, no bundler, no npm install required. Open `index.html` through a local server (browsers block ES module imports over `file://`) and it just works.

## Running locally

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Or deploy the folder as-is to GitHub Pages, Netlify, Vercel, etc.

## Running tests

No test framework or install step needed - open `tests/run.html` through the same local server:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/tests/run.html
```

## Structure

- `index.html` - page shell and screens (home + drill)
- `style.css` - styling
- `src/theory.js` - interval/chord/scale definitions, note/frequency math
- `src/audio.js` - oscillator-based synth (Web Audio API)
- `src/drills.js` - question generators for each drill mode
- `src/storage.js` - localStorage-backed daily streak and per-mode stats
- `src/app.js` - UI wiring / screen state
- `tests/theory.test.js` - plain-JS assertions for `src/theory.js`
- `tests/run.html` - browser-based test runner

## Current features

- Interval recognition (12 intervals, minor 2nd through octave)
- Chord quality recognition (major, minor, diminished, augmented, maj7, dom7, min7)
- Scale recognition (major, natural/harmonic/melodic minor, Dorian, Mixolydian)
- Multiple choice, instant feedback, session score
- Daily streak + lifetime per-mode accuracy, persisted in the browser

## Ideas for next iterations

- Difficulty levels / adjustable octave range
- Chord inversions, 7th chord extensions (m7b5, dim7)
- Rhythm/sight-reading drills
- Jazz-specific practice paths (ii-V-I recognition, extended harmony)
- User accounts + synced progress across devices
