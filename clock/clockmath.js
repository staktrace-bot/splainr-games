// Pure clock math, shared by the game and the tests.
(function (root) {
  function hourAngle(h, m) { return ((h % 12) * 30 + m * 0.5) % 360; }
  function minuteAngle(m) { return (m * 6) % 360; }
  function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  // Level 2 scenes: hour (1-12), ampm, scene
  var SCENES = [
    { scene: 'morning', ampm: 'AM', hours: [6, 7, 8, 9, 10] },
    { scene: 'afternoon', ampm: 'PM', hours: [1, 2, 3, 4] },
    { scene: 'evening', ampm: 'PM', hours: [6, 7] },
    { scene: 'night', ampm: 'PM', hours: [8, 9, 10, 11] },
    { scene: 'latenight', ampm: 'AM', hours: [1, 2, 3, 4] }
  ];
  function makePuzzle(level) {
    var p = { level: level };
    if (level === 1) { p.h = randInt(1, 12); p.m = 0; p.showHour = p.showMin = true; }
    else if (level === 2) {
      var s = SCENES[randInt(0, SCENES.length - 1)];
      p.h = s.hours[randInt(0, s.hours.length - 1)]; p.m = 0; p.scene = s.scene; p.ampm = s.ampm;
      p.showHour = p.showMin = true;
    } else if (level === 3) { p.h = randInt(1, 12); p.m = randInt(0, 11) * 5; p.showHour = p.showMin = true; }
    else if (level === 4) { p.h = randInt(1, 12); p.m = randInt(0, 11) * 5; p.showHour = p.showMin = true; }
    else { p.h = randInt(1, 12); p.m = randInt(0, 59); p.showHour = p.showMin = true; }
    // For hour-only levels the hour hand points exactly at the number.
    p.hourAngle = hourAngle(p.h, p.m);
    p.minuteAngle = minuteAngle(p.m);
    p.key = (level === 3 ? [p.m] : [p.h, p.m, p.scene || '']).join(':'); // level 3: never repeat the same minute
    return p;
  }
  function nextPuzzle(level, prevKey) {
    var p; var n = 0;
    do { p = makePuzzle(level); n++; } while (p.key === prevKey && n < 50);
    return p;
  }
  function fields(level) {
    return level === 1 || level === 2 ? ['h'] : level === 3 ? ['m'] : ['h', 'm'];
  }
  function check(p, ans) {
    var f = fields(p.level);
    if (f.indexOf('h') >= 0 && (ans.h === '' || parseInt(ans.h, 10) !== p.h)) return false;
    if (f.indexOf('m') >= 0 && (ans.m === '' || parseInt(ans.m, 10) !== p.m)) return false;
    if (p.level === 2 && ans.ampm !== p.ampm) return false;
    return true;
  }
  function parseLevel(search) {
    var v = new URLSearchParams(search).get('level');
    var n = /^[1-5]$/.test(v || '') ? parseInt(v, 10) : 1;
    return n;
  }
  function fmt(p) {
    var mm = (p.m < 10 ? '0' : '') + p.m;
    if (p.level === 3) return mm + ' minutes';
    if (p.level <= 2) return p.h + " o'clock" + (p.ampm ? ' ' + p.ampm : '');
    return p.h + ':' + mm;
  }
  var api = { hourAngle: hourAngle, minuteAngle: minuteAngle, makePuzzle: makePuzzle, nextPuzzle: nextPuzzle, fields: fields, check: check, parseLevel: parseLevel, fmt: fmt, SCENES: SCENES };
  if (typeof module !== 'undefined') module.exports = api; else root.ClockMath = api;
})(this);
