#!/usr/bin/env node
// Visual / layout tests for ButtPen. Uses system Chrome.
// Usage:
//   node buttpen/test/visual.js                         # serve repo, test locally
//   node buttpen/test/visual.js http://127.0.0.1:8765/buttpen/
//   node buttpen/test/visual.js https://staktrace-bot.github.io/splainr-games/buttpen/

const { chromium } = require('/tmp/pw/node_modules/playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const REPO = path.resolve(__dirname, '../..');
const SHOT_DIR = path.resolve(__dirname, 'screenshots');
const COPY_DIR = '/workspace/buttpen-screenshots';
fs.mkdirSync(SHOT_DIR, { recursive: true });
fs.mkdirSync(COPY_DIR, { recursive: true });

const SIZES = {
  desktop: { width: 1366, height: 768 },
  phone: { width: 390, height: 844 },
  short: { width: 390, height: 664 }
};

function mime(p) {
  const ext = path.extname(p).toLowerCase();
  return ({
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.json': 'application/json'
  })[ext] || 'application/octet-stream';
}

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      if (urlPath.endsWith('/')) urlPath += 'index.html';
      const file = path.normalize(path.join(REPO, urlPath));
      if (!file.startsWith(REPO)) { res.writeHead(403); res.end(); return; }
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); res.end('not found'); return; }
        res.writeHead(200, { 'content-type': mime(file), 'cache-control': 'no-store' });
        res.end(data);
      });
    });
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({ server, port, url: 'http://127.0.0.1:' + port + '/buttpen/' });
    });
    server.on('error', reject);
  });
}

function saveShot(buf, name) {
  const a = path.join(SHOT_DIR, name);
  const b = path.join(COPY_DIR, name);
  fs.writeFileSync(a, buf);
  fs.writeFileSync(b, buf);
  return a;
}

async function waitDone(page, timeout) {
  await page.waitForFunction(function () {
    var s = document.getElementById('status');
    return s && /Done|OK|All done/i.test(s.textContent || '');
  }, { timeout: timeout || 20000 });
}

async function runProgram(page, src) {
  const result = await page.evaluate(function (src) {
    return new Promise(function (resolve, reject) {
      document.getElementById('speed').value = 'instant';
      window.ButtPenApp.setSpeed('instant');
      try {
        window.ButtPenApp.runProgram(src, function (res) {
          if (!res) { resolve({ ok: false, status: document.getElementById('status').textContent }); return; }
          resolve({ ok: true, lines: res.lines.length, x: res.turtle.x, y: res.turtle.y, heading: res.turtle.heading });
        });
      } catch (e) { reject(String(e)); }
    });
  }, src);
  if (!result || !result.ok) throw new Error('runProgram failed: ' + JSON.stringify(result));
  await page.waitForTimeout(80);
  return result;
}

async function layoutReport(page) {
  return page.evaluate(function () {
    function box(el) {
      if (!el) return null;
      var r = el.getBoundingClientRect();
      var cs = getComputedStyle(el);
      return {
        id: el.id || el.className, x: r.x, y: r.y, w: r.width, h: r.height,
        top: r.top, bottom: r.bottom, left: r.left, right: r.right,
        visible: r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'
      };
    }
    function overlaps(a, b, pad) {
      pad = pad || 1;
      return a.right > b.left + pad && a.left < b.right - pad && a.bottom > b.top + pad && a.top < b.bottom - pad;
    }
    var ids = ['stage', 'panel', 'helpers', 'editorWrap', 'run', 'step', 'stop', 'clear', 'quick', 'status', 'picker', 'code'];
    var boxes = {};
    ids.forEach(function (id) { boxes[id] = box(document.getElementById(id)); });
    var vw = window.innerWidth, vh = window.innerHeight;
    var issues = [];
    ['helpers', 'editorWrap', 'run', 'quick', 'status'].forEach(function (id) {
      var b = boxes[id];
      if (!b || !b.visible) { issues.push(id + ' missing/invisible'); return; }
      if (b.bottom > vh + 2) issues.push(id + ' extends below the viewport (' + b.bottom.toFixed(0) + ' > ' + vh + ')');
      if (b.top < -2) issues.push(id + ' starts above the viewport');
    });
    if (boxes.stage && boxes.helpers && overlaps(boxes.stage, boxes.helpers, 2)) issues.push('stage overlaps helpers');
    if (boxes.stage && boxes.editorWrap && overlaps(boxes.stage, boxes.editorWrap, 2)) issues.push('stage overlaps editor');
    if (boxes.stage && boxes.quick && overlaps(boxes.stage, boxes.quick, 2)) issues.push('stage overlaps quick command');
    if (boxes.stage && boxes.status && overlaps(boxes.stage, boxes.status, 2) && boxes.status.h > 4) issues.push('stage overlaps status text');
    // Question-like text shouldn't sit under the canvas: the editor and helpers must be fully visible.
    if (boxes.stage && boxes.stage.h < 80) issues.push('stage is too short: ' + boxes.stage.h.toFixed(0));
    if (boxes.editorWrap && boxes.editorWrap.h < 40) issues.push('editor is too short: ' + boxes.editorWrap.h.toFixed(0));
    return { vw: vw, vh: vh, boxes: boxes, issues: issues };
  });
}

