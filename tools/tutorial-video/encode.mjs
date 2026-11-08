/**
 * encode.mjs - turns ./out/frames into ./out/how-to-play.webm (+ poster.jpg)
 * usage: node encode.mjs [bitrate-in-bits]
 */
import puppeteer from 'puppeteer-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CHROME = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(here, 'out');
const bitrate = Number(process.argv[2] ?? 500_000);
const fps = Number(process.argv[3] ?? 24);
const PORT = 5199;

const types = { '.html': 'text/html', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
  let file;
  if (url === '/enc.html') file = path.join(here, 'enc.html');
  else if (url === '/webm-muxer.js') file = path.join(here, 'node_modules', 'webm-muxer', 'build', 'webm-muxer.js');
  else file = path.join(outDir, url);
  if (!file.startsWith(here) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    res.end('not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(PORT, r));

const meta = JSON.parse(fs.readFileSync(path.join(outDir, 'frames.json'), 'utf8'));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  page.on('console', (m) => console.log('[page]', m.text()));
  page.on('pageerror', (e) => console.log('[pageerror]', String(e)));
  await page.goto(`http://localhost:${PORT}/enc.html`);
  const started = Date.now();
  const result = await page.evaluate(
    (cfg) => window.encode(cfg),
    { frames: meta.frames, t0: meta.t0, t1: meta.t1, fps, bitrate }
  );
  const buf = Buffer.from(result.base64, 'base64');
  fs.writeFileSync(path.join(outDir, 'how-to-play.webm'), buf);
  console.log(
    `encoded ${result.frames} frames (${result.width}x${result.height}, ${result.codec}) in ${((Date.now() - started) / 1000).toFixed(1)}s -> ${(buf.length / 1048576).toFixed(2)} MB`
  );
} finally {
  await browser.close();
  server.close();
}

// Poster: the clean title card, a few seconds in.
const target = meta.t0 + 3;
let best = meta.frames[0];
for (const f of meta.frames) {
  if (f.t <= target) best = f;
  else break;
}
fs.copyFileSync(path.join(outDir, 'frames', best.file), path.join(outDir, 'poster.jpg'));
console.log('poster:', best.file);
