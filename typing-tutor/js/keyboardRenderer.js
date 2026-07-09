// Renders the split-keyboard diagram and highlights the current target.
// The only DOM module besides ui.js/main.js.

import { KEYS, LAYER_HOLD, SHIFT_KEY } from './keyboardLayout.js';

const keyEls = new Map();

export function renderKeyboard(container) {
  container.innerHTML = '';
  keyEls.clear();
  for (const half of ['L', 'R']) {
    const halfEl = document.createElement('div');
    halfEl.className = 'kb-half';
    for (let row = 0; row < 4; row++) {
      const rowEl = document.createElement('div');
      rowEl.className = `kb-row${row === 3 ? ` kb-thumb-${half}` : ''}`;
      for (const key of KEYS.filter((k) => k.half === half && k.row === row)) {
        const el = document.createElement('div');
        el.className = 'kb-key';
        el.dataset.keyId = key.id;
        keyEls.set(key.id, el);
        rowEl.appendChild(el);
      }
      halfEl.appendChild(rowEl);
    }
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
