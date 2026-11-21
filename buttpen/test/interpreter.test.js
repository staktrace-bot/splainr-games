const assert = require('assert');
const I = require('../interpreter.js');

const near = (a, b, eps) => assert.ok(Math.abs(a - b) < (eps || 1e-6), a + ' != ' + b + ' (eps ' + (eps || 1e-6) + ')');
const nearPt = (t, x, y) => { near(t.x, x); near(t.y, y); };

function run(src, opts) {
  const r = I.parseAndRun(src, opts);
  assert.ok(r.ok, (r.error && r.error.message) + ' (line ' + (r.error && r.error.line) + ')\n---\n' + src);
  return r;
}
function fail(src, opts) {
  const rest = Array.prototype.slice.call(arguments, 1);
  let options = {};
  let snippets = rest;
  if (rest[0] && typeof rest[0] === 'object' && !Array.isArray(rest[0])) {
    options = rest[0];
    snippets = rest.slice(1);
  }
  const r = I.parseAndRun(src, options);
  assert.ok(!r.ok, 'expected error for: ' + src);
  snippets.forEach(function (s) {
    assert.ok(r.error.message.indexOf(s) !== -1, 'error "' + r.error.message + '" should contain "' + s + '"');
  });
  return r.error;
}

// --- primitive commands ---
var f = run('forward 80');
nearPt(f.turtle, 0, 80);
near(f.turtle.heading, 0);
assert.strictEqual(f.lines.length, 1);
near(f.lines[0].y2, 80);

var b = run('back 20');
nearPt(b.turtle, 0, -20);

var turn = run('right 90 forward 50');
near(turn.turtle.heading, 90);
nearPt(turn.turtle, 50, 0);

var left = run('left 90 forward 50');
near(left.turtle.heading, 270);
nearPt(left.turtle, -50, 0);

// default 90
var d = run('right forward 10');
near(d.turtle.heading, 90);
nearPt(d.turtle, 10, 0);
run('turn left 90'); // just shouldn't throw

// pen up does not draw
var pu = run('pen up forward 40');
assert.strictEqual(pu.lines.length, 0);
nearPt(pu.turtle, 0, 40);
assert.strictEqual(pu.turtle.penDown, false);

var pd = run('pen up forward 10 pen down back 10');
assert.strictEqual(pd.lines.length, 1);
assert.strictEqual(pd.turtle.penDown, true);

// color names, spelling, hex
var c1 = run('color red forward 1');
assert.strictEqual(c1.turtle.color, '#e63946');
var c2 = run('colour #0f0 forward 1');
assert.strictEqual(c2.turtle.color, '#00ff00');
var c3 = run('color #336699 forward 1');
assert.strictEqual(c3.turtle.color, '#336699');

var w = run('width 7 forward 1');
assert.strictEqual(w.turtle.width, 7);
assert.strictEqual(w.lines[0].width, 7);

var hid = run('hide');
assert.strictEqual(hid.turtle.visible, false);
assert.strictEqual(run('hide show').turtle.visible, true);

// home draws if pen down, and resets heading
var hm = run('forward 30 right 90 home');
nearPt(hm.turtle, 0, 0);
near(hm.turtle.heading, 0);
assert.ok(hm.lines.length >= 2);

// clear wipes lines and homes
var cl = run('forward 40 right 90 forward 10 clear forward 5');
assert.strictEqual(cl.lines.length, 1);
nearPt(cl.turtle, 0, 5);
near(cl.turtle.heading, 0);

// --- square closes, heading restored ---
var sq = run('repeat 4 [ forward 80 right 90 ]');
nearPt(sq.turtle, 0, 0);
near(sq.turtle.heading, 0);
assert.strictEqual(sq.lines.length, 4);
// sides: (0,0)->(0,80)->(80,80)->(80,0)->(0,0)
nearPt({ x: sq.lines[0].x2, y: sq.lines[0].y2 }, 0, 80);
nearPt({ x: sq.lines[1].x2, y: sq.lines[1].y2 }, 80, 80);
nearPt({ x: sq.lines[2].x2, y: sq.lines[2].y2 }, 80, 0);
nearPt({ x: sq.lines[3].x2, y: sq.lines[3].y2 }, 0, 0);
// first point of first line is origin
nearPt({ x: sq.lines[0].x1, y: sq.lines[0].y1 }, 0, 0);

