import { test } from 'node:test';
import assert from 'node:assert/strict';
import { charToKey, KEYS, LAYER_HOLD, SHIFT_KEY } from '../js/keyboardLayout.js';

test('base-layer letters map to layer 0 without shift', () => {
  assert.deepEqual(charToKey('a'), { keyId: 'L11', layer: 0, shift: false });
  assert.deepEqual(charToKey('y'), { keyId: 'R01', layer: 0, shift: false });
  assert.deepEqual(charToKey('b'), { keyId: 'L25', layer: 0, shift: false });
});

test('uppercase letters need shift', () => {
  assert.deepEqual(charToKey('A'), { keyId: 'L11', layer: 0, shift: true });
  assert.deepEqual(charToKey('T'), { keyId: 'L05', layer: 0, shift: true });
});

test('digits live on layer 1', () => {
  assert.deepEqual(charToKey('1'), { keyId: 'L01', layer: 1, shift: false });
  assert.deepEqual(charToKey('5'), { keyId: 'L05', layer: 1, shift: false });
  assert.deepEqual(charToKey('6'), { keyId: 'R01', layer: 1, shift: false });
  assert.deepEqual(charToKey('0'), { keyId: 'R05', layer: 1, shift: false });
});

test('arrows live on layer 1 hjkl keys (vim-style)', () => {
  assert.deepEqual(charToKey('←'), { keyId: 'R11', layer: 1, shift: false });
  assert.deepEqual(charToKey('↓'), { keyId: 'R12', layer: 1, shift: false });
  assert.deepEqual(charToKey('↑'), { keyId: 'R13', layer: 1, shift: false });
  assert.deepEqual(charToKey('→'), { keyId: 'R14', layer: 1, shift: false });
});

test('shifted symbols live on layer 2', () => {
  assert.deepEqual(charToKey('!'), { keyId: 'L01', layer: 2, shift: false });
  assert.deepEqual(charToKey('%'), { keyId: 'L05', layer: 2, shift: false });
  assert.deepEqual(charToKey('^'), { keyId: 'R01', layer: 2, shift: false });
  assert.deepEqual(charToKey(')'), { keyId: 'R05', layer: 2, shift: false });
});

test('brackets and punctuation live on layer 2', () => {
  assert.deepEqual(charToKey('-'), { keyId: 'R11', layer: 2, shift: false });
  assert.deepEqual(charToKey('['), { keyId: 'R13', layer: 2, shift: false });
  assert.deepEqual(charToKey('`'), { keyId: 'R16', layer: 2, shift: false });
  assert.deepEqual(charToKey('{'), { keyId: 'R22', layer: 2, shift: false });
  assert.deepEqual(charToKey('~'), { keyId: 'R25', layer: 2, shift: false });
  assert.deepEqual(charToKey('\\'), { keyId: 'R15', layer: 2, shift: false });
});

test('layer-0 punctuation, plain and shifted', () => {
  assert.deepEqual(charToKey(';'), { keyId: 'R15', layer: 0, shift: false });
  assert.deepEqual(charToKey(':'), { keyId: 'R15', layer: 0, shift: true });
  assert.deepEqual(charToKey("'"), { keyId: 'R16', layer: 0, shift: false });
  assert.deepEqual(charToKey('"'), { keyId: 'R16', layer: 0, shift: true });
  assert.deepEqual(charToKey('?'), { keyId: 'R24', layer: 0, shift: true });
});

test('space maps to the left thumb space key', () => {
  assert.deepEqual(charToKey(' '), { keyId: 'L35', layer: 0, shift: false });
});

test('unmappable characters return null', () => {
  assert.equal(charToKey('€'), null);
  assert.equal(charToKey('\t'), null);
});

test('layer hold keys and shift key exist in KEYS', () => {
  for (const id of [...Object.values(LAYER_HOLD), SHIFT_KEY]) {
    assert.ok(KEYS.some((k) => k.id === id), `missing key ${id}`);
  }
});

test('KEYS has 46 keys (23 per half)', () => {
  assert.equal(KEYS.length, 46);
  assert.equal(KEYS.filter((k) => k.half === 'L').length, 23);
});
