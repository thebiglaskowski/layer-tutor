# Layer Tutor

Browser typing trainer for **layered QMK/Vial split keyboards**.

Primary board today:

**CORNE V4 Wired Split Mechanical Keyboard, 40% 3×6 ortholinear**

The app is multi-board ready — pick a keyboard on the menu; progress is stored
per model so a future Iris / Lily58 / custom board does not clobber Corne stats.

| Path | What |
|------|------|
| `layouts/corne-v4.vil` | Vial export for the Corne V4 (base / numbers-nav / symbols / adjust) |
| `typing-tutor/` | **Layer Tutor** PWA |
| `typing-tutor/js/boards/` | One module per keyboard model (registry + matrices) |
| `scripts/check-layout.mjs` | Fails if a board’s matrix drifts from its `.vil` |
| `scripts/deploy-pages.sh` | Deploys only runtime assets to Cloudflare Pages |

Live: https://layer-tutor.pages.dev

## Curriculum

12 progressive stages: base letters → left/right hand islands → full sentences →
left-Fn numbers & arrows → right-Fn symbols & brackets → layer transitions →
mixed real-world text.

- **Unlock:** ≥90% accuracy clears the next stage  
- **Fluent badge:** ≥90% accuracy **and** ≥25 WPM  
- **Practice:** longer free rounds (no unlock side-effects)  
- **Heatmap:** rolling per-key misses (per board)  
- Large pools so replays rarely feel identical  

## Run locally

```sh
cd typing-tutor
python3 -m http.server 8000
# open http://localhost:8000
```

(A server is required — native ES modules do not load over `file://`.)

## Test

```sh
cd typing-tutor
node --test tests/*.test.js     # Node 18+
node ../scripts/check-layout.mjs
```

## Deploy

```sh
bash scripts/deploy-pages.sh
# or: cd typing-tutor && npm run deploy
```

CI runs unit tests + layout check on every push; deploys to Cloudflare Pages on
`main` when `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets are set.

## Adding another keyboard

1. Export Vial → `layouts/<id>.vil`
2. Copy `typing-tutor/js/boards/corne-v4.js` → `boards/<id>.js`, retarget the matrix
3. Register it in `typing-tutor/js/boards/index.js` (`BOARDS` array)
4. Run `node scripts/check-layout.mjs` and play a stage end-to-end
5. If the physical geometry differs, add a profile in `keyboardRenderer.js`

## Progress schema (v3)

`localStorage` key `qmk-typing-tutor-v1` (name kept for continuity):

```json
{
  "version": 3,
  "activeBoardId": "corne-v4",
  "boards": {
    "corne-v4": {
      "stages": {
        "home-row": {
          "unlocked": true,
          "bestWpm": 42,
          "bestAccuracy": 96,
          "timesPlayed": 3,
          "fluent": true
        }
      },
      "heatmap": { "a": 4, "[": 2 }
    }
  }
}
```

Older flat saves migrate into `boards.corne-v4` automatically.

## Architecture

Vanilla JS, zero npm dependencies, zero build step.

| Module | Role |
|--------|------|
| `boards/*` | Per-keyboard metadata + key matrix + `charToKey` |
| `lessonPools.js` / `lessons.js` | Large pools + stage definitions |
| `gameEngine.js` | Pure typing state machine |
| `storage.js` | Multi-board progress, fluent badges, heatmap |
| `keyboardRenderer.js` | Geometry-driven split board |
| `ui.js` / `main.js` / `sound.js` | Screens, board picker, input, beeps |

## Repo naming

This used to be a catch-all `QMK` dump. Better public names (pick one if you
rename on GitHub):

| Name | Why |
|------|-----|
| **`layer-tutor`** | Matches the product and Pages URL — best default |
| **`split-layer-tutor`** | Emphasizes split + layers |
| **`corne-layer-tutor`** | Honest about the first-class board; still multi-board capable |
| **`qmk-layer-tutor`** | Searchable for QMK folks; a bit generic |

Avoid bare `QMK` — people expect firmware, not a typing PWA.
