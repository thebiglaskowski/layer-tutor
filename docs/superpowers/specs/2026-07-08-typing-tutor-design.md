# Split-Keyboard Layer Typing Tutor — Design

Date: 2026-07-08
Status: Implemented (expanded 2026-07-10 — 12 stages, large pools, PWA polish)

## Problem

Joe just moved to a split keyboard flashed with a custom QMK/Vial layout
(`qmk-layout.vil` in this repo). The layout uses two held thumb keys
(`FN_MO13`, `FN_MO23`) to reach a numbers/navigation layer and a
symbols layer. Generic typing tutors (MonkeyType, TypingClub, etc.) only
teach flat single-layer layouts — they can't teach "hold this thumb key,
then press that key" reflexes. This project builds a small browser-based
typing game, specific to Joe's actual layout, that teaches base-layer
letter positions first and then layer-switching reflexes for numbers,
navigation, and symbols.

## Source of truth: the layout

Parsed from `qmk-layout.vil`. Each half's key array is stored
outer-edge → inner-edge; the right half must be read in reverse to get
left-to-right visual order. Four layers matter for typing; layers 4–5 are
fully transparent (unused) and layer 3 is a utility layer (RGB + boot),
not typing content.

**Layer 0 — Base** (visual, left-to-right):
```
Top:    Esc Q W E R T [Alt] | [Ctrl] Y U I O P Bspace
Home:   Caps A S D F G [Tab] | [Shift] H J K L ; '
Bottom: Shift Z X C V B     | N M , . / Delete
Thumb:  Ctrl [FN_MO13] Space | Enter [FN_MO23] GUI
```

**Layer 1 — Numbers/Nav** (held via left thumb key `FN_MO13`):
```
Top:    Tab 1 2 3 4 5 [Ctrl] | [Ctrl] 6 7 8 9 0 Bspace
Home:   (mods only, left)     | [Alt] ← ↓ ↑ →   (right hand, HJKL-mapped —
                                                   same physical keys as
                                                   H J K L in layer 0)
```
Arrow keys land on the same physical keys as H/J/K/L — Left/Down/Up/Right,
i.e. vim-style hjkl, which is worth calling out in-app since it's a nice
mnemonic.

**Layer 2 — Symbols** (held via right thumb key `FN_MO23`):
```
Top:    Tab ! @ # $ % [Ctrl] | [Ctrl] ^ & * ( ) Bspace
Home:   (mods only, left)     | [Alt] -  =  [  ]  \  `   (right hand)
Bottom: (unused, left)        |       _  +  {  }  |  ~   (shifted pairs,
                                                            directly below
                                                            their unshifted
                                                            counterpart)
