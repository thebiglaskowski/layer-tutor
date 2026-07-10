// Compatibility facade over the active/default board.
// Prefer importing from ./boards/index.js when you need multi-board awareness.
//
// Default exports always resolve to the Corne V4 board so existing tests and
// the layout-check script keep working without a DOM/session.

import { board as corneV4 } from './boards/corne-v4.js';
import {
  BOARDS,
  DEFAULT_BOARD_ID,
  getBoard,
  listBoards,
  listPlayableBoards,
  boardLabel,
  boardFullLabel,
} from './boards/index.js';

export {
  BOARDS,
  DEFAULT_BOARD_ID,
  getBoard,
  listBoards,
  listPlayableBoards,
  boardLabel,
  boardFullLabel,
};

/** Currently documented primary board. */
export const PRIMARY_BOARD = corneV4;

export const KEYS = corneV4.KEYS;
export const LAYER_HOLD = corneV4.LAYER_HOLD;
export const SHIFT_KEYS = corneV4.SHIFT_KEYS;
export const SHIFT_KEY = corneV4.SHIFT_KEY;

export function charToKey(ch) {
  return corneV4.charToKey(ch);
}

export function shiftKeysFor(target) {
  return corneV4.shiftKeysFor(target);
}

export function assertUniqueCharMap() {
  return corneV4.assertUniqueCharMap();
}

export function layoutSnapshot() {
  return corneV4.KEYS.map((k) => ({
    id: k.id,
    half: k.half,
    row: k.row,
    col: k.col,
    legends: { ...k.legends },
  }));
}
