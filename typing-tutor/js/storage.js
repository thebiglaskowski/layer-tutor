// The only module that touches localStorage. A backing store with
// getItem/setItem is injectable so tests can run in Node.
//
// Schema version 3: multi-board progress.
// {
//   version: 3,
//   activeBoardId: 'corne-v4',
//   boards: {
//     'corne-v4': { stages: {...}, heatmap: {...} }
//   }
// }
//
// v1/v2 flat { stages, heatmap } migrate into boards[defaultBoardId].

export const STORE_KEY = 'qmk-typing-tutor-v1';
export const SCHEMA_VERSION = 3;

/** Accuracy required to unlock the next stage. */
export const PASS_ACCURACY = 90;

/** WPM required (with PASS_ACCURACY) for the fluent badge. */
export const FLUENT_WPM = 25;

/** @deprecated old stage id — migrated on load */
const RENAMES = { 'shifted-symbols': 'symbol-layer' };

function emptyStage(unlocked) {
  return {
    unlocked: !!unlocked,
    bestWpm: 0,
    bestAccuracy: 0,
    timesPlayed: 0,
    fluent: false,
  };
}

function emptyBoardProgress() {
  return { stages: {}, heatmap: {} };
}

function emptyRoot(defaultBoardId) {
  return {
    version: SCHEMA_VERSION,
    activeBoardId: defaultBoardId,
    boards: {},
  };
}

/**
 * @param {string[]} stageIds curriculum order
 * @param {{getItem: Function, setItem: Function}} [backing]
 * @param {{ defaultBoardId?: string }} [opts]
 */
