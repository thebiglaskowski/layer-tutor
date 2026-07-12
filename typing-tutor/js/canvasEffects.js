// "Signal Trace" canvas effects: the app's one visual signature.
//
// Layer Tutor teaches that a keystroke is a signal traveling a keyboard
// matrix to the controller. This module makes that literal — but motion is
// confined to moments and places where it can't compete with typing focus:
//  - idle screens (menu/results) get a slow, animated circuit-trace field
//  - the game screen gets the same field frozen static and faint; nothing
//    in the background moves while the user is typing
//  - each correct keystroke blooms a small layer-colored glow contained
//    within the key itself (no cross-screen travel); wrong keys get a
//    brief red short-circuit crackle
//
// DOM/canvas access lives here by design, alongside keyboardRenderer.js
// and ui.js. Pure state (traces, sparks) is closed over per module since
// there is only ever one app instance on screen.

const REDUCE_MOTION_CLASS = 'reduce-motion';

let ambientCanvas = null;
let signalCanvas = null;
let ambientCtx = null;
let signalCtx = null;
let dpr = 1;
let traces = [];
let sparks = [];
let rafId = null;
let lastFrame = 0;
let staticAmbient = false; // true on the game screen: background frozen

function reducedMotion() {
  return document.documentElement.classList.contains(REDUCE_MOTION_CLASS);
}

function sizeCanvas(canvas) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { w, h, ctx };
}

const TRACE_HUES = [
  { hue: 189, weight: 0.7 }, // accent cyan — base signal
  { hue: 291, weight: 0.15 }, // shift violet
  { hue: 38, weight: 0.15 }, // hold amber
];

function pickHue() {
  const r = Math.random();
  let acc = 0;
  for (const t of TRACE_HUES) {
    acc += t.weight;
    if (r <= acc) return t.hue;
  }
  return TRACE_HUES[0].hue;
}

/** Build a sparse field of rectilinear PCB-style traces sized to the viewport. */
function generateTraces(w, h) {
  const grid = Math.max(64, Math.round(Math.min(w, h) / 9));
  const count = Math.round((w * h) / (grid * grid * 26));
  const next = [];
  for (let i = 0; i < count; i++) {
    const x0 = Math.round((Math.random() * w) / grid) * grid;
    const y0 = Math.round((Math.random() * h) / grid) * grid;
    const legs = 1 + Math.floor(Math.random() * 2);
    const pts = [[x0, y0]];
    let [x, y] = [x0, y0];
    for (let l = 0; l < legs; l++) {
      const horizontal = Math.random() < 0.5;
      const dist = grid * (1 + Math.floor(Math.random() * 4));
      x = horizontal ? x + (Math.random() < 0.5 ? dist : -dist) : x;
      y = horizontal ? y : y + (Math.random() < 0.5 ? dist : -dist);
      pts.push([x, y]);
    }
    next.push({
      pts,
      hue: pickHue(),
      phase: Math.random(),
      speed: 0.02 + Math.random() * 0.03,
    });
  }
  traces = next;
}

function pathLength(pts) {
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  }
  return total;
}

function pointAt(pts, t) {
  const total = pathLength(pts);
  let target = t * total;
  for (let i = 1; i < pts.length; i++) {
    const segLen = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (target <= segLen || i === pts.length - 1) {
      const frac = segLen ? target / segLen : 0;
      return [
        pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * frac,
        pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * frac,
      ];
    }
    target -= segLen;
  }
  return pts[pts.length - 1];
}

function drawTracePaths(alpha) {
  for (const t of traces) {
    ambientCtx.strokeStyle = `hsl(${t.hue} 70% 55% / ${alpha})`;
    ambientCtx.lineWidth = 1;
    ambientCtx.beginPath();
    ambientCtx.moveTo(t.pts[0][0], t.pts[0][1]);
    for (let i = 1; i < t.pts.length; i++) ambientCtx.lineTo(t.pts[i][0], t.pts[i][1]);
    ambientCtx.stroke();
  }
}

/** One motionless frame: trace paths plus solder-pad dots at their endpoints. */
function drawAmbientStatic(w, h) {
  ambientCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ambientCtx.clearRect(0, 0, w, h);
  drawTracePaths(0.07);
  for (const t of traces) {
    const [px, py] = t.pts[t.pts.length - 1];
    ambientCtx.fillStyle = `hsl(${t.hue} 80% 60% / 0.12)`;
    ambientCtx.beginPath();
    ambientCtx.arc(px, py, 2, 0, Math.PI * 2);
    ambientCtx.fill();
  }
}

function drawAmbient(w, h, dt) {
  ambientCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ambientCtx.fillStyle = 'rgba(5, 6, 12, 0.22)';
  ambientCtx.fillRect(0, 0, w, h);
  drawTracePaths(0.07);

  for (const t of traces) {
    t.phase = (t.phase + t.speed * dt) % 1;
    const [px, py] = pointAt(t.pts, t.phase);
    const grad = ambientCtx.createRadialGradient(px, py, 0, px, py, 8);
    grad.addColorStop(0, `hsl(${t.hue} 100% 70% / 0.6)`);
    grad.addColorStop(1, `hsl(${t.hue} 100% 60% / 0)`);
    ambientCtx.fillStyle = grad;
    ambientCtx.beginPath();
    ambientCtx.arc(px, py, 8, 0, Math.PI * 2);
    ambientCtx.fill();
  }
}

