const assert = require('assert');
const P = require('../parser.js');

function ok(src) {
  const r = P.parse(src);
  assert.ok(r.ok, (r.error && r.error.message) + ' (line ' + (r.error && r.error.line) + ')\n' + src);
  return r.ast;
}
function fail(src, /*, snippet */) {
  const r = P.parse(src);
  assert.ok(!r.ok, 'expected error for: ' + src);
  const snippets = Array.prototype.slice.call(arguments, 1);
  snippets.forEach(function (s) {
    assert.ok(r.error.message.indexOf(s) !== -1, 'error "' + r.error.message + '" should contain "' + s + '"');
  });
  return r.error;
}
function types(ast) { return ast.body.map(function (s) { return s.type + ':' + (s.name || ''); }); }

// --- basics ---
var a = ok('forward 50');
assert.strictEqual(a.body.length, 1);
assert.strictEqual(a.body[0].type, 'command');
assert.strictEqual(a.body[0].name, 'forward');
assert.strictEqual(a.body[0].args[0].type, 'num');
assert.strictEqual(a.body[0].args[0].value, 50);

ok('fd 50'); ok('go 10'); ok('fwd 3'); ok('forwards 3');
ok('back 20'); ok('bk 20'); ok('backward 1'); ok('backwards 1');

var two = ok('forward 50 right 90');
assert.strictEqual(two.body.length, 2);
assert.strictEqual(two.body[0].name, 'forward');
assert.strictEqual(two.body[1].name, 'right');

// case and spacing
var c = ok('  FORWARD   50\n\tRt 90  ');
assert.strictEqual(c.body[0].name, 'forward');
assert.strictEqual(c.body[1].name, 'right');

// comments
var cm = ok('; hello\nforward 10 // wow\nright 90');
assert.strictEqual(cm.body.length, 2);

// default 90 for turns
var t = ok('left\nright\nturn left\nturn right 45\nlt 30\nrt');
assert.strictEqual(t.body.length, 6);
assert.strictEqual(t.body[0].name, 'left');
assert.strictEqual(t.body[0].args.length, 0);
assert.strictEqual(t.body[2].name, 'left');
assert.strictEqual(t.body[2].args.length, 0);
assert.strictEqual(t.body[3].name, 'right');
assert.strictEqual(t.body[3].args[0].value, 45);
assert.strictEqual(t.body[5].args.length, 0);

// pen
var pn = ok('pen up pen down penup pendown pu pd');
assert.deepStrictEqual(pn.body.map(s => s.name), ['penup','pendown','penup','pendown','penup','pendown']);

// color both spellings + hex
var col = ok('color red colour blue color #ff00aa color #fff');
assert.strictEqual(col.body[0].args[0].value, 'red');
assert.strictEqual(col.body[1].args[0].value, 'blue');
assert.strictEqual(col.body[2].args[0].value, '#ff00aa');
assert.strictEqual(col.body[3].args[0].value, '#fff');

// width aliases
ok('width 4'); ok('size 2'); ok('pensize 3'); ok('penwidth 5');

// zero-arg
ok('home clear cs clearscreen hide ht hideturtle show st showturtle');

// --- repeat (including nested) ---
var r1 = ok('repeat 4 [ forward 80 right 90 ]');
assert.strictEqual(r1.body[0].type, 'repeat');
assert.strictEqual(r1.body[0].count.value, 4);
assert.strictEqual(r1.body[0].body.length, 2);
assert.strictEqual(r1.body[0].body[0].name, 'forward');
assert.strictEqual(r1.body[0].body[1].name, 'right');

var r2 = ok('repeat 4 [\n  forward 80\n  right 90\n]');
assert.strictEqual(r2.body[0].body.length, 2);

// no space before bracket
var r3 = ok('repeat 4[fd 50]');
assert.strictEqual(r3.body[0].type, 'repeat');
assert.strictEqual(r3.body[0].body[0].name, 'forward');

// empty body is ok
var r0 = ok('repeat 5 [ ]');
assert.strictEqual(r0.body[0].body.length, 0);

// nested two levels
var nest = ok('repeat 2 [ repeat 3 [ fd 10 rt 90 ] right 45 ]');
assert.strictEqual(nest.body[0].type, 'repeat');
assert.strictEqual(nest.body[0].count.value, 2);
assert.strictEqual(nest.body[0].body.length, 2);
assert.strictEqual(nest.body[0].body[0].type, 'repeat');
assert.strictEqual(nest.body[0].body[0].count.value, 3);
assert.strictEqual(nest.body[0].body[0].body.length, 2);
assert.strictEqual(nest.body[0].body[1].name, 'right');

