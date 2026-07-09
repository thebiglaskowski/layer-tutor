# QMK Split Keyboard

`qmk-layout.vil` — the Vial layout for my split keyboard (base / numbers-nav / symbols / adjust layers).

## Layer Tutor (`typing-tutor/`)

A typing tutorial game for learning the layered layout. 9 progressive stages:
base-layer letters first, then held-thumb-key layers for numbers, navigation,
and symbols.

### Run

```sh
cd typing-tutor
python3 -m http.server 8000
# open http://localhost:8000
```

(A server is required — native ES modules don't load over file://.)

### Test

```sh
cd typing-tutor
node --test tests/*.test.js     # Node 18+
```

### Deploy (Cloudflare Pages)

Live at https://layer-tutor.pages.dev — installable as a PWA (Add to Home
Screen on Android; plug the keyboard into the phone via USB-OTG).

```sh
cd typing-tutor
npx wrangler pages deploy . --project-name layer-tutor --branch main
```
