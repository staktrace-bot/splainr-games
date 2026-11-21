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
const { execFileSync } = require('child_process');

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

async function getState(page) {
  return page.evaluate(() => window.ButtPenApp.getState());
}

async function runQuick(page, src) {
  const result = await page.evaluate(function (src) {
    return window.ButtPenApp.runQuick(src);
  }, src);
  await page.waitForTimeout(50);
  return result;
}

async function sampleWorld(page, x, y) {
  return page.evaluate(function (pt) {
    var world = window.ButtPenApp.world;
    var s = world.worldToScreen(pt.x, pt.y);
    var canvas = world.canvas;
    var dpr = window.devicePixelRatio || 1;
    var px = Math.round(s.x * dpr);
    var py = Math.round(s.y * dpr);
    var data = world.ctx.getImageData(px, py, 1, 1).data;
    return { r: data[0], g: data[1], b: data[2], a: data[3], sx: s.x, sy: s.y, px: px, py: py };
  }, { x: x, y: y });
}

// True if this canvas pixel looks like ink, not the cream graph paper.
function isInk(px) {
  if (!px || px.a < 200) return false;
  // paper is #fffdf7 (~255,253,247); grid lines are very light blue-grey
  var paperDist = Math.abs(px.r - 255) + Math.abs(px.g - 253) + Math.abs(px.b - 247);
  var gridish = px.r > 200 && px.g > 210 && px.b > 210;
  return paperDist > 80 && !gridish;
}

