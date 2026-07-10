// Optional click feedback via Web Audio API — no asset files, works offline.

let ctx = null;
let enabled = true;

export function setSoundEnabled(on) {
  enabled = !!on;
  try {
    localStorage.setItem('qmk-typing-tutor-sound', enabled ? '1' : '0');
  } catch { /* ignore */ }
}

export function isSoundEnabled() {
  try {
    const v = localStorage.getItem('qmk-typing-tutor-sound');
    if (v === null) return true;
    return v !== '0';
  } catch {
    return true;
  }
}

export function initSoundFromStorage() {
  enabled = isSoundEnabled();
  return enabled;
}

function ac() {
  if (!ctx) {
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function beep(freq, duration, type = 'sine', gain = 0.04) {
  if (!enabled) return;
  const c = ac();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = gain;
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  osc.connect(g);
  g.connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + duration);
}

export function playCorrect() {
  beep(880, 0.04, 'sine', 0.03);
}

export function playError() {
  beep(180, 0.08, 'square', 0.04);
}

export function playDone() {
  beep(660, 0.06, 'sine', 0.04);
  setTimeout(() => beep(880, 0.08, 'sine', 0.04), 70);
}
