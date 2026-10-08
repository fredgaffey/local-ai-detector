#!/usr/bin/env node
// Serves locally converted models in Hugging Face's URL layout, for e2e builds
// made with WXT_E2E_MODEL_MIRROR=http://localhost:<port>/ (src/engine/runtime.ts).
//
//   node scripts/e2e/model-mirror.mjs --port 8787 \
//     --map fredgaffey/desklib-ai-text-detector-v1.01-ONNX=~/.cache/lad-cands/desklib \
//     --map fredgaffey/tabularis-ai-text-detection-ONNX=~/.cache/lad-cands/tabularis
//
// GET /<owner>/<repo>/resolve/<revision>/<file> -> <dir>/<file>. CORS and CORP
// headers are set because the extension's workers are cross-origin isolated.

import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { homedir } from "node:os";
import { join, normalize } from "node:path";

const args = process.argv.slice(2);
const port = Number(args[args.indexOf("--port") + 1] || 8787);
const maps = new Map();
args.forEach((a, i) => {
  if (a !== "--map") return;
  const [repo, dir] = args[i + 1].split("=");
  maps.set(repo, dir.replace(/^~/, homedir()));
});

createServer((req, res) => {
  const headers = { "access-control-allow-origin": "*", "cross-origin-resource-policy": "cross-origin" };
  const m = decodeURIComponent(new URL(req.url, "http://x").pathname).match(/^\/([^/]+\/[^/]+)\/resolve\/[^/]+\/(.+)$/);
  const dir = m && maps.get(m[1]);
  const file = dir && normalize(join(dir, m[2]));
  if (!file || !file.startsWith(dir) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404, headers).end();
    return;
  }
  res.writeHead(200, { ...headers, "content-type": "application/octet-stream", "content-length": statSync(file).size });
  if (req.method === "HEAD") return res.end();
  createReadStream(file).pipe(res);
}).listen(port, "127.0.0.1", () => console.error(`model mirror on http://localhost:${port}/ (${[...maps.keys()].join(", ")})`));
