// Progressive curriculum + round builders (weak keys, sandbox, custom lists).

import { POOLS } from './lessonPools.js';
import { EXTRA_POOLS } from './lessonPoolsExtra.js';
import { PASS_ACCURACY, FLUENT_WPM } from './storage.js';

export { PASS_ACCURACY, FLUENT_WPM };

export const PRACTICE_ROUND_MULT = 3;

/** Track labels for menu grouping */
export const TRACK_META = {
  base: { title: 'Base layer', order: 0 },
  split: { title: 'Split hands', order: 1 },
  layer1: { title: 'Layer 1 · left Fn', order: 2 },
  layer2: { title: 'Layer 2 · right Fn', order: 3 },
  mixed: { title: 'Mixed mastery', order: 4 },
};

/**
 * @typedef {object} Stage
 * @property {string} id
 * @property {string} name
 * @property {string} layerHint
 * @property {string} coachTip
 * @property {number} roundSize
 * @property {string[]} pool
 * @property {'base'|'split'|'layer1'|'layer2'|'mixed'} track
 * @property {boolean} [preferBoard]
 */

/** @type {Stage[]} */
export const STAGES = [
  {
    id: 'home-row',
    name: 'Home Row',
    layerHint: 'Base layer · fingers rest here',
    coachTip: 'Park eight fingers on A S D F / H J K L. Thumbs rest light on the inner keys.',
    roundSize: 20,
    pool: POOLS['home-row'],
    track: 'base',
  },
  {
    id: 'bigrams',
    name: 'Common Bigrams',
    layerHint: 'Base layer · high-frequency pairs',
    coachTip: 'th, ing, ion, ent — sequences transfer better than isolated letters. Stay on home when you can.',
    roundSize: 24,
    pool: EXTRA_POOLS.bigrams,
    track: 'base',
  },
  {
    id: 'top-row',
    name: 'Top Row',
    layerHint: 'Base layer · reach up',
    coachTip: 'Reach up from home, strike, return. Do not leave fingers parked on the top row.',
    roundSize: 20,
    pool: POOLS['top-row'],
    track: 'base',
  },
  {
    id: 'bottom-row',
    name: 'Bottom Row',
    layerHint: 'Base layer · reach down',
    coachTip: 'Same rule as top row: visit the bottom row, then come home.',
    roundSize: 20,
    pool: POOLS['bottom-row'],
    track: 'base',
  },
  {
    id: 'left-hand',
    name: 'Left Hand Only',
    layerHint: 'Base layer · left half of the split',
    coachTip: 'Right hand stays idle. Feel the left half as its own island — Q W E R T / A S D F G / Z X C V B.',
    roundSize: 18,
    pool: POOLS['left-hand'],
    track: 'split',
  },
  {
    id: 'right-hand',
    name: 'Right Hand Only',
    layerHint: 'Base layer · right half of the split',
    coachTip: 'Left hand stays idle. Right half owns Y U I O P / H J K L / N M and friends.',
    roundSize: 18,
    pool: POOLS['right-hand'],
    track: 'split',
  },
  {
    id: 'all-letters',
    name: 'Full Sentences',
    layerHint: 'Base layer · everything together',
    coachTip: 'Both hands, all rows. Keep eyes on the prompt; trust the glowing target key.',
    roundSize: 6,
    pool: POOLS['all-letters'],
    track: 'base',
  },
  {
    id: 'numbers',
    name: 'Numbers',
    layerHint: 'Hold LEFT thumb (Fn) for digits',
    coachTip: 'Hold amber Fn (left thumb), then press the green digit. Release when the number is done.',
    roundSize: 16,
    pool: POOLS.numbers,
    track: 'layer1',
  },
  {
    id: 'navigation',
    name: 'Navigation',
    layerHint: 'Hold LEFT thumb (Fn) · arrows on HJKL',
    coachTip: 'Still left-Fn. Arrows sit on H J K L — vim-style: H left, J down, K up, L right.',
    roundSize: 14,
    pool: POOLS.navigation,
    track: 'layer1',
  },
  {
    id: 'hold-drill',
    name: 'Hold Drill',
    layerHint: 'Sustain left Fn across a whole token',
    coachTip: 'Keep the left thumb down for the entire item. Digits and arrows only — no release mid-token.',
    roundSize: 16,
    pool: EXTRA_POOLS['hold-drill'],
    track: 'layer1',
    preferBoard: true,
  },
  {
    id: 'symbol-layer',
    name: 'Symbol Layer',
    layerHint: 'Hold RIGHT thumb (Fn) for !@#$%…',
    coachTip: 'Right thumb holds Fn. These symbols do not need Shift on this board — just hold Fn and press.',
    roundSize: 16,
    pool: POOLS['symbol-layer'],
    track: 'layer2',
  },
  {
    id: 'punctuation',
    name: 'Brackets & Punctuation',
    layerHint: 'Hold RIGHT thumb (Fn) · right hand',
    coachTip: 'Still right-Fn. Brackets, equals, slash and friends live under the right hand on the symbol layer.',
    roundSize: 16,
    pool: POOLS.punctuation,
    track: 'layer2',
  },
  {
    id: 'pulse-drill',
    name: 'Pulse Drill',
    layerHint: 'Base ↔ layer every 1–2 chars',
    coachTip: 'Tap the layer only when amber appears. Release immediately after the layer char — pulse, don’t park.',
    roundSize: 18,
    pool: EXTRA_POOLS['pulse-drill'],
    track: 'mixed',
    preferBoard: true,
  },
  {
    id: 'layer-transitions',
    name: 'Layer Transitions',
    layerHint: 'Rapid hold / release mid-token',
    coachTip: 'The hard skill: enter a layer, type one or two keys, release, keep going. Watch amber appear and vanish.',
    roundSize: 16,
    pool: POOLS['layer-transitions'],
    track: 'mixed',
  },
  {
    id: 'mixed',
    name: 'Mixed Mastery',
    layerHint: 'All layers · real-world text',
    coachTip: 'Realistic strings. Hold only as long as you need; accuracy first, then speed.',
    roundSize: 12,
    pool: POOLS.mixed,
    track: 'mixed',
  },
];

