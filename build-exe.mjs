// Build wt-translator-bridge.exe as a single Node SEA binary.
// Run: node build-exe.mjs   (Windows, Node 20+)
import { execFileSync } from "node:child_process";
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";

const FUSE = "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2";
const EXE = "wt-translator-bridge.exe";

// SEA entry points are CommonJS; the only ESM construct is the http import.
const src = readFileSync("wt-chat-translate.mjs", "utf8").replace(
  'import http from "node:http";',
  'const http = require("node:http");',
);
writeFileSync("sea-entry.cjs", src);

writeFileSync(
  "sea-config.json",
  JSON.stringify({ main: "sea-entry.cjs", output: "sea-prep.blob", disableExperimentalSEAWarning: true }, null, 2),
);

execFileSync(process.execPath, ["--experimental-sea-config", "sea-config.json"], { stdio: "inherit" });
copyFileSync(process.execPath, EXE);
execFileSync(
  "npx",
  ["--yes", "postject", EXE, "NODE_SEA_BLOB", "sea-prep.blob", "--sentinel-fuse", FUSE],
  { stdio: "inherit", shell: true },
);

console.log(`\nBuilt ${EXE}`);
