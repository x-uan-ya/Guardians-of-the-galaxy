/**
 * record.mjs - plays the game with a scripted "player" and records the screen.
 * Output: ./out/frames/*.jpg, ./out/frames.json, ./out/marks.json
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CHROME = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL_ = process.env.GAME_URL ?? 'http://localhost:5173/';
const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(here, 'out');
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(path.join(outDir, 'frames'), { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const now = () => Date.now() / 1000;
const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--hide-scrollbars'],
});

const frames = [];
const marks = [];
let t0 = 0;
let t1 = 0;

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  const problems = [];
  page.on('pageerror', (e) => problems.push(String(e)));

  // --- Sign in as a throw-away demo user and start from a clean game. -------
  await page.goto(URL_, { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    localStorage.clear();
    const user = { id: 'u_demo', email: 'demo@example.com', passwordHash: 'x', securityQuestions: [], createdAt: new Date().toISOString() };
    localStorage.setItem('mars-outpost-users', JSON.stringify([user]));
    localStorage.setItem('mars-outpost-session', JSON.stringify({ userId: 'u_demo', timestamp: Date.now() }));
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await sleep(800);

  // --- On-screen helpers: captions, highlight ring, cursor, title cards. ----
  await page.evaluate(() => {
    const style = document.createElement('style');
    style.textContent = `
      #tut-root{position:fixed;inset:0;z-index:2147483000;pointer-events:none;font-family:ui-sans-serif,system-ui,"Segoe UI",Arial,sans-serif}
      #tut-caption{position:absolute;padding:12px 18px;border-radius:14px;background:rgba(9,11,19,.95);border:1px solid rgba(224,122,63,.65);box-shadow:0 12px 40px rgba(0,0,0,.55);color:#f1f5f9;opacity:0;transition:opacity .35s ease,transform .35s ease;transform:translateY(10px)}
      #tut-caption.show{opacity:1;transform:translateY(0)}
      #tut-caption.bottom{left:50%;bottom:24px;width:900px;margin-left:-450px}
      #tut-caption.top{left:248px;top:62px;width:640px}
      #tut-step{font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#f0894a;font-weight:800;margin-bottom:3px}
      #tut-text{font-size:22px;line-height:1.3;font-weight:500}
      #tut-ring{position:absolute;border:3px solid #ffd54a;border-radius:14px;box-shadow:0 0 0 4px rgba(255,213,74,.22),0 0 30px rgba(255,213,74,.5);opacity:0;transition:left .45s ease,top .45s ease,width .45s ease,height .45s ease,opacity .3s ease}
      #tut-ring.show{opacity:1;animation:tutpulse 1.2s ease-in-out infinite}
      @keyframes tutpulse{0%,100%{box-shadow:0 0 0 4px rgba(255,213,74,.22),0 0 30px rgba(255,213,74,.5)}50%{box-shadow:0 0 0 8px rgba(255,213,74,.12),0 0 40px rgba(255,213,74,.7)}}
      #tut-cursor{position:absolute;left:0;top:0;width:30px;height:30px;opacity:0;filter:drop-shadow(0 2px 3px rgba(0,0,0,.6))}
      .tut-ripple{position:absolute;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;border:3px solid #ffd54a;animation:tutripple .6s ease-out forwards}
      @keyframes tutripple{from{transform:scale(.6);opacity:1}to{transform:scale(4);opacity:0}}
      #tut-card{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:radial-gradient(ellipse at 50% 40%,#2a1409 0%,#0a0a12 70%);color:#fff;opacity:0;transition:opacity .5s ease}
      #tut-card.show{opacity:1}
      #tut-card h1{font-size:54px;font-weight:800;letter-spacing:.02em;margin:0 0 14px}
      #tut-card h1 b{color:#f0894a}
      #tut-card p{font-size:24px;color:#cbd5e1;margin:0;max-width:760px;line-height:1.4}
    `;
    document.head.appendChild(style);
    const root = document.createElement('div');
    root.id = 'tut-root';
    root.innerHTML = `
      <div id="tut-ring"></div>
      <div id="tut-caption"><div id="tut-step"></div><div id="tut-text"></div></div>
      <svg id="tut-cursor" viewBox="0 0 24 24"><path d="M3 2 L3 19 L7.5 14.8 L10.6 21.5 L13.2 20.3 L10.2 13.8 L16.5 13.5 Z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>
      <div id="tut-card"><h1></h1><p></p></div>`;
    document.body.appendChild(root);
    const cursor = root.querySelector('#tut-cursor');
    window.addEventListener('mousemove', (e) => {
      cursor.style.opacity = '1';
      cursor.style.transform = `translate(${e.clientX}px,${e.clientY}px)`;
    }, true);
    window.addEventListener('mousedown', (e) => {
      const r = document.createElement('div');
      r.className = 'tut-ripple';
      r.style.left = e.clientX + 'px';
      r.style.top = e.clientY + 'px';
      root.appendChild(r);
      setTimeout(() => r.remove(), 700);
    }, true);
    window.__tut = {
      caption(step, text, pos) {
        const c = root.querySelector('#tut-caption');
        c.classList.remove('show');
        c.className = pos;
        root.querySelector('#tut-step').textContent = step;
        root.querySelector('#tut-text').textContent = text;
        requestAnimationFrame(() => requestAnimationFrame(() => c.classList.add('show')));
      },
      hideCaption() { root.querySelector('#tut-caption').classList.remove('show'); },
      ring(rect) {
        const r = root.querySelector('#tut-ring');
        if (!rect) { r.classList.remove('show'); return; }
        const pad = 6;
        r.style.left = rect.x - pad + 'px';
        r.style.top = rect.y - pad + 'px';
        r.style.width = rect.w + pad * 2 + 'px';
        r.style.height = rect.h + pad * 2 + 'px';
        r.classList.add('show');
      },
      card(title, sub) {
        const c = root.querySelector('#tut-card');
        if (title === null) { c.classList.remove('show'); return; }
        c.querySelector('h1').innerHTML = title;
        c.querySelector('p').textContent = sub;
        c.classList.add('show');
      },
      // Smallest element whose text matches every pattern (used to outline UI areas).
      rectOf(patterns) {
        let best = null;
        let bestArea = Infinity;
        for (const el of document.querySelectorAll('body *')) {
          if (root.contains(el)) continue;
          const text = el.innerText || '';
          if (!text || !patterns.every((p) => new RegExp(p, 'i').test(text))) continue;
          const b = el.getBoundingClientRect();
          const area = b.width * b.height;
          if (b.width < 40 || b.height < 20 || area >= bestArea) continue;
          best = b;
          bestArea = area;
        }
        return best ? { x: best.x, y: best.y, w: best.width, h: best.height } : null;
      },
    };
  });

  // --- Recording ------------------------------------------------------------
  const client = await page.createCDPSession();
  client.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    frames.push({ t: metadata.timestamp, data });
    client.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await client.send('Page.startScreencast', { format: 'jpeg', quality: 82, everyNthFrame: 1, maxWidth: 1280, maxHeight: 720 });

  // --- Scripted-player primitives -------------------------------------------
  let mx = 640;
  let my = 360;
  await page.mouse.move(mx, my);

  const glide = async (x, y, ms = 800) => {
    const steps = Math.max(8, Math.round(ms / 16));
    const sx = mx;
    const sy = my;
    for (let i = 1; i <= steps; i += 1) {
      const e = ease(i / steps);
      await page.mouse.move(sx + (x - sx) * e, sy + (y - sy) * e);
      await sleep(ms / steps);
    }
    mx = x;
    my = y;
  };

  const find = async (text, { exact = false, startsWith = false } = {}) => {
    const handle = await page.evaluateHandle((t, ex, sw) => {
      const norm = (s) => s.replace(/\s+/g, ' ').trim().toLowerCase();
      const want = norm(t);
      const els = [...document.querySelectorAll('button, a, [role="button"], [role="tab"]')];
      return (
        els.find((b) => {
          const s = norm(b.innerText || b.textContent || '');
          const ok = ex ? s === want : sw ? s.startsWith(want) : s.includes(want);
          return ok && !b.disabled && b.getClientRects().length > 0;
        }) ?? null
      );
    }, text, exact, startsWith);
    const el = handle.asElement();
    if (!el) throw new Error(`Could not find a clickable "${text}"`);
    return el;
  };

  const centreOf = async (el, { scroll = true, block = 'nearest' } = {}) => {
    if (scroll) {
      await el.evaluate((n, b) => n.scrollIntoView({ block: b, behavior: 'smooth' }), block);
      await sleep(block === 'nearest' ? 350 : 750);
    }
    const b = await el.boundingBox();
    if (!b) throw new Error('element has no box');
    return { x: b.x + b.width / 2, y: b.y + b.height / 2, b };
  };

  const clickEl = async (el, { ms = 850, block = 'nearest' } = {}) => {
    const c = await centreOf(el, { block });
    await glide(c.x, c.y, ms);
    await sleep(220);
    await page.mouse.down();
    await sleep(90);
    await page.mouse.up();
    await sleep(450);
  };

  const click = async (text, opts = {}) => {
    const deadline = Date.now() + 8000;
    let el;
    for (;;) {
      try { el = await find(text, opts); break; } catch (e) { if (Date.now() > deadline) throw e; await sleep(250); }
    }
    await clickEl(el, opts);
  };

  const hoverEl = async (el, holdMs, ms = 800) => {
    const c = await centreOf(el, { scroll: false });
    await glide(c.x, c.y, ms);
    await sleep(holdMs);
  };

  // A response button of an emergency waiting in the Mission Tablet, if any.
  const emergencyButton = async () => {
    const handle = await page.evaluateHandle(() => {
      const panel = document.querySelector('.bunker-emergency');
      if (!panel) return null;
      return [...panel.querySelectorAll('button.bunker-action')].find((b) => !b.disabled) ?? null;
    });
    return handle.asElement();
  };
  // Outline an element inside the Mission Tablet (scrolls it into view first and
  // clips the outline to the tablet's visible area).
  const ringSelector = async (selector, nth = 0) => {
    await page.evaluate(
      (s, n) => document.querySelectorAll(s)[n]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }),
      selector,
      nth
    );
    await sleep(800);
    const rect = await page.evaluate(
      (s, n) => {
        const el = document.querySelectorAll(s)[n];
        const body = document.querySelector('.bunker-tablet-body');
        if (!el || !body) return null;
        const r = el.getBoundingClientRect();
        const v = body.getBoundingClientRect();
        const x = Math.max(r.left, v.left + 4);
        const y = Math.max(r.top, v.top + 4);
        const right = Math.min(r.right, v.right - 4);
        const bottom = Math.min(r.bottom, v.bottom - 4);
        return right > x && bottom > y ? { x, y, w: right - x, h: bottom - y } : null;
      },
      selector,
      nth
    );
    await ring(rect);
    return rect;
  };
  const say = async (step, text, pos = 'bottom') => {
    await page.evaluate((s, t, p) => window.__tut.caption(s, t, p), step, text, pos);
  };
  const ring = async (rect) => page.evaluate((r) => window.__tut.ring(r), rect);
  const ringText = async (patterns) => {
    const rect = await page.evaluate((p) => window.__tut.rectOf(p), patterns);
    await ring(rect);
    return rect;
  };
  const chapter = (title) => marks.push({ title, t: now() });

  // --- The tutorial ---------------------------------------------------------
  t0 = now();
  await page.evaluate(() => window.__tut.card('How to play <b>MARS: OUTPOST ZERO</b>', 'Keep your Mars outpost alive for 30 Sols. Here is how, in about two minutes.'));
  await sleep(4200);
  await page.evaluate(() => window.__tut.card(null));
  await sleep(700);

  // 1. Choose a mission site
  chapter('Choose your mission');
  await say('Step 1 · Choose your mission', 'Pick where your mission takes place. Each site changes the odds. Mars is the classic.');
  await sleep(1800);
  const marsCard = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find((b) => /Mars Outpost/.test(b.innerText)) ?? null);
  await hoverEl(marsCard.asElement(), 1200);
  await click('Mars Outpost', { ms: 500 });
  await sleep(1000);
  await click('Confirm Mission');
  await sleep(900);

  // 2. Pick a role
  chapter('Pick your role');
  await page.waitForSelector('.occ-card');
  await say('Step 2 · Pick your role', 'Every role has its own special ability. Point at a character to watch it move.');
  await sleep(1500);
  const cards = await page.$$('.occ-card');
  await hoverEl(cards[0], 1500);
  await hoverEl(cards[1], 1200);
  await hoverEl(cards[2], 1200);
  await hoverEl(cards[3], 1200);
  await say('Step 2 · Pick your role', 'The Engineer keeps your systems running. Click a character to choose it.');
  await hoverEl(cards[0], 700, 900);
  await click('Engineer', { ms: 300 });
  await sleep(2400);
  await say('Step 2 · Pick your role', 'Press Launch Run to start your mission.');
  await click('Launch Run', { block: 'center' });
  await sleep(1500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(300);

  // 3. The outpost
  chapter('Your outpost');
  await page.evaluate(() => {
    const dismiss = [...document.querySelectorAll('[aria-label]')].find((e) => /dismiss/i.test(e.getAttribute('aria-label')));
    if (dismiss) dismiss.click();
  });
  await sleep(500);
  await say('Step 3 · Your outpost', 'This is your outpost. Each room holds one of your supplies. Click a room to inspect it.', 'top');
  await ring(await page.evaluate(() => { const b = document.querySelector('.bunker-scene')?.getBoundingClientRect(); return b ? { x: b.x, y: b.y, w: b.width, h: b.height } : null; }));
  await sleep(2600);
  const oxygenRoom = await page.evaluateHandle(() => [...document.querySelectorAll('button.bunker-hotspot')].find((b) => /oxygen/i.test(b.innerText)) ?? null);
  await ring(null);
  await hoverEl(oxygenRoom.asElement(), 400, 900);
  await page.mouse.down(); await sleep(90); await page.mouse.up();
  await sleep(2800);
  await click('Mission', { exact: true, ms: 700 });
  await sleep(700);

  // 4. Supplies and vitals
  chapter('Your supplies');
  await say('Step 4 · Your supplies', 'Oxygen, Power, Food and Water are your supplies. Green is safe. Keep every bar out of the red.', 'top');
  await ringText(['OXYGEN', 'POWER', 'FOOD', 'WATER', 'Stable']);
  await sleep(4000);
  await say('Step 4 · Your supplies', 'Health, Morale and Radiation show how you are doing. For Radiation, lower is better.', 'top');
  await ringText(['Health', 'Morale', 'Radiation Exposure']);
  await sleep(4200);
  await ring(null);

  // 5. Emergencies and the Mission Controller
  chapter('Emergencies');
  await say('Step 5 · Emergencies', 'Emergencies must be answered before the day can end.', 'top');
  await ringSelector('.bunker-emergency');
  await sleep(3200);
  await ring(null);
  await say('Step 5 · Emergencies', 'Not sure what to do? Ask Mission Controller. Advice only appears when you ask for it.', 'top');
  await ringText(['Ask Mission Controller for advice']);
  await sleep(4200);
  await ring(null);
  await click('Ask Mission Controller for advice', { ms: 900 });
  await sleep(900);
  await say('Step 5 · Emergencies', 'It recommends a response and explains why, what could go wrong, and what to expect.', 'top');
  await ringSelector('.bunker-tablet [data-role="recommended"]');
  await sleep(5200);
  await ring(null);
  await say('Step 5 · Emergencies', 'It only advises. You decide: accept the recommendation, or override it with another option.', 'top');
  await ringSelector('.bunker-tablet [data-role="alternative"]');
  await sleep(4800);
  await ring(null);
  await say('Step 5 · Emergencies', 'Here we accept the recommendation.', 'top');
  await click('Accept recommendation', { ms: 900 });
  await sleep(1600);

  // 6. Plan a Sol
  chapter('Plan your Sol');
  await say('Step 6 · Plan your Sol', 'Each Sol you plan one action. Press Ask Mission Controller if you would like advice.', 'top');
  await ringText(['Ask Mission Controller for advice']);
  await sleep(4200);
  await ring(null);
  await click('Ask Mission Controller for advice', { ms: 900 });
  await sleep(900);
  await say('Step 6 · Plan your Sol', 'It shows a recommended, an alternative and sometimes a risky option.', 'top');
  await ringSelector('.bunker-tablet [data-role="recommended"]');
  await sleep(5200);
  await ring(null);
  await say('Step 6 · Plan your Sol', 'Press Override to choose a different option instead. Then press End Sol.', 'top');
  await click('Override: choose', { startsWith: true, ms: 900 });
  await sleep(2200);
  await click('end Sol', { ms: 800 });
  await say('Step 6 · Plan your Sol', 'The Sol ends and the next one begins. Your supplies change every Sol.', 'top');
  await sleep(2800);
  const next = await emergencyButton();
  if (next) {
    await say('Step 6 · Plan your Sol', 'A new Sol can bring a new emergency. You can answer it with or without advice.', 'top');
    await sleep(2600);
    await clickEl(next, { ms: 900 });
    await sleep(1200);
  }
  await say('Step 6 · Plan your Sol', 'Open the Log to see what happened and why.', 'top');
  await click('Log', { exact: true, ms: 700 });
  await sleep(3300);
  // 7. Badges (make sure no emergency pop-up can cover the page first)
  for (let i = 0; i < 3; i += 1) {
    await click('Mission', { exact: true, ms: 600 });
    const pending = await emergencyButton();
    if (!pending) break;
    await clickEl(pending, { ms: 800 });
    await sleep(1000);
  }
  chapter('Earn badges');
  await say('Step 7 · Earn badges', 'Play well to earn XP, climb ranks and unlock badges. They stay with you across missions.', 'bottom');
  await click('Badges', { exact: true, ms: 900 });
  await sleep(4000);

  // Outro
  await page.evaluate(() => window.__tut.hideCaption());
  await sleep(500);
  await page.evaluate(() => window.__tut.card('You are ready, <b>Commander</b>', 'Watch your lowest bar, plan ahead, and keep your crew alive for 30 Sols. Good luck!'));
  await sleep(4200);
  t1 = now();
  await sleep(400);
  await client.send('Page.stopScreencast');
  if (problems.length) console.log('PAGE ERRORS DURING RECORDING:', problems);
} finally {
  await browser.close();
}

// --- Save ---------------------------------------------------------------------
frames.sort((a, b) => a.t - b.t);
const index = frames.map((f, i) => {
  const name = `f${String(i).padStart(5, '0')}.jpg`;
  fs.writeFileSync(path.join(outDir, 'frames', name), Buffer.from(f.data, 'base64'));
  return { t: f.t, file: name };
});
fs.writeFileSync(path.join(outDir, 'frames.json'), JSON.stringify({ t0, t1, frames: index }));
fs.writeFileSync(path.join(outDir, 'marks.json'), JSON.stringify(marks.map((m) => ({ title: m.title, start: Math.max(0, +(m.t - t0).toFixed(1)) })), null, 1));
console.log(`frames: ${frames.length}, duration: ${(t1 - t0).toFixed(1)}s`);
console.log(fs.readFileSync(path.join(outDir, 'marks.json'), 'utf8'));