export function buildRound(stage, rand = Math.random, count = stage.roundSize) {
  const source = stage.pool?.length ? stage.pool : ['a'];
  const pool = [...source];
  const items = [];
  const n = Math.max(1, count);
  while (items.length < n) {
    const i = Math.floor(rand() * pool.length);
    items.push(pool.splice(i, 1)[0]);
    if (pool.length === 0) pool.push(...source);
  }
  return items;
}

export function practiceRoundSize(stage) {
  return Math.max(stage.roundSize * PRACTICE_ROUND_MULT, stage.roundSize + 5);
}

/** Build items overweighting heatmap misses (and neighbors). */
export function buildWeakKeyRound(heatmap, charToKey, count = 24, rand = Math.random) {
  const ranked = Object.entries(heatmap || {})
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  if (!ranked.length) {
    return buildRound(
      { pool: [...'asdfghjkl', ...'qwertyuiop', ' thrice'], roundSize: count },
      rand,
      count,
    );
  }
  const top = ranked.slice(0, 12).map(([ch]) => ch);
  const items = [];
  while (items.length < count) {
    // 70% pure miss chars / short combos, 30% mixed with easy fillers
    if (rand() < 0.7) {
      const a = top[Math.floor(rand() * top.length)];
      const b = top[Math.floor(rand() * top.length)];
      const c = top[Math.floor(rand() * top.length)];
      const len = 1 + Math.floor(rand() * 4);
      let s = '';
      for (let i = 0; i < len; i++) s += top[Math.floor(rand() * top.length)];
      // Prefer mappable strings only
      if ([...s].every((ch) => charToKey(ch))) items.push(s);
      else if (charToKey(a)) items.push(a + (charToKey(b) ? b : ''));
    } else {
      const easy = 'asdfghjkl';
      const miss = top[Math.floor(rand() * top.length)];
      const e = easy[Math.floor(rand() * easy.length)];
      const s = rand() < 0.5 ? e + miss + e : miss + e + miss;
      if ([...s].every((ch) => charToKey(ch))) items.push(s);
    }
  }
  return items;
}

