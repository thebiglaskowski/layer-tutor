import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STAGES, TRACK_META, buildRound, practiceRoundSize, PRACTICE_ROUND_MULT,
  buildWeakKeyRound, contextualTip, coachFromMistakes, todaysFocus,
  summarizeRunMetrics,
} from '../js/lessons.js';
import { charToKey } from '../js/keyboardLayout.js';

test('curriculum includes bigrams, hold-drill, pulse-drill in order', () => {
  const ids = STAGES.map((s) => s.id);
  assert.ok(ids.includes('bigrams'));
  assert.ok(ids.indexOf('bigrams') > ids.indexOf('home-row'));
  assert.ok(ids.includes('hold-drill'));
  assert.ok(ids.includes('pulse-drill'));
  assert.equal(STAGES.length, 15);
});

test('track grouping preserves progressive stage order', () => {
  const orders = STAGES.map((stage) => TRACK_META[stage.track].order);
  assert.deepEqual(orders, [...orders].sort((a, b) => a - b));
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

test('every stage has a large non-empty pool, coach tip, and positive roundSize', () => {
  for (const stage of STAGES) {
    assert.ok(stage.pool.length >= 20, `${stage.id} pool too small: ${stage.pool.length}`);
    assert.ok(stage.roundSize > 0, stage.id);
    assert.ok(stage.name && stage.layerHint && stage.coachTip, stage.id);
  }
});

test('buildRound and practiceRoundSize', () => {
  const stage = STAGES[0];
  assert.equal(buildRound(stage, () => 0).length, stage.roundSize);
  assert.ok(practiceRoundSize(stage) >= stage.roundSize * PRACTICE_ROUND_MULT);
});

test('layer usage per stage matches curriculum rules', () => {
  const expected = {
    'home-row': [0], bigrams: [0], 'top-row': [0], 'bottom-row': [0],
    'left-hand': [0], 'right-hand': [0], 'all-letters': [0],
    numbers: [1], navigation: [1], 'hold-drill': [1],
    'symbol-layer': [0, 2], punctuation: [0, 2],
    'pulse-drill': [0, 1, 2], 'layer-transitions': [0, 1, 2], mixed: [0, 1, 2],
  };
  for (const stage of STAGES) {
    const layers = new Set();
    for (const item of stage.pool) {
      for (const ch of item) layers.add(charToKey(ch).layer);
    }
    assert.deepEqual([...layers].sort((a, b) => a - b), expected[stage.id], stage.id);
  }
});

test('buildWeakKeyRound prefers heatmap chars and stays mappable', () => {
  const items = buildWeakKeyRound({ a: 9, b: 4, '1': 2 }, charToKey, 12, () => 0);
  assert.equal(items.length, 12);
  for (const item of items) {
    for (const ch of item) assert.ok(charToKey(ch), ch);
  }
});

test('weak-key rounds ignore unmappable imported metrics and always terminate', () => {
  const items = buildWeakKeyRound(
    { '💩': 99 },
    charToKey,
    12,
    () => 0,
    { '💩': { attempts: 10, errors: 10, samples: 0, totalLatencyMs: 0 } },
  );
  assert.equal(items.length, 12);
  assert.ok(items.every((item) => [...item].every((ch) => charToKey(ch))));
});

test('run analysis reports slow keys and layer transitions', () => {
  const analysis = summarizeRunMetrics({
    keyMetrics: {
      a: { attempts: 1, errors: 0, samples: 1, totalLatencyMs: 200 },
      '1': { attempts: 1, errors: 0, samples: 1, totalLatencyMs: 600 },
    },
    events: [
      { ch: 'a', previousCh: null, latencyMs: 200 },
      { ch: '1', previousCh: 'a', latencyMs: 600, errors: 1 },
      { ch: 'a', previousCh: '1', latencyMs: 300 },
    ],
  }, charToKey);
  assert.equal(analysis.slowest[0].ch, '1');
  assert.equal(analysis.transitionMetrics['enter-layer-1'].count, 1);
  assert.equal(analysis.transitions.find((row) => row.kind === 'enter-layer-1').accuracy, 50);
  assert.equal(analysis.transitionMetrics['exit-layer-1'].count, 1);
});

test('editorial filter removes blocked and broken generated content', () => {
  const allItems = STAGES.flatMap((stage) => stage.pool);
  assert.equal(allItems.some((item) => /\b(?:fag|fags|nazi|lsd)\b/i.test(item)), false);
  assert.equal(STAGES.find((stage) => stage.id === 'all-letters').pool
    .some((item) => /\b(?:can|will)\s+\w+s\b|^Please\s+\w+s\b|^Did\s+.+\s+\w+s\b/i.test(item)), false);
});

test('contextualTip mentions hold for layer chars', () => {
  assert.match(contextualTip('1', charToKey, 'x'), /left Fn/i);
  assert.match(contextualTip('!', charToKey, 'x'), /right Fn/i);
  assert.match(contextualTip('A', charToKey, 'x'), /Shift/i);
  assert.match(contextualTip(' ', charToKey, 'x'), /Space/i);
});

test('coachFromMistakes returns actionable line', () => {
  assert.match(coachFromMistakes({ '[': 3 }, charToKey), /layer-2|Symbol/i);
  assert.match(coachFromMistakes({}, charToKey), /Clean/i);
});

test('todaysFocus points at unlock or fluent work', () => {
  const stages = STAGES.slice(0, 3);
  const progress = {
    stages: {
      [stages[0].id]: { unlocked: true, fluent: true, timesPlayed: 1, bestWpm: 30, bestAccuracy: 95 },
      [stages[1].id]: { unlocked: false, fluent: false, timesPlayed: 0, bestWpm: 0, bestAccuracy: 0 },
      [stages[2].id]: { unlocked: false, fluent: false, timesPlayed: 0, bestWpm: 0, bestAccuracy: 0 },
    },
    heatmap: {},
  };
  const f = todaysFocus(progress, stages);
  assert.equal(f.kind, 'unlock');
});
