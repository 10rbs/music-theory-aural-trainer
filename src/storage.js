// Persistence for daily streak + lifetime stats. Uses localStorage since this
// is a real deployed static site (not a Cowork artifact), so it's fine here.

const KEY = 'aural-trainer:stats:v1';

function todayStr() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function dayBefore(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function defaultStats() {
  return {
    streak: 0,
    lastPracticeDate: null,
    modes: {
      intervals: { correct: 0, total: 0 },
      chords: { correct: 0, total: 0 },
      scales: { correct: 0, total: 0 },
    },
  };
}

export function loadStats() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultStats();
    const parsed = JSON.parse(raw);
    return { ...defaultStats(), ...parsed, modes: { ...defaultStats().modes, ...(parsed.modes || {}) } };
  } catch (e) {
    return defaultStats();
  }
}

function saveStats(stats) {
  localStorage.setItem(KEY, JSON.stringify(stats));
}

/** Call once per answered question. Updates streak (once per day) and mode totals. */
export function recordAnswer(mode, wasCorrect) {
  const stats = loadStats();
  const today = todayStr();

  if (stats.lastPracticeDate !== today) {
    if (stats.lastPracticeDate === dayBefore(today)) {
      stats.streak += 1;
    } else {
      stats.streak = 1;
    }
    stats.lastPracticeDate = today;
  }

  if (!stats.modes[mode]) stats.modes[mode] = { correct: 0, total: 0 };
  stats.modes[mode].total += 1;
  if (wasCorrect) stats.modes[mode].correct += 1;

  saveStats(stats);
  return stats;
}

export function getStreak() {
  const stats = loadStats();
  const today = todayStr();
  // If the last practice wasn't today or yesterday, the streak is effectively broken.
  if (stats.lastPracticeDate !== today && stats.lastPracticeDate !== dayBefore(today)) {
    return 0;
  }
  return stats.streak;
}
