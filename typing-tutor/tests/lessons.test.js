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

test('buildRound refills the pool when roundSize exceeds pool length', () => {
  const stage = { id: 'tiny', name: 'Tiny', layerHint: 'x', roundSize: 7, pool: ['a', 'b', 'c'] };
  const round = buildRound(stage, () => 0);
  assert.equal(round.length, 7);
  for (const item of round) assert.ok(stage.pool.includes(item));
});

test('layer usage per stage matches the curriculum rules', () => {
  const expected = {
    'home-row': [0], 'top-row': [0], 'bottom-row': [0], 'all-letters': [0],
    numbers: [1], navigation: [1],
    'shifted-symbols': [0, 2], punctuation: [0, 2],
    mixed: [0, 1, 2],
  };
  for (const stage of STAGES) {
    const layers = new Set();
    for (const item of stage.pool) {
      for (const ch of item) layers.add(charToKey(ch).layer);
    }
    assert.deepEqual([...layers].sort(), expected[stage.id], `stage ${stage.id}`);
  }
});
