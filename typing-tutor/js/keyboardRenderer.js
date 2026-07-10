// Renders the split-keyboard diagram and highlights the current target.
//
// Layout is geometry-driven to mirror the physical board: every key has an
// explicit position/size/rotation in key-pitch units ("u"), and the case is
// one continuous SVG outline that steps with the column stagger and wraps
// the fanned thumb cluster. The right half is a mirror of the left.
//
// State is closed over per mount (no module-global key map).

import { PRIMARY_BOARD } from './keyboardLayout.js';

const U = 3.55;
const KEY_GAP = 0.35;
const CO = [0.55, 0.40, 0.12, 0, 0.15, 0.28, 0.65];
const PAD = 0.30;

const THUMB_GEOM_L = {
  L33: { x: 3.45, y: 3.30, w: 1, h: 1, r: 6 },
  L34: { x: 4.58, y: 3.46, w: 1, h: 1, r: 14 },
  L35: { x: 5.75, y: 2.85, w: 1, h: 1.85, r: 22 },
};
const THUMB_MIRROR = { R33: 'L35', R34: 'L34', R35: 'L33' };

function visualColOf(key) {
  if (key.half === 'R' && key.row === 2) return key.col + 1;
  return key.col;
}

function geomFor(key) {
  if (key.row === 3) {
    const left = THUMB_GEOM_L[key.id] ?? THUMB_GEOM_L[THUMB_MIRROR[key.id]];
    if (key.half === 'L') return left;
    return { x: 7 - left.x - left.w, y: left.y, w: left.w, h: left.h, r: -left.r };
  }
  const vc = visualColOf(key);
  const off = key.half === 'L' ? CO[vc] : CO[6 - vc];
  return { x: vc, y: off + key.row, w: 1, h: 1, r: 0 };
}

const CASE_L = [
  [-PAD, CO[0] - PAD],
  [1, CO[0] - PAD], [1, CO[1] - PAD],
  [2, CO[1] - PAD], [2, CO[2] - PAD],
  [3, CO[2] - PAD], [3, CO[3] - PAD],
  [4, CO[3] - PAD], [4, CO[4] - PAD],
  [5, CO[4] - PAD], [5, CO[5] - PAD],
  [6, CO[5] - PAD], [6, CO[6] - PAD],
  [7 + PAD, CO[6] - PAD],
  [7 + PAD, 3.85],
  [6.25, 5.30],
  [3.45, 4.88],
  [3.15, 4.58],
  [3.15, CO[2] + 3 + PAD],
  [2, CO[2] + 3 + PAD], [2, CO[1] + 3 + PAD],
  [1, CO[1] + 3 + PAD], [1, CO[0] + 3 + PAD],
  [-PAD, CO[0] + 3 + PAD],
];

const MIN_Y = CO[3] - PAD;
const MAX_Y = 5.35;
const MIN_X = -PAD;
const MAX_X = 7 + PAD;
const WIDTH_U = MAX_X - MIN_X;
const HEIGHT_U = MAX_Y - MIN_Y;

function roundedPath(pts, radius) {
  const n = pts.length;
  let d = '';
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i + n - 1) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const v1 = [p1[0] - p0[0], p1[1] - p0[1]];
    const v2 = [p2[0] - p1[0], p2[1] - p1[1]];
    const l1 = Math.hypot(v1[0], v1[1]);
    const l2 = Math.hypot(v2[0], v2[1]);
    const r1 = Math.min(radius, l1 / 2);
    const r2 = Math.min(radius, l2 / 2);
    const a = [p1[0] - (v1[0] / l1) * r1, p1[1] - (v1[1] / l1) * r1];
    const b = [p1[0] + (v2[0] / l2) * r2, p1[1] + (v2[1] / l2) * r2];
    d += `${i === 0 ? 'M' : 'L'} ${a[0].toFixed(1)} ${a[1].toFixed(1)} `;
    d += `Q ${p1[0].toFixed(1)} ${p1[1].toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)} `;
  }
  return `${d}Z`;
}

