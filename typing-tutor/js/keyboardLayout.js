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
