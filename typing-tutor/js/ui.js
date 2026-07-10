// Screen rendering. DOM-only; owns no game state.

import { STAGES, TRACK_META, FLUENT_WPM, PASS_ACCURACY, todaysFocus } from './lessons.js';
import { boardFullLabel, boardLabel } from './boards/index.js';

const SCREENS = [
  'screen-menu', 'screen-game', 'screen-results',
  'screen-onboarding', 'screen-sandbox',
];

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

export function showScreen(id) {
  for (const s of SCREENS) {
    const el = document.getElementById(s);
    if (!el) continue;
    const on = s === id;
    el.classList.toggle('hidden', !on);
    el.setAttribute('aria-hidden', on ? 'false' : 'true');
  }
  requestAnimationFrame(() => {
    if (id === 'screen-menu') {
      document.querySelector('.stage-card:not(.locked)')?.focus();
    } else if (id === 'screen-game') {
      document.getElementById('prompt')?.focus({ preventScroll: true });
    } else if (id === 'screen-results') {
      document.getElementById('btn-retry')?.focus();
    } else if (id === 'screen-sandbox') {
      document.getElementById('sandbox-prompt')?.focus({ preventScroll: true });
    } else if (id === 'screen-onboarding') {
      document.getElementById('onboard-prompt')?.focus({ preventScroll: true });
    }
  });
}

export function focusTypingSurface() {
  const prompt = document.getElementById('prompt');
  if (prompt && document.activeElement !== prompt) {
    prompt.focus({ preventScroll: true });
  }
}

export function updateRotateHint() {
  const el = document.getElementById('rotate-hint');
  if (!el) return;
  const portrait = window.matchMedia('(max-width: 760px) and (orientation: portrait)').matches;
  el.classList.toggle('hidden', !portrait);
}

/**
 * @param {object} progress
 * @param {(stage: object, opts: object) => void} onSelect
 * @param {Array<[string, number]>} topMisses
 * @param {object} boardOpts
 */