function caseSvg(half) {
  const pts = CASE_L.map(([x, y]) => {
    const px = half === 'L' ? x : 7 - x;
    return [(px - MIN_X) * 100, (y - MIN_Y) * 100];
  });
  const gradId = `kb-case-grad-${half}`;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'kb-case');
  svg.setAttribute('viewBox', `0 0 ${WIDTH_U * 100} ${HEIGHT_U * 100}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `
    <defs>
      <linearGradient id="${gradId}" x1="0" y1="0" x2="0.35" y2="1">
        <stop offset="0" stop-color="#141924"/>
        <stop offset="0.65" stop-color="#090c12"/>
      </linearGradient>
    </defs>
    <path d="${roundedPath(pts, 18)}" fill="url(#${gradId})"
          stroke="#242d40" stroke-width="2.5"/>`;
  return svg;
}

function leftGlow(col) {
  const hue = 175 + ((220 - 175) * col) / 6;
  return `hsl(${hue.toFixed(0)} 85% 58% / 0.5)`;
}

function rightGlow(col) {
  const stops = [270, 330, 375, 410, 480];
  const t = (col / 6) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(t));
  const frac = t - i;
  const hue = (stops[i] + (stops[i + 1] - stops[i]) * frac) % 360;
  return `hsl(${hue.toFixed(0)} 85% 58% / 0.5)`;
}

function glowFor(key, geom) {
  const col = Math.round(Math.min(6, Math.max(0, geom.x)));
  return key.half === 'L' ? leftGlow(col) : rightGlow(col);
}

/**
 * Mount a keyboard into `container`.
 * @param {HTMLElement} container
 * @param {object} [board] board from the registry (defaults to Corne V4)
 * @returns {{ highlightTarget: (target: object|null) => void, destroy: () => void }}
 */
export function renderKeyboard(container, board = PRIMARY_BOARD) {
  const KEYS = board.KEYS;
  const LAYER_HOLD = board.LAYER_HOLD;
  const shiftKeysFor = board.shiftKeysFor.bind(board);

  const keyEls = new Map();
  container.innerHTML = '';
  container.setAttribute('role', 'img');
  container.setAttribute(
    'aria-label',
    `${board.name || 'Split'} keyboard diagram showing the target key`,
  );

  for (const half of ['L', 'R']) {
    const halfEl = document.createElement('div');
    halfEl.className = `kb-half kb-half-${half}`;
    halfEl.style.width = `${(WIDTH_U * U).toFixed(2)}rem`;
    halfEl.style.height = `${(HEIGHT_U * U).toFixed(2)}rem`;
    halfEl.appendChild(caseSvg(half));

    for (const key of KEYS.filter((k) => k.half === half)) {
      const g = geomFor(key);
      const el = document.createElement('div');
      el.className = 'kb-key';
      el.dataset.keyId = key.id;
      el.style.left = `${((g.x - MIN_X) * U + KEY_GAP / 2).toFixed(2)}rem`;
      el.style.top = `${((g.y - MIN_Y) * U + KEY_GAP / 2).toFixed(2)}rem`;
      el.style.width = `${(g.w * U - KEY_GAP).toFixed(2)}rem`;
      el.style.height = `${(g.h * U - KEY_GAP).toFixed(2)}rem`;
      if (g.r) el.style.setProperty('--rot', `${g.r}deg`);
      el.style.setProperty('--glow', glowFor(key, g));

      const legend = document.createElement('span');
      legend.className = 'kb-legend';
      el.appendChild(legend);

      const badge = document.createElement('span');
      badge.className = 'kb-badge';
      badge.hidden = true;
      el.appendChild(badge);

      halfEl.appendChild(el);
      keyEls.set(key.id, el);
    }
    container.appendChild(halfEl);
  }

  function setDisplayLayer(layer) {
    for (const key of KEYS) {
      const el = keyEls.get(key.id);
      const text = key.legends[layer];
      const legendEl = el.querySelector('.kb-legend');
      legendEl.textContent = text ?? '';
      el.classList.toggle('kb-key-blank', text == null);
      el.classList.toggle('kb-key-wide-legend', (text ?? '').length > 1);
    }
  }

  function clearHighlights() {
    for (const el of keyEls.values()) {
      el.classList.remove('kb-target', 'kb-hold', 'kb-shift');
      const badge = el.querySelector('.kb-badge');
      badge.hidden = true;
      badge.textContent = '';
    }
  }

  function highlightTarget(target) {
    clearHighlights();
    if (!target) {
      setDisplayLayer(0);
      return;
    }
    setDisplayLayer(target.layer);
    keyEls.get(target.keyId)?.classList.add('kb-target');

    if (target.layer > 0) {
      const holdEl = keyEls.get(LAYER_HOLD[target.layer]);
      if (holdEl) {
        holdEl.classList.add('kb-hold');
        const badge = holdEl.querySelector('.kb-badge');
        badge.hidden = false;
        badge.textContent = 'HOLD FN';
      }
    }
    if (target.shift) {
      for (const id of shiftKeysFor(target)) {
        const shiftEl = keyEls.get(id);
        if (shiftEl) {
          shiftEl.classList.add('kb-shift');
          const badge = shiftEl.querySelector('.kb-badge');
          badge.hidden = false;
          badge.textContent = 'SHIFT';
        }
      }
    }
  }

  setDisplayLayer(0);

  return {
    highlightTarget,
    destroy() {
      clearHighlights();
      keyEls.clear();
      container.innerHTML = '';
    },
  };
}
