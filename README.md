# WT Translator Bridge

Live **War Thunder in‑game chat**, auto‑detected and translated, in your browser.

War Thunder runs a small local server at `http://localhost:8111` while you play.
This is a tiny local bridge that reads the chat from it, translates each message,
and serves a clean live web page — so you can read what everyone's saying,
whatever language they're typing in.

No API key. No accounts.

## Download (Windows — no install)

Grab **`wt-translator-bridge.exe`** from the [latest release](https://github.com/Horizon-StudiosAU/wt-translator-bridge/releases/latest), double‑click it, then open **http://localhost:8123** and spawn into a match. No Node required.

> Windows may show a SmartScreen "unknown publisher" warning (the build is unsigned) — click **More info → Run anyway**.

## Run from source (any OS)

Requires [Node.js](https://nodejs.org) 18+ and War Thunder running:

```bash
node wt-chat-translate.mjs
```

Then open **http://localhost:8123**. Chat appears translated in real time, with the original text and detected language under each line.

## Options

Set these environment variables before running:

| Variable | Default | Meaning |
|----------|---------|---------|
| `WT_TARGET_LANG` | `en` | Language to translate chat into (e.g. `de`, `ru`, `ja`, `zh-CN`) |
| `WT_PORT` | `8123` | Port for the web UI |
| `WT_HOST` | `http://localhost:8111` | War Thunder local server |

Example: `WT_TARGET_LANG=de node wt-chat-translate.mjs`

## Flight telemetry feed (for FoxThree Live Ops)

Besides chat, the bridge merges War Thunder's read‑only telemetry into a few
JSON endpoints that power the live dashboard on
[FoxThree](https://foxthree.horizonstudios.io/live):

| Endpoint | What it serves |
|----------|----------------|
| `/api/telemetry` | own altitude / TAS / IAS / Mach / G / climb / throttle / fuel + range & aspect to the nearest contact |
| `/api/contacts` | live map objects (you, allies, enemies, bases) in normalized map space |
| `/api/hudmsg` | rolling combat log (kills / crashes / damage) |
| `/api/map.img` | the live tactical map image (JPEG proxy) |

All read‑only — the bridge never writes anything back into the game.

## How it works

- Polls `http://localhost:8111/gamechat` (the game's local server) every ~1.5 s.
- Detects each message's language and translates it.
- Serves the live UI at `http://localhost:8123`, plus a small JSON feed
  (`/api/lines`), a reverse‑translate endpoint (`/api/translate?q=…&tl=…`), and
  the telemetry endpoints above.

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
