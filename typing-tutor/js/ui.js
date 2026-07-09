// Screen rendering. DOM-only; owns no game state.

import { STAGES } from './lessons.js';

const SCREENS = ['screen-menu', 'screen-game', 'screen-results'];

const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

export function showScreen(id) {
  for (const s of SCREENS) {
    document.getElementById(s).classList.toggle('hidden', s !== id);
  }
}

export function renderMenu(progress, onSelect) {
  const list = document.getElementById('stage-list');
  list.innerHTML = '';
  STAGES.forEach((stage, i) => {
    const p = progress.stages[stage.id];
    const li = document.createElement('li');
    li.className = 'stage-card' + (p.unlocked ? '' : ' locked');
    li.innerHTML = `
      <span class="stage-num">${String(i + 1).padStart(2, '0')}</span>
      <span class="stage-info">
        <span class="stage-name">${esc(stage.name)}</span>
        <span class="stage-hint">${esc(stage.layerHint)}</span>
      </span>
      <span class="stage-stats">${p.unlocked
        ? (p.timesPlayed ? `${p.bestWpm} wpm · ${p.bestAccuracy}%` : 'not played')
        : '🔒'}</span>`;
    if (p.unlocked) li.addEventListener('click', () => onSelect(stage));
    list.appendChild(li);
  });
}

export function renderPrompt(item, cursor) {
  const el = document.getElementById('prompt');
  el.innerHTML = '';
  [...item].forEach((ch, i) => {
    const span = document.createElement('span');
    span.textContent = ch === ' ' ? '·' : ch;
    span.className = i < cursor ? 'ch typed' : i === cursor ? 'ch current' : 'ch pending';
    if (ch === ' ') span.classList.add('space');
    el.appendChild(span);
  });
}

export function flashError() {
  const cur = document.querySelector('#prompt .current');
  if (!cur) return;
  cur.classList.remove('error-flash');
  void cur.offsetWidth; // force reflow so the animation restarts
  cur.classList.add('error-flash');
}

export function renderLiveStats({ wpm, accuracy }, progressText) {
  document.getElementById('live-wpm').textContent = `${wpm} wpm`;
  document.getElementById('live-acc').textContent = `${accuracy}%`;
  document.getElementById('live-progress').textContent = progressText;
}

export function renderResults(stage, { wpm, accuracy }, mistakes, passed, hasNext) {
  document.getElementById('results-title').textContent =
    passed ? `${stage.name} — cleared!` : `${stage.name} — keep practicing`;
  document.getElementById('results-stats').innerHTML = `
    <div class="stat"><span class="stat-value">${wpm}</span><span class="stat-label">wpm</span></div>
    <div class="stat"><span class="stat-value">${accuracy}%</span><span class="stat-label">accuracy</span></div>`;
  const mEl = document.getElementById('results-mistakes');
  const entries = Object.entries(mistakes).sort((a, b) => b[1] - a[1]).slice(0, 8);
  mEl.innerHTML = entries.length
    ? '<h3>Missed keys</h3>' + entries.map(([ch, n]) =>
        `<span class="miss"><kbd>${ch === ' ' ? '␣' : esc(ch)}</kbd> ×${n}</span>`).join('')
    : '<p class="flawless">Flawless — no missed keys.</p>';
  document.getElementById('btn-next').classList.toggle('hidden', !(passed && hasNext));
}
