import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStorage, PASS_ACCURACY } from '../js/storage.js';

const IDS = ['s1', 's2', 's3'];

function fakeBacking(initial = {}) {
  const m = new Map(Object.entries(initial));
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
}

test('PASS_ACCURACY is 90', () => {
  assert.equal(PASS_ACCURACY, 90);
});

test('first stage starts unlocked, the rest locked', () => {
  const store = createStorage(IDS, fakeBacking());
  const data = store.load();
  assert.equal(data.stages.s1.unlocked, true);
  assert.equal(data.stages.s2.unlocked, false);
  assert.deepEqual(data.stages.s1, { unlocked: true, bestWpm: 0, bestAccuracy: 0, timesPlayed: 0 });
});

test('saveResult updates bests and timesPlayed, keeps higher bests', () => {
  const store = createStorage(IDS, fakeBacking());
  store.load();
  store.saveResult('s1', 40, 95);
  const { data } = store.saveResult('s1', 30, 80);
  assert.equal(data.stages.s1.bestWpm, 40);
  assert.equal(data.stages.s1.bestAccuracy, 95);
  assert.equal(data.stages.s1.timesPlayed, 2);
});

test('accuracy >= 90 unlocks the next stage', () => {
  const store = createStorage(IDS, fakeBacking());
  store.load();
  const { data, unlockedNext } = store.saveResult('s1', 40, 90);
  assert.equal(unlockedNext, true);
  assert.equal(data.stages.s2.unlocked, true);
  assert.equal(data.stages.s3.unlocked, false);
});

test('accuracy < 90 does not unlock; re-clearing reports unlockedNext=false', () => {
  const store = createStorage(IDS, fakeBacking());
  store.load();
  assert.equal(store.saveResult('s1', 40, 89.9).unlockedNext, false);
  store.saveResult('s1', 40, 95);
  assert.equal(store.saveResult('s1', 40, 95).unlockedNext, false); // already unlocked
});

test('last stage clearing never throws', () => {
  const store = createStorage(IDS, fakeBacking());
  store.load();
  assert.doesNotThrow(() => store.saveResult('s3', 40, 99));
});

test('corrupted JSON starts fresh instead of crashing', () => {
  const store = createStorage(IDS, fakeBacking({ 'qmk-typing-tutor-v1': '{not json' }));
  const data = store.load();
  assert.equal(data.stages.s1.unlocked, true);
});

test('progress persists across createStorage instances sharing a backing', () => {
  const backing = fakeBacking();
  createStorage(IDS, backing).saveResult('s1', 33, 92);
  const data = createStorage(IDS, backing).load();
  assert.equal(data.stages.s1.bestWpm, 33);
  assert.equal(data.stages.s2.unlocked, true);
});

test('reset wipes progress back to defaults', () => {
  const store = createStorage(IDS, fakeBacking());
  store.saveResult('s1', 40, 95);
  const data = store.reset();
  assert.deepEqual(data.stages.s1, { unlocked: true, bestWpm: 0, bestAccuracy: 0, timesPlayed: 0 });
  assert.equal(data.stages.s2.unlocked, false);
});