export function createStorage(stageIds, backing = globalThis.localStorage, opts = {}) {
  const defaultBoardId = opts.defaultBoardId || 'corne-v4';

  function readRaw() {
    try {
      const raw = backing.getItem(STORE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // corrupted store → start fresh
    }
    return null;
  }

  function write(root) {
    backing.setItem(STORE_KEY, JSON.stringify(root));
  }

  function migrateBoardProgress(rawBoard) {
    const out = emptyBoardProgress();
    const incoming = {};

    if (rawBoard && typeof rawBoard === 'object') {
      Object.assign(incoming, rawBoard.stages || {});
      for (const [from, to] of Object.entries(RENAMES)) {
        if (incoming[from] && !incoming[to]) {
          incoming[to] = incoming[from];
        }
        delete incoming[from];
      }
      if (rawBoard.heatmap && typeof rawBoard.heatmap === 'object') {
        for (const [ch, n] of Object.entries(rawBoard.heatmap)) {
          if (typeof n === 'number' && n > 0) out.heatmap[ch] = n;
        }
      }
    }

    // Always materialize every known stage — even for a fresh null board.
    for (let i = 0; i < stageIds.length; i++) {
      const id = stageIds[i];
      const prev = incoming[id];
      if (prev && typeof prev === 'object') {
        out.stages[id] = {
          unlocked: !!prev.unlocked,
          bestWpm: Number(prev.bestWpm) || 0,
          bestAccuracy: Number(prev.bestAccuracy) || 0,
          timesPlayed: Number(prev.timesPlayed) || 0,
          fluent: !!prev.fluent || (
            (Number(prev.bestWpm) || 0) >= FLUENT_WPM
            && (Number(prev.bestAccuracy) || 0) >= PASS_ACCURACY
          ),
        };
      } else {
        out.stages[id] = emptyStage(i === 0);
      }
    }

    let maxUnlocked = 0;
    stageIds.forEach((id, i) => {
      const s = out.stages[id];
      if (s.unlocked || s.timesPlayed > 0 || s.bestAccuracy > 0) maxUnlocked = Math.max(maxUnlocked, i);
    });
    for (let i = 0; i <= maxUnlocked; i++) {
      out.stages[stageIds[i]].unlocked = true;
    }
    if (stageIds.length) out.stages[stageIds[0]].unlocked = true;

    return out;
  }

  function migrateRoot(raw) {
    const root = emptyRoot(defaultBoardId);
    if (!raw || typeof raw !== 'object') {
      root.boards[defaultBoardId] = migrateBoardProgress(null);
      return root;
    }

    // v3 multi-board
    if (raw.boards && typeof raw.boards === 'object') {
      root.activeBoardId = typeof raw.activeBoardId === 'string' ? raw.activeBoardId : defaultBoardId;
      for (const [id, bp] of Object.entries(raw.boards)) {
        root.boards[id] = migrateBoardProgress(bp);
      }
      if (!root.boards[root.activeBoardId]) {
        root.boards[root.activeBoardId] = migrateBoardProgress(null);
      }
      // Ensure default exists
      if (!root.boards[defaultBoardId]) {
        root.boards[defaultBoardId] = migrateBoardProgress(null);
      }
      root.version = SCHEMA_VERSION;
      return root;
    }

    // v1/v2 flat → tuck under default board
    root.activeBoardId = defaultBoardId;
    root.boards[defaultBoardId] = migrateBoardProgress(raw);
    root.version = SCHEMA_VERSION;
    return root;
  }

  function loadRoot() {
    const before = readRaw();
    const root = migrateRoot(before);
    if (JSON.stringify(before) !== JSON.stringify(root)) write(root);
    return root;
  }

  function load(boardId = null) {
    const root = loadRoot();
    const id = boardId || root.activeBoardId || defaultBoardId;
    if (!root.boards[id]) {
      root.boards[id] = migrateBoardProgress(null);
      write(root);
    }
    // Return board progress shaped like the old v2 API for callers.
    const bp = root.boards[id];
    return {
      version: SCHEMA_VERSION,
      activeBoardId: root.activeBoardId,
      boardId: id,
      stages: bp.stages,
      heatmap: bp.heatmap,
    };
  }

  function setActiveBoard(boardId) {
    const root = loadRoot();
    root.activeBoardId = boardId;
    if (!root.boards[boardId]) {
      root.boards[boardId] = migrateBoardProgress(null);
    }
    write(root);
    return load(boardId);
  }

  function getActiveBoardId() {
    return loadRoot().activeBoardId || defaultBoardId;
  }

  /**
   * @param {string} stageId
   * @param {number} wpm
   * @param {number} accuracy
   * @param {Record<string, number>} [mistakes]
   * @param {{ practice?: boolean, boardId?: string }} [opts]
   */
  function saveResult(stageId, wpm, accuracy, mistakes = {}, opts = {}) {
    const root = loadRoot();
    const boardId = opts.boardId || root.activeBoardId || defaultBoardId;
    if (!root.boards[boardId]) root.boards[boardId] = migrateBoardProgress(null);
    const bp = root.boards[boardId];
    const s = bp.stages[stageId];
    if (!s) {
      return { data: load(boardId), unlockedNext: false, fluentNow: false };
    }

    s.timesPlayed += 1;
    s.bestWpm = Math.max(s.bestWpm, wpm);
    s.bestAccuracy = Math.max(s.bestAccuracy, accuracy);

    let fluentNow = false;
    if (accuracy >= PASS_ACCURACY && wpm >= FLUENT_WPM) {
      if (!s.fluent) fluentNow = true;
      s.fluent = true;
    }

    for (const [ch, n] of Object.entries(mistakes)) {
      if (typeof n === 'number' && n > 0) {
        bp.heatmap[ch] = (bp.heatmap[ch] ?? 0) + n;
      }
    }

    let unlockedNext = false;
    if (!opts.practice) {
      const idx = stageIds.indexOf(stageId);
      if (accuracy >= PASS_ACCURACY && idx >= 0 && idx + 1 < stageIds.length) {
        const next = bp.stages[stageIds[idx + 1]];
        if (!next.unlocked) {
          next.unlocked = true;
          unlockedNext = true;
        }
      }
    }

    write(root);
    return { data: load(boardId), unlockedNext, fluentNow };
  }

  function reset(boardId = null) {
    const root = loadRoot();
    const id = boardId || root.activeBoardId || defaultBoardId;
    root.boards[id] = migrateBoardProgress(null);
    write(root);
    return load(id);
  }

  function topMisses(limit = 8, boardId = null) {
    const data = load(boardId);
    return Object.entries(data.heatmap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
  }

  return { load, saveResult, reset, topMisses, setActiveBoard, getActiveBoardId, loadRoot };
}
