#!/usr/bin/env node
import http from "node:http";

const CONFIG = {
  wtHost: process.env.WT_HOST || "http://localhost:8111",
  targetLang: (process.env.WT_TARGET_LANG || "en").toLowerCase(),
  port: Number(process.env.WT_PORT || 8123),
  pollMs: 1500,
  maxLines: 400,
};

let store = [];
const seenIds = new Set();
let reachable = false;
let lastError = null;
const translateCache = new Map();

async function translate(text, target) {
  const key = target + " " + text;
  const cached = translateCache.get(key);
  if (cached) return cached;

  const url =
    "https://translate.googleapis.com/translate_a/single" +
    `?client=gtx&sl=auto&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(text)}`;
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json();
    const translated = Array.isArray(j[0])
      ? j[0].map((seg) => (seg && seg[0] ? seg[0] : "")).join("")
      : text;
    const lang = (j[2] || "auto").toString();
    const out = { translated, lang };
    translateCache.set(key, out);
    return out;
  } catch {
    return { translated: text, lang: "?" };
  }
}

async function poll() {
  let data;
  try {
    const r = await fetch(`${CONFIG.wtHost}/gamechat?lastId=0`, { signal: AbortSignal.timeout(2500) });
    if (!r.ok) throw new Error("HTTP " + r.status);
    data = await r.json();
    reachable = true;
    lastError = null;
  } catch (e) {
    reachable = false;
    lastError = e instanceof Error ? e.message : String(e);
    return;
  }
  if (!Array.isArray(data) || data.length === 0) return;

  const ids = new Set(data.map((d) => d.id));
  if (store.length && !ids.has(store[store.length - 1].id)) {
    store = [];
    seenIds.clear();
  }

  for (const rec of data) {
    if (seenIds.has(rec.id)) continue;
    const msg = (rec.msg || "").replace(/<\/?color[^>]*>/gi, "").trim();
    seenIds.add(rec.id);
    if (!msg) continue;

    const { translated, lang } = await translate(msg, CONFIG.targetLang);
    const isTarget = lang === CONFIG.targetLang || lang === "auto";
    store.push({
      id: rec.id,
      time: typeof rec.time === "number" ? rec.time : null,
      sender: rec.sender || "",
      mode: rec.mode || "",
      enemy: !!rec.enemy,
      original: msg,
      translated: isTarget || translated === msg ? "" : translated,
      lang,
    });
  }

  while (store.length > CONFIG.maxLines) {
    const dropped = store.shift();
    seenIds.delete(dropped.id);
  }
}

setInterval(poll, CONFIG.pollMs);
poll();

const HTML = String.raw`<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>WT Chat Translator</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #0b1220; color: #e9f2f5;
    font: 14px/1.5 "Segoe UI", system-ui, sans-serif; }
  header { position: sticky; top: 0; display: flex; align-items: center; gap: 10px;
    padding: 10px 16px; background: #0d1626; border-bottom: 1px solid #1d2a3d; }
  header b { font-size: 15px; letter-spacing: .2px; }
  .dot { width: 9px; height: 9px; border-radius: 50%; background: #f2545b; }
  .dot.on { background: #37d3e6; box-shadow: 0 0 8px #37d3e6; }
  .muted { color: #94a6b4; font-size: 12px; }
  #log { padding: 10px 16px 40px; }
  .line { padding: 4px 0; border-bottom: 1px solid #131e2e; }
  .meta { color: #6f8496; font-size: 12px; margin-right: 6px; }
  .sender { color: #cfe7ec; font-weight: 600; }
  .line.enemy .sender { color: #f2a04a; }
  .line.system { color: #f2e07a; }
  .msg { white-space: pre-wrap; word-break: break-word; }
  .orig { margin-top: 1px; color: #7c8ea0; font-size: 12px; }
  .lang { display: inline-block; min-width: 22px; padding: 0 5px; margin-right: 6px;
    border: 1px solid #2a3a4f; border-radius: 4px; color: #9fd9e3; font-size: 10px;
    text-transform: uppercase; }
  .empty { color: #6f8496; padding: 30px 16px; }
</style></head>
<body>
  <header>
    <span class="dot" id="dot"></span>
    <b>WT Chat Translator</b>
    <span class="muted" id="status">connecting…</span>
    <span class="muted" style="margin-left:auto" id="tgt"></span>
  </header>
  <div id="log"><div class="empty">Waiting for War Thunder chat… (spawn into a match)</div></div>
<script>
  const log = document.getElementById('log');
  const dot = document.getElementById('dot');
  const statusEl = document.getElementById('status');
  const tgtEl = document.getElementById('tgt');
  const esc = (s) => s.replace(/[&<>"']/g, (c) =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const fmtTime = (t) => {
    if (t == null) return '';
    const m = Math.floor(t / 60), s = String(Math.floor(t % 60)).padStart(2, '0');
    return '[' + m + ':' + s + '] ';
  };
  let lastCount = -1;
  async function tick() {
    let d;
    try { d = await (await fetch('/api/lines', { cache: 'no-store' })).json(); }
    catch { return; }
    dot.classList.toggle('on', d.reachable);
    statusEl.textContent = d.reachable ? 'connected to localhost:8111' : 'War Thunder not reachable';
    tgtEl.textContent = '→ ' + d.target.toUpperCase();
    if (d.lines.length === lastCount) return;
    const nearBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 80;
    lastCount = d.lines.length;
    if (!d.lines.length) {
      log.innerHTML = '<div class="empty">No chat yet…</div>';
      return;
    }
    log.innerHTML = d.lines.map((l) => {
      const cls = l.enemy ? 'enemy' : (l.sender ? 'ally' : 'system');
      const who = l.sender ? '<span class="sender">' + esc(l.sender) + '</span>: ' : '';
      const mode = l.mode ? '[' + esc(l.mode) + '] ' : '';
      const body = esc(l.translated || l.original);
      const orig = l.translated
        ? '<div class="orig"><span class="lang">' + esc(l.lang) + '</span>' + esc(l.original) + '</div>'
        : '';
      return '<div class="line ' + cls + '"><span class="meta">' + fmtTime(l.time) + mode + '</span>'
        + who + '<span class="msg">' + body + '</span>' + orig + '</div>';
    }).join('');
    if (nearBottom) window.scrollTo(0, document.body.scrollHeight);
  }
  setInterval(tick, 1200);
  tick();
</script>
</body></html>`;

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") {
    res.writeHead(204, { "Access-Control-Allow-Headers": "*" });
    res.end();
    return;
  }

  const u = new URL(req.url || "/", "http://localhost");

  if (u.pathname === "/api/lines") {
    res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    res.end(JSON.stringify({ reachable, target: CONFIG.targetLang, error: lastError, lines: store }));
    return;
  }

  if (u.pathname === "/api/translate") {
    const q = u.searchParams.get("q") || "";
    const tl = (u.searchParams.get("tl") || CONFIG.targetLang).toLowerCase();
    const result = q.trim() ? await translate(q, tl) : { translated: "", lang: "" };
    res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    res.end(JSON.stringify(result));
    return;
  }

  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(HTML);
});

server.listen(CONFIG.port, () => {
  process.stdout.write(
    `\nWT Chat Translator running\n  UI:     http://localhost:${CONFIG.port}\n` +
      `  WT:     ${CONFIG.wtHost}/gamechat\n  Target: ${CONFIG.targetLang}\n\n` +
      `Open the UI and spawn into a match. Ctrl+C to stop.\n`,
  );
});
