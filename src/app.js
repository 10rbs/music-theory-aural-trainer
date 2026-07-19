import { Synth } from './audio.js';
import { nextIntervalQuestion, nextChordQuestion, nextScaleQuestion } from './drills.js';
import { loadStats, recordAnswer, getStreak } from './storage.js';

const synth = new Synth();

const QUESTION_FACTORIES = {
  intervals: nextIntervalQuestion,
  chords: nextChordQuestion,
  scales: nextScaleQuestion,
};

const MODE_TITLES = {
  intervals: 'Interval Training',
  chords: 'Chord Training',
  scales: 'Scale Training',
};

const state = {
  mode: null,
  question: null,
  answered: false,
  sessionCorrect: 0,
  sessionTotal: 0,
};

const el = {
  home: document.getElementById('screen-home'),
  drill: document.getElementById('screen-drill'),
  streak: document.getElementById('streak-count'),
  modeCards: document.querySelectorAll('.mode-card'),
  modeStats: {
    intervals: document.getElementById('stat-intervals'),
    chords: document.getElementById('stat-chords'),
    scales: document.getElementById('stat-scales'),
  },
  drillTitle: document.getElementById('drill-title'),
  backBtn: document.getElementById('back-btn'),
  playBtn: document.getElementById('play-btn'),
  choices: document.getElementById('choices'),
  feedback: document.getElementById('feedback'),
  nextBtn: document.getElementById('next-btn'),
  sessionScore: document.getElementById('session-score'),
};

function renderHome() {
  el.streak.textContent = getStreak();
  const stats = loadStats();
  for (const mode of Object.keys(el.modeStats)) {
    const m = stats.modes[mode] || { correct: 0, total: 0 };
    el.modeStats[mode].textContent = m.total > 0 ? `${m.correct}/${m.total} correct` : 'No attempts yet';
  }
  el.home.classList.remove('hidden');
  el.drill.classList.add('hidden');
}

function showDrillScreen(mode) {
  state.mode = mode;
  state.sessionCorrect = 0;
  state.sessionTotal = 0;
  el.drillTitle.textContent = MODE_TITLES[mode];
  el.home.classList.add('hidden');
  el.drill.classList.remove('hidden');
  loadNextQuestion();
}

function loadNextQuestion() {
  state.answered = false;
  state.question = QUESTION_FACTORIES[state.mode]();
  el.feedback.textContent = '';
  el.feedback.className = 'feedback';
  el.nextBtn.classList.add('hidden');
  updateSessionScore();
  renderChoices();
  playCurrentQuestion();
}

function playCurrentQuestion() {
  const q = state.question;
  if (q.playStyle === 'harmonic') {
    synth.playHarmonic(q.freqs);
  } else {
    synth.playMelodic(q.freqs);
  }
}

function renderChoices() {
  const q = state.question;
  el.choices.innerHTML = '';
  q.choices.forEach((choice) => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.textContent = q.label(choice);
    btn.addEventListener('click', () => handleAnswer(choice, btn));
    el.choices.appendChild(btn);
  });
}

function handleAnswer(choice, btnEl) {
  if (state.answered) return;
  state.answered = true;
  const q = state.question;
  const correct = choice === q.answer;

  [...el.choices.children].forEach((btn) => (btn.disabled = true));

  if (correct) {
    btnEl.classList.add('correct');
    el.feedback.textContent = `Correct - ${q.label(q.answer)}`;
    el.feedback.className = 'feedback correct';
  } else {
    btnEl.classList.add('incorrect');
    el.feedback.textContent = `Not quite - that was ${q.label(q.answer)}`;
    el.feedback.className = 'feedback incorrect';
    [...el.choices.children].forEach((btn) => {
      if (btn.textContent === q.label(q.answer)) btn.classList.add('correct');
    });
  }

  state.sessionTotal += 1;
  if (correct) state.sessionCorrect += 1;
  updateSessionScore();
  recordAnswer(state.mode, correct);

  el.nextBtn.classList.remove('hidden');
}

function updateSessionScore() {
  el.sessionScore.textContent = `Session: ${state.sessionCorrect}/${state.sessionTotal}`;
}

el.modeCards.forEach((card) => {
  card.addEventListener('click', () => showDrillScreen(card.dataset.mode));
});
el.backBtn.addEventListener('click', renderHome);
el.playBtn.addEventListener('click', playCurrentQuestion);
el.nextBtn.addEventListener('click', loadNextQuestion);

renderHome();
