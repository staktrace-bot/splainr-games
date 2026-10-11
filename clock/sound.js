// Web Audio sound effects (no files needed).
var Sound = (function () {
  var ctx = null, muted = localStorage.getItem('splainr-muted') === '1';
  function unlock() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    // play a silent buffer (iOS unlock)
    var b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource();
    s.buffer = b; s.connect(ctx.destination); s.start(0);
  }
  ['pointerdown', 'touchend', 'keydown', 'click'].forEach(function (ev) {
    window.addEventListener(ev, unlock, { capture: true, passive: true });
  });
  function tone(freq, start, dur, type, vol) {
    if (!ctx || muted) return;
    var t = ctx.currentTime + start;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.25, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + dur + 0.05);
  }
  return {
    right: function () { tone(784, 0, 0.5, 'sine', 0.22); tone(1175, 0.1, 0.6, 'sine', 0.18); tone(1568, 0.2, 0.7, 'triangle', 0.08); },
    wrong: function () {
      // playful descending "uh-oh": two notes (G4 -> D4), triangle + sine + a little square, slight wobble
      if (!ctx || muted) return;
      [[392, 0, 0.2], [294, 0.2, 0.28]].forEach(function (n) {
        var t = ctx.currentTime + n[1], end = t + n[2];
        var g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
        lfo.frequency.value = 9; lg.gain.value = n[0] * 0.02; lfo.connect(lg);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(1, t + 0.02);
        g.gain.setValueAtTime(1, end - 0.08);
        g.gain.exponentialRampToValueAtTime(0.0001, end);
        g.connect(ctx.destination);
        [['triangle', 0.11], ['sine', 0.08], ['square', 0.016]].forEach(function (w) {
          var o = ctx.createOscillator(), og = ctx.createGain();
          o.type = w[0]; o.frequency.setValueAtTime(n[0] * 1.03, t);
          o.frequency.exponentialRampToValueAtTime(n[0], t + 0.06);
          lg.connect(o.frequency); og.gain.value = w[1];
          o.connect(og); og.connect(g); o.start(t); o.stop(end + 0.02);
        });
        lfo.start(t); lfo.stop(end + 0.02);
      });
    },
    fanfare: function () {
      [[523, 0, .18], [659, .18, .18], [784, .36, .18], [1047, .54, .7]].forEach(function (n) {
        tone(n[0], n[1], n[2] + 0.15, 'triangle', 0.22); tone(n[0] / 2, n[1], n[2] + 0.15, 'sine', 0.12);
      });
      [1047, 1319, 1568].forEach(function (f) { tone(f, 0.54, 0.9, 'sine', 0.08); });
    },
    // test hook: render a sound into a given (offline) context
    _render: function (name, c) { var old = ctx, m = muted; ctx = c; muted = false; this[name](); ctx = old; muted = m; },
    isMuted: function () { return muted; },
    toggle: function () { muted = !muted; localStorage.setItem('splainr-muted', muted ? '1' : '0'); return muted; }
  };
})();