// nested three levels
var nest3 = ok('repeat 2 [ repeat 2 [ repeat 2 [ fd 5 ] ] ]');
assert.strictEqual(nest3.body[0].body[0].body[0].type, 'repeat');
assert.strictEqual(nest3.body[0].body[0].body[0].body[0].name, 'forward');

// repeat count can be an expression
var rex = ok('repeat 2 + 2 [ fd 10 ]');
assert.strictEqual(rex.body[0].count.type, 'bin');
assert.strictEqual(rex.body[0].count.op, '+');

// multiline flower-like
ok(`color pink
repeat 12 [
  repeat 6 [
    forward 50
    right 60
  ]
  right 30
]`);

// --- subroutines ---
var sq = ok('to square :size\n  repeat 4 [ fd :size rt 90 ]\nend\nsquare 50');
assert.strictEqual(sq.body[0].type, 'to');
assert.strictEqual(sq.body[0].name, 'square');
assert.deepStrictEqual(sq.body[0].params, ['size']);
assert.strictEqual(sq.body[0].body[0].type, 'repeat');
assert.strictEqual(sq.body[1].type, 'call');
assert.strictEqual(sq.body[1].name, 'square');
assert.strictEqual(sq.body[1].args[0].value, 50);

var noP = ok('to hop\n fd 10\nend\nhop');
assert.deepStrictEqual(noP.body[0].params, []);
assert.strictEqual(noP.body[1].type, 'call');

var twoP = ok('to rect :w :h\n fd :w rt 90 fd :h rt 90 fd :w rt 90 fd :h rt 90\nend\nrect 40 20');
assert.deepStrictEqual(twoP.body[0].params, ['w', 'h']);
assert.strictEqual(twoP.body[1].args.length, 2);

// --- arithmetic ---
var ar = ok('forward :size / 2 + 10');
var e = ar.body[0].args[0];
assert.strictEqual(e.type, 'bin');
assert.strictEqual(e.op, '+');
assert.strictEqual(e.left.type, 'bin');
assert.strictEqual(e.left.op, '/');
assert.strictEqual(e.left.left.name, 'size');
assert.strictEqual(e.left.right.value, 2);

ok('forward 10 * 3 - 1');
ok('forward ( 4 + 6 ) / 2');
ok('forward -50');
ok('forward :size/2'); // no spaces
ok('forward (:size * 2)');

// unary minus tight
var um = ok('back -10');
assert.strictEqual(um.body[0].args[0].type, 'unary');

// --- errors are kid-readable and have a line ---
// Unknown words that are close to a builtin get a "Did you mean…?" parse error.
fail('forwrd 50', 'forwrd', 'forward');
fail('reapet 4 [ fd 1 ]', 'reapet', 'repeat');
fail('colr red', 'colr', 'color');
// A mystery word followed by "[" is probably a loop typo even if it's not close to "repeat".
fail('spin 4 [ fd 10 ]', '[');
// Completely unknown short names are left as calls (the interpreter may still suggest).
assert.strictEqual(ok('zz 50').body[0].type, 'call');

fail('repeat 4 forward 50', 'square brackets');
fail('repeat [ fd 10 ]', 'number first');
fail('repeat 4 [ fd 10', '"]"', 'finish this repeat');
fail('repeat', 'square brackets');
fail('to square :size\n fd :size\n', '"end"', 'to square');
fail('end', 'no recipe');
fail('to', 'name for your recipe');
fail('to forward\nend', 'built-in');
fail('turn 90', 'left or right');
fail('pen', 'pen up or pen down');
fail('color', 'name or a code');
fail('forward', 'needs a number');
fail('width', 'width needs a number');
fail(']', 'doesn\'t have a matching');
fail('to box\n  to nest\n  end\nend', 'inside another');
fail('repeat 2 [ to box fd 1 end ]', 'inside a repeat');
fail('forward 10 +', 'expecting a number');
fail('forward ( 1 + 2', '")"');

// line numbers
var el = fail('forward 10\nrepeat 4 [ fd 10');
assert.strictEqual(el.line, 2);

var el2 = fail('color red\nto star\n  fd 10\n');
assert.strictEqual(el2.line, 2);

// several statements after a repeat
var mix = ok('fd 10\nrepeat 2 [ rt 90 ]\nhome');
assert.deepStrictEqual(types(mix), ['command:forward', 'repeat:', 'command:home']);

console.log('parser tests passed');
