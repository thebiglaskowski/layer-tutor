---
name: verify
description: Build/launch/drive recipe for verifying Layer Tutor changes at the running-app surface (browser PWA, no build step)
---

# Verifying Layer Tutor

## Launch

```sh
cd typing-tutor && python3 -m http.server 8014 &   # any free port; ES modules need a real origin
```

Drive with the Playwright MCP tools (`browser_navigate` to `http://localhost:8014/`).

## Gotchas

- **Stale Playwright profile lock**: if `browser_navigate` errors with "Browser is already in use for ~/.cache/ms-playwright-mcp/mcp-chrome-*", a headless Chrome from a previous session is holding the profile — `pkill -9 -f mcp-chrome-<hash>` and retry.
- **Auto-pause on blur**: `main.js` pauses the game on `window` blur. Headless focus juggling triggers this — check `#btn-resume` visibility and press Escape to unpause before typing.
- **Cross-call timing lies**: arming a canvas sampler in one MCP call and pressing a key in the next is unreliable (sampler window expires, pause races). Do keypress + canvas sampling in ONE `browser_evaluate`: dispatch a synthetic `KeyboardEvent('keydown', {key, code, bubbles: true})` on `document` (the app does not check `isTrusted`), then sample over ~20 rAF frames.
- **Same module instance from console**: `await import('./js/canvasEffects.js')` in `browser_evaluate` resolves to the same ES-module instance main.js uses — good for isolating draw code from event wiring.
- **The intro/onboarding screen has no keyboard diagram**, so `getKeyRect` is null there and canvas key effects never fire on it — test effects on the game screen (Skip intro → Play Home Row).

## Useful flows

- Menu → `Play Home Row` button → game screen; first round item is a real word, current char is `[...document.querySelectorAll('#prompt .ch')].find(e => e.className.includes('current'))` (beware: bare `[class*=current]` matches unrelated nodes).
- Canvas effect assertions: read `#fx-ambient` / `#fx-signal` via `getImageData`, count alpha>8 pixels and their bounding box. Static-background check = two samples 500ms+ apart must be identical.
