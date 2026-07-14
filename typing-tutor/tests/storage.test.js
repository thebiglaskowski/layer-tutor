import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStorage, PASS_ACCURACY, FLUENT_WPM, STORE_KEY, SCHEMA_VERSION } from '../js/storage.js';

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
  assert.equal(SCHEMA_VERSION, 4);
});

test('first stage starts unlocked with v4 fields', () => {
  const data = store().load();
  assert.equal(data.stages.s1.unlocked, true);
  assert.equal(data.stages.s2.unlocked, false);
  assert.deepEqual(data.stages.s1.recentRuns, []);
  assert.equal(data.stages.s1.note, '');
  assert.equal(data.streak.count, 0);
  assert.deepEqual(data.keyMetrics, {});
  assert.deepEqual(data.transitionMetrics, {});
  assert.deepEqual(data.sessionRuns, []);
  assert.ok(data.settings);
  assert.equal(data.onboardingDone, false);
});

test('saveResult updates bests, recentRuns, heatmap, streak', () => {
  const s = store();
  s.saveResult('s1', 40, 95, { a: 2 });
  const data = s.load();
  assert.equal(data.stages.s1.bestWpm, 40);
  assert.equal(data.stages.s1.recentRuns.length, 1);
  assert.equal(data.heatmap.a, 2);
  assert.equal(data.streak.count, 1);
  assert.equal(data.stages.s2.unlocked, true);
});

test('practice and adhoc do not unlock', () => {
  const s = store();
  assert.equal(s.saveResult('s1', 50, 99, {}, { practice: true }).unlockedNext, false);
  assert.equal(s.load().stages.s2.unlocked, false);
  s.saveResult(null, 10, 50, { x: 1 }, { weakKeys: true });
  assert.equal(s.load().heatmap.x, 1);
  assert.equal(s.load().stages.s1.timesPlayed, 1); // only practice run counted
});

test('fluent badge, notes, goals, settings', () => {
  const s = store();
  s.load();
  assert.equal(s.saveResult('s1', 20, 95).data.stages.s1.fluent, false);
  assert.equal(s.saveResult('s1', 30, 95).fluentNow, true);
  let data = s.setStageNote('s1', 'thumb high');
  assert.equal(data.stages.s1.note, 'thumb high');
  data = s.setWpmGoal('s1', 45);
  assert.equal(data.stages.s1.wpmGoal, 45);
  data = s.updateSettings({ focusMode: false });
  assert.equal(data.settings.focusMode, false);
  assert.equal(data.settings.soundEnabled, true);
  data = s.updateSettings({ soundEnabled: false });
  assert.equal(data.settings.soundEnabled, false);
  data = s.setOnboardingDone(true);
  assert.equal(data.onboardingDone, true);
});

test('does not combine speed and accuracy records from separate runs for fluent', () => {
  const s = store();
  assert.equal(s.saveResult('s1', 40, 80).data.stages.s1.fluent, false);
  const result = s.saveResult('s1', 20, 95);
  assert.equal(result.fluentNow, false);
  assert.equal(result.data.stages.s1.fluent, false);
});

test('aggregates adaptive key, transition, and session metrics', () => {
  const s = store();
  const metrics = {
    keyMetrics: {
      a: { attempts: 3, correct: 2, errors: 1, totalLatencyMs: 800, samples: 2 },
    },
    transitionMetrics: {
      'enter-layer-1': { count: 2, totalLatencyMs: 900 },
    },
    avgLatencyMs: 400,
  };
  s.saveResult('s1', 30, 90, { a: 1 }, { metrics });
  s.saveResult(null, 20, 80, {}, { metrics, weakKeys: true });
  const data = s.load();
  assert.equal(data.keyMetrics.a.attempts, 6);
  assert.equal(data.keyMetrics.a.errors, 2);
  assert.equal(data.transitionMetrics['enter-layer-1'].count, 4);
  assert.equal(data.sessionRuns.length, 2);
  assert.equal(data.sessionRuns[0].avgLatencyMs, 400);
});

test('custom lists and export/import', () => {
  const s = store();
  s.saveCustomList({ name: 'emails', items: ['a@b.com', 'hi'] });
  let data = s.load();
  assert.equal(data.customLists.length, 1);
  assert.equal(data.customLists[0].items.length, 2);
  const json = s.exportAll();
  const s2 = store(fakeBacking());
  data = s2.importAll(json);
  assert.equal(data.customLists[0].name, 'emails');
  data = s.deleteCustomList(data.customLists[0].id);
  // delete on s not s2
  assert.equal(s.load().customLists.length, 0);
});

test('corrupted JSON starts fresh', () => {
  const data = store(fakeBacking({ [STORE_KEY]: '{nope' })).load();
  assert.equal(data.stages.s1.unlocked, true);
});

test('migrates the legacy sound preference into board settings', () => {
  const data = store(fakeBacking({ 'qmk-typing-tutor-sound': '0' })).load();
  assert.equal(data.settings.soundEnabled, false);
});

test('load does not rewrite when current', () => {
  const backing = fakeBacking();
  const s = store(backing);
  s.load();
  const after = backing._m.get(STORE_KEY);
  let writes = 0;
  const orig = backing.setItem.bind(backing);
  backing.setItem = (k, v) => { writes += 1; orig(k, v); };
  s.load();
  assert.equal(writes, 0);
  assert.equal(backing._m.get(STORE_KEY), after);
});

test('migrates flat v2 and multi-board v3', () => {
  const flat = {
    stages: { s1: { unlocked: true, bestWpm: 10, bestAccuracy: 91, timesPlayed: 1 } },
    heatmap: { z: 2 },
  };
  const data = createStorage(IDS, fakeBacking({ [STORE_KEY]: JSON.stringify(flat) }), { defaultBoardId: 'corne-v4' }).load();
  assert.equal(data.heatmap.z, 2);
  assert.equal(data.stages.s1.bestWpm, 10);
  assert.ok(Array.isArray(data.stages.s1.recentRuns));
});
