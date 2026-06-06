# WT Translator Bridge

Live **War Thunder in‑game chat**, auto‑detected and translated, in your browser.

War Thunder runs a small local server at `http://localhost:8111` while you play.
This is a tiny local bridge that reads the chat from it, translates each message,
and serves a clean live web page — so you can read what everyone's saying,
whatever language they're typing in.

No API key. No accounts. No npm install. Just Node.

## Requirements

- [Node.js](https://nodejs.org) 18 or newer
- War Thunder running (it's what serves `localhost:8111`)

## Run

```bash
node wt-chat-translate.mjs
```

Then open **http://localhost:8123** and spawn into a match. Chat appears
translated in real time, with the original text and detected language under each
line.

## Options

Set these environment variables before running:

| Variable | Default | Meaning |
|----------|---------|---------|
| `WT_TARGET_LANG` | `en` | Language to translate chat into (e.g. `de`, `ru`, `ja`, `zh-CN`) |
| `WT_PORT` | `8123` | Port for the web UI |
| `WT_HOST` | `http://localhost:8111` | War Thunder local server |

Example: `WT_TARGET_LANG=de node wt-chat-translate.mjs`

## How it works

- Polls `http://localhost:8111/gamechat` (the game's local server) every ~1.5 s.
- Detects each message's language and translates it.
- Serves the live UI at `http://localhost:8123`, plus a small JSON feed
  (`/api/lines`) and a reverse‑translate endpoint (`/api/translate?q=…&tl=…`).

Everything runs on your machine. The only thing sent out is the chat **text**,
to Google's public translate endpoint, for translation. To use a different
translator (LibreTranslate, DeepL, …), swap the `translate()` function.

## Notes

- It can read chat but **cannot send** it — War Thunder's local server is
  read‑only, so there's no way to inject messages. Use it to read; reply in game.
- In **Sim battles** the game only shows chat you'd normally see; this just
  mirrors that.

## License

MIT © Horizon Studios
