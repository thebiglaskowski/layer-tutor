// The progressive curriculum. Content rules:
// - Stages 1-6 stay on base-layer (layer 0) characters.
// - Stage 7-8 exercise layer 1 (hold LEFT thumb / Fn).
// - Stage 9-10 exercise layer 2 (hold RIGHT thumb / Fn) mixed with letters.
// - Stage 11 drills rapid layer enter/exit mid-token.
// - Stage 12 mixes all three layers in realistic strings.
// Every character in every pool item must resolve via charToKey() — enforced
// by tests/lessons.test.js.
//
// Large pools live in lessonPools.js so replaying a stage rarely repeats the
// same sequence. buildRound samples without replacement until the pool is empty.

import { POOLS } from './lessonPools.js';
import { PASS_ACCURACY, FLUENT_WPM } from './storage.js';

export { PASS_ACCURACY, FLUENT_WPM };

/** Free-practice rounds are this many times a stage's normal roundSize. */
export const PRACTICE_ROUND_MULT = 3;

/**
 * @typedef {object} Stage
 * @property {string} id
 * @property {string} name
 * @property {string} layerHint
 * @property {string} coachTip  short pedagogy line shown under the board
 * @property {number} roundSize
 * @property {string[]} pool
 * @property {'base'|'split'|'layer1'|'layer2'|'mixed'} track
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

/**
 * Draw `count` items from the stage pool without replacement until empty,
 * then refill. Injectable RNG for tests.
 */
export function buildRound(stage, rand = Math.random, count = stage.roundSize) {
  const pool = [...stage.pool];
  const items = [];
  const n = Math.max(1, count);
  while (items.length < n) {
    const i = Math.floor(rand() * pool.length);
    items.push(pool.splice(i, 1)[0]);
    if (pool.length === 0) pool.push(...stage.pool);
  }
  return items;
}

export function practiceRoundSize(stage) {
  return stage.roundSize * PRACTICE_ROUND_MULT;
}
