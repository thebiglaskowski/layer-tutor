import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STAGES, buildRound, practiceRoundSize, PRACTICE_ROUND_MULT } from '../js/lessons.js';
import { charToKey } from '../js/keyboardLayout.js';

const EXPECTED_IDS = [
  'home-row', 'top-row', 'bottom-row', 'left-hand', 'right-hand', 'all-letters',
  'numbers', 'navigation', 'symbol-layer', 'punctuation', 'layer-transitions', 'mixed',
];

test('there are 12 stages in curriculum order', () => {
  assert.deepEqual(STAGES.map((s) => s.id), EXPECTED_IDS);
});

test('every stage item uses only mappable characters', () => {
  for (const stage of STAGES) {
    for (const item of stage.pool) {
      for (const ch of item) {
        assert.ok(charToKey(ch), `stage ${stage.id}: no key mapping for ${JSON.stringify(ch)} in ${JSON.stringify(item)}`);
      }
    }
  }
});

test('row stages stay within their taught keys', () => {
  const patterns = {
    'home-row': /^[asdfghjkl ]+$/,
    'top-row': /^[qwertyuiopasdfghjkl ]+$/,
    'bottom-row': /^[a-z,./ ]+$/,
    'left-hand': /^[qwertasdfgzxcvb ]+$/,
    'right-hand': /^[yuiophjklnm ]+$/,
    numbers: /^[0-9]+$/,
    navigation: /^[←↓↑→]+$/,
  };
  for (const [id, re] of Object.entries(patterns)) {
    const stage = STAGES.find((s) => s.id === id);
    assert.ok(stage, id);
    for (const item of stage.pool) {
      assert.match(item, re, `stage ${id}: ${JSON.stringify(item)} breaks charset`);
    }
  }
});

test('every stage has a large non-empty pool, coach tip, and positive roundSize', () => {
  for (const stage of STAGES) {
    assert.ok(stage.pool.length >= 30, `${stage.id} pool too small: ${stage.pool.length}`);
    assert.ok(stage.roundSize > 0, stage.id);
    assert.ok(stage.name && stage.layerHint && stage.coachTip, stage.id);
  }
});

test('pools are large enough that replays rarely feel identical (~10x original scale)', () => {
  // Original pools were ~12–30 items. We aim for roughly an order of magnitude more.
  const minSizes = {
    'home-row': 150,
    'top-row': 150,
    'bottom-row': 150,
    'left-hand': 100,
    'right-hand': 80,
    'all-letters': 40,
    numbers: 100,
    navigation: 60,
    'symbol-layer': 100,
    punctuation: 100,
    'layer-transitions': 80,
    mixed: 100,
  };
  for (const stage of STAGES) {
    assert.ok(
      stage.pool.length >= minSizes[stage.id],
      `${stage.id}: pool ${stage.pool.length} < min ${minSizes[stage.id]}`,
    );
  }
});

test('buildRound returns roundSize items drawn from the pool', () => {
  const stage = STAGES[0];
  const round = buildRound(stage, () => 0);
  assert.equal(round.length, stage.roundSize);
  for (const item of round) assert.ok(stage.pool.includes(item));
});

test('buildRound accepts an explicit count (practice rounds)', () => {
  const stage = STAGES[0];
  const n = practiceRoundSize(stage);
  assert.equal(n, stage.roundSize * PRACTICE_ROUND_MULT);
  const round = buildRound(stage, () => 0, n);
  assert.equal(round.length, n);
});

test('buildRound with rand=()=>0 is deterministic (pool order)', () => {
  const stage = STAGES[0];
  assert.deepEqual(buildRound(stage, () => 0), buildRound(stage, () => 0));
});

test('buildRound refills the pool when count exceeds pool length', () => {
  const stage = { id: 'tiny', name: 'Tiny', layerHint: 'x', coachTip: 'x', roundSize: 7, pool: ['a', 'b', 'c'] };
  const round = buildRound(stage, () => 0);
  assert.equal(round.length, 7);
  for (const item of round) assert.ok(stage.pool.includes(item));
});

test('layer usage per stage matches the curriculum rules', () => {
  const expected = {
    'home-row': [0],
    'top-row': [0],
    'bottom-row': [0],
    'left-hand': [0],
    'right-hand': [0],
    'all-letters': [0],
    numbers: [1],
    navigation: [1],
    'symbol-layer': [0, 2],
    punctuation: [0, 2],
    'layer-transitions': [0, 1, 2],
    mixed: [0, 1, 2],
  };
  for (const stage of STAGES) {
    const layers = new Set();
    for (const item of stage.pool) {
      for (const ch of item) layers.add(charToKey(ch).layer);
    }
    assert.deepEqual([...layers].sort((a, b) => a - b), expected[stage.id], `stage ${stage.id}`);
  }
});

test('every pool item is a non-empty string', () => {
  for (const stage of STAGES) {
    for (const item of stage.pool) {
      assert.equal(typeof item, 'string', stage.id);
      assert.ok(item.length > 0, `stage ${stage.id} has an empty item`);
    }
  }
});

test('symbol-layer stage is named without implying Shift is required', () => {
  const s = STAGES.find((x) => x.id === 'symbol-layer');
  assert.match(s.name, /symbol/i);
  assert.doesNotMatch(s.name, /shift/i);
});