// square with multiline and aliases
var sq2 = run('repeat 4 [\n  fd 80\n  rt 90\n]');
nearPt(sq2.turtle, 0, 0);
assert.strictEqual(sq2.lines.length, 4);

// repeat 0 draws nothing
var z = run('repeat 0 [ fd 50 ]');
assert.strictEqual(z.lines.length, 0);
nearPt(z.turtle, 0, 0);

// repeat with expression count
var re = run('repeat 2 + 2 [ fd 10 rt 90 ]');
nearPt(re.turtle, 0, 0);
assert.strictEqual(re.lines.length, 4);

// --- nested repeats ---
// 2x3: six moves of 10, turning 90 each time → but that's not a closed shape.
// Better: a grid-like or "square of squares".
// repeat 2 [ repeat 2 [ fd 10 rt 90 ] ]  → 4 sides of 10, a square (2*2)
var nsq = run('repeat 2 [ repeat 2 [ fd 10 rt 90 ] ]');
nearPt(nsq.turtle, 0, 0);
assert.strictEqual(nsq.lines.length, 4);

// nested: 4 squares rotated (like a simple flower)
var flower = run('repeat 4 [ repeat 4 [ fd 30 rt 90 ] rt 90 ]');
nearPt(flower.turtle, 0, 0);
near(flower.turtle.heading, 0);
assert.strictEqual(flower.lines.length, 16);

// three-level nest: 2*2*2 = 8 forward 5
var n3 = run('repeat 2 [ repeat 2 [ repeat 2 [ fd 5 ] ] ]');
assert.strictEqual(n3.lines.length, 8);
nearPt(n3.turtle, 0, 40);

// hexagon flower (matches an example): 12 * 6 sides
var hexf = run('repeat 12 [ repeat 6 [ forward 50 right 60 ] right 30 ]');
nearPt(hexf.turtle, 0, 0);
assert.strictEqual(hexf.lines.length, 72);

// star with 5 points, closes
var star = run('repeat 5 [ forward 100 right 144 ]');
nearPt(star.turtle, 0, 0);
near(star.turtle.heading, 0);
assert.strictEqual(star.lines.length, 5);
// each vertex should be 100 from previous
star.lines.forEach(function (ln) {
  var dx = ln.x2 - ln.x1, dy = ln.y2 - ln.y1;
  near(Math.sqrt(dx * dx + dy * dy), 100, 1e-6);
});

// --- subroutines with params ---
var box = run('to square :size\n  repeat 4 [ fd :size rt 90 ]\nend\nsquare 50');
nearPt(box.turtle, 0, 0);
assert.strictEqual(box.lines.length, 4);
near(Math.abs(box.lines[0].y2 - box.lines[0].y1), 50);

// arithmetic in the call and in the body
var half = run('to square :size\n  repeat 4 [ fd :size / 2 rt 90 ]\nend\nsquare 100');
nearPt(half.turtle, 0, 0);
near(Math.abs(half.lines[0].y2 - half.lines[0].y1), 50);

var callArith = run('to square :size\n  repeat 4 [ fd :size rt 90 ]\nend\nsquare 40 + 10');
near(Math.abs(callArith.lines[0].y2 - callArith.lines[0].y1), 50);

var twoArg = run('to rect :w :h\n  fd :w rt 90 fd :h rt 90 fd :w rt 90 fd :h rt 90\nend\nrect 80 20');
nearPt(twoArg.turtle, 0, 0);
assert.strictEqual(twoArg.lines.length, 4);
near(Math.abs(twoArg.lines[0].y2 - twoArg.lines[0].y1), 80);
near(Math.abs(twoArg.lines[1].x2 - twoArg.lines[1].x1), 20);

// recipe with no params
var hop = run('to hop\n fd 10\nend\nhop hop hop');
nearPt(hop.turtle, 0, 30);
assert.strictEqual(hop.lines.length, 3);

// define after... actually collectProcs registers all first, so call-before-define works
var later = run('box 20\nto box :s\n repeat 4 [ fd :s rt 90 ]\nend');
nearPt(later.turtle, 0, 0);
assert.strictEqual(later.lines.length, 4);

// procedures from options (REPL)
var pre = run('to square :size\n  repeat 4 [ fd :size rt 90 ]\nend');
var repl = run('square 30', { procedures: pre.procedures });
nearPt(repl.turtle, 0, 0);
assert.strictEqual(repl.lines.length, 4);