export function buildCustomRound(items, count = 20, rand = Math.random) {
  const pool = (items || []).filter((x) => typeof x === 'string' && x.length > 0);
  if (!pool.length) return ['type', 'your', 'list'];
  return buildRound({ pool, roundSize: count }, rand, count);
}

/** Contextual one-liner for the character about to be typed. */
export function contextualTip(ch, charToKey, stageCoachTip) {
  if (ch == null) return stageCoachTip || '';
  const m = charToKey(ch);
  if (!m) return stageCoachTip || '';
  if (m.layer === 1) {
    if ('←↓↑→'.includes(ch)) {
      return `Hold left Fn, then ${{ '←': 'H', '↓': 'J', '↑': 'K', '→': 'L' }[ch]} for ${ch}`;
    }
    return `Hold left Fn, then the green key for “${ch}”`;
  }
  if (m.layer === 2) {
    return `Hold right Fn, then the green key for “${ch}”`;
  }
  if (m.shift) {
    return `Hold Shift, then the green key for “${ch}”`;
  }
  if (ch === ' ') return 'Thumb Space (left inner tall key)';
  return stageCoachTip || 'Eyes on the prompt — trust the green key';
}

/** One-line coaching from a run's mistakes + heatmap. */
export function coachFromMistakes(mistakes, charToKey) {
  const entries = Object.entries(mistakes || {}).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return 'Clean run. Nudge WPM next — accuracy is locked in.';
  const [ch, n] = entries[0];
  const m = charToKey?.(ch);
  if (m?.layer === 1) return `Most misses on layer-1 (“${ch}” ×${n}) — try Hold Drill or Numbers practice.`;
  if (m?.layer === 2) return `Most misses on layer-2 (“${ch}” ×${n}) — try Symbol Layer or Pulse Drill.`;
  if (m?.shift) return `Shift + “${ch}” is sticky (×${n}). Slow the shift press; don't bounce.`;
  if (ch === ' ') return `Space timing is off (×${n}). Plant the left thumb; don't stab.`;
  return `Most misses on “${ch}” (×${n}). Use Practice weak keys to overweight it.`;
}

/** Today's focus suggestion from progress. */
export function todaysFocus(progress, stages = STAGES) {
  const unlocked = stages.filter((s) => progress.stages[s.id]?.unlocked);
  const nextLocked = stages.find((s) => !progress.stages[s.id]?.unlocked);
  const weak = Object.entries(progress.heatmap || {}).sort((a, b) => b[1] - a[1])[0];
  if (nextLocked) {
    const prev = stages[stages.indexOf(nextLocked) - 1];
    return {
      kind: 'unlock',
      title: `Clear ${prev?.name || 'previous'} to unlock ${nextLocked.name}`,
      stageId: prev?.id,
    };
  }
  const unfluent = unlocked.find((s) => !progress.stages[s.id]?.fluent);
  if (unfluent) {
    return {
      kind: 'fluent',
      title: `Push ${unfluent.name} to fluent (≥${FLUENT_WPM} wpm @ ≥${PASS_ACCURACY}%)`,
      stageId: unfluent.id,
    };
  }
  if (weak) {
    return {
      kind: 'weak',
      title: `Weakest key: “${weak[0]}” (×${weak[1]}) — run weak-key drill`,
      stageId: null,
    };
  }
  return {
    kind: 'mixed',
    title: 'Everything fluent — Mixed Mastery or sandbox for fun',
    stageId: 'mixed',
  };
}
