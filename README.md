# Layer Tutor

![Layer Tutor](assets/layer-tutor.png)

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

15 progressive stages: home row → bigrams → top/bottom → left/right hands →
sentences → numbers/nav/hold drill → symbols/punctuation → pulse drill →
layer transitions → mixed mastery.

- **Unlock:** ≥90% accuracy clears the next stage  
- **Fluent badge:** ≥90% accuracy **and** ≥25 WPM  
- **Practice / weak-key drill / sandbox / custom lists**  
- **Heatmap** + mini keyboard, streaks, goals, notes, export/import  
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

**Auto-deploy:** push to `main` → tests → Cloudflare Pages
(https://layer-tutor.pages.dev) via `.github/workflows/deploy.yml`.

One-time secrets (Cloudflare API token with **Account → Cloudflare Pages → Edit**):

```sh
bash scripts/setup-github-deploy.sh
```

Manual deploy (local wrangler login):

```sh
bash scripts/deploy-pages.sh
```

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