async function characterInfo(page) {
  return page.evaluate(function () {
    var actor = document.getElementById('actor');
    var paper = document.getElementById('paper');
    var stage = document.getElementById('stage');
    var ar = actor.getBoundingClientRect();
    var sr = stage.getBoundingClientRect();
    var pose = window.ButtPenApp.world.pose;
    var screen = window.ButtPenApp.world.worldToScreen(pose.x, pose.y);
    return {
      pose: pose,
      screen: screen,
      actor: { x: ar.x, y: ar.y, w: ar.width, h: ar.height, top: ar.top, bottom: ar.bottom, left: ar.left, right: ar.right },
      stage: { x: sr.x, y: sr.y, w: sr.width, h: sr.height },
      // Pen tip should sit at the turtle's world position, which maps to screen inside the stage.
      penInStage: {
        x: sr.left + screen.x,
        y: sr.top + screen.y
      }
    };
  });
}

async function main() {
  const argUrl = process.argv[2];
  let served = null;
  const base = argUrl || (served = await startServer(), served.url);
  console.log('Testing', base);

  const browser = await chromium.launch({
    executablePath: process.env.CHROME || '/usr/bin/google-chrome-stable',
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--font-render-hinting=none']
  });

  const failures = [];
  function check(cond, msg) {
    if (!cond) { failures.push(msg); console.error('FAIL:', msg); }
    else console.log('OK:', msg);
  }

  const examples = require(path.join(REPO, 'buttpen/examples.js'));
  const square = examples.EXAMPLES.find(e => e.id === 'square').code;
  const star = examples.EXAMPLES.find(e => e.id === 'star').code;

  async function open(sizeName) {
    const size = SIZES[sizeName];
    const context = await browser.newContext({
      viewport: size,
      deviceScaleFactor: sizeName === 'desktop' ? 1 : 2,
      userAgent: 'Mozilla/5.0 (ButtPenTest)'
    });
    const page = await context.newPage();
    page.on('pageerror', e => console.error('pageerror', sizeName, e.message));
    await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => window.ButtPenApp, { timeout: 15000 });
    // Don't let a leftover program from localStorage surprise us.
    return { context, page, size };
  }

  // ---- Desktop: square drawing ----
  {
    const { context, page } = await open('desktop');
    await page.evaluate(() => { document.getElementById('speed').value = 'instant'; window.ButtPenApp.setSpeed('instant'); });
    await runProgram(page, square);
    const lay = await layoutReport(page);
    console.log('desktop layout', JSON.stringify({ vw: lay.vw, vh: lay.vh, stage: lay.boxes.stage, panel: lay.boxes.panel, issues: lay.issues }));
    lay.issues.forEach(i => failures.push('desktop: ' + i));
    check(lay.boxes.stage && lay.boxes.stage.w > 400, 'desktop stage is wide');
    check(lay.boxes.panel && lay.boxes.panel.x > lay.boxes.stage.x, 'desktop is side-by-side (panel to the right of stage)');
    const ch = await characterInfo(page);
    console.log('desktop character', JSON.stringify(ch.pose), 'pen', ch.penInStage);
    check(Math.abs(ch.pose.x) < 1 && Math.abs(ch.pose.y) < 1, 'after square, character is back at the origin');
    check(Math.abs(((ch.pose.heading % 360) + 360) % 360) < 1, 'after square, character faces up (heading 0)');
    const shot = await page.screenshot({ fullPage: false });
    const p = saveShot(shot, 'desktop-drawing.png');
    console.log('wrote', p);
    await context.close();
  }

  // ---- Phone 390x844: star + layout ----
  {
    const { context, page } = await open('phone');
    await runProgram(page, star);
    const lay = await layoutReport(page);
    console.log('phone layout', JSON.stringify({ vw: lay.vw, vh: lay.vh, stage: lay.boxes.stage, helpers: lay.boxes.helpers, editor: lay.boxes.editorWrap, issues: lay.issues }));
    lay.issues.forEach(i => failures.push('phone: ' + i));
    check(lay.boxes.panel && lay.boxes.stage && lay.boxes.panel.y >= lay.boxes.stage.bottom - 2,
      'phone is stacked (panel below stage)');
    const ch = await characterInfo(page);
    check(Math.abs(ch.pose.x) < 1 && Math.abs(ch.pose.y) < 1, 'after star, character is back at the origin');
    const shot = await page.screenshot({ fullPage: false });
    const p = saveShot(shot, 'phone.png');
    console.log('wrote', p);
    await context.close();
  }

  // ---- Short phone 390x664: no overlap ----
  {
    const { context, page } = await open('short');
    await runProgram(page, square);
    const lay = await layoutReport(page);
    console.log('short layout', JSON.stringify({ vw: lay.vw, vh: lay.vh, boxes: {
      stage: lay.boxes.stage, helpers: lay.boxes.helpers, editor: lay.boxes.editorWrap,
      run: lay.boxes.run, quick: lay.boxes.quick, status: lay.boxes.status
    }, issues: lay.issues }));
    lay.issues.forEach(i => failures.push('short: ' + i));
    check(lay.boxes.stage && lay.boxes.helpers && lay.boxes.helpers.y >= lay.boxes.stage.bottom - 2,
      'short phone: helpers sit below the canvas, not under it');
    const shot = await page.screenshot({ fullPage: false });
    const p = saveShot(shot, 'phone-short.png');
    console.log('wrote', p);
    await context.close();
  }

  // ---- Character picker (desktop, no need to run a program first; show picker clearly) ----
  {
    const { context, page } = await open('desktop');
    // Open on a fresh page so the picker in the header is visible; click kitty to show selection.
    await page.evaluate(() => window.ButtPenApp.chooseCharacter('kitty'));
    // Scroll picker into view if needed and screenshot the header + picker area, plus a full page shot.
    const picker = page.locator('#picker');
    await picker.waitFor();
    const full = await page.screenshot({ fullPage: false });
    saveShot(full, 'character-picker-full.png');
    const header = page.locator('header');
    const hshot = await header.screenshot();
    const p = saveShot(hshot, 'character-picker.png');
    console.log('wrote', p);
    const count = await page.locator('#picker button').count();
    check(count >= 6, 'character picker has at least 6 avatars (got ' + count + ')');
    const selected = await page.locator('#picker button[aria-selected="true"]').getAttribute('data-id');
    check(selected === 'kitty', 'kitty is selected in the picker');
    await context.close();
  }

  // Also take a desktop flower shot for a richer drawing screenshot (optional extra)
  {
    const { context, page } = await open('desktop');
    const flower = examples.EXAMPLES.find(e => e.id === 'flower').code;
    await page.evaluate(() => window.ButtPenApp.chooseCharacter('unicorn'));
    await runProgram(page, flower);
    const shot = await page.screenshot({ fullPage: false });
    saveShot(shot, 'desktop-flower.png');
    await context.close();
  }

  await browser.close();
  if (served) served.server.close();

  if (failures.length) {
    console.error('\n' + failures.length + ' failure(s):');
    failures.forEach(f => console.error(' - ' + f));
    process.exit(1);
  }
  console.log('\nAll visual tests passed');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
