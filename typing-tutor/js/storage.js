// The only module that touches localStorage. A backing store with
// getItem/setItem is injectable so tests can run in Node.

const STORE_KEY = 'qmk-typing-tutor-v1';

export const PASS_ACCURACY = 90;

export function createStorage(stageIds, backing = globalThis.localStorage) {
  function read() {
    try {
      const raw = backing.getItem(STORE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // corrupted store → start fresh
    }
    return { stages: {} };
  }

  function write(data) {
    backing.setItem(STORE_KEY, JSON.stringify(data));
  }

  function load() {
    const data = read();
    stageIds.forEach((id, i) => {
      data.stages[id] ??= { unlocked: i === 0, bestWpm: 0, bestAccuracy: 0, timesPlayed: 0 };
    });
    write(data);
    return data;
  }

  function saveResult(stageId, wpm, accuracy) {
    const data = load();
    const s = data.stages[stageId];
    s.timesPlayed += 1;
    s.bestWpm = Math.max(s.bestWpm, wpm);
    s.bestAccuracy = Math.max(s.bestAccuracy, accuracy);
    let unlockedNext = false;
    const idx = stageIds.indexOf(stageId);
    if (accuracy >= PASS_ACCURACY && idx >= 0 && idx + 1 < stageIds.length) {
      const next = data.stages[stageIds[idx + 1]];
      if (!next.unlocked) {
        next.unlocked = true;
        unlockedNext = true;
      }
    }
    write(data);
    return { data, unlockedNext };
  }

  return { load, saveResult };
}