function drawSignal(w, h) {
  signalCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  signalCtx.clearRect(0, 0, w, h);
  signalCtx.globalCompositeOperation = 'lighter';

  sparks = sparks.filter((s) => performance.now() - s.start < s.duration);
  for (const s of sparks) {
    const t = Math.min(1, (performance.now() - s.start) / s.duration);
    const fade = 1 - t;
    if (s.kind === 'bloom') {
      // soft glow bloom contained within the key: a fading center glow plus
      // a thin ring expanding to the key's edge
      const eased = 1 - (1 - t) * (1 - t);
      const glowR = s.r * (0.5 + eased * 0.5);
      const grad = signalCtx.createRadialGradient(s.x, s.y, 0, s.x, s.y, glowR);
      grad.addColorStop(0, `hsl(${s.hue} 100% 72% / ${0.55 * fade})`);
      grad.addColorStop(1, `hsl(${s.hue} 100% 60% / 0)`);
      signalCtx.fillStyle = grad;
      signalCtx.beginPath();
      signalCtx.arc(s.x, s.y, glowR, 0, Math.PI * 2);
      signalCtx.fill();
      signalCtx.strokeStyle = `hsl(${s.hue} 100% 70% / ${0.45 * fade})`;
      signalCtx.lineWidth = 1.5;
      signalCtx.beginPath();
      signalCtx.arc(s.x, s.y, s.r * eased, 0, Math.PI * 2);
      signalCtx.stroke();
    } else {
      // short-circuit crackle: jittery red spikes radiating from the key
      for (const a of s.angles) {
        const len = s.r * (0.5 + t * 0.5);
        const jx = s.x + Math.cos(a) * len + (Math.random() - 0.5) * 4;
        const jy = s.y + Math.sin(a) * len + (Math.random() - 0.5) * 4;
        signalCtx.strokeStyle = `hsl(${s.hue} 100% 60% / ${0.8 * fade})`;
        signalCtx.lineWidth = 1.5;
        signalCtx.beginPath();
        signalCtx.moveTo(s.x, s.y);
        signalCtx.lineTo(jx, jy);
        signalCtx.stroke();
      }
    }
  }
  signalCtx.globalCompositeOperation = 'source-over';
}

function tick(now) {
  if (reducedMotion() || document.hidden) {
    rafId = null;
    return;
  }
  const dt = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 0.016;
  lastFrame = now;
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (!staticAmbient) drawAmbient(w, h, dt);
  drawSignal(w, h);
  if (staticAmbient && sparks.length === 0) {
    // background is frozen and the last spark just cleared — go fully idle
    rafId = null;
    return;
  }
  rafId = requestAnimationFrame(tick);
}

function ensureLoop() {
  if (rafId == null && !reducedMotion() && !document.hidden) {
    lastFrame = 0;
    rafId = requestAnimationFrame(tick);
  }
}

function handleResize() {
  if (!ambientCanvas) return;
  const { w, h, ctx: actx } = sizeCanvas(ambientCanvas);
  ambientCtx = actx;
  const { ctx: sctx } = sizeCanvas(signalCanvas);
  signalCtx = sctx;
  generateTraces(w, h);
  if (staticAmbient || reducedMotion()) drawAmbientStatic(w, h);
}

/** Mount the two effect canvases. Call once at startup. */
export function initEffects() {
  ambientCanvas = document.getElementById('fx-ambient');
  signalCanvas = document.getElementById('fx-signal');
  if (!ambientCanvas || !signalCanvas) return;

  handleResize();
  // reduced-motion users get the static field instead of a blank canvas
  if (reducedMotion()) drawAmbientStatic(window.innerWidth, window.innerHeight);
  window.addEventListener('resize', handleResize);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) ensureLoop();
  });
  window
    .matchMedia('(prefers-reduced-motion: reduce)')
    .addEventListener?.('change', () => ensureLoop());

  ensureLoop();
}

/**
 * Freeze the ambient field into a static faint frame during active typing so
 * nothing moves behind the prompt; let it animate on idle/menu/results screens.
 */
export function setAmbientForScreen(screenId) {
  if (!ambientCanvas) return;
  staticAmbient = screenId === 'screen-game';
  ambientCanvas.style.opacity = staticAmbient ? '0.35' : '0.7';
  if (staticAmbient) {
    drawAmbientStatic(window.innerWidth, window.innerHeight);
  } else {
    ensureLoop();
  }
}

const LAYER_HUE = { 0: 189, 1: 38, 2: 291 };

/** Bloom a layer-colored glow contained within the just-typed key. */
export function signalFromKey(keyInfo, layer = 0) {
  if (!signalCtx || reducedMotion() || !keyInfo?.rect) return;
  const { rect } = keyInfo;
  sparks.push({
    kind: 'bloom',
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
    r: Math.max(rect.width, rect.height) * 0.75,
    hue: LAYER_HUE[layer] ?? LAYER_HUE[0],
    start: performance.now(),
    duration: 280,
  });
  ensureLoop();
}

/** Fire a short-circuit crackle at a mis-hit key. */
export function shortCircuitAtKey(keyInfo) {
  if (!signalCtx || reducedMotion() || !keyInfo?.rect) return;
  const { rect } = keyInfo;
  const angles = Array.from({ length: 6 }, () => Math.random() * Math.PI * 2);
  sparks.push({
    kind: 'crackle',
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
    r: Math.max(rect.width, rect.height) * 0.6,
    angles,
    hue: 350,
    start: performance.now(),
    duration: 260,
  });
  ensureLoop();
}
