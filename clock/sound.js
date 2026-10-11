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
      if (!ctx || muted) return;
      var t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(330, t); o.frequency.exponentialRampToValueAtTime(220, t + 0.3);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 0.45);
    },
    fanfare: function () {
      [[523, 0, .18], [659, .18, .18], [784, .36, .18], [1047, .54, .7]].forEach(function (n) {
        tone(n[0], n[1], n[2] + 0.15, 'triangle', 0.22); tone(n[0] / 2, n[1], n[2] + 0.15, 'sine', 0.12);
      });
      [1047, 1319, 1568].forEach(function (f) { tone(f, 0.54, 0.9, 'sine', 0.08); });
    },
    isMuted: function () { return muted; },
    toggle: function () { muted = !muted; localStorage.setItem('splainr-muted', muted ? '1' : '0'); return muted; }
  };
})();
