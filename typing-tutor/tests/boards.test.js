import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BOARDS,
  DEFAULT_BOARD_ID,
  getBoard,
  listPlayableBoards,
  boardFullLabel,
  boardLabel,
} from '../js/boards/index.js';
import { PRIMARY_BOARD, KEYS, charToKey } from '../js/keyboardLayout.js';

test('default / primary board is Corne V4', () => {
  assert.equal(DEFAULT_BOARD_ID, 'corne-v4');
  assert.equal(PRIMARY_BOARD.id, 'corne-v4');
  assert.match(PRIMARY_BOARD.productName, /CORNE V4/i);
  assert.match(PRIMARY_BOARD.formFactor, /3×6|3x6/i);
  assert.match(PRIMARY_BOARD.formFactor, /ortho/i);
});

test('board labels include product identity for sharing', () => {
  const b = getBoard('corne-v4');
  assert.match(boardLabel(b), /Corne V4/);
  assert.match(boardFullLabel(b), /CORNE V4 Wired Split Mechanical Keyboard/);
  assert.match(boardFullLabel(b), /40%/);
});

test('registry has at least the Corne and all playable boards resolve', () => {
  assert.ok(BOARDS.length >= 1);
  assert.ok(listPlayableBoards().every((b) => b.id && b.KEYS?.length));
  assert.equal(getBoard('missing-id').id, DEFAULT_BOARD_ID);
});

test('keyboardLayout facade matches the Corne board matrix', () => {
  assert.equal(KEYS.length, PRIMARY_BOARD.KEYS.length);
  assert.deepEqual(charToKey('a'), PRIMARY_BOARD.charToKey('a'));
  assert.equal(PRIMARY_BOARD.vilPath, 'layouts/corne-v4.vil');
  assert.equal(PRIMARY_BOARD.geometry, 'corne-3x6');
});

test('Corne CHAR_MAP is unique and maps hold layers', () => {
  assert.equal(PRIMARY_BOARD.assertUniqueCharMap(), true);
  assert.equal(PRIMARY_BOARD.LAYER_HOLD[1], 'L34');
  assert.equal(PRIMARY_BOARD.LAYER_HOLD[2], 'R34');
});
