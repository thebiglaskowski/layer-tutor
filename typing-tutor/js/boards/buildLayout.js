// Pure helpers: turn a key matrix into KEYS + charToKey for a board.

/**
 * @param {Array<Array<[string, string|null, string|null, string|null]>>} rows
 * @param {'L'|'R'} half
 */
export function buildKeys(rows, half) {
  const keys = [];
  rows.forEach((row, rowIndex) => {
    for (const [id, l0, l1, l2] of row) {
      keys.push({ id, half, row: rowIndex, col: Number(id[2]), legends: { 0: l0, 1: l1, 2: l2 } });
    }
  });
  return keys;
}

/**
 * @param {object} opts
 * @param {ReturnType<typeof buildKeys>} opts.keys
 * @param {Record<number, string>} opts.layerHold  layer → thumb key id
 * @param {string[]} opts.shiftKeys
 * @param {string} [opts.spaceKeyId]
 * @param {Record<string, string>} [opts.shiftedL0]  e.g. { ':': ';' }
 */
export function buildCharMap({
  keys,
  layerHold,
  shiftKeys,
  spaceKeyId = null,
  shiftedL0 = { ':': ';', '"': "'", '<': ',', '>': '.', '?': '/' },
}) {
  const map = new Map();
  const holdIds = new Set(Object.values(layerHold));

  for (const key of keys) {
    if (holdIds.has(key.id)) continue;
    for (const layer of [0, 1, 2]) {
      const legend = key.legends[layer];
      if (!legend || [...legend].length !== 1) continue;
      const ch = layer === 0 ? legend.toLowerCase() : legend;
      if (!map.has(ch)) map.set(ch, { keyId: key.id, layer, shift: false });
    }
  }

  for (const [ch, entry] of [...map]) {
    if (entry.layer === 0 && ch >= 'a' && ch <= 'z') {
      map.set(ch.toUpperCase(), { ...entry, shift: true });
    }
  }

  for (const [shifted, base] of Object.entries(shiftedL0)) {
    const baseEntry = map.get(base);
    if (baseEntry) map.set(shifted, { ...baseEntry, shift: true });
  }

  if (spaceKeyId) {
    map.set(' ', { keyId: spaceKeyId, layer: 0, shift: false });
  }

  return map;
}

export function assertUniqueCharMap(keys, layerHold) {
  const holdIds = new Set(Object.values(layerHold));
  const seen = new Map();
  const conflicts = [];
  for (const key of keys) {
    if (holdIds.has(key.id)) continue;
    for (const layer of [0, 1, 2]) {
      const legend = key.legends[layer];
      if (!legend || [...legend].length !== 1) continue;
      const ch = layer === 0 ? legend.toLowerCase() : legend;
      if (seen.has(ch) && seen.get(ch) !== key.id) {
        conflicts.push(`${ch}: ${seen.get(ch)} vs ${key.id}`);
      } else {
        seen.set(ch, key.id);
      }
    }
  }
  if (conflicts.length) throw new Error(`CHAR_MAP conflicts: ${conflicts.join('; ')}`);
  return true;
}

/**
 * Build a complete runtime layout object for a board.
 */
export function createLayout({
  left,
  right,
  layerHold,
  shiftKeys,
  spaceKeyId,
  shiftedL0,
}) {
  const KEYS = [...buildKeys(left, 'L'), ...buildKeys(right, 'R')];
  const CHAR_MAP = buildCharMap({
    keys: KEYS,
    layerHold,
    shiftKeys,
    spaceKeyId,
    shiftedL0,
  });

  function charToKey(ch) {
    return CHAR_MAP.get(ch) ?? null;
  }

  function shiftKeysFor(target) {
    if (!target?.shift) return [];
    const key = KEYS.find((k) => k.id === target.keyId);
    if (!key) return [...shiftKeys];
    const sameHalf = shiftKeys.filter((id) => {
      const sk = KEYS.find((k) => k.id === id);
      return sk && sk.half === key.half;
    });
    return sameHalf.length ? sameHalf : [...shiftKeys];
  }

  function assertUnique() {
    return assertUniqueCharMap(KEYS, layerHold);
  }

  return {
    KEYS,
    LAYER_HOLD: layerHold,
    SHIFT_KEYS: shiftKeys,
    SHIFT_KEY: shiftKeys[0],
    charToKey,
    shiftKeysFor,
    assertUniqueCharMap: assertUnique,
  };
}
