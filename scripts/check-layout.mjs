#!/usr/bin/env node
/**
 * Verify each board's key matrix still matches its Vial .vil for layers 0–2.
 *
 * Usage: node scripts/check-layout.mjs
 * Exit 0 on match, 1 on drift.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { BOARDS, listPlayableBoards } = await import(
  path.join(root, 'typing-tutor/js/boards/index.js')
);

const LEGEND = {
  KC_ESCAPE: 'Esc',
  KC_CAPSLOCK: 'Caps',
  KC_LSHIFT: 'Shift',
  KC_RSHIFT: 'Shift',
  KC_LCTRL: 'Ctrl',
  KC_RCTRL: 'Ctrl',
  KC_LALT: 'Alt',
  KC_RALT: 'Alt',
  KC_LGUI: 'Win',
  KC_RGUI: 'Win',
  KC_BSPACE: 'Bksp',
  KC_DELETE: 'Del',
  KC_SPACE: 'Space',
  KC_ENTER: 'Enter',
  KC_TAB: 'Tab',
  KC_SCOLON: ';',
  KC_QUOTE: "'",
  KC_COMMA: ',',
  KC_DOT: '.',
  KC_SLASH: '/',
  KC_MINUS: '-',
  KC_EQUAL: '=',
  KC_LBRACKET: '[',
  KC_RBRACKET: ']',
  KC_BSLASH: '\\',
  KC_GRAVE: '`',
  KC_LEFT: '←',
  KC_DOWN: '↓',
  KC_UP: '↑',
  KC_RIGHT: '→',
  FN_MO13: 'Fn',
  FN_MO23: 'Fn',
  KC_NO: null,
  KC_TRNS: null,
  '-1': null,
};

for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
  LEGEND[`KC_${ch}`] = ch;
}
for (let i = 0; i <= 9; i++) LEGEND[`KC_${i}`] = String(i);

const SHIFTED = {
  'LSFT(KC_1)': '!',
  'LSFT(KC_2)': '@',
  'LSFT(KC_3)': '#',
  'LSFT(KC_4)': '$',
  'LSFT(KC_5)': '%',
  'LSFT(KC_6)': '^',
  'LSFT(KC_7)': '&',
  'LSFT(KC_8)': '*',
  'LSFT(KC_9)': '(',
  'LSFT(KC_0)': ')',
  'LSFT(KC_MINUS)': '_',
  'LSFT(KC_EQUAL)': '+',
  'LSFT(KC_LBRACKET)': '{',
  'LSFT(KC_RBRACKET)': '}',
  'LSFT(KC_BSLASH)': '|',
  'LSFT(KC_GRAVE)': '~',
};

function legendOf(code) {
  if (code === -1 || code === null) return null;
  if (typeof code !== 'string') return null;
  if (code in SHIFTED) return SHIFTED[code];
  if (code in LEGEND) return LEGEND[code];
  if (code === 'KC_TRNS' || code === 'KC_NO') return null;
  return undefined;
}

function vilToVisual(layerRows) {
  const left = layerRows.slice(0, 4);
  const right = layerRows.slice(4, 8).map((row) => [...row].reverse());
  return { left, right };
}

function expectedFromVil(vil) {
  const expected = new Map();
  const idGrid = {
    L: [
      ['L00', 'L01', 'L02', 'L03', 'L04', 'L05', 'L06'],
      ['L10', 'L11', 'L12', 'L13', 'L14', 'L15', 'L16'],
      ['L20', 'L21', 'L22', 'L23', 'L24', 'L25'],
      ['L33', 'L34', 'L35'],
    ],
    R: [
      ['R00', 'R01', 'R02', 'R03', 'R04', 'R05', 'R06'],
      ['R10', 'R11', 'R12', 'R13', 'R14', 'R15', 'R16'],
      ['R20', 'R21', 'R22', 'R23', 'R24', 'R25'],
      ['R33', 'R34', 'R35'],
    ],
  };

  for (const layer of [0, 1, 2]) {
    const { left, right } = vilToVisual(vil.layout[layer]);

    function walk(halfRows, half) {
      const grid = idGrid[half];
      for (let r = 0; r < grid.length; r++) {
        const ids = grid[r];
        const vilRow = halfRows[r].filter((c) => c !== -1);
        if (vilRow.length < ids.length) {
          throw new Error(`layer ${layer} half ${half} row ${r}: vil has ${vilRow.length} keys, tutor expects ${ids.length}`);
        }
        const codes = vilRow.length === ids.length ? vilRow : vilRow.slice(0, ids.length);
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i];
          const leg = legendOf(codes[i]);
          if (leg === undefined) {
            throw new Error(`Unknown KC code ${codes[i]} at ${id} layer ${layer}`);
          }
          if (!expected.has(id)) expected.set(id, { 0: null, 1: null, 2: null });
          expected.get(id)[layer] = leg;
        }
      }
    }

    walk(left, 'L');
    walk(right, 'R');
  }
  return expected;
}

let failed = false;

for (const board of listPlayableBoards()) {
  if (!board.vilPath) {
    console.log(`SKIP ${board.id} — no vilPath`);
    continue;
  }
  const vilPath = path.join(root, board.vilPath);
  if (!fs.existsSync(vilPath)) {
    console.error(`FAIL ${board.id}: missing ${board.vilPath}`);
    failed = true;
    continue;
  }

  const errors = [];
  const vil = JSON.parse(fs.readFileSync(vilPath, 'utf8'));
  const expected = expectedFromVil(vil);
  const HOLD_IDS = new Set(Object.values(board.LAYER_HOLD));

  board.assertUniqueCharMap();

  for (const key of board.KEYS) {
    const exp = expected.get(key.id);
    if (!exp) {
      errors.push(`tutor key ${key.id} not found in .vil mapping`);
      continue;
    }
    for (const layer of [0, 1, 2]) {
      if (HOLD_IDS.has(key.id) && layer > 0) continue;
      const a = key.legends[layer];
      const b = exp[layer];
      if (a !== b) {
        errors.push(`${key.id} layer ${layer}: tutor=${JSON.stringify(a)} vil=${JSON.stringify(b)}`);
      }
    }
  }

  if (board.LAYER_HOLD[1] !== 'L34') errors.push('LAYER_HOLD[1] should be L34 (FN_MO13)');
  if (board.LAYER_HOLD[2] !== 'R34') errors.push('LAYER_HOLD[2] should be R34 (FN_MO23)');

  if (!board.charToKey('a') || !board.charToKey('1') || !board.charToKey('!') || !board.charToKey('←')) {
    errors.push('charToKey missing basic mappings');
  }

  if (errors.length) {
    failed = true;
    console.error(`FAIL ${board.id} (${board.productName}):\n` + errors.map((e) => '  - ' + e).join('\n'));
  } else {
    console.log(`OK  ${board.id} — ${board.KEYS.length} keys match ${board.vilPath}; ${board.productName}`);
  }
}

if (!listPlayableBoards().length) {
  console.error('No playable boards registered.');
  process.exit(1);
}

if (failed) process.exit(1);
console.log(`Checked ${listPlayableBoards().length} board(s); registry size ${BOARDS.length}.`);
