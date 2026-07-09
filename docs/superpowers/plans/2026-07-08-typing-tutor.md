# Split-Keyboard Layer Typing Tutor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A browser-based typing game that teaches Joe's split keyboard's layered QMK/Vial layout (base letters → numbers/nav layer → symbols layer) through 9 progressive stages with a live on-screen keyboard diagram.

**Architecture:** Vanilla-JS single-page app in `typing-tutor/` with one ES module per concern: static layout data (derived from `qmk-layout.vil`), stage/lesson content, a DOM-free game engine, a localStorage progress store, a keyboard-diagram renderer, and UI screens. Pure-logic modules are tested with Node's built-in test runner; DOM modules are verified manually in Chrome.

**Tech Stack:** HTML/CSS/vanilla JS (native ES modules), `node --test` (Node 18+) for unit tests, `python3 -m http.server` to serve (ES modules don't load over `file://`). Zero npm dependencies, zero build step.

**Spec:** `docs/superpowers/specs/2026-07-08-typing-tutor-design.md`

## Global Constraints

- No npm dependencies, no bundler, no build step. `package.json` exists only for `"type": "module"` and script shortcuts.
- All app code under `typing-tutor/`; tests under `typing-tutor/tests/`.
- Modules that touch the DOM: `keyboardRenderer.js`, `ui.js`, `main.js` ONLY. Modules that touch localStorage: `storage.js` ONLY. Everything else is pure and unit-tested.
- Stage unlock threshold is 90% accuracy — defined once as `PASS_ACCURACY` in `storage.js`.
- Layout data is hand-derived from `qmk-layout.vil` (the `.vil` stores the right half outer→inner; our tables are visual left→right). Layers 4–5 (transparent) and layer 3 (RGB/boot) are excluded.
- Visual direction: dark near-black background, cyan accent, green = correct/target, amber = hold-this-key, red = error. Monospace prompt. Glow/transition effects. No CSS framework.
- Run tests from `typing-tutor/`: `node --test tests/`. Serve: `python3 -m http.server 8000` from `typing-tutor/`.
- Commit after every task.

---

### Task 1: Scaffold — page shell, full stylesheet, package.json, README

**Files:**
- Create: `typing-tutor/package.json`
- Create: `typing-tutor/index.html`
- Create: `typing-tutor/style.css`
- Create: `typing-tutor/js/main.js` (placeholder, replaced in Task 7)
- Create: `README.md` (repo root)

**Interfaces:**
- Consumes: nothing
- Produces: the element IDs later tasks render into: `#stage-list`, `#screen-menu`, `#screen-game`, `#screen-results`, `#game-stage-name`, `#live-wpm`, `#live-acc`, `#live-progress`, `#prompt`, `#keyboard`, `#layer-hint`, `#results-title`, `#results-stats`, `#results-mistakes`, `#btn-quit`, `#btn-retry`, `#btn-next`, `#btn-menu`. CSS classes: `.hidden`, `.screen`, `.stage-card`, `.locked`, `.stage-num`, `.stage-info`, `.stage-name`, `.stage-hint`, `.stage-stats`, `.ch`, `.typed`, `.current`, `.pending`, `.space`, `.error-flash`, `.kb-half`, `.kb-row`, `.kb-thumb-L`, `.kb-thumb-R`, `.kb-key`, `.kb-key-wide-legend`, `.kb-key-blank`, `.kb-target`, `.kb-hold`, `.stat`, `.stat-value`, `.stat-label`, `.miss`, `.flawless`.

- [ ] **Step 1: Create `typing-tutor/package.json`**

```json
{
  "name": "qmk-typing-tutor",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/",
    "serve": "python3 -m http.server 8000"
  }
}
```

- [ ] **Step 2: Create `typing-tutor/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Layer Tutor</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <main id="app">
    <section id="screen-menu" class="screen">
      <h1>Layer Tutor</h1>
      <p class="subtitle">Learn your split keyboard, layer by layer</p>
      <ol id="stage-list"></ol>
    </section>

    <section id="screen-game" class="screen hidden">
      <header id="game-header">
        <button id="btn-quit">&larr; Menu</button>
        <h2 id="game-stage-name"></h2>
        <div id="live-stats">
          <span id="live-wpm">0 wpm</span>
          <span id="live-acc">100%</span>
          <span id="live-progress"></span>
        </div>
      </header>
      <div id="prompt"></div>
      <div id="keyboard"></div>
      <p id="layer-hint"></p>
    </section>

    <section id="screen-results" class="screen hidden">
      <h2 id="results-title"></h2>
      <div id="results-stats"></div>
      <div id="results-mistakes"></div>
      <div id="results-actions">
        <button id="btn-retry">Retry</button>
        <button id="btn-next" class="hidden">Next stage &rarr;</button>
        <button id="btn-menu">Menu</button>
      </div>
    </section>
  </main>
  <script type="module" src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 3: Create `typing-tutor/style.css`** (the complete final stylesheet — later tasks only consume these classes)

```css
:root {
  --bg: #0a0d14;
  --panel: #131a2a;
  --panel-edge: #1e2940;
  --key: #1a2338;
  --key-edge: #2a3856;
  --text: #e8ecf4;
  --text-dim: #8a94ab;
  --accent: #22d3ee;
  --correct: #34d399;
  --hold: #fbbf24;
  --error: #f87171;
  --radius: 10px;
  --mono: 'JetBrains Mono', 'Cascadia Code', ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  background:
    radial-gradient(1200px 600px at 70% -10%, rgba(34, 211, 238, 0.08), transparent 60%),
    radial-gradient(900px 500px at 10% 110%, rgba(251, 191, 36, 0.05), transparent 60%),
    var(--bg);
  color: var(--text);
  min-height: 100vh;
  display: flex;
  justify-content: center;
}

#app { width: min(1100px, 94vw); padding: 3rem 0 4rem; }
.hidden { display: none !important; }
.screen { animation: fadeIn 0.25s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } }

/* ---------- menu ---------- */
h1 {
  font-size: 2.6rem; font-weight: 800; letter-spacing: -0.02em;
  background: linear-gradient(90deg, var(--accent), #a78bfa);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.subtitle { color: var(--text-dim); margin: 0.4rem 0 2.2rem; }

#stage-list { list-style: none; display: grid; gap: 0.7rem; }
.stage-card {
  display: flex; align-items: center; gap: 1.1rem;
  background: linear-gradient(180deg, var(--panel), rgba(19, 26, 42, 0.6));
  border: 1px solid var(--panel-edge);
  border-radius: var(--radius);
  padding: 1rem 1.3rem;
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}
.stage-card:hover:not(.locked) {
  transform: translateY(-2px);
  border-color: var(--accent);
  box-shadow: 0 8px 30px rgba(34, 211, 238, 0.12);
}
.stage-card.locked { opacity: 0.45; cursor: default; }
.stage-num { font-family: var(--mono); color: var(--accent); font-size: 0.9rem; }
.stage-info { display: flex; flex-direction: column; gap: 0.15rem; flex: 1; }
.stage-name { font-weight: 600; }
.stage-hint { color: var(--text-dim); font-size: 0.85rem; }
.stage-stats { font-family: var(--mono); color: var(--text-dim); font-size: 0.85rem; }

/* ---------- game ---------- */
#game-header { display: flex; align-items: center; gap: 1.2rem; margin-bottom: 2.5rem; }
#game-stage-name { flex: 1; font-size: 1.1rem; font-weight: 600; }
#live-stats { display: flex; gap: 1.2rem; font-family: var(--mono); color: var(--text-dim); font-size: 0.9rem; }
#live-stats #live-wpm { color: var(--accent); }

button {
  font: inherit; color: var(--text);
  background: var(--key); border: 1px solid var(--key-edge);
  border-radius: 8px; padding: 0.5rem 1rem; cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
button:hover { border-color: var(--accent); box-shadow: 0 0 16px rgba(34, 211, 238, 0.15); }

#prompt {
  font-family: var(--mono); font-size: 2.2rem; letter-spacing: 0.06em;
  text-align: center; min-height: 3.2rem; margin-bottom: 2.5rem;
}
.ch { display: inline-block; min-width: 0.6ch; transition: color 0.1s ease; }
.ch.typed { color: var(--correct); }
.ch.current {
  color: var(--text);
  border-bottom: 3px solid var(--accent);
  animation: pulse 1.2s ease-in-out infinite;
}
.ch.pending { color: var(--text-dim); opacity: 0.5; }
.ch.space { opacity: 0.35; }
@keyframes pulse { 50% { border-color: transparent; } }
.ch.error-flash { animation: shake 0.25s ease; color: var(--error); }
@keyframes shake {
  25% { transform: translateX(-3px); }
  75% { transform: translateX(3px); }
}

/* ---------- keyboard diagram ---------- */
#keyboard { display: flex; justify-content: center; gap: 3.5rem; user-select: none; }
.kb-half { display: flex; flex-direction: column; gap: 0.4rem; }
.kb-row { display: flex; gap: 0.4rem; }
.kb-thumb-L { justify-content: flex-end; margin-top: 0.3rem; }
.kb-thumb-R { justify-content: flex-start; margin-top: 0.3rem; }
.kb-key {
  width: 3.2rem; height: 3.2rem;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--mono); font-size: 0.95rem;
  background: linear-gradient(180deg, var(--key), #151d30);
  border: 1px solid var(--key-edge);
  border-radius: 8px;
  transition: background 0.1s ease, box-shadow 0.15s ease, border-color 0.1s ease, transform 0.1s ease;
}
.kb-key-wide-legend { font-size: 0.62rem; color: var(--text-dim); }
.kb-key-blank { opacity: 0.3; }
.kb-key.kb-target {
  background: var(--correct); color: #06281c; border-color: var(--correct);
  box-shadow: 0 0 22px rgba(52, 211, 153, 0.55);
  transform: translateY(-2px);
  font-weight: 700;
}
.kb-key.kb-hold {
  background: var(--hold); color: #2d2005; border-color: var(--hold);
  box-shadow: 0 0 22px rgba(251, 191, 36, 0.5);
  font-weight: 700;
}
#layer-hint { text-align: center; color: var(--text-dim); margin-top: 1.6rem; font-size: 0.9rem; }

/* ---------- results ---------- */
#screen-results { text-align: center; padding-top: 4rem; }
#results-title { font-size: 2rem; margin-bottom: 2rem; }
#results-stats { display: flex; justify-content: center; gap: 3rem; margin-bottom: 2.5rem; }
.stat { display: flex; flex-direction: column; }
.stat-value { font-family: var(--mono); font-size: 3rem; font-weight: 700; color: var(--accent); }
.stat-label { color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.75rem; }
#results-mistakes { margin-bottom: 2.5rem; color: var(--text-dim); }
#results-mistakes h3 { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.8rem; }
.miss { display: inline-block; margin: 0.2rem 0.4rem; font-family: var(--mono); }
.miss kbd {
  background: var(--key); border: 1px solid var(--error); border-radius: 6px;
  padding: 0.15rem 0.5rem; color: var(--error);
}
.flawless { color: var(--correct); }
#results-actions { display: flex; justify-content: center; gap: 1rem; }
#btn-next { border-color: var(--accent); color: var(--accent); }
```

- [ ] **Step 4: Create placeholder `typing-tutor/js/main.js`**

```js
// Placeholder — replaced by the real app bootstrap in a later task.
console.log('Layer Tutor: scaffold loaded');
```

- [ ] **Step 5: Create `README.md` at repo root**

```markdown
# QMK Split Keyboard

`qmk-layout.vil` — the Vial layout for my split keyboard (base / numbers-nav / symbols / adjust layers).

## Layer Tutor (`typing-tutor/`)

A typing tutorial game for learning the layered layout. 9 progressive stages:
base-layer letters first, then held-thumb-key layers for numbers, navigation,
and symbols.

### Run

```sh
cd typing-tutor
python3 -m http.server 8000
# open http://localhost:8000
```

(A server is required — native ES modules don't load over file://.)

### Test

```sh
cd typing-tutor
node --test tests/     # Node 18+
```
```

- [ ] **Step 6: Verify the page loads**

Run: `cd /home/joe/github/QMK/typing-tutor && python3 -m http.server 8000 &` then `curl -s http://localhost:8000 | head -5` and `curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/style.css`
Expected: HTML doctype in the first output, `200` from the second. Then kill the server (`kill %1`).

- [ ] **Step 7: Commit**

```bash
cd /home/joe/github/QMK
git add typing-tutor/ README.md
git commit -m "feat: scaffold typing tutor page shell, dark theme stylesheet, README"
```

---

### Task 2: keyboardLayout.js — layout data + char→key mapping

**Files:**
- Create: `typing-tutor/js/keyboardLayout.js`
- Test: `typing-tutor/tests/keyboardLayout.test.js`

**Interfaces:**
- Consumes: nothing (static data hand-derived from `qmk-layout.vil`)
- Produces:
  - `KEYS: Array<{ id: string, half: 'L'|'R', row: 0|1|2|3, col: number, legends: { 0: string|null, 1: string|null, 2: string|null } }>` — every physical key in visual left→right order
  - `LAYER_HOLD: { 1: 'L34', 2: 'R34' }` — key ids of the FN_MO13 / FN_MO23 thumb keys
  - `SHIFT_KEY: 'L20'` — key id of left shift
  - `charToKey(ch: string): { keyId: string, layer: 0|1|2, shift: boolean } | null`

- [ ] **Step 1: Write the failing test `typing-tutor/tests/keyboardLayout.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { charToKey, KEYS, LAYER_HOLD, SHIFT_KEY } from '../js/keyboardLayout.js';

test('base-layer letters map to layer 0 without shift', () => {
  assert.deepEqual(charToKey('a'), { keyId: 'L11', layer: 0, shift: false });
  assert.deepEqual(charToKey('y'), { keyId: 'R01', layer: 0, shift: false });
  assert.deepEqual(charToKey('b'), { keyId: 'L25', layer: 0, shift: false });
});

test('uppercase letters need shift', () => {
  assert.deepEqual(charToKey('A'), { keyId: 'L11', layer: 0, shift: true });
  assert.deepEqual(charToKey('T'), { keyId: 'L05', layer: 0, shift: true });
});

test('digits live on layer 1', () => {
  assert.deepEqual(charToKey('1'), { keyId: 'L01', layer: 1, shift: false });
  assert.deepEqual(charToKey('5'), { keyId: 'L05', layer: 1, shift: false });
  assert.deepEqual(charToKey('6'), { keyId: 'R01', layer: 1, shift: false });
  assert.deepEqual(charToKey('0'), { keyId: 'R05', layer: 1, shift: false });
});

test('arrows live on layer 1 hjkl keys (vim-style)', () => {
  assert.deepEqual(charToKey('←'), { keyId: 'R11', layer: 1, shift: false });
  assert.deepEqual(charToKey('↓'), { keyId: 'R12', layer: 1, shift: false });
  assert.deepEqual(charToKey('↑'), { keyId: 'R13', layer: 1, shift: false });
  assert.deepEqual(charToKey('→'), { keyId: 'R14', layer: 1, shift: false });
});

test('shifted symbols live on layer 2', () => {
  assert.deepEqual(charToKey('!'), { keyId: 'L01', layer: 2, shift: false });
  assert.deepEqual(charToKey('%'), { keyId: 'L05', layer: 2, shift: false });
  assert.deepEqual(charToKey('^'), { keyId: 'R01', layer: 2, shift: false });
  assert.deepEqual(charToKey(')'), { keyId: 'R05', layer: 2, shift: false });
});

test('brackets and punctuation live on layer 2', () => {
  assert.deepEqual(charToKey('-'), { keyId: 'R11', layer: 2, shift: false });
  assert.deepEqual(charToKey('['), { keyId: 'R13', layer: 2, shift: false });
  assert.deepEqual(charToKey('`'), { keyId: 'R16', layer: 2, shift: false });
  assert.deepEqual(charToKey('{'), { keyId: 'R22', layer: 2, shift: false });
  assert.deepEqual(charToKey('~'), { keyId: 'R25', layer: 2, shift: false });
  assert.deepEqual(charToKey('\\'), { keyId: 'R15', layer: 2, shift: false });
});

test('layer-0 punctuation, plain and shifted', () => {
  assert.deepEqual(charToKey(';'), { keyId: 'R15', layer: 0, shift: false });
  assert.deepEqual(charToKey(':'), { keyId: 'R15', layer: 0, shift: true });
  assert.deepEqual(charToKey("'"), { keyId: 'R16', layer: 0, shift: false });
  assert.deepEqual(charToKey('"'), { keyId: 'R16', layer: 0, shift: true });
  assert.deepEqual(charToKey('?'), { keyId: 'R24', layer: 0, shift: true });
});

test('space maps to the left thumb space key', () => {
  assert.deepEqual(charToKey(' '), { keyId: 'L35', layer: 0, shift: false });
});

test('unmappable characters return null', () => {
  assert.equal(charToKey('€'), null);
  assert.equal(charToKey('\t'), null);
});

test('layer hold keys and shift key exist in KEYS', () => {
  for (const id of [...Object.values(LAYER_HOLD), SHIFT_KEY]) {
    assert.ok(KEYS.some((k) => k.id === id), `missing key ${id}`);
  }
});

test('KEYS has 46 keys (23 per half)', () => {
  assert.equal(KEYS.length, 46);
  assert.equal(KEYS.filter((k) => k.half === 'L').length, 23);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/joe/github/QMK/typing-tutor && node --test tests/keyboardLayout.test.js`
Expected: FAIL — `Cannot find module .../js/keyboardLayout.js`

- [ ] **Step 3: Write `typing-tutor/js/keyboardLayout.js`**

```js
// Static layout data derived by hand from ../qmk-layout.vil (layers 0-2).
// The .vil stores the RIGHT half outer-edge → inner-edge; every row here is
// visual left → right. If the .vil changes, update these tables to match.
// Layer 3 (RGB/boot) and layers 4-5 (transparent) are intentionally omitted.

const XX = null; // no legend on this layer (KC_NO / transparent)

// Each entry: [id, layer0legend, layer1legend, layer2legend]
const LEFT = [
  [['L00', 'Esc', 'Tab', 'Tab'], ['L01', 'Q', '1', '!'], ['L02', 'W', '2', '@'], ['L03', 'E', '3', '#'], ['L04', 'R', '4', '$'], ['L05', 'T', '5', '%'], ['L06', 'Alt', 'Ctrl', 'Ctrl']],
  [['L10', 'Caps', 'Ctrl', 'Ctrl'], ['L11', 'A', XX, XX], ['L12', 'S', XX, XX], ['L13', 'D', XX, XX], ['L14', 'F', XX, XX], ['L15', 'G', XX, XX], ['L16', 'Tab', 'Alt', 'Alt']],
  [['L20', 'Shift', 'Shift', 'Shift'], ['L21', 'Z', XX, XX], ['L22', 'X', XX, XX], ['L23', 'C', XX, XX], ['L24', 'V', XX, XX], ['L25', 'B', XX, XX]],
  [['L33', 'Ctrl', 'GUI', 'GUI'], ['L34', 'NUM', 'NUM', 'NUM'], ['L35', 'Space', 'Space', 'Space']],
];

const RIGHT = [
  [['R00', 'Ctrl', 'Ctrl', 'Ctrl'], ['R01', 'Y', '6', '^'], ['R02', 'U', '7', '&'], ['R03', 'I', '8', '*'], ['R04', 'O', '9', '('], ['R05', 'P', '0', ')'], ['R06', 'Bksp', 'Bksp', 'Bksp']],
  [['R10', 'Shift', 'Alt', 'Alt'], ['R11', 'H', '←', '-'], ['R12', 'J', '↓', '='], ['R13', 'K', '↑', '['], ['R14', 'L', '→', ']'], ['R15', ';', XX, '\\'], ['R16', "'", XX, '`']],
  [['R20', 'N', XX, '_'], ['R21', 'M', XX, '+'], ['R22', ',', XX, '{'], ['R23', '.', XX, '}'], ['R24', '/', XX, '|'], ['R25', 'Del', XX, '~']],
  [['R33', 'Enter', 'Enter', 'Enter'], ['R34', 'SYM', 'SYM', 'SYM'], ['R35', 'GUI', 'GUI', 'GUI']],
];

function buildKeys(rows, half) {
  const keys = [];
  rows.forEach((row, rowIndex) => {
    for (const [id, l0, l1, l2] of row) {
      keys.push({ id, half, row: rowIndex, col: Number(id[2]), legends: { 0: l0, 1: l1, 2: l2 } });
    }
  });
  return keys;
}

export const KEYS = [...buildKeys(LEFT, 'L'), ...buildKeys(RIGHT, 'R')];

// Thumb keys that activate each layer while held (FN_MO13 / FN_MO23 in the .vil).
export const LAYER_HOLD = { 1: 'L34', 2: 'R34' };
export const SHIFT_KEY = 'L20';

const CHAR_MAP = new Map();

// Single-character legends map directly; layer-0 letters map from lowercase.
const HOLD_IDS = new Set(Object.values(LAYER_HOLD));
for (const key of KEYS) {
  if (HOLD_IDS.has(key.id)) continue;
  for (const layer of [0, 1, 2]) {
    const legend = key.legends[layer];
    if (!legend || [...legend].length !== 1) continue;
    const ch = layer === 0 ? legend.toLowerCase() : legend;
    if (!CHAR_MAP.has(ch)) CHAR_MAP.set(ch, { keyId: key.id, layer, shift: false });
  }
}

// Uppercase letters = shift + the layer-0 letter key.
for (const [ch, entry] of [...CHAR_MAP]) {
  if (entry.layer === 0 && ch >= 'a' && ch <= 'z') {
    CHAR_MAP.set(ch.toUpperCase(), { ...entry, shift: true });
  }
}

// Shifted layer-0 punctuation.
const SHIFTED_L0 = { ':': ';', '"': "'", '<': ',', '>': '.', '?': '/' };
for (const [shifted, base] of Object.entries(SHIFTED_L0)) {
  CHAR_MAP.set(shifted, { ...CHAR_MAP.get(base), shift: true });
}

CHAR_MAP.set(' ', { keyId: 'L35', layer: 0, shift: false });

export function charToKey(ch) {
  return CHAR_MAP.get(ch) ?? null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/joe/github/QMK/typing-tutor && node --test tests/keyboardLayout.test.js`
Expected: PASS — all 11 tests

- [ ] **Step 5: Commit**

```bash
cd /home/joe/github/QMK
git add typing-tutor/js/keyboardLayout.js typing-tutor/tests/keyboardLayout.test.js
git commit -m "feat: keyboard layout data and char-to-key mapping from qmk-layout.vil"
```

---

### Task 3: lessons.js — 9 stage definitions + round builder

**Files:**
- Create: `typing-tutor/js/lessons.js`
- Test: `typing-tutor/tests/lessons.test.js`

**Interfaces:**
- Consumes: `charToKey` from `./keyboardLayout.js` (in tests only — cross-validates content)
- Produces:
  - `STAGES: Array<{ id: string, name: string, layerHint: string, roundSize: number, pool: string[] }>` — 9 stages in curriculum order
  - `buildRound(stage, rand = Math.random): string[]` — samples `roundSize` items from the pool without replacement (refills when exhausted)

- [ ] **Step 1: Write the failing test `typing-tutor/tests/lessons.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STAGES, buildRound } from '../js/lessons.js';
import { charToKey } from '../js/keyboardLayout.js';

test('there are 9 stages in curriculum order', () => {
  assert.deepEqual(
    STAGES.map((s) => s.id),
    ['home-row', 'top-row', 'bottom-row', 'all-letters', 'numbers',
     'navigation', 'shifted-symbols', 'punctuation', 'mixed'],
  );
});

test('every stage item uses only mappable characters', () => {
  for (const stage of STAGES) {
    for (const item of stage.pool) {
      for (const ch of item) {
        assert.ok(charToKey(ch), `stage ${stage.id}: no key mapping for "${ch}" in "${item}"`);
      }
    }
  }
});

test('row stages stay within their taught keys', () => {
  const patterns = {
    'home-row': /^[asdfghjkl;']+$/,
    'top-row': /^[qwertyuiopasdfghjkl;']+$/,
    'bottom-row': /^[a-z,./']+$/,
    numbers: /^[0-9]+$/,
    navigation: /^[←↓↑→]+$/,
  };
  for (const [id, re] of Object.entries(patterns)) {
    const stage = STAGES.find((s) => s.id === id);
    for (const item of stage.pool) {
      assert.match(item, re, `stage ${id}: "${item}" breaks charset`);
    }
  }
});

test('every stage has a non-empty pool and positive roundSize', () => {
  for (const stage of STAGES) {
    assert.ok(stage.pool.length > 0, stage.id);
    assert.ok(stage.roundSize > 0, stage.id);
    assert.ok(stage.name && stage.layerHint, stage.id);
  }
});

test('buildRound returns roundSize items drawn from the pool', () => {
  const stage = STAGES[0];
  const round = buildRound(stage, () => 0);
  assert.equal(round.length, stage.roundSize);
  for (const item of round) assert.ok(stage.pool.includes(item));
});

test('buildRound with rand=()=>0 is deterministic (pool order)', () => {
  const stage = STAGES[0];
  assert.deepEqual(buildRound(stage, () => 0), buildRound(stage, () => 0));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/joe/github/QMK/typing-tutor && node --test tests/lessons.test.js`
Expected: FAIL — `Cannot find module .../js/lessons.js`

- [ ] **Step 3: Write `typing-tutor/js/lessons.js`**

```js
// The 9-stage curriculum. Content rules:
// - Stages 1-4 use only base-layer (layer 0) characters.
// - Stage 5-6 exercise layer 1 (hold LEFT thumb / NUM).
// - Stage 7-8 exercise layer 2 (hold RIGHT thumb / SYM) mixed with letters.
// - Stage 9 mixes all three layers in realistic strings.
// Every character in every pool item must resolve via charToKey() — enforced
// by tests/lessons.test.js.

export const STAGES = [
  {
    id: 'home-row',
    name: 'Home Row',
    layerHint: 'Base layer · fingers rest here',
    roundSize: 15,
    pool: ['as', 'sad', 'dad', 'lad', 'fad', 'gas', 'has', 'had', 'gag', 'hall',
      'fall', 'glad', 'flag', 'flask', 'salad', 'dash', 'sash', 'gash', 'half',
      'lash', 'gall', 'alas', 'shall', 'flash', 'glass', 'asks', "dad's", "gal's"],
  },
  {
    id: 'top-row',
    name: 'Top Row',
    layerHint: 'Base layer · reach up',
    roundSize: 15,
    pool: ['the', 'there', 'where', 'quiet', 'tower', 'power', 'water', 'paper',
      'tiger', 'quote', 'request', 'require', 'typewriter', 'should', 'great',
      'eight', 'port', 'quest', 'guitar', 'shorter', 'father', 'yellow',
      'pretty', 'square', 'adequate', 'territory', 'loyal', 'usual', 'sugar',
      'outside'],
  },
  {
    id: 'bottom-row',
    name: 'Bottom Row',
    layerHint: 'Base layer · reach down',
    roundSize: 15,
    pool: ['zebra', 'cabin', 'move', 'buzz', 'exact', 'victim', 'jazz', 'mixed',
      'number', 'combo', 'zombie', 'carbon', 'vivid', 'maximum', 'banner',
      'comma,', 'end.', 'and/or', 'c/o', 'p.m.', 'next.', 'back,', 'zinc',
      'vex', 'climb'],
  },
  {
    id: 'all-letters',
    name: 'Full Sentences',
    layerHint: 'Base layer · everything together',
    roundSize: 4,
    pool: ['The quick brown fox jumps over the lazy dog.',
      'Pack my box with five dozen liquor jugs.',
      'Sphinx of black quartz, judge my vow.',
      'How vexingly quick daft zebras jump.',
      'Jackdaws love my big sphinx of quartz.',
      'Bright vixens jump; dozy fowl quack.'],
  },
  {
    id: 'numbers',
    name: 'Numbers',
    layerHint: 'Hold LEFT thumb (NUM) for digits',
    roundSize: 12,
    pool: ['42', '2024', '90210', '8675309', '1234', '0987', '31415', '2718',
      '1024', '4096', '365', '555', '789', '8080', '443', '1999', '2001',
      '112', '60', '13'],
  },
  {
    id: 'navigation',
    name: 'Navigation',
    layerHint: 'Hold LEFT thumb (NUM) · arrows on HJKL',
    roundSize: 10,
    pool: ['←←→→', '↑↑↓↓', '←↓↑→', '→→↑', '↓↓←', '↑→↓←', '←←←', '→↑→↓',
      '↓←↑→', '↑↓↑↓', '→↓↓→', '←↑←↑'],
  },
  {
    id: 'shifted-symbols',
    name: 'Shifted Symbols',
    layerHint: 'Hold RIGHT thumb (SYM) for !@#$%…',
    roundSize: 12,
    pool: ['wow!', '(ok)', 'a&b', '@home', '#tag', 'yes!', 'stop!', '$cash',
      'hash#', '(wow)', 'a*b', 'x^y', '%rate', 'one&two', 'go!', 'this&that',
      'ask@me', '(no)', 'win!', 'a^b'],
  },
  {
    id: 'punctuation',
    name: 'Brackets & Punctuation',
    layerHint: 'Hold RIGHT thumb (SYM) · right hand',
    roundSize: 12,
    pool: ['x=y', 'a-b', '[list]', '{key}', '`code`', 'a_b', 'c|d', '~home',
      'one+two', 're-do', 'snake_case', 'kebab-case', 'a=b', '[a]', '{x}',
      '`x`', 'x~y', 'pipe|pipe', 'path\\to', 'tag-line'],
  },
  {
    id: 'mixed',
    name: 'Mixed Mastery',
    layerHint: 'All layers · real-world text',
    roundSize: 6,
    pool: ['let x = 42;', '$19.99', '123 Main St.', '(555) 867-5309',
      '2 + 2 = 4', 'user@host.com', '#1 fan!', 'arr[0] + arr[1]',
      '100% done', 'tip: 20%', '3 * 3 = 9', 'a[1] = b[2];', 'x != y',
      'ship v2.0!'],
  },
];

export function buildRound(stage, rand = Math.random) {
  const pool = [...stage.pool];
  const items = [];
  while (items.length < stage.roundSize) {
    const i = Math.floor(rand() * pool.length);
    items.push(pool.splice(i, 1)[0]);
    if (pool.length === 0) pool.push(...stage.pool);
  }
  return items;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/joe/github/QMK/typing-tutor && node --test tests/lessons.test.js`
Expected: PASS — all 6 tests. The "mappable characters" test is the important one: it cross-validates every drill character against the actual layout. If it fails, fix the pool content (not the mapping) unless the mapping is genuinely missing a legend.

- [ ] **Step 5: Commit**

```bash
cd /home/joe/github/QMK
git add typing-tutor/js/lessons.js typing-tutor/tests/lessons.test.js
git commit -m "feat: 9-stage curriculum content, cross-validated against the layout"
```

---

### Task 4: gameEngine.js — typing state machine + stats

**Files:**
- Create: `typing-tutor/js/gameEngine.js`
- Test: `typing-tutor/tests/gameEngine.test.js`

**Interfaces:**
- Consumes: nothing (pure; timestamps are passed in)
- Produces:
  - `createGame(items: string[]): Game` — Game is `{ items, itemIndex, cursor, correct, errors, startTime, endTime, mistakes, done }`
  - `currentItem(game): string | null`
  - `currentChar(game): string | null`
  - `handleKey(game, ch: string, now: number): 'correct' | 'error' | 'done' | 'ignored'`
  - `stats(game, now?: number): { wpm: number, accuracy: number }` — wpm rounded to integer, accuracy to 1 decimal

- [ ] **Step 1: Write the failing test `typing-tutor/tests/gameEngine.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, currentItem, currentChar, handleKey, stats } from '../js/gameEngine.js';

test('typing correct chars advances cursor, then items', () => {
  const g = createGame(['ab', 'c']);
  assert.equal(currentChar(g), 'a');
  assert.equal(handleKey(g, 'a', 0), 'correct');
  assert.equal(currentChar(g), 'b');
  assert.equal(handleKey(g, 'b', 100), 'correct');
  assert.equal(currentItem(g), 'c');
  assert.equal(g.cursor, 0);
});

test('wrong key counts an error, records the mistake, cursor stays', () => {
  const g = createGame(['ab']);
  assert.equal(handleKey(g, 'x', 0), 'error');
  assert.equal(g.errors, 1);
  assert.deepEqual(g.mistakes, { a: 1 });
  assert.equal(currentChar(g), 'a');
  assert.equal(handleKey(g, 'a', 100), 'correct');
});

test('completing all items sets done and endTime; further keys ignored', () => {
  const g = createGame(['a']);
  assert.equal(handleKey(g, 'a', 500), 'done');
  assert.equal(g.done, true);
  assert.equal(g.endTime, 500);
  assert.equal(handleKey(g, 'a', 600), 'ignored');
});

test('startTime is set on the first keystroke, even a wrong one', () => {
  const g = createGame(['a']);
  assert.equal(g.startTime, null);
  handleKey(g, 'x', 1000);
  assert.equal(g.startTime, 1000);
});

test('wpm and accuracy math', () => {
  const g = createGame(['abcde', 'fghij']);
  const chars = 'abcdefghij';
  let result;
  for (let i = 0; i < chars.length; i++) {
    result = handleKey(g, chars[i], i === 0 ? 0 : i === 9 ? 120000 : 1000);
  }
  assert.equal(result, 'done');
  // 10 correct chars = 2 "words" over exactly 2 minutes = 1 wpm
  assert.deepEqual(stats(g), { wpm: 1, accuracy: 100 });
});

test('accuracy counts errors', () => {
  const g = createGame(['ab']);
  handleKey(g, 'x', 0);      // error
  handleKey(g, 'a', 100);
  handleKey(g, 'b', 60000);  // done at 1 minute
  const s = stats(g);
  assert.equal(s.accuracy, 66.7); // 2 correct / 3 keystrokes
});

test('stats before first keystroke are zero-safe', () => {
  const g = createGame(['ab']);
  assert.deepEqual(stats(g, 5000), { wpm: 0, accuracy: 100 });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/joe/github/QMK/typing-tutor && node --test tests/gameEngine.test.js`
Expected: FAIL — `Cannot find module .../js/gameEngine.js`

- [ ] **Step 3: Write `typing-tutor/js/gameEngine.js`**

```js
// Pure typing state machine. No DOM, no timers — callers pass timestamps in.

export function createGame(items) {
  return {
    items,
    itemIndex: 0,
    cursor: 0,
    correct: 0,
    errors: 0,
    startTime: null,
    endTime: null,
    mistakes: {},
    done: false,
  };
}

export function currentItem(game) {
  return game.done ? null : game.items[game.itemIndex];
}

export function currentChar(game) {
  const item = currentItem(game);
  return item ? item[game.cursor] : null;
}

export function handleKey(game, ch, now) {
  if (game.done) return 'ignored';
  if (game.startTime === null) game.startTime = now;
  const target = currentChar(game);
  if (ch === target) {
    game.correct += 1;
    game.cursor += 1;
    if (game.cursor >= game.items[game.itemIndex].length) {
      game.itemIndex += 1;
      game.cursor = 0;
      if (game.itemIndex >= game.items.length) {
        game.done = true;
        game.endTime = now;
        return 'done';
      }
    }
    return 'correct';
  }
  game.errors += 1;
  game.mistakes[target] = (game.mistakes[target] ?? 0) + 1;
  return 'error';
}

export function stats(game, now = Date.now()) {
  const end = game.endTime ?? now;
  const elapsedMin = game.startTime === null ? 0 : (end - game.startTime) / 60000;
  const wpm = elapsedMin > 0 ? game.correct / 5 / elapsedMin : 0;
  const total = game.correct + game.errors;
  const accuracy = total > 0 ? (game.correct / total) * 100 : 100;
  return { wpm: Math.round(wpm), accuracy: Math.round(accuracy * 10) / 10 };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/joe/github/QMK/typing-tutor && node --test tests/gameEngine.test.js`
Expected: PASS — all 7 tests

- [ ] **Step 5: Commit**

```bash
cd /home/joe/github/QMK
git add typing-tutor/js/gameEngine.js typing-tutor/tests/gameEngine.test.js
git commit -m "feat: pure typing game engine with wpm/accuracy stats"
```

---

### Task 5: storage.js — progress persistence + unlock logic

**Files:**
- Create: `typing-tutor/js/storage.js`
- Test: `typing-tutor/tests/storage.test.js`

**Interfaces:**
- Consumes: nothing (backing store injected; browser uses `localStorage` by default)
- Produces:
  - `PASS_ACCURACY = 90` — the single source of truth for the unlock threshold
  - `createStorage(stageIds: string[], backing?): { load(): Progress, saveResult(stageId, wpm, accuracy): { data: Progress, unlockedNext: boolean } }`
  - `Progress` shape: `{ stages: { [id]: { unlocked, bestWpm, bestAccuracy, timesPlayed } } }` — first stage starts unlocked

- [ ] **Step 1: Write the failing test `typing-tutor/tests/storage.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStorage, PASS_ACCURACY } from '../js/storage.js';

const IDS = ['s1', 's2', 's3'];

function fakeBacking(initial = {}) {
  const m = new Map(Object.entries(initial));
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
}

test('PASS_ACCURACY is 90', () => {
  assert.equal(PASS_ACCURACY, 90);
});

test('first stage starts unlocked, the rest locked', () => {
  const store = createStorage(IDS, fakeBacking());
  const data = store.load();
  assert.equal(data.stages.s1.unlocked, true);
  assert.equal(data.stages.s2.unlocked, false);
  assert.deepEqual(data.stages.s1, { unlocked: true, bestWpm: 0, bestAccuracy: 0, timesPlayed: 0 });
});

test('saveResult updates bests and timesPlayed, keeps higher bests', () => {
  const store = createStorage(IDS, fakeBacking());
  store.load();
  store.saveResult('s1', 40, 95);
  const { data } = store.saveResult('s1', 30, 80);
  assert.equal(data.stages.s1.bestWpm, 40);
  assert.equal(data.stages.s1.bestAccuracy, 95);
  assert.equal(data.stages.s1.timesPlayed, 2);
});

test('accuracy >= 90 unlocks the next stage', () => {
  const store = createStorage(IDS, fakeBacking());
  store.load();
  const { data, unlockedNext } = store.saveResult('s1', 40, 90);
  assert.equal(unlockedNext, true);
  assert.equal(data.stages.s2.unlocked, true);
  assert.equal(data.stages.s3.unlocked, false);
});

test('accuracy < 90 does not unlock; re-clearing reports unlockedNext=false', () => {
  const store = createStorage(IDS, fakeBacking());
  store.load();
  assert.equal(store.saveResult('s1', 40, 89.9).unlockedNext, false);
  store.saveResult('s1', 40, 95);
  assert.equal(store.saveResult('s1', 40, 95).unlockedNext, false); // already unlocked
});

test('last stage clearing never throws', () => {
  const store = createStorage(IDS, fakeBacking());
  store.load();
  assert.doesNotThrow(() => store.saveResult('s3', 40, 99));
});

test('corrupted JSON starts fresh instead of crashing', () => {
  const store = createStorage(IDS, fakeBacking({ 'qmk-typing-tutor-v1': '{not json' }));
  const data = store.load();
  assert.equal(data.stages.s1.unlocked, true);
});

test('progress persists across createStorage instances sharing a backing', () => {
  const backing = fakeBacking();
  createStorage(IDS, backing).saveResult('s1', 33, 92);
  const data = createStorage(IDS, backing).load();
  assert.equal(data.stages.s1.bestWpm, 33);
  assert.equal(data.stages.s2.unlocked, true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/joe/github/QMK/typing-tutor && node --test tests/storage.test.js`
Expected: FAIL — `Cannot find module .../js/storage.js`

- [ ] **Step 3: Write `typing-tutor/js/storage.js`**

```js
// The only module that touches localStorage. A backing store with
// getItem/setItem is injectable so tests can run in Node.

const STORE_KEY = 'qmk-typing-tutor-v1';

export const PASS_ACCURACY = 90;

export function createStorage(stageIds, backing = globalThis.localStorage) {
  function read() {
    try {
      const raw = backing.getItem(STORE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // corrupted store → start fresh
    }
    return { stages: {} };
  }

  function write(data) {
    backing.setItem(STORE_KEY, JSON.stringify(data));
  }

  function load() {
    const data = read();
    stageIds.forEach((id, i) => {
      data.stages[id] ??= { unlocked: i === 0, bestWpm: 0, bestAccuracy: 0, timesPlayed: 0 };
    });
    write(data);
    return data;
  }

  function saveResult(stageId, wpm, accuracy) {
    const data = load();
    const s = data.stages[stageId];
    s.timesPlayed += 1;
    s.bestWpm = Math.max(s.bestWpm, wpm);
    s.bestAccuracy = Math.max(s.bestAccuracy, accuracy);
    let unlockedNext = false;
    const idx = stageIds.indexOf(stageId);
    if (accuracy >= PASS_ACCURACY && idx >= 0 && idx + 1 < stageIds.length) {
      const next = data.stages[stageIds[idx + 1]];
      if (!next.unlocked) {
        next.unlocked = true;
        unlockedNext = true;
      }
    }
    write(data);
    return { data, unlockedNext };
  }

  return { load, saveResult };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/joe/github/QMK/typing-tutor && node --test tests/storage.test.js`
Expected: PASS — all 8 tests. Also run the full suite: `node --test tests/` — all files pass.

- [ ] **Step 5: Commit**

```bash
cd /home/joe/github/QMK
git add typing-tutor/js/storage.js typing-tutor/tests/storage.test.js
git commit -m "feat: localStorage progress store with 90%-accuracy unlock rule"
```

---

### Task 6: keyboardRenderer.js — on-screen split keyboard

**Files:**
- Create: `typing-tutor/js/keyboardRenderer.js`
- Modify: `typing-tutor/js/main.js` (temporary demo, replaced in Task 7)

**Interfaces:**
- Consumes: `KEYS`, `LAYER_HOLD`, `SHIFT_KEY` from `./keyboardLayout.js`
- Produces:
  - `renderKeyboard(container: HTMLElement): void` — builds the two-half diagram once
  - `highlightTarget(target: { keyId, layer, shift } | null): void` — green `.kb-target` on the key, amber `.kb-hold` on the layer thumb key (layer 1/2) and/or shift key; switches all displayed legends to the target's layer. `null` clears highlights and shows layer 0.

DOM module — no unit test; verified in the browser in Step 3.

- [ ] **Step 1: Write `typing-tutor/js/keyboardRenderer.js`**

```js
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
```

- [ ] **Step 2: Replace `typing-tutor/js/main.js` with a temporary renderer demo**

```js
// TEMPORARY demo of the keyboard renderer — replaced by the real app in the
// next task. Cycles a few targets so every highlight state is visible.
import { renderKeyboard, highlightTarget } from './keyboardRenderer.js';
import { charToKey } from './keyboardLayout.js';

document.getElementById('screen-menu').classList.add('hidden');
document.getElementById('screen-game').classList.remove('hidden');
document.getElementById('game-stage-name').textContent = 'Renderer demo';
renderKeyboard(document.getElementById('keyboard'));

const demo = ['f', 'J', '7', '←', '{', ' '];
let i = 0;
setInterval(() => {
  const ch = demo[i % demo.length];
  document.getElementById('prompt').textContent = `target: ${ch === ' ' ? 'space' : ch}`;
  highlightTarget(charToKey(ch));
  i += 1;
}, 1500);
```

- [ ] **Step 3: Verify in the browser**

Run: `cd /home/joe/github/QMK/typing-tutor && python3 -m http.server 8000`
Open http://localhost:8000 in Chrome and confirm, as the demo cycles:
- Two keyboard halves render, 23 keys each, thumb rows inset toward the center.
- `f` → only the left home-row F key glows green; board shows layer-0 legends.
- `J` → J glows green AND left Shift glows amber.
- `7` → board legends switch to layer 1 (numbers/arrows visible), 7 glows green, left NUM thumb key glows amber.
- `←` → H-position key shows ← and glows green, NUM thumb amber.
- `{` → board switches to layer-2 legends, `{` glows green, right SYM thumb amber.
- `space` → Space thumb key glows green, layer-0 legends.
- No console errors.

Stop the server when done.

- [ ] **Step 4: Commit**

```bash
cd /home/joe/github/QMK
git add typing-tutor/js/keyboardRenderer.js typing-tutor/js/main.js
git commit -m "feat: on-screen split keyboard renderer with target/hold highlighting"
```

---

### Task 7: ui.js + main.js — screens, wiring, full game loop

**Files:**
- Create: `typing-tutor/js/ui.js`
- Modify: `typing-tutor/js/main.js` (replace the demo entirely)

**Interfaces:**
- Consumes: everything from Tasks 2–6: `STAGES`, `buildRound`, `charToKey`, `createGame`/`currentItem`/`currentChar`/`handleKey`/`stats`, `createStorage`/`PASS_ACCURACY`, `renderKeyboard`/`highlightTarget`
- Produces (ui.js):
  - `showScreen(id: 'screen-menu'|'screen-game'|'screen-results'): void`
  - `renderMenu(progress, onSelect: (stage) => void): void`
  - `renderPrompt(item: string, cursor: number): void`
  - `flashError(): void`
  - `renderLiveStats({ wpm, accuracy }, progressText: string): void`
  - `renderResults(stage, { wpm, accuracy }, mistakes, passed: boolean, hasNext: boolean): void`

- [ ] **Step 1: Write `typing-tutor/js/ui.js`**

```js
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
```

- [ ] **Step 2: Replace `typing-tutor/js/main.js` with the real app bootstrap**

```js
// App bootstrap and game orchestration.

import { STAGES, buildRound } from './lessons.js';
import { charToKey } from './keyboardLayout.js';
import { createGame, currentItem, currentChar, handleKey, stats } from './gameEngine.js';
import { createStorage, PASS_ACCURACY } from './storage.js';
import { renderKeyboard, highlightTarget } from './keyboardRenderer.js';
import * as ui from './ui.js';

const storage = createStorage(STAGES.map((s) => s.id));
let progress = storage.load();
let stage = null;
let game = null;
let tickTimer = null;

const ARROWS = { ArrowLeft: '←', ArrowDown: '↓', ArrowUp: '↑', ArrowRight: '→' };

function goMenu() {
  stopTick();
  game = null;
  ui.renderMenu(progress, startStage);
  ui.showScreen('screen-menu');
}

function startStage(s) {
  stage = s;
  game = createGame(buildRound(s));
  document.getElementById('game-stage-name').textContent = s.name;
  document.getElementById('layer-hint').textContent = s.layerHint;
  ui.showScreen('screen-game');
  renderKeyboard(document.getElementById('keyboard'));
  refresh();
  startTick();
}

function refresh() {
  const item = currentItem(game);
  if (item == null) return;
  ui.renderPrompt(item, game.cursor);
  highlightTarget(charToKey(currentChar(game)));
  ui.renderLiveStats(stats(game), `${game.itemIndex + 1}/${game.items.length}`);
}

function startTick() {
  tickTimer = setInterval(() => {
    if (game && !game.done && game.startTime !== null) {
      ui.renderLiveStats(stats(game), `${game.itemIndex + 1}/${game.items.length}`);
    }
  }, 1000);
}

function stopTick() {
  clearInterval(tickTimer);
}

function finishStage() {
  stopTick();
  const s = stats(game);
  const { data } = storage.saveResult(stage.id, s.wpm, s.accuracy);
  progress = data;
  const idx = STAGES.indexOf(stage);
  const passed = s.accuracy >= PASS_ACCURACY;
  const hasNext = idx + 1 < STAGES.length && progress.stages[STAGES[idx + 1].id].unlocked;
  ui.renderResults(stage, s, game.mistakes, passed, hasNext);
  ui.showScreen('screen-results');
}

document.addEventListener('keydown', (e) => {
  if (!game || game.done) return;
  if (document.getElementById('screen-game').classList.contains('hidden')) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const ch = ARROWS[e.key] ?? (e.key.length === 1 ? e.key : null);
  if (ch === null) return;
  e.preventDefault();
  const result = handleKey(game, ch, Date.now());
  if (result === 'error') {
    ui.flashError();
    return;
  }
  if (result === 'done') {
    finishStage();
    return;
  }
  refresh();
});

document.getElementById('btn-quit').addEventListener('click', goMenu);
document.getElementById('btn-menu').addEventListener('click', goMenu);
document.getElementById('btn-retry').addEventListener('click', () => startStage(stage));
document.getElementById('btn-next').addEventListener('click', () => {
  startStage(STAGES[STAGES.indexOf(stage) + 1]);
});

goMenu();
```

- [ ] **Step 3: Run the full unit-test suite (regression check)**

Run: `cd /home/joe/github/QMK/typing-tutor && node --test tests/`
Expected: PASS — all tests from Tasks 2–5 still green.

- [ ] **Step 4: Manual end-to-end verification in Chrome**

Run: `cd /home/joe/github/QMK/typing-tutor && python3 -m http.server 8000`, open http://localhost:8000. Verify:

1. Menu shows 9 stage cards; only "Home Row" is clickable, others show 🔒 and are dimmed.
2. Click Home Row → game screen: prompt word, keyboard diagram, target key glowing green.
3. Type a wrong letter → current char shakes red, cursor does not advance.
4. Type the round through correctly → results screen with wpm, accuracy, missed keys.
5. With ≥90% accuracy → title says "cleared!", "Next stage →" button appears; menu now shows Top Row unlocked.
6. Reload the page → progress persisted (Top Row still unlocked, best stats shown on the card).
7. Play "Numbers" far enough to confirm: board legends flip to layer 1 and the NUM thumb key glows amber; digits typed **while holding the physical left thumb key** register correctly.
8. Play "Navigation" briefly: arrow prompts (← ↓ ↑ →) work with the physical layer-1 arrow keys.
9. Uppercase in "Full Sentences": Shift key glows amber for capitals.
10. Quit mid-round via "← Menu" → no console errors, stats not saved for the aborted round.

Stop the server when done.

- [ ] **Step 5: Commit**

```bash
cd /home/joe/github/QMK
git add typing-tutor/js/ui.js typing-tutor/js/main.js
git commit -m "feat: full game loop — menu, stages, results, progress persistence"
```

---

### Task 8: Final verification and push

**Files:**
- No new files — verification + push only.

**Interfaces:**
- Consumes: the complete app
- Produces: verified, pushed `main`

- [ ] **Step 1: Run the complete test suite one more time**

Run: `cd /home/joe/github/QMK/typing-tutor && node --test tests/`
Expected: PASS — 0 failures across all 4 test files.

- [ ] **Step 2: Spec conformance spot-check**

Re-read `docs/superpowers/specs/2026-07-08-typing-tutor-design.md` section by section and confirm each is implemented: 9 stages ✓, 90% unlock ✓, must-correct-to-advance ✓, WPM/accuracy formulas ✓, hold-then-press highlighting ✓, localStorage shape ✓, module boundaries ✓, dark visual direction ✓. Fix anything that drifted before pushing.

- [ ] **Step 3: Verify clean working tree and push**

Run: `cd /home/joe/github/QMK && git status` — confirm nothing unexpected/uncommitted (per Joe's concurrent-agent rule, stop if there are foreign changes).
Then: `git push -u origin main`
Expected: branch pushed to git@github.com:thebiglaskowski/QMK.git

---

## Self-Review Notes

- **Spec coverage:** curriculum (Task 3), mechanics/engine (Task 4), visual keyboard + hold highlighting (Task 6), persistence/unlocks (Task 5), screens/results/mistake breakdown (Task 7), dark visual direction (Task 1 CSS), out-of-scope items untouched. Layer-3 footnote from the spec is covered by the README's layer list rather than in-app copy — acceptable simplification.
- **Type consistency:** `charToKey` returns `{keyId, layer, shift}` consumed identically by `highlightTarget` (Task 6) and `main.js` (Task 7). `stats()` return `{wpm, accuracy}` consumed by `renderLiveStats`/`renderResults`/`saveResult`. `PASS_ACCURACY` imported in main.js from storage.js — single source of truth.
- **Known deviation from spec:** the spec says "opened directly as index.html"; native ES modules require an HTTP server, so the README documents `python3 -m http.server 8000`. Still zero-install, zero-build.
