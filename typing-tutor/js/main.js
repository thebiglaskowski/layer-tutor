// App bootstrap and game orchestration.

import { STAGES, buildRound, practiceRoundSize, PASS_ACCURACY } from './lessons.js';
import {
  getBoard,
  listPlayableBoards,
  DEFAULT_BOARD_ID,
  boardFullLabel,
} from './boards/index.js';
import { createGame, currentItem, currentChar, handleKey, stats } from './gameEngine.js';
import { createStorage } from './storage.js';
import { renderKeyboard } from './keyboardRenderer.js';
import * as sound from './sound.js';
import * as ui from './ui.js';

const storage = createStorage(STAGES.map((s) => s.id), globalThis.localStorage, {
  defaultBoardId: DEFAULT_BOARD_ID,
});

let activeBoard = getBoard(storage.getActiveBoardId());
let progress = storage.load(activeBoard.id);
let stage = null;
let game = null;
let practice = false;
let tickTimer = null;
let kb = null;
let paused = false;
let pauseStartedAt = null;
let pausedAccumMs = 0;

const ARROWS = { ArrowLeft: '←', ArrowDown: '↓', ArrowUp: '↑', ArrowRight: '→' };

sound.initSoundFromStorage();

function now() {
  return Date.now() - pausedAccumMs;
}

function goMenu() {
  stopTick();
  setPaused(false);
  game = null;
  practice = false;
  stage = null;
  kb?.destroy();
  kb = null;
  ui.renderMenu(progress, startStage, storage.topMisses(10, activeBoard.id), {
    boards: listPlayableBoards(),
    activeBoard,
    onBoardChange: switchBoard,
  });
  ui.showScreen('screen-menu');
  syncSoundToggle();
}

function switchBoard(boardId) {
  if (boardId === activeBoard.id) return;
  activeBoard = getBoard(boardId);
  progress = storage.setActiveBoard(activeBoard.id);
  ui.announce(`Board: ${boardFullLabel(activeBoard)}`);
  goMenu();
}

function startStage(s, opts = {}) {
  stage = s;
  practice = !!opts.practice;
  pausedAccumMs = 0;
  pauseStartedAt = null;
  paused = false;
  ui.setPaused(false);

  const count = practice ? practiceRoundSize(s) : s.roundSize;
  game = createGame(buildRound(s, Math.random, count));

  const nameEl = document.getElementById('game-stage-name');
  nameEl.textContent = practice ? `${s.name} · practice` : s.name;
  document.getElementById('layer-hint').textContent = s.layerHint;
  document.getElementById('coach-tip').textContent = s.coachTip;
  const boardChip = document.getElementById('game-board-label');
  if (boardChip) boardChip.textContent = activeBoard.name;

  ui.showScreen('screen-game');
  kb?.destroy();
  kb = renderKeyboard(document.getElementById('keyboard'), activeBoard);
  refresh();
  startTick();
  ui.announce(practice
    ? `Practice mode on ${activeBoard.name}: ${s.name}. ${s.coachTip}`
    : `Starting ${s.name} on ${activeBoard.name}. ${s.coachTip}`);
}

function refresh() {
  const item = currentItem(game);
  if (item == null) return;
  ui.renderPrompt(item, game.cursor);
  kb?.highlightTarget(activeBoard.charToKey(currentChar(game)));
  const label = practice ? `practice ${game.itemIndex + 1}/${game.items.length}` : `${game.itemIndex + 1}/${game.items.length}`;
  ui.renderLiveStats(stats(game, now()), label);
}

function startTick() {
  stopTick();
  tickTimer = setInterval(() => {
    if (game && !game.done && !paused && game.startTime !== null) {
      const label = practice ? `practice ${game.itemIndex + 1}/${game.items.length}` : `${game.itemIndex + 1}/${game.items.length}`;
      ui.renderLiveStats(stats(game, now()), label);
    }
  }, 1000);
}

function stopTick() {
  if (tickTimer != null) {
    clearInterval(tickTimer);
    tickTimer = null;
  }
}

function setPaused(on) {
  if (on === paused) return;
  if (on) {
    if (!game || game.done) return;
    paused = true;
    pauseStartedAt = Date.now();
    ui.setPaused(true);
    ui.announce('Paused. Press Escape or click Resume.');
  } else {
    if (pauseStartedAt != null) {
      pausedAccumMs += Date.now() - pauseStartedAt;
      pauseStartedAt = null;
    }
    paused = false;
    ui.setPaused(false);
  }
}