export function renderMenu(progress, onSelect, topMisses = [], boardOpts = {}) {
  const {
    boards = [],
    activeBoard = null,
    onBoardChange = null,
    onWeakKeys = null,
    onPlayCustom = null,
    onEditNote = null,
  } = boardOpts;

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
  }
  if (productEl && activeBoard) productEl.textContent = boardFullLabel(activeBoard);

  // Today focus + streak
  const focus = todaysFocus(progress, STAGES);
  const focusEl = document.getElementById('today-focus');
  if (focusEl) {
    focusEl.hidden = false;
    focusEl.innerHTML = `<span class="focus-label">Today</span> <span class="focus-text">${esc(focus.title)}</span>`;
  }
  const streakEl = document.getElementById('streak-bar');
  if (streakEl) {
    const n = progress.streak?.count || 0;
    if (n > 0) {
      streakEl.hidden = false;
      streakEl.textContent = `🔥 ${n}-day streak`;
    } else {
      streakEl.hidden = true;
    }
  }

  // Settings checkboxes
  const s = progress.settings || {};
  const bind = (id, key) => {
    const el = document.getElementById(id);
    if (el) el.checked = s[key] !== false && !!s[key] || (s[key] === undefined && el.defaultChecked);
  };
  const setFocus = document.getElementById('set-focus-mode');
  const setGhost = document.getElementById('set-home-ghost');
  const setCollapsed = document.getElementById('set-board-collapsed');
  const setReduced = document.getElementById('set-reduced-auto');
  if (setFocus) setFocus.checked = s.focusMode !== false;
  if (setGhost) setGhost.checked = s.showHomeGhost !== false;
  if (setCollapsed) setCollapsed.checked = !!s.boardCollapsed;
  if (setReduced) setReduced.checked = s.reducedBoardAuto !== false;
  const setFullMap = document.getElementById('set-full-layer-map');
  if (setFullMap) setFullMap.checked = s.fullLayerMap !== false;

  // Grouped stage list
  const host = document.getElementById('stage-list');
  host.innerHTML = '';
  const byTrack = new Map();
  for (const stage of STAGES) {
    if (!byTrack.has(stage.track)) byTrack.set(stage.track, []);
    byTrack.get(stage.track).push(stage);
  }
  const tracks = [...byTrack.keys()].sort(
    (a, b) => (TRACK_META[a]?.order ?? 99) - (TRACK_META[b]?.order ?? 99),
  );

  for (const track of tracks) {
    const section = document.createElement('section');
    section.className = 'track-section';
    section.innerHTML = `<h2 class="track-title">${esc(TRACK_META[track]?.title || track)}</h2>`;
    const list = document.createElement('ol');
    list.className = 'stage-list-ol';

    byTrack.get(track).forEach((stage) => {
      const p = progress.stages[stage.id] ?? {
        unlocked: false, bestWpm: 0, bestAccuracy: 0, timesPlayed: 0, fluent: false, recentRuns: [],
      };
      const globalIndex = STAGES.indexOf(stage);
      const li = document.createElement('li');
      const card = document.createElement('div');
      card.className = 'stage-card' + (p.unlocked ? '' : ' locked');
      card.dataset.stageId = stage.id;

      let status = 'locked';
      if (p.unlocked && p.fluent) status = 'fluent';
      else if (p.unlocked && p.timesPlayed > 0) status = 'cleared';
      else if (p.unlocked) status = 'open';

      const chip = {
        locked: 'Locked',
        open: 'Open',
        cleared: 'Cleared',
        fluent: 'Fluent',
      }[status];

      const spark = (p.recentRuns || []).map((r) => r.wpm);
      const sparkSvg = sparkline(spark);

      const stats = p.unlocked
        ? (p.timesPlayed
          ? `${p.bestWpm} wpm · ${p.bestAccuracy}%`
          : 'not played')
        : '';

      const goal = p.wpmGoal ? ` · goal ${p.wpmGoal}` : '';

      card.innerHTML = `
        <span class="stage-num" aria-hidden="true">${String(globalIndex + 1).padStart(2, '0')}</span>
        <span class="stage-info">
          <span class="stage-name">${esc(stage.name)}
            <span class="status-chip status-${status}">${chip}</span>
          </span>
          <span class="stage-hint">${esc(stage.layerHint)}</span>
          ${sparkSvg ? `<span class="spark-wrap">${sparkSvg}</span>` : ''}
        </span>
        <span class="stage-stats">${p.unlocked ? esc(stats + goal) : '🔒'}</span>
        ${p.unlocked ? '<button type="button" class="btn-practice" data-action="practice">Practice</button>' : ''}
      `;

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
          }
        });
        card.querySelector('[data-action="practice"]')?.addEventListener('click', (e) => {
          e.stopPropagation();
          onSelect(stage, { practice: true });
        });
      } else {
        card.setAttribute('aria-disabled', 'true');
      }

      li.appendChild(card);
      list.appendChild(li);
    });

    section.appendChild(list);
    host.appendChild(section);
  }

  // Heatmap list
  const heat = document.getElementById('heatmap');
  const heatSection = document.getElementById('heatmap-section');
  if (heat && heatSection) {
    if (topMisses.length) {
      heat.innerHTML = topMisses.map(([ch, n]) =>
        `<span class="miss"><kbd>${ch === ' ' ? '␣' : esc(ch)}</kbd> ×${n}</span>`).join('');
      heatSection.classList.remove('hidden');
    } else {
      heat.innerHTML = '';
      heatSection.classList.add('hidden');
    }
  }

  updateRotateHint();
}