// arithmetic extras
near(run('forward 10 * 3 - 1').turtle.y, 29);
near(run('forward (4 + 6) / 2').turtle.y, 5);
near(run('forward -50').turtle.y, -50);
near(run('forward 8 / 2 / 2').turtle.y, 2); // left associative

// --- error messages ---
var typo = fail('forwrd 50', 'forwrd', 'forward');
assert.strictEqual(typo.line, 1);

fail('reapet 4 [ fd 1 ]', 'reapet', 'repeat');
fail('color blurple', 'blurple');
fail('forward 10 / 0', 'divide by zero');
fail('to square :size\n  fd :size\nend\nsquare', 'needs 1 number', 'square');
fail('to hop\n fd 1\nend\nhop 5', 'needs 0 number');
fail('fd :size', 'don\'t know :size');
fail('to box\n fd 1\nend\nto box\n fd 2\nend', 'already have a recipe');

// typo suggestion inside a loop still has a useful line
var typo2 = fail('repeat 2 [\n  forwrd 10\n]');
assert.ok(typo2.message.indexOf('forward') !== -1);
assert.strictEqual(typo2.line, 2);

// --- step cap (infinite-ish loops) ---
var cap = fail('repeat 10000 [ fd 1 ]', { maxSteps: 50 }, 'long drawing', '50');
assert.ok(cap.line >= 1);

// cap fires inside nested loops too
fail('repeat 100 [ repeat 100 [ fd 1 ] ]', { maxSteps: 80 }, 'long drawing');

// --- recursion cap ---
var rec = fail('to loop\n  loop\nend\nloop', { maxDepth: 8 }, 'too many times');
assert.ok(rec.line >= 1);

// recursion cap with a growing spiral that never stops
fail('to spiral :n\n  fd :n\n  rt 90\n  spiral :n + 1\nend\nspiral 1', { maxDepth: 10, maxSteps: 5000 }, 'too many times');

// hide/show and width don't get lost through a loop
var mixed = run('width 6 color orange repeat 2 [ fd 5 ]');
assert.strictEqual(mixed.turtle.color, I.COLOR_NAMES.orange);
assert.strictEqual(mixed.turtle.width, 6);
assert.strictEqual(mixed.lines[1].color, I.COLOR_NAMES.orange);

// heading normalization: 360 rights
var spin = run('repeat 4 [ right 90 ]');
near(spin.turtle.heading, 0);

console.log('interpreter tests passed');

// --- shipped example programs ---
const E = require('../examples.js');
(function () {
  const near = (a, b, eps) => assert.ok(Math.abs(a - b) < (eps || 1e-6), a + ' != ' + b);
  const sq = I.parseAndRun(E.EXAMPLES.find(e => e.id === 'square').code);
  assert.ok(sq.ok, sq.error && sq.error.message);
  assert.strictEqual(sq.lines.length, 4);
  near(sq.turtle.x, 0); near(sq.turtle.y, 0); near(sq.turtle.heading, 0);

  const star = I.parseAndRun(E.EXAMPLES.find(e => e.id === 'star').code);
  assert.ok(star.ok, star.error && star.error.message);
  assert.strictEqual(star.lines.length, 5);
  near(star.turtle.x, 0); near(star.turtle.y, 0); near(star.turtle.heading, 0);

  const flower = I.parseAndRun(E.EXAMPLES.find(e => e.id === 'flower').code);
  assert.ok(flower.ok, flower.error && flower.error.message);
  assert.strictEqual(flower.lines.length, 72);
  near(flower.turtle.x, 0, 1e-6); near(flower.turtle.y, 0, 1e-6);

  const house = I.parseAndRun(E.EXAMPLES.find(e => e.id === 'house').code);
  assert.ok(house.ok, house.error && house.error.message);
  assert.ok(house.lines.length >= 7);
  // house uses the box subroutine (4 sides) plus a 2-or-3-segment roof
  assert.ok(house.procedures.box, 'box recipe defined');

  const def = I.parseAndRun(E.DEFAULT_PROGRAM);
  assert.ok(def.ok, def.error && def.error.message);
  assert.strictEqual(def.lines.length, 4);
})();
console.log('example program tests passed');
