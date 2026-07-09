// Renders the split-keyboard diagram and highlights the current target.
// The only DOM module besides ui.js/main.js.

import { KEYS, LAYER_HOLD, SHIFT_KEY } from './keyboardLayout.js';

const keyEls = new Map();

// Thumb keys (row 3) aren't placed on the 7-col grid — they sit in their own
// angled cluster — but they still need a "visual column" for the glow-hue
// sweep. These approximate where each thumb key sits under the main grid.
const THUMB_VISUAL_COL = {
  L33: 4, L34: 5, L35: 6,
  R33: 0, R34: 1, R35: 2,
};

// Per-visual-column vertical offset (rem), pushed down. Middle-finger column
// (3) is highest (0), pinky/outer columns are lowest.
const STAGGER_L = [0.55, 0.45, 0.12, 0, 0.18, 0.30, 0.42];
const STAGGER_R = [0.42, 0.30, 0.18, 0, 0.12, 0.45, 0.55];

function visualColOf(key) {
  if (key.row === 3) return THUMB_VISUAL_COL[key.id];
  // Right-half bottom letter row's missing key is at the inner edge (col 0),
  // not the outer edge, so every stored col shifts right by one.
  if (key.half === 'R' && key.row === 2) return key.col + 1;
  return key.col;
}

function leftGlow(col) {
  const hue = 175 + ((220 - 175) * col) / 6;
  return `hsl(${hue.toFixed(0)} 85% 58% / 0.5)`;
}

function rightGlow(col) {
  // purple -> magenta -> red -> orange -> green, unwrapped so it can be
  // interpolated linearly and let CSS wrap the final value mod 360.
  const stops = [270, 330, 375, 410, 480];
  const t = (col / 6) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(t));
  const frac = t - i;
  const hue = (stops[i] + (stops[i + 1] - stops[i]) * frac) % 360;
  return `hsl(${hue.toFixed(0)} 85% 58% / 0.5)`;
}

function glowFor(key, visualCol) {
  return key.half === 'L' ? leftGlow(visualCol) : rightGlow(visualCol);
}

export function renderKeyboard(container) {
  container.innerHTML = '';
  keyEls.clear();
  for (const half of ['L', 'R']) {
    const halfEl = document.createElement('div');
    halfEl.className = `kb-half kb-half-${half}`;

    const gridEl = document.createElement('div');
    gridEl.className = 'kb-rows-grid';

    const thumbEl = document.createElement('div');
    thumbEl.className = `kb-row kb-thumb-${half}`;

    for (let row = 0; row < 4; row++) {
      for (const key of KEYS.filter((k) => k.half === half && k.row === row)) {
        const el = document.createElement('div');
        el.className = 'kb-key';
        el.dataset.keyId = key.id;

        const visualCol = visualColOf(key);
        el.style.setProperty('--glow', glowFor(key, visualCol));

        if (row < 3) {
          el.style.gridColumn = String(visualCol + 1);
          el.style.gridRow = String(row + 1);
          el.style.setProperty('--stagger', `${(key.half === 'L' ? STAGGER_L : STAGGER_R)[visualCol]}rem`);
          gridEl.appendChild(el);
        } else {
          thumbEl.appendChild(el);
        }

        keyEls.set(key.id, el);
      }
    }

    halfEl.appendChild(gridEl);
    halfEl.appendChild(thumbEl);
    container.appendChild(halfEl);
  }
  setDisplayLayer(0);
}

function setDisplayLayer(layer) {
  for (const key of KEYS) {
    const el = keyEls.get(key.id);
    const legend = key.legends[layer];
    el.textContent = legend ?? '';
    el.classList.toggle('kb-key-blank', legend == null);
    el.classList.toggle('kb-key-wide-legend', (legend ?? '').length > 1);
  }
}

export function highlightTarget(target) {
  for (const el of keyEls.values()) el.classList.remove('kb-target', 'kb-hold');
  if (!target) {
    setDisplayLayer(0);
    return;
  }
  setDisplayLayer(target.layer);
  keyEls.get(target.keyId)?.classList.add('kb-target');
  if (target.layer > 0) keyEls.get(LAYER_HOLD[target.layer])?.classList.add('kb-hold');
  if (target.shift) keyEls.get(SHIFT_KEY)?.classList.add('kb-hold');
}
