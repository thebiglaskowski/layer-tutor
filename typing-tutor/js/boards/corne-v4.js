// Corne V4 — primary board for this app.
// Layout matrix derived from layouts/corne-v4.vil (layers 0–2).
// The .vil stores the RIGHT half outer-edge → inner-edge; rows here are
// visual left → right. Keep in sync via: node scripts/check-layout.mjs

import { createLayout } from './buildLayout.js';

const XX = null;

const LEFT = [
  [['L00', 'Esc', 'Tab', 'Tab'], ['L01', 'Q', '1', '!'], ['L02', 'W', '2', '@'], ['L03', 'E', '3', '#'], ['L04', 'R', '4', '$'], ['L05', 'T', '5', '%'], ['L06', 'Alt', 'Ctrl', 'Ctrl']],
  [['L10', 'Caps', 'Ctrl', 'Ctrl'], ['L11', 'A', XX, XX], ['L12', 'S', XX, XX], ['L13', 'D', XX, XX], ['L14', 'F', XX, XX], ['L15', 'G', XX, XX], ['L16', 'Tab', 'Alt', 'Alt']],
  [['L20', 'Shift', 'Shift', 'Shift'], ['L21', 'Z', XX, XX], ['L22', 'X', XX, XX], ['L23', 'C', XX, XX], ['L24', 'V', XX, XX], ['L25', 'B', XX, XX]],
  [['L33', 'Ctrl', 'Win', 'Win'], ['L34', 'Fn', 'Fn', 'Fn'], ['L35', 'Space', 'Space', 'Space']],
];

const RIGHT = [
  [['R00', 'Ctrl', 'Ctrl', 'Ctrl'], ['R01', 'Y', '6', '^'], ['R02', 'U', '7', '&'], ['R03', 'I', '8', '*'], ['R04', 'O', '9', '('], ['R05', 'P', '0', ')'], ['R06', 'Bksp', 'Bksp', 'Bksp']],
  [['R10', 'Shift', 'Alt', 'Alt'], ['R11', 'H', '←', '-'], ['R12', 'J', '↓', '='], ['R13', 'K', '↑', '['], ['R14', 'L', '→', ']'], ['R15', ';', XX, '\\'], ['R16', "'", XX, '`']],
  [['R20', 'N', XX, '_'], ['R21', 'M', XX, '+'], ['R22', ',', XX, '{'], ['R23', '.', XX, '}'], ['R24', '/', XX, '|'], ['R25', 'Del', XX, '~']],
  [['R33', 'Enter', 'Enter', 'Enter'], ['R34', 'Fn', 'Fn', 'Fn'], ['R35', 'Win', 'Win', 'Win']],
];

const layout = createLayout({
  left: LEFT,
  right: RIGHT,
  layerHold: { 1: 'L34', 2: 'R34' },
  shiftKeys: ['L20', 'R10'],
  spaceKeyId: 'L35',
});

/**
 * @typedef {object} Board
 * @property {string} id
 * @property {string} name           short UI label
 * @property {string} productName    full retail / model name
 * @property {string} formFactor     e.g. "40% 3×6 ortholinear"
 * @property {string} description    one-line blurb for menu
 * @property {string} geometry       renderer geometry profile id
 * @property {string} vilPath        repo-relative path to Vial export
 * @property {boolean} [comingSoon]  placeholder for future boards
 */

/** @type {Board & ReturnType<typeof createLayout>} */
export const board = {
  id: 'corne-v4',
  name: 'Corne V4',
  productName: 'CORNE V4 Wired Split Mechanical Keyboard',
  formFactor: '40% 3×6 ortholinear',
  description: 'Wired Corne V4 — 3×6 split with dual thumb Fn layers (numbers/nav + symbols).',
  geometry: 'corne-3x6',
  vilPath: 'layouts/corne-v4.vil',
  comingSoon: false,
  ...layout,
};

export default board;
