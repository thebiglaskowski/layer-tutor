# AGENTS.md — layer-tutor

Browser **Layer Tutor** PWA: teach Joe’s layered QMK/Vial split keyboards through progressive typing stages. Primary board is the **CORNE V4** (40% 3×6 ortholinear) with dual thumb Fn layers (numbers/nav + symbols). Multi-board ready.

Live: https://layer-tutor.pages.dev  
Repo product surface: vanilla JS, zero npm dependencies, zero bundler.

## Layout

```
layouts/<board-id>.vil     # Vial exports (source of truth for matrices)
typing-tutor/              # PWA (what Pages deploys)
  index.html, style.css, sw.js, manifest.webmanifest
  js/
    boards/                # per-keyboard registry + matrices
    gameEngine.js          # pure typing state machine (no DOM)
    lessons.js + lessonPools.js
    storage.js             # multi-board progress / heatmap (localStorage only)
    keyboardRenderer.js    # geometry-driven diagram (DOM)
    canvasEffects.js       # "Signal Trace" ambient + reactive canvas effects (DOM/canvas)
    ui.js, main.js, sound.js
  tests/                   # node:test unit tests
  icons/
scripts/
  check-layout.mjs         # .vil ↔ board matrix drift check
  stage-pages.sh           # runtime-only deploy payload
  deploy-pages.sh          # local wrangler deploy
  setup-github-deploy.sh   # one-time GH secrets
assets/                    # README / marketing images
.github/workflows/deploy.yml
```

Ignore agent scratch: `docs/superpowers/`, `.superpowers/`, local `CLAUDE.md`.

## Architecture rules (do not break)

- **No build step, no framework, no npm deps.** `package.json` is only `"type": "module"` + scripts.
- **Module boundaries**
  - DOM: `keyboardRenderer.js`, `canvasEffects.js`, `ui.js`, `main.js` only
  - `localStorage`: `storage.js` only
  - Pure / unit-tested: `gameEngine.js`, `lessons.js`, `boards/*`, `storage.js` (injectable backing store)
- **Boards** live under `js/boards/`. Register in `boards/index.js`. Progress is **per board id** (storage schema v4).
- **Diagram always shows base keycaps.** Layer glyphs overlay **only** on the green target key; amber = hold Fn, magenta = shift. Do not call a full-board `setDisplayLayer(1|2)` for teaching — it makes the map feel wrong.
- **Signal Trace canvas effects** (`canvasEffects.js`): ambient circuit-trace background + a reactive pulse from the just-typed key toward its half's controller point, colored by layer, red short-circuit crackle on misses. Always gate animation on the `reduce-motion` root class and `document.hidden`; never block the keydown handler.
- **Input:** prefer `e.key` (post-QMK character). Special-case Space + arrows only. During a stage, focus the prompt (not Menu) so Space types instead of activating buttons.
- **Unlock:** ≥90% accuracy. **Fluent:** ≥90% and ≥25 WPM. Practice mode = longer rounds, no unlock side-effects.
- **Service worker:** bump `CACHE` in `sw.js` when shipping JS/CSS/HTML changes so clients drop the old bucket.

## Commands

```sh
# Serve (ES modules need a real origin)
cd typing-tutor && python3 -m http.server 8000

# Tests (Node 18+)
cd typing-tutor && node --test tests/*.test.js
node scripts/check-layout.mjs

# Deploy (CI does this on push to main; local:)
bash scripts/deploy-pages.sh
```

CI: `.github/workflows/deploy.yml` — test → stage → `wrangler pages deploy` to project `layer-tutor`. Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

## Adding or editing a keyboard

1. Export Vial → `layouts/<id>.vil`
2. Add `typing-tutor/js/boards/<id>.js` via `createLayout()` (see `corne-v4.js`)
3. Push onto `BOARDS` in `boards/index.js`
4. `node scripts/check-layout.mjs` must pass
5. If physical geometry differs, extend `keyboardRenderer.js` (geometry profile)
6. Play a stage end-to-end on device (USB-OTG phone path matters)

Right-half rows in `.vil` are **outer → inner**; tutor tables are **visual left → right** (reverse the right half when deriving).

## Curriculum / content

- Stages defined in `lessons.js`; large pools in `lessonPools.js`.
- Every character in every pool item must resolve via that board’s `charToKey()` — enforced by tests.
- Prefer variety (large pools, sample without replacement) over tiny repeating lists.
- Layer rules per stage are tested; don’t put digits into “base only” stages, etc.

## Hard don’ts

- Don’t commit secrets, `.wrangler/`, `.pages-out/`, or superpowers session trees.
- Don’t deploy the whole `typing-tutor/` tree blindly — use `stage-pages.sh` (no tests).
- Don’t “fix” layout drift by weakening `check-layout.mjs`; fix the matrix or re-export `.vil`.
- Don’t add a bundler/React/Vue for convenience.
- Don’t ask the user where files live if this doc or `README.md` already says.

## Done checklist

- [ ] `node --test tests/*.test.js` green  
- [ ] `node scripts/check-layout.mjs` green  
- [ ] Manual smoke: start a stage, type through a space-containing prompt, confirm base legends stay put on layer targets  
- [ ] Bump `sw.js` `CACHE` if clients must see the change immediately  
- [ ] Commit logical units; push `main` for auto-deploy  

## Product facts (don’t invent others)

- Primary board product string: `CORNE V4 Wired Split Mechanical Keyboard, 40% 3×6 ortholinear`
- Left thumb Fn → layer 1 (numbers + hjkl arrows); right thumb Fn → layer 2 (symbols)
- Storage key name `qmk-typing-tutor-v1` is historical; document version is **4** (multi-board)
