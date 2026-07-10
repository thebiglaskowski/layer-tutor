// Screen rendering. DOM-only; owns no game state.

import { STAGES, FLUENT_WPM, PASS_ACCURACY } from './lessons.js';
import { boardFullLabel, boardLabel } from './boards/index.js';

const SCREENS = ['screen-menu', 'screen-game', 'screen-results'];

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

export function showScreen(id) {
  for (const s of SCREENS) {
    const el = document.getElementById(s);
    const on = s === id;
    el.classList.toggle('hidden', !on);
    el.setAttribute('aria-hidden', on ? 'false' : 'true');
  }
  // Move focus to a sensible landmark on the new screen.
  // During a run, focus the prompt (not Menu) so Space types a space instead of
  // activating the focused button.
  requestAnimationFrame(() => {
    if (id === 'screen-menu') {
      document.querySelector('#stage-list .stage-card:not(.locked)')?.focus();
    } else if (id === 'screen-game') {
      document.getElementById('prompt')?.focus({ preventScroll: true });
    } else if (id === 'screen-results') {
      document.getElementById('btn-retry')?.focus();
    }
  });
}

/** Keep typing focus on the prompt while a stage is active. */
export function focusTypingSurface() {
  const prompt = document.getElementById('prompt');
  if (!prompt) return;
  if (document.activeElement !== prompt) {
    prompt.focus({ preventScroll: true });
  }
}

/**
 * @param {object} progress
 * @param {(stage: object, opts: { practice: boolean }) => void} onSelect
 * @param {Array<[string, number]>} [topMisses]
 * @param {{ boards?: object[], activeBoard?: object, onBoardChange?: (id: string) => void }} [boardOpts]
 */
export function renderMenu(progress, onSelect, topMisses = [], boardOpts = {}) {
  const { boards = [], activeBoard = null, onBoardChange = null } = boardOpts;

  // Board picker + product label
  const select = document.getElementById('board-select');
  const productEl = document.getElementById('board-product');
  if (select && boards.length) {
    select.innerHTML = '';
    for (const b of boards) {
      const opt = document.createElement('option');
      opt.value = b.id;
      opt.textContent = boardLabel(b);
      if (activeBoard && b.id === activeBoard.id) opt.selected = true;
      select.appendChild(opt);
    }
    select.disabled = boards.length < 2;
    select.onchange = () => onBoardChange?.(select.value);
    select.setAttribute('aria-label', 'Keyboard model');
  }
  if (productEl && activeBoard) {
    productEl.textContent = boardFullLabel(activeBoard);
  }

  const list = document.getElementById('stage-list');
  list.innerHTML = '';
  list.setAttribute('role', 'list');

  STAGES.forEach((stage, i) => {
    const p = progress.stages[stage.id] ?? { unlocked: false, bestWpm: 0, bestAccuracy: 0, timesPlayed: 0, fluent: false };
    const li = document.createElement('li');
    li.setAttribute('role', 'listitem');

    const card = document.createElement('div');
    card.className = 'stage-card' + (p.unlocked ? '' : ' locked');
    card.dataset.stageId = stage.id;
    card.dataset.index = String(i);

    if (p.unlocked) {
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `Play ${stage.name}`);
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-action="practice"]')) return;
        onSelect(stage, { practice: false });
      });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(stage, { practice: false });
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          const cards = [...list.querySelectorAll('.stage-card:not(.locked)')];
          const idx = cards.indexOf(card);
          const next = e.key === 'ArrowDown' ? cards[idx + 1] : cards[idx - 1];
          next?.focus();
        }
      });
    } else {
      card.setAttribute('aria-disabled', 'true');
      card.setAttribute('aria-label', `${stage.name}, locked`);
    }

    const stats = p.unlocked
      ? (p.timesPlayed
        ? `${p.bestWpm} wpm · ${p.bestAccuracy}%${p.fluent ? ' · fluent' : ''}`
        : 'not played')
      : 'locked';

    card.innerHTML = `
      <span class="stage-num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
      <span class="stage-info">
        <span class="stage-name">${esc(stage.name)}${p.fluent ? ' <span class="fluent-badge" title="≥' + FLUENT_WPM + ' wpm at ≥' + PASS_ACCURACY + '%">fluent</span>' : ''}</span>
        <span class="stage-hint">${esc(stage.layerHint)}</span>
      </span>
      <span class="stage-stats">${p.unlocked ? esc(stats) : '<span class="lock-icon" aria-hidden="true">🔒</span>'}</span>
      ${p.unlocked ? '<button type="button" class="btn-practice" data-action="practice" aria-label="Free practice ' + esc(stage.name) + '">Practice</button>' : ''}`;

    const practiceBtn = card.querySelector('[data-action="practice"]');
    if (practiceBtn) {
      practiceBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelect(stage, { practice: true });
      });
    }

    li.appendChild(card);
    list.appendChild(li);
  });

  // Rolling heatmap strip
  const heat = document.getElementById('heatmap');
  if (heat) {
    if (topMisses.length) {
      heat.innerHTML = '<h2 class="heatmap-title">Missed keys (all time)</h2><div class="heatmap-keys">'
        + topMisses.map(([ch, n]) =>
          `<span class="miss"><kbd>${ch === ' ' ? '␣' : esc(ch)}</kbd> ×${n}</span>`).join('')
        + '</div>';
      heat.classList.remove('hidden');
    } else {
      heat.innerHTML = '';
      heat.classList.add('hidden');
    }
  }
}