function lineStartsAt(lines, x, y, eps) {
  eps = eps || 1e-6;
  return lines.some(function (ln) {
    return (Math.abs(ln.x1 - x) < eps && Math.abs(ln.y1 - y) < eps) ||
           (Math.abs(ln.x2 - x) < eps && Math.abs(ln.y2 - y) < eps);
  });
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

  // ---- Print: only the drawing, with caption, no UI chrome ----
  {
    const { context, page } = await open('desktop');
    check((await page.locator('#print').count()) === 1, 'Print button is on the page, next to Save picture');
    await runProgram(page, square);
    const dataUrl = await page.evaluate(() => window.ButtPenApp.preparePrint({ includeCharacter: true }));
    check(typeof dataUrl === 'string' && dataUrl.indexOf('data:image/png') === 0, 'preparePrint returns a PNG data URL');
    const loaded = await page.evaluate(() => {
      var img = document.getElementById('printImg');
      return !!(img && img.complete && img.naturalWidth > 10);
    });
    check(loaded, 'print <img> has loaded before print');

    await page.emulateMedia({ media: 'print' });
    const info = await page.evaluate(() => {
      var app = document.getElementById('app');
      var sheet = document.getElementById('printSheet');
      var cap = document.querySelector('#printSheet figcaption');
      var helpers = document.getElementById('helpers');
      var code = document.getElementById('code');
      return {
        appDisplay: getComputedStyle(app).display,
        sheetDisplay: getComputedStyle(sheet).display,
        sheetPosition: getComputedStyle(sheet).position,
        caption: cap && cap.textContent.trim(),
        helpersDisplay: getComputedStyle(helpers).display,
        codeDisplay: getComputedStyle(code).display,
        bodyText: document.body.innerText.replace(/\s+/g, ' ').trim()
      };
    });
    console.log('print media', JSON.stringify(info));
    check(info.appDisplay === 'none', 'print media hides the app UI chrome');
    check(info.caption === 'Made with ButtPen', 'print caption says Made with ButtPen');
    check(info.bodyText.indexOf('Made with ButtPen') !== -1, 'print text includes the caption');
    check(info.bodyText.indexOf('Forward') === -1, 'print text does not include helper buttons');
    check(info.bodyText.indexOf('Quick command') === -1, 'print text does not include the editor chrome');

    const printShot = await page.screenshot({ fullPage: true });
    saveShot(printShot, 'print-emulate.png');

    const pdfPath = path.join(SHOT_DIR, 'print-preview.pdf');
    await page.pdf({
      path: pdfPath,
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true
    });
    fs.copyFileSync(pdfPath, path.join(COPY_DIR, 'print-preview.pdf'));
    console.log('wrote', pdfPath);

    const prefix = path.join(SHOT_DIR, 'print-preview');
    execFileSync('pdftoppm', ['-png', '-r', '150', '-singlefile', pdfPath, prefix]);
    const pngPath = prefix + '.png';
    if (!fs.existsSync(pngPath)) {
      // some pdftoppm versions ignore -singlefile and write -1.png
      const alt = prefix + '-1.png';
      if (fs.existsSync(alt)) fs.renameSync(alt, pngPath);
    }
    check(fs.existsSync(pngPath), 'pdftoppm wrote a print-preview PNG');
    if (fs.existsSync(pngPath)) {
      fs.copyFileSync(pngPath, path.join(COPY_DIR, 'print-preview.png'));
      console.log('wrote', pngPath);
    }
    await context.close();
  }

  // ---- Regression: quick commands must add to the current drawing, not erase it ----
  async function assertQuickAppends(sizeName, takeShots) {
    const { context, page } = await open(sizeName);
    await runProgram(page, square);
    const before = await getState(page);
    check(before.lines.length === 4, sizeName + ': square has 4 lines before quick commands (got ' + before.lines.length + ')');
    const prev = { x: before.turtle.x, y: before.turtle.y, heading: before.turtle.heading };
    check(Math.abs(prev.x) < 1e-6 && Math.abs(prev.y) < 1e-6, sizeName + ': after square, character is at the origin');

    // A point on the right side of the square, not on the later quick-command strokes.
    const rightSide = await sampleWorld(page, 80, 40);
    const topSide = await sampleWorld(page, 40, 80);
    console.log(sizeName, 'before pixels', JSON.stringify({ rightSide, topSide, prev }));
    check(isInk(rightSide), sizeName + ': right side of the square is drawn before quick commands (got ' + JSON.stringify(rightSide) + ')');
    check(isInk(topSide), sizeName + ': top side of the square is drawn before quick commands (got ' + JSON.stringify(topSide) + ')');

    if (takeShots) {
      const shot = await page.locator('#stage').screenshot();
      saveShot(shot, 'quick-before.png');
    }

    const first = await runQuick(page, 'fd 50');
    check(first && first.ok, sizeName + ': fd 50 quick command ran');
    const mid = await getState(page);
    check(mid.lines.length === 5, sizeName + ': after fd 50, drawing has 5 lines (square + new one), got ' + mid.lines.length);
    check(lineStartsAt(mid.lines, prev.x, prev.y), sizeName + ': new line starts at the character\'s previous position (' + prev.x + ',' + prev.y + ')');
    check(Math.abs(mid.turtle.x - prev.x) < 1e-6 && Math.abs(mid.turtle.y - 50) < 1e-6,
      sizeName + ': after fd 50 the character is at (0, 50), got (' + mid.turtle.x + ', ' + mid.turtle.y + ')');

    const second = await runQuick(page, 'rt 45 fd 30');
    check(second && second.ok, sizeName + ': rt 45 fd 30 quick command ran');
    const after = await getState(page);
    check(after.lines.length === 6, sizeName + ': after both quick commands, drawing has 6 lines, got ' + after.lines.length);
    check(lineStartsAt(after.lines, 0, 50), sizeName + ': second new line starts where fd 50 ended (0, 50)');

    const rightAfter = await sampleWorld(page, 80, 40);
    const topAfter = await sampleWorld(page, 40, 80);
    console.log(sizeName, 'after pixels', JSON.stringify({ rightAfter, topAfter, turtle: after.turtle, lineCount: after.lines.length }));
    check(isInk(rightAfter), sizeName + ': right side of the square is still there after quick commands (got ' + JSON.stringify(rightAfter) + ')');
    check(isInk(topAfter), sizeName + ': top side of the square is still there after quick commands (got ' + JSON.stringify(topAfter) + ')');

    if (takeShots) {
      const shot = await page.locator('#stage').screenshot();
      saveShot(shot, 'quick-after.png');
    }

    // Changing character, speed, example, resizing, Save and Print must not wipe the drawing.
    const n = after.lines.length;
    await page.evaluate(function () {
      window.ButtPenApp.chooseCharacter('puppy');
      window.ButtPenApp.setSpeed('fast');
      var sel = document.getElementById('examples');
      sel.value = 'star';
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.evaluate(function () { window.ButtPenApp.world.resize(); });
    await page.evaluate(function () { return window.ButtPenApp.preparePrint({ includeCharacter: true }); });
    await page.evaluate(function () {
      return new Promise(function (resolve) { window.ButtPenApp.world.toPNG(function (url) { resolve(!!url); }); });
    });
    const still = await getState(page);
    check(still.lines.length === n, sizeName + ': character/speed/example/resize/save/print left the ' + n + ' lines in place (got ' + still.lines.length + ')');
    const rightStill = await sampleWorld(page, 80, 40);
    check(isInk(rightStill), sizeName + ': square ink is still on the canvas after character/speed/example/resize/save/print');

    await context.close();
  }

  await assertQuickAppends('desktop', true);
  await assertQuickAppends('phone', false);

  // Side-by-side before/after for the report
  {
    const before = path.join(COPY_DIR, 'quick-before.png');
    const after = path.join(COPY_DIR, 'quick-after.png');
    const out = path.join(COPY_DIR, 'quick-before-after.png');
    if (fs.existsSync(before) && fs.existsSync(after)) {
      execFileSync('python3', [path.join(__dirname, 'montage.py'), before, after, out]);
      fs.copyFileSync(out, path.join(SHOT_DIR, 'quick-before-after.png'));
      console.log('wrote', out);
    }
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