function finishStage() {
  stopTick();
  setPaused(false);
  sound.playDone();
  const s = stats(game, now());
  const { data, fluentNow } = storage.saveResult(
    stage.id,
    s.wpm,
    s.accuracy,
    game.mistakes,
    { practice, boardId: activeBoard.id },
  );
  progress = data;
  const idx = STAGES.indexOf(stage);
  const passed = s.accuracy >= PASS_ACCURACY;
  const hasNext = idx + 1 < STAGES.length && progress.stages[STAGES[idx + 1].id].unlocked;
  const fluent = progress.stages[stage.id]?.fluent;
  ui.renderResults(stage, s, game.mistakes, {
    passed,
    hasNext,
    practice,
    fluent,
    fluentNow,
    boardName: activeBoard.name,
  });
  ui.showScreen('screen-results');
  ui.announce(passed
    ? `Stage complete. ${s.wpm} words per minute, ${s.accuracy} percent accuracy.`
    : `Stage finished below unlock threshold. ${s.accuracy} percent accuracy.`);
}

function isGameScreen() {
  return !document.getElementById('screen-game').classList.contains('hidden');
}

/** Normalize a keydown into a single typed character, or null if not typable. */
function keyToChar(e) {
  if (ARROWS[e.key]) return ARROWS[e.key];
  // Space: some hosts report key=" " , others only code="Space" / key="Spacebar".
  // Also never treat Space as a button-activate when we're in a stage.
  if (e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar') return ' ';
  if (e.key.length === 1) return e.key;
  return null;
}

function isTypingCapture(e) {
  if (!game || game.done || paused || !isGameScreen()) return false;
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  return keyToChar(e) !== null;
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && isGameScreen() && game && !game.done) {
    e.preventDefault();
    setPaused(!paused);
    return;
  }

  if (paused) return;
  if (e.repeat) return;
  if (!game || game.done) return;
  if (!isGameScreen()) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  const ch = keyToChar(e);
  if (ch === null) return;

  // Always claim the event so focused buttons (Menu) don't eat Space/Enter.
  e.preventDefault();
  e.stopPropagation();
  ui.focusTypingSurface();

  const result = handleKey(game, ch, now());
  if (result === 'error') {
    sound.playError();
    ui.flashError();
    ui.renderLiveStats(stats(game, now()), practice
      ? `practice ${game.itemIndex + 1}/${game.items.length}`
      : `${game.itemIndex + 1}/${game.items.length}`);
    return;
  }
  if (result === 'done') {
    finishStage();
    return;
  }
  sound.playCorrect();
  refresh();
});

// Space/Enter activate buttons on keyup in HTML — block that while typing.
document.addEventListener('keyup', (e) => {
  if (!isTypingCapture(e)) return;
  if (e.code === 'Space' || e.key === ' ' || e.key === 'Enter' || e.code === 'Enter') {
    e.preventDefault();
    e.stopPropagation();
  }
});

window.addEventListener('blur', () => {
  if (game && !game.done && isGameScreen()) setPaused(true);
});

const resetBtn = document.getElementById('btn-reset');
let resetArmed = null;

function disarmReset() {
  clearTimeout(resetArmed);
  resetArmed = null;
  resetBtn.textContent = 'Reset progress';
  resetBtn.classList.remove('armed');
}

resetBtn.addEventListener('click', () => {
  if (resetArmed) {
    disarmReset();
    progress = storage.reset(activeBoard.id);
    goMenu();
    ui.announce(`Progress reset for ${activeBoard.name}.`);
  } else {
    resetBtn.textContent = `Click again to wipe ${activeBoard.name} progress`;
    resetBtn.classList.add('armed');
    resetArmed = setTimeout(disarmReset, 3000);
  }
});

function syncSoundToggle() {
  const btn = document.getElementById('btn-sound');
  if (!btn) return;
  const on = sound.isSoundEnabled();
  btn.textContent = on ? 'Sound: on' : 'Sound: off';
  btn.setAttribute('aria-pressed', on ? 'true' : 'false');
}

document.getElementById('btn-sound')?.addEventListener('click', () => {
  sound.setSoundEnabled(!sound.isSoundEnabled());
  syncSoundToggle();
});

document.getElementById('btn-quit').addEventListener('click', goMenu);
document.getElementById('btn-menu').addEventListener('click', goMenu);
document.getElementById('btn-retry').addEventListener('click', () => startStage(stage, { practice }));
document.getElementById('btn-next').addEventListener('click', () => {
  startStage(STAGES[STAGES.indexOf(stage) + 1], { practice: false });
});
document.getElementById('btn-resume')?.addEventListener('click', () => setPaused(false));

goMenu();