export function renderPrompt(item, cursor) {
  const el = document.getElementById('prompt');
  el.innerHTML = '';
  el.setAttribute('aria-label', `Type: ${item}`);
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
  void cur.offsetWidth;
  cur.classList.add('error-flash');
}

export function renderLiveStats({ wpm, accuracy }, progressText) {
  document.getElementById('live-wpm').textContent = `${wpm} wpm`;
  document.getElementById('live-acc').textContent = `${accuracy}%`;
  document.getElementById('live-progress').textContent = progressText;
}

export function setPaused(paused) {
  const overlay = document.getElementById('pause-overlay');
  if (!overlay) return;
  overlay.classList.toggle('hidden', !paused);
  overlay.setAttribute('aria-hidden', paused ? 'false' : 'true');
}

export function renderResults(stage, { wpm, accuracy }, mistakes, {
  passed,
  hasNext,
  practice,
  fluent,
  fluentNow,
  boardName,
}) {
  const title = document.getElementById('results-title');
  const boardSuffix = boardName ? ` · ${boardName}` : '';
  if (practice) {
    title.textContent = `${stage.name} — practice complete${boardSuffix}`;
  } else if (passed) {
    title.textContent = fluentNow
      ? `${stage.name} — cleared & fluent!${boardSuffix}`
      : `${stage.name} — cleared!${boardSuffix}`;
  } else {
    title.textContent = `${stage.name} — keep practicing${boardSuffix}`;
  }

  const fluentNote = fluent
    ? `<p class="fluent-note">Fluent badge: ≥${FLUENT_WPM} wpm at ≥${PASS_ACCURACY}% accuracy.</p>`
    : (passed
      ? `<p class="fluent-note dim">Unlocked next. Hit ≥${FLUENT_WPM} wpm at ≥${PASS_ACCURACY}% for the fluent badge.</p>`
      : `<p class="fluent-note dim">Need ≥${PASS_ACCURACY}% accuracy to unlock the next stage.</p>`);

  document.getElementById('results-stats').innerHTML = `
    <div class="stat"><span class="stat-value">${wpm}</span><span class="stat-label">wpm</span></div>
    <div class="stat"><span class="stat-value">${accuracy}%</span><span class="stat-label">accuracy</span></div>
    ${fluent ? '<div class="stat fluent-stat"><span class="stat-value">✓</span><span class="stat-label">fluent</span></div>' : ''}`;

  const noteEl = document.getElementById('results-note');
  if (noteEl) noteEl.innerHTML = fluentNote;

  const mEl = document.getElementById('results-mistakes');
  const entries = Object.entries(mistakes).sort((a, b) => b[1] - a[1]).slice(0, 8);
  mEl.innerHTML = entries.length
    ? '<h3>Missed this run</h3>' + entries.map(([ch, n]) =>
        `<span class="miss"><kbd>${ch === ' ' ? '␣' : esc(ch)}</kbd> ×${n}</span>`).join('')
    : '<p class="flawless">Flawless — no missed keys.</p>';

  document.getElementById('btn-next').classList.toggle('hidden', !(passed && hasNext && !practice));
}

export function announce(msg) {
  const live = document.getElementById('aria-live');
  if (!live) return;
  live.textContent = '';
  requestAnimationFrame(() => { live.textContent = msg; });
}
