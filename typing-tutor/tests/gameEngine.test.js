import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, currentItem, currentChar, handleKey, stats } from '../js/gameEngine.js';

test('typing correct chars advances cursor, then items', () => {
  const g = createGame(['ab', 'c']);
  assert.equal(currentChar(g), 'a');
  assert.equal(handleKey(g, 'a', 0), 'correct');
  assert.equal(currentChar(g), 'b');
  assert.equal(handleKey(g, 'b', 100), 'correct');
  assert.equal(currentItem(g), 'c');
  assert.equal(g.cursor, 0);
});

test('wrong key counts an error, records the mistake, cursor stays', () => {
  const g = createGame(['ab']);
  assert.equal(handleKey(g, 'x', 0), 'error');
  assert.equal(g.errors, 1);
  assert.deepEqual(g.mistakes, { a: 1 });
  assert.equal(currentChar(g), 'a');
  assert.equal(handleKey(g, 'a', 100), 'correct');
});

test('completing all items sets done and endTime; further keys ignored', () => {
  const g = createGame(['a']);
  assert.equal(handleKey(g, 'a', 500), 'done');
  assert.equal(g.done, true);
  assert.equal(g.endTime, 500);
  assert.equal(handleKey(g, 'a', 600), 'ignored');
});

test('startTime is set on the first keystroke, even a wrong one', () => {
  const g = createGame(['a']);
  assert.equal(g.startTime, null);
  handleKey(g, 'x', 1000);
  assert.equal(g.startTime, 1000);
});

test('wpm and accuracy math', () => {
  const g = createGame(['abcde', 'fghij']);
  const chars = 'abcdefghij';
  let result;
  for (let i = 0; i < chars.length; i++) {
    result = handleKey(g, chars[i], i === 0 ? 0 : i === 9 ? 120000 : 1000);
  }
  assert.equal(result, 'done');
  // 10 correct chars = 2 "words" over exactly 2 minutes = 1 wpm
  assert.deepEqual(stats(g), { wpm: 1, accuracy: 100 });
});

test('accuracy counts errors', () => {
  const g = createGame(['ab']);
  handleKey(g, 'x', 0);      // error
  handleKey(g, 'a', 100);
  handleKey(g, 'b', 60000);  // done at 1 minute
  const s = stats(g);
  assert.equal(s.accuracy, 66.7); // 2 correct / 3 keystrokes
});

test('stats before first keystroke are zero-safe', () => {
  const g = createGame(['ab']);
  assert.deepEqual(stats(g, 5000), { wpm: 0, accuracy: 100 });
});
