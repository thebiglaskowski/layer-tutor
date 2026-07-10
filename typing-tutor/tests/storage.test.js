import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStorage, PASS_ACCURACY, FLUENT_WPM, STORE_KEY } from '../js/storage.js';

const IDS = ['s1', 's2', 's3'];

function fakeBacking(initial = {}) {
  const m = new Map(Object.entries(initial));
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), _m: m };
}

function store(backing = fakeBacking()) {
  return createStorage(IDS, backing, { defaultBoardId: 'corne-v4' });
}

test('PASS_ACCURACY is 90 and FLUENT_WPM is 25', () => {
  assert.equal(PASS_ACCURACY, 90);
  assert.equal(FLUENT_WPM, 25);
});

test('first stage starts unlocked, the rest locked', () => {
  const data = store().load();
  assert.equal(data.stages.s1.unlocked, true);
  assert.equal(data.stages.s2.unlocked, false);
  assert.equal(data.stages.s1.fluent, false);
  assert.deepEqual(data.heatmap, {});
  assert.equal(data.boardId, 'corne-v4');
});

test('saveResult updates bests and timesPlayed, keeps higher bests', () => {
  const s = store();
  s.load();
  s.saveResult('s1', 40, 95);
  const { data } = s.saveResult('s1', 30, 80);
  assert.equal(data.stages.s1.bestWpm, 40);
  assert.equal(data.stages.s1.bestAccuracy, 95);
  assert.equal(data.stages.s1.timesPlayed, 2);
});

test('accuracy >= 90 unlocks the next stage', () => {
  const s = store();
  s.load();
  const { data, unlockedNext } = s.saveResult('s1', 40, 90);
  assert.equal(unlockedNext, true);
  assert.equal(data.stages.s2.unlocked, true);
  assert.equal(data.stages.s3.unlocked, false);
});

test('practice mode does not unlock next stage', () => {
  const s = store();
  s.load();
  const { unlockedNext, data } = s.saveResult('s1', 50, 99, {}, { practice: true });
  assert.equal(unlockedNext, false);
  assert.equal(data.stages.s2.unlocked, false);
  assert.equal(data.stages.s1.timesPlayed, 1);
});

test('fluent badge requires both accuracy and wpm thresholds', () => {
  const s = store();
  s.load();
  assert.equal(s.saveResult('s1', 20, 95).data.stages.s1.fluent, false);
  const { fluentNow, data } = s.saveResult('s1', 30, 95);
  assert.equal(fluentNow, true);
  assert.equal(data.stages.s1.fluent, true);
});

test('mistakes accumulate into heatmap', () => {
  const s = store();
  s.load();
  s.saveResult('s1', 10, 80, { a: 2, b: 1 });
  s.saveResult('s1', 10, 80, { a: 1, c: 4 });
  const misses = s.topMisses(5);
  assert.deepEqual(misses[0], ['c', 4]);
  assert.deepEqual(misses.find(([ch]) => ch === 'a'), ['a', 3]);
});

test('accuracy < 90 does not unlock; re-clearing reports unlockedNext=false', () => {
  const s = store();
  s.load();
  assert.equal(s.saveResult('s1', 40, 89.9).unlockedNext, false);
  s.saveResult('s1', 40, 95);
  assert.equal(s.saveResult('s1', 40, 95).unlockedNext, false);
});

test('last stage clearing never throws', () => {
  const s = store();
  s.load();
  assert.doesNotThrow(() => s.saveResult('s3', 40, 99));
});

test('corrupted JSON starts fresh instead of crashing', () => {
  const s = store(fakeBacking({ [STORE_KEY]: '{not json' }));
  const data = s.load();
  assert.equal(data.stages.s1.unlocked, true);
});

test('progress persists across createStorage instances sharing a backing', () => {
  const backing = fakeBacking();
  createStorage(IDS, backing, { defaultBoardId: 'corne-v4' }).saveResult('s1', 33, 92);
  const data = createStorage(IDS, backing, { defaultBoardId: 'corne-v4' }).load();
  assert.equal(data.stages.s1.bestWpm, 33);
  assert.equal(data.stages.s2.unlocked, true);
});

test('reset wipes progress for the active board only', () => {
  const backing = fakeBacking();
  const s = createStorage(IDS, backing, { defaultBoardId: 'corne-v4' });
  s.saveResult('s1', 40, 95, { x: 3 }, { boardId: 'corne-v4' });
  s.setActiveBoard('other-board');
  s.saveResult('s1', 10, 100, {}, { boardId: 'other-board' });
  s.reset('corne-v4');
  assert.equal(s.load('corne-v4').stages.s1.bestWpm, 0);
  assert.equal(s.load('other-board').stages.s1.bestWpm, 10);
});

test('migrates shifted-symbols → symbol-layer and cascades unlocks for inserted stages', () => {
  const ids = ['home-row', 'left-hand', 'symbol-layer', 'mixed'];
  const legacy = {
    stages: {
      'home-row': { unlocked: true, bestWpm: 40, bestAccuracy: 95, timesPlayed: 2 },
      'shifted-symbols': { unlocked: true, bestWpm: 30, bestAccuracy: 92, timesPlayed: 1 },
      mixed: { unlocked: true, bestWpm: 25, bestAccuracy: 90, timesPlayed: 1 },
    },
  };
  const backing = fakeBacking({ [STORE_KEY]: JSON.stringify(legacy) });
  const data = createStorage(ids, backing, { defaultBoardId: 'corne-v4' }).load();
  assert.ok(data.stages['symbol-layer']);
  assert.equal(data.stages['symbol-layer'].bestWpm, 30);
  assert.equal(data.stages['shifted-symbols'], undefined);
  assert.equal(data.stages['left-hand'].unlocked, true);
  assert.equal(data.stages.mixed.unlocked, true);
  assert.equal(data.boardId, 'corne-v4');
});

test('load does not rewrite when store is already current', () => {
  const backing = fakeBacking();
  const s = store(backing);
  s.load();
  const afterFirst = backing._m.get(STORE_KEY);
  let writes = 0;
  const orig = backing.setItem.bind(backing);
  backing.setItem = (k, v) => { writes += 1; orig(k, v); };
  s.load();
  assert.equal(writes, 0);
  assert.equal(backing._m.get(STORE_KEY), afterFirst);
});

test('progress is isolated per board id', () => {
  const s = store();
  s.saveResult('s1', 50, 99, {}, { boardId: 'corne-v4' });
  s.setActiveBoard('future-board');
  assert.equal(s.load('future-board').stages.s1.bestWpm, 0);
  assert.equal(s.load('corne-v4').stages.s1.bestWpm, 50);
  assert.equal(s.getActiveBoardId(), 'future-board');
});

test('v3 root shape is written on first load', () => {
  const backing = fakeBacking();
  store(backing).load();
  const root = JSON.parse(backing._m.get(STORE_KEY));
  assert.equal(root.version, 3);
  assert.equal(root.activeBoardId, 'corne-v4');
  assert.ok(root.boards['corne-v4'].stages.s1);
});
