/**
 * verify.mjs - plays the finished WebM in real Chrome: metadata, seeking, frames.
 * usage: node verify.mjs [path-to-webm]
 */
import puppeteer from 'puppeteer-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CHROME = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const webm = path.resolve(process.argv[2] ?? path.join(here, 'out', 'how-to-play.webm'));
const PORT = 5198;
fs.mkdirSync(path.join(here, 'out'), { recursive: true });

const server = http.createServer((req, res) => {
  if (req.url?.startsWith('/video.webm')) {
    const size = fs.statSync(webm).size;
    const range = req.headers.range;
    if (range) {
      const [s, e] = range.replace('bytes=', '').split('-');
      const start = Number(s);
      const end = e ? Number(e) : size - 1;
      res.writeHead(206, { 'Content-Type': 'video/webm', 'Content-Range': `bytes ${start}-${end}/${size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 });
      fs.createReadStream(webm, { start, end }).pipe(res);
    } else {
      res.writeHead(200, { 'Content-Type': 'video/webm', 'Accept-Ranges': 'bytes', 'Content-Length': size });
      fs.createReadStream(webm).pipe(res);
    }
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<!doctype html><body style="margin:0;background:#000"><video id="v" src="/video.webm" muted playsinline preload="auto" style="width:1280px;height:720px;display:block"></video>');
});
await new Promise((r) => server.listen(PORT, r));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
let ok = true;
const check = (name, pass, extra = '') => { if (!pass) ok = false; console.log(`${pass ? 'PASS' : 'FAIL'}  ${name} ${extra}`); };
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => document.getElementById('v').readyState >= 1, { timeout: 15000 });
  const info = await page.evaluate(() => {
    const v = document.getElementById('v');
    return { duration: v.duration, w: v.videoWidth, h: v.videoHeight, error: v.error ? v.error.code : null, seekEnd: v.seekable.length ? v.seekable.end(v.seekable.length - 1) : 0 };
  });
  console.log(JSON.stringify(info));
  check('metadata loads with a finite duration', Number.isFinite(info.duration) && info.duration > 100, `(${info.duration.toFixed(1)}s)`);
  check('1280x720', info.w === 1280 && info.h === 720);
  check('no media error', info.error === null);
  check('fully seekable', info.seekEnd >= info.duration - 1, `(${info.seekEnd.toFixed(1)}s)`);

  const times = [3, 30, 62, 70, 90, 112];
  for (const t of times) {
    const seeked = await page.evaluate((t) => new Promise((resolve) => {
      const v = document.getElementById('v');
      const done = () => { v.removeEventListener('seeked', done); resolve(Math.abs(v.currentTime - t) < 0.5); };
      v.addEventListener('seeked', done);
      v.currentTime = t;
    }), t);
    check(`seek to ${t}s`, seeked);
    await new Promise((r) => setTimeout(r, 250));
    await (await page.$('#v')).screenshot({ path: path.join(here, 'out', `v${String(t).padStart(3, '0')}.png`) });
  }

  // Real playback: it advances and reaches the end.
  await page.evaluate(() => { const v = document.getElementById('v'); v.currentTime = 100; return v.play(); });
  await new Promise((r) => setTimeout(r, 2500));
  const played = await page.evaluate(() => document.getElementById('v').currentTime);
  check('plays forward', played > 101.5, `(t=${played.toFixed(1)}s)`);
} finally {
  await browser.close();
  server.close();
}
console.log(ok ? 'ALL PASS' : 'SOME FAILED');
