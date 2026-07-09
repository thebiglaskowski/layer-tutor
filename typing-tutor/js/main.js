// App bootstrap and game orchestration.

import { STAGES, buildRound } from './lessons.js';
import { charToKey } from './keyboardLayout.js';
import { createGame, currentItem, currentChar, handleKey, stats } from './gameEngine.js';
import { createStorage, PASS_ACCURACY } from './storage.js';
import { renderKeyboard, highlightTarget } from './keyboardRenderer.js';
import * as ui from './ui.js';

const storage = createStorage(STAGES.map((s) => s.id));
let progress = storage.load();
let stage = null;
let game = null;
let tickTimer = null;

const ARROWS = { ArrowLeft: '←', ArrowDown: '↓', ArrowUp: '↑', ArrowRight: '→' };

function goMenu() {
  stopTick();
  game = null;
  ui.renderMenu(progress, startStage);
  ui.showScreen('screen-menu');
}

function startStage(s) {
  stage = s;
  game = createGame(buildRound(s));
  document.getElementById('game-stage-name').textContent = s.name;
  document.getElementById('layer-hint').textContent = s.layerHint;
  ui.showScreen('screen-game');
  renderKeyboard(document.getElementById('keyboard'));
  refresh();
  startTick();
}

function refresh() {
  const item = currentItem(game);
  if (item == null) return;
  ui.renderPrompt(item, game.cursor);
  highlightTarget(charToKey(currentChar(game)));
  ui.renderLiveStats(stats(game), `${game.itemIndex + 1}/${game.items.length}`);
}

function startTick() {
  tickTimer = setInterval(() => {
    if (game && !game.done && game.startTime !== null) {
      ui.renderLiveStats(stats(game), `${game.itemIndex + 1}/${game.items.length}`);
    }
  }, 1000);
}

function stopTick() {
  clearInterval(tickTimer);
}

function finishStage() {
  stopTick();
  const s = stats(game);
  const { data } = storage.saveResult(stage.id, s.wpm, s.accuracy);
  progress = data;
  const idx = STAGES.indexOf(stage);
  const passed = s.accuracy >= PASS_ACCURACY;
  const hasNext = idx + 1 < STAGES.length && progress.stages[STAGES[idx + 1].id].unlocked;
  ui.renderResults(stage, s, game.mistakes, passed, hasNext);
  ui.showScreen('screen-results');
}

document.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (!game || game.done) return;
  if (document.getElementById('screen-game').classList.contains('hidden')) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const ch = ARROWS[e.key] ?? (e.key.length === 1 ? e.key : null);
  if (ch === null) return;
  e.preventDefault();
  const result = handleKey(game, ch, Date.now());
  if (result === 'error') {
    ui.flashError();
    return;
  }
  if (result === 'done') {
    finishStage();
    return;
  }
  refresh();
});

// Reset is two-click: first click arms it for 3 seconds, second click wipes.
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
    progress = storage.reset();
    ui.renderMenu(progress, startStage);
  } else {
    resetBtn.textContent = 'Click again to wipe all progress';
    resetBtn.classList.add('armed');
    resetArmed = setTimeout(disarmReset, 3000);
  }
});

document.getElementById('btn-quit').addEventListener('click', goMenu);
document.getElementById('btn-menu').addEventListener('click', goMenu);
document.getElementById('btn-retry').addEventListener('click', () => startStage(stage));
document.getElementById('btn-next').addEventListener('click', () => {
  startStage(STAGES[STAGES.indexOf(stage) + 1]);
});

goMenu();
