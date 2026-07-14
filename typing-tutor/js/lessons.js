// Progressive curriculum + round builders (weak keys, sandbox, custom lists).

import { POOLS } from './lessonPools.js';
import { EXTRA_POOLS } from './lessonPoolsExtra.js';
import { PASS_ACCURACY, FLUENT_WPM } from './storage.js';

export { PASS_ACCURACY, FLUENT_WPM };

export const PRACTICE_ROUND_MULT = 3;

/** Track labels for menu grouping */
export const TRACK_META = {
  base: { title: 'Base layer', order: 0 },
  split: { title: 'Split hands & full base', order: 1 },
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
    track: 'split',
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
export function buildWeakKeyRound(
  heatmap,
  charToKey,
  count = 24,
  rand = Math.random,
  keyMetrics = {},
) {
  const chars = new Set([...Object.keys(heatmap || {}), ...Object.keys(keyMetrics || {})]);
  const ranked = [...chars]
    .filter((ch) => charToKey(ch))
    .map((ch) => {
      const m = keyMetrics[ch] || {};
      const attempts = Math.max(0, Number(m.attempts) || 0);
      const errors = Math.max(0, Number(m.errors) || Number(heatmap?.[ch]) || 0);
      const samples = Math.max(0, Number(m.samples) || 0);
      const errorRate = attempts ? errors / attempts : Math.min(1, errors / 3);
      const avgLatency = samples ? (Number(m.totalLatencyMs) || 0) / samples : 0;
      // Error rate dominates; hesitation breaks ties. A tiny confidence factor
      // keeps one accidental miss from outranking a consistently weak key.
      const confidence = Math.min(1, Math.max(0.25, attempts / 8));
      const score = errorRate * 5 * confidence + Math.min(2, avgLatency / 1000);
      return [ch, score];
    })
    .filter(([, score]) => score > 0)
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
  let attempts = 0;
  const maxAttempts = Math.max(100, count * 50);
  while (items.length < count && attempts < maxAttempts) {
    attempts += 1;
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
  const fallback = [...'asdfghjklqwertyuiop'].filter((ch) => charToKey(ch));
  while (items.length < count && fallback.length) {
    items.push(fallback[items.length % fallback.length]);
  }
  return items;
}

function transitionKind(previous, current) {
  if (!previous || !current) return 'start';
  if (previous.layer === 0 && current.layer > 0) return `enter-layer-${current.layer}`;
  if (previous.layer > 0 && current.layer === 0) return `exit-layer-${previous.layer}`;
  if (previous.layer !== current.layer) return 'switch-layer';
  if (previous.keyId?.[0] !== current.keyId?.[0]) return 'switch-hand';
  return current.layer > 0 ? `stay-layer-${current.layer}` : 'same-hand-base';
}

/** Aggregate a completed run into durable metrics and concise coaching. */
export function summarizeRunMetrics(game, charToKey) {
  const transitionMetrics = {};
  for (const event of game?.events || []) {
    const kind = transitionKind(charToKey(event.previousCh), charToKey(event.ch));
    const metric = transitionMetrics[kind] || { count: 0, errors: 0, totalLatencyMs: 0 };
    metric.count += 1;
    metric.errors += Math.max(0, Number(event.errors) || 0);
    metric.totalLatencyMs += Math.max(0, Number(event.latencyMs) || 0);
    transitionMetrics[kind] = metric;
  }

  const keyRows = Object.entries(game?.keyMetrics || {}).map(([ch, m]) => ({
    ch,
    errorRate: m.attempts ? m.errors / m.attempts : 0,
    avgLatencyMs: m.samples ? m.totalLatencyMs / m.samples : 0,
    attempts: m.attempts,
  }));
  const sampled = keyRows.filter((r) => r.avgLatencyMs > 0);
  const avgLatencyMs = sampled.length
    ? Math.round(sampled.reduce((sum, r) => sum + r.avgLatencyMs, 0) / sampled.length)
    : 0;
  const slowest = [...sampled]
    .sort((a, b) => b.avgLatencyMs - a.avgLatencyMs || b.errorRate - a.errorRate)
    .slice(0, 5);
  const transitionRows = Object.entries(transitionMetrics)
    .filter(([kind]) => kind !== 'start')
    .map(([kind, m]) => ({
      kind,
      count: m.count,
      accuracy: Math.round((m.count / Math.max(1, m.count + m.errors)) * 1000) / 10,
      avgLatencyMs: m.count ? Math.round(m.totalLatencyMs / m.count) : 0,
    }))
    .sort((a, b) => (
      ((100 - b.accuracy) * 20 + b.avgLatencyMs)
      - ((100 - a.accuracy) * 20 + a.avgLatencyMs)
    ));

  let transitionCoach = '';
  const slowTransition = transitionRows[0];
  if (slowTransition?.kind.startsWith('exit-layer')) {
    transitionCoach = 'Layer release is the toughest transition—release the thumb as the layer key lands.';
  } else if (slowTransition?.kind.startsWith('enter-layer')) {
    transitionCoach = 'Layer entry is the toughest transition—lead with the thumb, then strike the target.';
  } else if (slowTransition?.kind === 'switch-hand') {
    transitionCoach = 'Hand switches are costing the most time—keep both hands parked over home.';
  }

  return {
    keyMetrics: game?.keyMetrics || {},
    transitionMetrics,
    avgLatencyMs,
    slowest,
    transitions: transitionRows,
    transitionCoach,
  };
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
  const weak = Object.entries(progress.keyMetrics || {})
    .filter(([, m]) => m?.attempts > 0)
    .map(([ch, m]) => [ch, (m.errors / m.attempts) + ((m.samples ? m.totalLatencyMs / m.samples : 0) / 5000)])
    .sort((a, b) => b[1] - a[1])[0]
    || Object.entries(progress.heatmap || {}).sort((a, b) => b[1] - a[1])[0];
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
      title: `Weakest key: “${weak[0]}” — train its accuracy and response time`,
      stageId: null,
    };
  }
  return {
    kind: 'mixed',
    title: 'Everything fluent — Mixed Mastery or sandbox for fun',
    stageId: 'mixed',
  };
}
