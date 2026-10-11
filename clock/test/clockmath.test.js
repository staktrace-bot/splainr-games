const assert = require('assert');
const CM = require('../clockmath.js');
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, a + ' != ' + b);
near(CM.hourAngle(12, 0), 0); near(CM.hourAngle(3, 0), 90); near(CM.hourAngle(6, 0), 180); near(CM.hourAngle(9, 0), 270);
near(CM.hourAngle(2, 30), 75);      // halfway between 2 (60) and 3 (90)
near(CM.hourAngle(11, 45), 352.5); near(CM.hourAngle(12, 30), 15);
near(CM.minuteAngle(0), 0); near(CM.minuteAngle(15), 90); near(CM.minuteAngle(30), 180); near(CM.minuteAngle(59), 354);
const hours3 = new Set();
for (let lvl = 1; lvl <= 5; lvl++) {
  let prev = null;
  for (let i = 0; i < 2000; i++) {
    const p = CM.nextPuzzle(lvl, prev);
    assert.notStrictEqual(p.key, prev, 'immediate repeat');
    prev = p.key;
    assert.ok(p.h >= 1 && p.h <= 12 && p.m >= 0 && p.m <= 59);
    assert.ok(p.showHour && p.showMin, 'both hands shown on every level');
    if (lvl <= 2) { assert.strictEqual(p.m, 0); near(p.hourAngle, (p.h % 12) * 30); near(p.minuteAngle, 0); }
    if (lvl === 3 || lvl === 4) assert.strictEqual(p.m % 5, 0);
    if (lvl >= 3) near(p.minuteAngle, p.m * 6);
    if (lvl >= 3) near(p.hourAngle, ((p.h % 12) * 30 + p.m / 2) % 360);
    if (lvl === 3) { hours3.add(p.h); assert.deepStrictEqual(CM.fields(3), ['m']); }
    if (lvl === 2) {
      assert.notStrictEqual(p.h, 12);
      const ok = { morning: ['AM', [6,7,8,9,10]], afternoon: ['PM', [1,2,3,4]], evening: ['PM', [6,7]], night: ['PM', [8,9,10,11]], latenight: ['AM', [1,2,3,4]] }[p.scene];
      assert.strictEqual(p.ampm, ok[0]); assert.ok(ok[1].includes(p.h));
    }
  }
}
assert.strictEqual(hours3.size, 12, 'level 3 uses random hours');
near(CM.hourAngle(4, 30), 135); near(CM.hourAngle(7, 15), 217.5);
const p3 = { level: 3, h: 12, m: 0 };
assert.ok(CM.check(p3, { h: '', m: '0' })); assert.ok(CM.check(p3, { h: '', m: '00' })); assert.ok(!CM.check(p3, { h: '', m: '' }));
assert.ok(CM.check({ level: 2, h: 9, m: 0, ampm: 'PM' }, { h: '9', m: '', ampm: 'PM' }));
assert.ok(!CM.check({ level: 2, h: 9, m: 0, ampm: 'PM' }, { h: '9', m: '', ampm: 'AM' }));
assert.ok(CM.check({ level: 5, h: 4, m: 7 }, { h: '4', m: '07' }));
['?level=0', '?level=6', '?level=abc', '', '?level=2.5'].forEach(s => assert.strictEqual(CM.parseLevel(s), 1));
assert.strictEqual(CM.parseLevel('?level=4'), 4);
console.log('clockmath tests passed');
