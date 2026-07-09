// TEMPORARY demo of the keyboard renderer — replaced by the real app in the
// next task. Cycles a few targets so every highlight state is visible.
import { renderKeyboard, highlightTarget } from './keyboardRenderer.js';
import { charToKey } from './keyboardLayout.js';

document.getElementById('screen-menu').classList.add('hidden');
document.getElementById('screen-game').classList.remove('hidden');
document.getElementById('game-stage-name').textContent = 'Renderer demo';
renderKeyboard(document.getElementById('keyboard'));

const demo = ['f', 'J', '7', '←', '{', ' '];
let i = 0;
setInterval(() => {
  const ch = demo[i % demo.length];
  document.getElementById('prompt').textContent = `target: ${ch === ' ' ? 'space' : ch}`;
  highlightTarget(charToKey(ch));
  i += 1;
}, 1500);
