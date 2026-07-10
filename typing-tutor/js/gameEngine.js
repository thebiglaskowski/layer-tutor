// Pure typing state machine. No DOM, no timers — callers pass timestamps in.
//
// WPM timing starts on the first *correct* keystroke so early fumbles do not
// zero out the clock before the learner has begun the line. Errors before
// that still count toward accuracy and the mistake map.

export function createGame(items) {
  return {
    items,
    itemIndex: 0,
    cursor: 0,
    correct: 0,
    errors: 0,
    startTime: null,
    endTime: null,
    mistakes: {},
    done: false,
  };
}

export function currentItem(game) {
  return game.done ? null : game.items[game.itemIndex];
}

export function currentChar(game) {
  const item = currentItem(game);
  return item ? item[game.cursor] : null;
}

export function handleKey(game, ch, now) {
  if (game.done) return 'ignored';
  const target = currentChar(game);
  if (ch === target) {
    if (game.startTime === null) game.startTime = now;
    game.correct += 1;
    game.cursor += 1;
    if (game.cursor >= game.items[game.itemIndex].length) {
      game.itemIndex += 1;
      game.cursor = 0;
      if (game.itemIndex >= game.items.length) {
        game.done = true;
        game.endTime = now;
        return 'done';
      }
    }
    return 'correct';
  }
  // Wrong key: count error even before the WPM clock starts.
  game.errors += 1;
  game.mistakes[target] = (game.mistakes[target] ?? 0) + 1;
  return 'error';
}

export function stats(game, now = Date.now()) {
  const end = game.endTime ?? now;
  const elapsedMin = game.startTime === null ? 0 : (end - game.startTime) / 60000;
  const wpm = elapsedMin > 0 ? game.correct / 5 / elapsedMin : 0;
  const total = game.correct + game.errors;
  const accuracy = total > 0 ? (game.correct / total) * 100 : 100;
  return { wpm: Math.round(wpm), accuracy: Math.round(accuracy * 10) / 10 };
}
