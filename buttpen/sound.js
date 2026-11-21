// Web Audio sound effects (no files needed). Shares the Clock game mute key.
var Sound = (function () {
  var ctx = null, muted = localStorage.getItem('splainr-muted') === '1';
  function unlock() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
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
    g.gain.exponentialRampToValueAtTime(vol || 0.18, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + dur + 0.04);
  }
  return {
    start: function () { tone(523, 0, 0.12, 'triangle', 0.12); tone(784, 0.08, 0.16, 'sine', 0.1); },
    done: function () { tone(659, 0, 0.18, 'sine', 0.14); tone(784, 0.1, 0.2, 'sine', 0.12); tone(1046, 0.22, 0.35, 'triangle', 0.1); },
    error: function () {
      // friendly two-note "uh-oh", similar energy to the clock game
      tone(392, 0, 0.2, 'triangle', 0.18);
      tone(294, 0.2, 0.28, 'triangle', 0.16);
      tone(392, 0, 0.2, 'sine', 0.08);
      tone(294, 0.2, 0.28, 'sine', 0.08);
    },
    clear: function () { tone(880, 0, 0.18, 'sine', 0.08); tone(440, 0.08, 0.28, 'triangle', 0.1); },
    pop: function () { tone(880, 0, 0.08, 'triangle', 0.1); },
    step: function () { tone(660, 0, 0.05, 'sine', 0.05); },
    isMuted: function () { return muted; },
    toggle: function () { muted = !muted; localStorage.setItem('splainr-muted', muted ? '1' : '0'); return muted; }
  };
})();