```

**Layer 3 — Adjust** (both thumb keys held together): RGB controls +
bootloader. Not typing content — referenced once in-app as a footnote,
never drilled.

## Curriculum — 12 progressive stages

Stages unlock in order; a stage unlocks the next once you clear it at
≥90% accuracy. A **fluent** badge is awarded at ≥90% accuracy **and**
≥25 WPM. You can always replay any unlocked stage, or run **Practice**
(3× round size, no unlock side-effects). Large pools (~10× the original
item counts) live in `lessonPools.js` so replays rarely feel identical.

| # | Stage | Layer(s) | Content |
|---|-------|----------|---------|
| 1 | Home row | 0 | `a s d f g h j k l` (+ multi-word drills) |
| 2 | Top row | 0 | adds top-row letters |
| 3 | Bottom row | 0 | adds bottom-row letters + `, . /` |
| 4 | Left hand only | 0 | left-half island (split pedagogy) |
| 5 | Right hand only | 0 | right-half island |
| 6 | Full sentences | 0 | mixed sentences, both hands |
| 7 | Numbers | 1 (left Fn) | digit groups |
| 8 | Navigation | 1 (left Fn) | arrows on HJKL |
| 9 | Symbol layer | 0 + 2 (right Fn) | `!@#$%^&*()` — no Shift required on this board |
| 10 | Brackets & punctuation | 0 + 2 (right Fn) | ``-=[]\`_+{}|~`` |
| 11 | Layer transitions | 0 + 1 + 2 | rapid hold/release mid-token |
| 12 | Mixed mastery | 0 + 1 + 2 | realistic mixed text |

Each stage carries a short **coach tip** (thumb home position, hold-then-press,
vim arrows, etc.).

## Gameplay mechanics

- Each stage is an ordered list of items (words or tokens). One item is
  shown at a time as the prompt.
- Per-character feedback: correct-so-far in green, current character
  highlighted, remaining characters dim.
- **Must type the correct character to advance** — a wrong keypress
  flashes that character red and counts as an error, but the cursor does
  not move until you type the right one. This is a deliberate choice to
  build accurate muscle memory rather than let errors slide by.
- Timing starts on the first keystroke of a stage and stops on the last
  correct character of the last item.
  - WPM = (correct characters ÷ 5) ÷ elapsed minutes
  - Accuracy = correct keystrokes ÷ (correct + error keystrokes)
- End-of-stage results screen: WPM, accuracy, and a per-key mistake
  breakdown ("you missed `[` 3 times"). Options: retry stage, or advance
  (if unlocked).

Input is captured via standard `keydown` listening — the game only cares
about the character that ultimately arrives (which QMK/Vial already
translates correctly based on which thumb key you're physically holding).
The game doesn't need to detect layer state directly; it only needs to
show you *which* key to hold before you press, which is the visual
keyboard's job.

## Visual keyboard diagram

A split-keyboard diagram (built from the parsed matrix above) sits below
the prompt, redrawn on every character:

- The **target key** for the current character is highlighted green.
- If the current character lives on layer 1 or 2, the required thumb key
  (`FN_MO13` or `FN_MO23`) is highlighted amber, labeled "hold," so the
  visual reads "hold this, then press that."
- Layer 0 characters only highlight the single key — no amber prompt.

## Progress persistence

`localStorage`, one JSON blob:

```json
{
  "stages": {
    "home-row":     { "unlocked": true, "bestWpm": 42, "bestAccuracy": 96, "timesPlayed": 3 },
    "top-row":      { "unlocked": true, "bestWpm": 0,  "bestAccuracy": 0,  "timesPlayed": 0 },
    "...": "one entry per stage id, in curriculum order"
  }
}
```

Stage 1 starts unlocked; all others start locked until the prior stage is
cleared at ≥90% accuracy.

## Architecture — vanilla JS, no build step

New `typing-tutor/` folder at repo root, alongside `qmk-layout.vil`.
Native ES modules served with a trivial static server (`python3 -m http.server`) — native ES modules don't load over file://, but no npm install and no bundler needed.

```
typing-tutor/
  index.html
  style.css
  js/
    main.js              — app bootstrap, screen routing
    keyboardLayout.js    — key matrix + layer-hold key ids, derived from qmk-layout.vil
    lessons.js           — the 9 stage definitions and content generators
    gameEngine.js        — prompt state machine, input matching, WPM/accuracy calc
    keyboardRenderer.js  — draws/updates the on-screen split-keyboard diagram
    storage.js           — localStorage read/write for progress
    ui.js                — menu, stage-select, and results screens
```

Each module has one job and a narrow interface:
- `keyboardLayout.js` exports the static key-matrix data and layer-hold
  key positions — no logic, no DOM.
- `lessons.js` exports the stage list and item generators — pure data,
  no DOM, no timing.
- `gameEngine.js` owns typing state (current item, cursor position,
  correct/error counts, timestamps) and exposes it to the renderer/UI —
  no DOM access itself.
- `keyboardRenderer.js` and `ui.js` are the only modules that touch the
  DOM.
- `storage.js` is the only module that touches `localStorage`.

## Visual direction

Dark, modern, polished. Dark background (near-black, not pure #000),
high-contrast neon-ish accent palette for feedback states (green =
correct/target key, amber = hold-this thumb key, red = error flash),
generous spacing, a monospace or geometric sans for the prompt text,
subtle glow/transition effects on key highlights and stage completion.
Should feel like a sleek game, not a form. No CSS framework — hand-rolled
CSS custom properties for the palette.

## Out of scope

- Layer 3 (RGB/Adjust) drills — not typing content.
- Endless/freeform practice mode — explicitly deferred; stage 9 serves as
  the repeatable "keep practicing" stage.
- Any backend, account system, or cross-device sync — single-user,
  browser-local only.
- Detecting actual thumb-key hold state from hardware — the game teaches
  the reflex visually; it doesn't need to read keyboard layer state.