function sparkline(values) {
  if (!values?.length) return '';
  const w = 64;
  const h = 18;
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => {
    const x = values.length === 1 ? w / 2 : (i / (values.length - 1)) * w;
    const y = h - (v / max) * (h - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><polyline fill="none" stroke="currentColor" stroke-width="1.5" points="${pts}"/></svg>`;
}

export function renderPrompt(item, cursor) {
  const el = document.getElementById('prompt');
  if (!el) return;
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

export function renderLiveStats({ wpm, accuracy }, progressText, goal = 0) {
  const wpmEl = document.getElementById('live-wpm');
  const accEl = document.getElementById('live-acc');
  const progEl = document.getElementById('live-progress');
  const goalEl = document.getElementById('live-goal');
  if (wpmEl) wpmEl.textContent = `${wpm} wpm`;
  if (accEl) {
    accEl.textContent = `${accuracy}%`;
    accEl.classList.remove('acc-good', 'acc-mid', 'acc-bad');
    if (accuracy >= PASS_ACCURACY) accEl.classList.add('acc-good');
    else if (accuracy >= 80) accEl.classList.add('acc-mid');
    else accEl.classList.add('acc-bad');
  }
  if (progEl) progEl.textContent = progressText;
  if (goalEl) {
    if (goal > 0) {
      goalEl.classList.remove('hidden');
      goalEl.textContent = wpm >= goal ? `goal ${goal} ✓` : `goal ${goal}`;
      goalEl.classList.toggle('goal-met', wpm >= goal);
    } else {
      goalEl.classList.add('hidden');
    }
  }
}

export function renderProgressBar(frac) {
  const bar = document.getElementById('prompt-progress-bar');
  if (bar) bar.style.width = `${Math.min(100, Math.max(0, frac * 100)).toFixed(1)}%`;
}

export function setContextTip(text) {
  const el = document.getElementById('context-tip');
  if (el) el.textContent = text || '';
}

export function setHoldMeter(visible, fill = 1) {
  const meter = document.getElementById('hold-meter');
  const fillEl = document.getElementById('hold-meter-fill');
  if (!meter) return;
  meter.classList.toggle('hidden', !visible);
  meter.setAttribute('aria-hidden', visible ? 'false' : 'true');
  if (fillEl) fillEl.style.width = `${Math.min(100, fill * 100)}%`;
}

export function setPaused(paused) {
  const overlay = document.getElementById('pause-overlay');
  if (!overlay) return;
  overlay.classList.toggle('hidden', !paused);
  overlay.setAttribute('aria-hidden', paused ? 'false' : 'true');
}

export function renderResults(stage, { wpm, accuracy }, mistakes, opts) {
  const {
    passed, hasNext, practice, fluent, fluentNow, boardName,
    previousBest = null, coach = '', recentRuns = [],
  } = opts;

  const title = document.getElementById('results-title');
  const boardSuffix = boardName ? ` · ${boardName}` : '';
  if (practice) title.textContent = `${stage.name} — practice complete${boardSuffix}`;
  else if (passed) {
    title.textContent = fluentNow
      ? `${stage.name} — cleared & fluent!${boardSuffix}`
      : `${stage.name} — cleared!${boardSuffix}`;
  } else title.textContent = `${stage.name} — keep practicing${boardSuffix}`;

  const fluentNote = fluent
    ? `<p class="fluent-note">Fluent: ≥${FLUENT_WPM} wpm at ≥${PASS_ACCURACY}%.</p>`
    : (passed
      ? `<p class="fluent-note dim">Unlocked next. Hit ≥${FLUENT_WPM} wpm for fluent.</p>`
      : `<p class="fluent-note dim">Need ≥${PASS_ACCURACY}% accuracy to unlock the next stage.</p>`);

  document.getElementById('results-stats').innerHTML = `
    <div class="stat"><span class="stat-value">${wpm}</span><span class="stat-label">wpm</span></div>
    <div class="stat"><span class="stat-value">${accuracy}%</span><span class="stat-label">accuracy</span></div>
    ${fluent ? '<div class="stat fluent-stat"><span class="stat-value">✓</span><span class="stat-label">fluent</span></div>' : ''}`;

  const noteEl = document.getElementById('results-note');
  if (noteEl) noteEl.innerHTML = fluentNote;

  const delta = document.getElementById('results-delta');
  if (delta) {
    if (previousBest && previousBest.wpm > 0) {
      const dw = wpm - previousBest.wpm;
      const da = Math.round((accuracy - previousBest.accuracy) * 10) / 10;
      const wSign = dw > 0 ? '+' : '';
      const aSign = da > 0 ? '+' : '';
      delta.innerHTML = `vs best: <span class="${dw >= 0 ? 'up' : 'down'}">${wSign}${dw} wpm</span>
        · <span class="${da >= 0 ? 'up' : 'down'}">${aSign}${da}% acc</span>`;
    } else {
      delta.textContent = 'First recorded run for this stage.';
    }
  }

  const coachEl = document.getElementById('results-coach');
  if (coachEl) coachEl.textContent = coach || '';

  const spark = document.getElementById('results-spark');
  if (spark) {
    const runs = recentRuns.map((r) => r.wpm);
    spark.innerHTML = runs.length
      ? `<span class="spark-label">Recent WPM</span> ${sparkline(runs)}`
      : '';
  }

  const mEl = document.getElementById('results-mistakes');
  const entries = Object.entries(mistakes).sort((a, b) => b[1] - a[1]).slice(0, 8);
  mEl.innerHTML = entries.length
    ? '<h3>Missed this run</h3>' + entries.map(([ch, n]) =>
        `<span class="miss"><kbd>${ch === ' ' ? '␣' : esc(ch)}</kbd> ×${n}</span>`).join('')
    : '<p class="flawless">Flawless — no missed keys.</p>';

  document.getElementById('btn-next').classList.toggle('hidden', !(passed && hasNext && !practice));
  document.getElementById('btn-drill-misses').classList.toggle('hidden', !entries.length);

  const noteInput = document.getElementById('stage-note');
  if (noteInput) noteInput.value = stage._note || '';
  const goalInput = document.getElementById('wpm-goal');
  if (goalInput) goalInput.value = stage._wpmGoal || '';
}

export function announce(msg) {
  const live = document.getElementById('aria-live');
  if (!live) return;
  live.textContent = '';
  requestAnimationFrame(() => { live.textContent = msg; });
}

export function renderCheatSheet(board) {
  const host = document.getElementById('cheat-layers');
  const name = document.getElementById('cheat-board-name');
  if (name) name.textContent = boardFullLabel(board);
  if (!host) return;
  const layers = [
    { n: 0, title: 'Layer 0 · base' },
    { n: 1, title: 'Layer 1 · hold left Fn' },
    { n: 2, title: 'Layer 2 · hold right Fn' },
  ];
  host.innerHTML = layers.map(({ n, title }) => {
    const rows = [[], [], [], []];
    for (const k of board.KEYS) {
      rows[k.row].push(k);
    }
    const half = (h) => [0, 1, 2, 3].map((r) => {
      const keys = board.KEYS.filter((k) => k.half === h && k.row === r)
        .sort((a, b) => a.col - b.col);
      return `<div class="cheat-row">${keys.map((k) => {
        const leg = k.legends[n];
        return `<span class="cheat-key ${leg == null ? 'blank' : ''}">${esc(leg ?? '·')}</span>`;
      }).join('')}</div>`;
    }).join('');
    return `<div class="cheat-layer"><h3>${esc(title)}</h3>
      <div class="cheat-halves"><div>${half('L')}</div><div>${half('R')}</div></div></div>`;
  }).join('');
}

export function renderCustomLists(lists, { onPlay, onDelete }) {
  const ul = document.getElementById('list-saved');
  if (!ul) return;
  ul.innerHTML = '';
  for (const list of lists || []) {
    const li = document.createElement('li');
    li.innerHTML = `<span>${esc(list.name)} <small>(${list.items.length})</small></span>
      <span class="list-btns">
        <button type="button" data-act="play">Play</button>
        <button type="button" data-act="del">Delete</button>
      </span>`;
    li.querySelector('[data-act="play"]').onclick = () => onPlay(list);
    li.querySelector('[data-act="del"]').onclick = () => onDelete(list.id);
    ul.appendChild(li);
  }
}

export function setModal(id, open) {
  document.getElementById(id)?.classList.toggle('hidden', !open);
}
