(function () {
  var CM = window.ClockMath, $ = function (id) { return document.getElementById(id); };
  var NS = 'http://www.w3.org/2000/svg';
  var NEED = 5;
  var state = { level: CM.parseLevel(location.search), streak: 0, puzzle: null, ans: { h: '', m: '', ampm: '' }, active: 'h', busy: false };
  var PROMPTS = { 1: 'What hour is it?', 2: 'What time is it? AM or PM?', 3: 'How many minutes?', 4: 'What time is it?', 5: 'What time is it?' };

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  // ---------- clock drawing ----------
  var COLORS = ['#ff595e', '#ff924c', '#ffca3a', '#8ac926', '#52a675', '#1982c4', '#4267ac', '#6a4c93', '#c05299', '#ff595e', '#ff924c', '#8ac926'];
  function drawClock(p) {
    var svg = $('clock'); svg.innerHTML = '';
    el('circle', { cx: 100, cy: 100, r: 97, fill: '#ffca3a' }, svg);
    el('circle', { cx: 100, cy: 100, r: 89, fill: '#fffdf5', stroke: '#ff924c', 'stroke-width': 3 }, svg);
    for (var i = 0; i < 60; i++) {
      var a = i * 6 * Math.PI / 180, big = i % 5 === 0;
      var r1 = big ? 77 : 82, r2 = 87;
      el('line', { x1: 100 + r1 * Math.sin(a), y1: 100 - r1 * Math.cos(a), x2: 100 + r2 * Math.sin(a), y2: 100 - r2 * Math.cos(a),
        stroke: big ? '#444' : '#999', 'stroke-width': big ? 2.5 : 1.2, 'stroke-linecap': 'round' }, svg);
    }
    if (p.showHour) hand(svg, p.hourAngle, 42, 9, '#e63946', 'hour-hand');
    if (p.showMin) hand(svg, p.minuteAngle, 72, 5, '#1d70b8', 'minute-hand');
    for (var n = 1; n <= 12; n++) {
      var an = n * 30 * Math.PI / 180, rr = 64;
      var t = el('text', { x: 100 + rr * Math.sin(an), y: 100 - rr * Math.cos(an), 'text-anchor': 'middle', 'dominant-baseline': 'central',
        'font-size': 19, 'font-weight': 800, fill: COLORS[n - 1], stroke: '#fffdf5', 'stroke-width': 3, 'paint-order': 'stroke' }, svg);
      t.textContent = n;
    }
    // minute labels on level 3 & 5 helper? keep clean: small minute numbers on level 3 only
    if (p.level === 3) {
      for (var k = 0; k < 12; k++) {
        var am = k * 30 * Math.PI / 180, r3 = 94.5;
        var tt = el('text', { x: 100 + r3 * Math.sin(am), y: 100 - r3 * Math.cos(am), 'text-anchor': 'middle', 'dominant-baseline': 'central',
          'font-size': 6.5, 'font-weight': 700, fill: '#7a4a00' }, svg);
        tt.textContent = (k * 5 < 10 ? '0' : '') + k * 5;
      }
    }
    el('circle', { cx: 100, cy: 100, r: 7, fill: '#333' }, svg);
  }
  function hand(svg, angle, len, w, color, id) {
    var g = el('g', { id: id, transform: 'rotate(' + angle + ' 100 100)', 'data-angle': angle }, svg);
    el('line', { x1: 100, y1: 112, x2: 100, y2: 100 - len, stroke: color, 'stroke-width': w, 'stroke-linecap': 'round' }, g);
    el('path', { d: 'M' + (100 - w) + ' ' + (100 - len + 6) + ' L100 ' + (100 - len - 6) + ' L' + (100 + w) + ' ' + (100 - len + 6) + ' Z', fill: color }, g);
  }

  // ---------- scenes (level 2) ----------
  var SCENE_SVG = {
    morning: '<svg viewBox="0 0 200 110"><defs><linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8ecae6"/><stop offset="1" stop-color="#ffd6a5"/></linearGradient></defs><rect width="200" height="110" fill="url(#sk)"/><circle cx="50" cy="82" r="22" fill="#ffb703"/><g stroke="#ffb703" stroke-width="3" stroke-linecap="round"><line x1="50" y1="52" x2="50" y2="44"/><line x1="25" y1="62" x2="19" y2="56"/><line x1="75" y1="62" x2="81" y2="56"/></g><rect y="82" width="200" height="28" fill="#6bbf59"/><text x="135" y="40" font-size="26">🐓</text><text x="160" y="80" font-size="22">🥣</text></svg>',
    afternoon: '<svg viewBox="0 0 200 110"><rect width="200" height="110" fill="#4cc9f0"/><circle cx="100" cy="28" r="20" fill="#ffd60a"/><g stroke="#ffd60a" stroke-width="3" stroke-linecap="round"><line x1="100" y1="2" x2="100" y2="-4"/><line x1="72" y1="28" x2="64" y2="28"/><line x1="128" y1="28" x2="136" y2="28"/><line x1="80" y1="8" x2="75" y2="3"/><line x1="120" y1="8" x2="125" y2="3"/></g><rect y="85" width="200" height="25" fill="#80b918"/><text x="20" y="85" font-size="22">🛝</text><text x="150" y="85" font-size="22">⚽</text></svg>',
    evening: '<svg viewBox="0 0 200 110"><defs><linearGradient id="ev" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a189a"/><stop offset=".6" stop-color="#f77f00"/><stop offset="1" stop-color="#fcbf49"/></linearGradient></defs><rect width="200" height="110" fill="url(#ev)"/><circle cx="150" cy="88" r="22" fill="#ff5400"/><rect y="88" width="200" height="22" fill="#3a5a40"/><text x="25" y="86" font-size="24">🍽️</text></svg>',
    night: '<svg viewBox="0 0 200 110"><rect width="200" height="110" fill="#14213d"/><circle cx="155" cy="28" r="16" fill="#fefae0"/><circle cx="162" cy="23" r="14" fill="#14213d"/><g fill="#fff"><circle cx="30" cy="20" r="1.8"/><circle cx="70" cy="35" r="1.4"/><circle cx="110" cy="15" r="1.8"/><circle cx="185" cy="60" r="1.4"/><circle cx="50" cy="55" r="1.2"/></g><rect y="88" width="200" height="22" fill="#283618"/><text x="20" y="86" font-size="24">🪥</text><text x="60" y="86" font-size="24">📖</text></svg>',
    latenight: '<svg viewBox="0 0 200 110"><rect width="200" height="110" fill="#03045e"/><circle cx="100" cy="24" r="15" fill="#fefae0"/><g fill="#fff"><circle cx="20" cy="15" r="1.6"/><circle cx="60" cy="40" r="1.4"/><circle cx="150" cy="18" r="1.8"/><circle cx="180" cy="45" r="1.3"/><circle cx="40" cy="65" r="1.2"/></g><text x="55" y="100" font-size="44">🛌</text><text x="125" y="70" font-size="20" fill="#bde0fe" font-weight="800">z Z z</text><text x="150" y="102" font-size="22">🦉</text></svg>'
  };
  var SCENE_WORDS = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', night: 'Night', latenight: 'Middle of the night' };

  // ---------- input UI ----------
  function buildKeypad() {
    var kp = $('keypad'); kp.innerHTML = '';
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✔'].forEach(function (k) {
      var b = document.createElement('button');
      b.textContent = k; b.dataset.key = k;
      if (k === '✔') b.className = 'ok'; if (k === '⌫') b.className = 'del';
      b.setAttribute('aria-label', k === '⌫' ? 'delete' : k === '✔' ? 'check' : k);
      b.addEventListener('click', function () { press(k); });
      kp.appendChild(b);
    });
  }
  function renderFields() {
    var f = CM.fields(state.level), box = $('fields'); box.innerHTML = '';
    f.forEach(function (name, i) {
      if (i > 0) { var c = document.createElement('span'); c.className = 'colon'; c.textContent = ':'; box.appendChild(c); }
      var wrap = document.createElement('div'); wrap.className = 'fieldwrap';
      var b = document.createElement('button');
      b.className = 'field ' + (name === 'h' ? 'hour' : 'min') + (state.active === name ? ' active' : '');
      b.id = 'field-' + name;
      b.textContent = state.ans[name] || (name === 'h' ? '?' : '??');
      if (!state.ans[name]) b.classList.add('empty');
      b.addEventListener('click', function () { state.active = name; renderFields(); });
      var lab = document.createElement('div'); lab.className = 'flabel'; lab.textContent = name === 'h' ? 'hour' : 'minutes';
      wrap.appendChild(b); wrap.appendChild(lab); box.appendChild(wrap);
    });
    document.querySelectorAll('#ampm button').forEach(function (b) { b.classList.toggle('active', b.dataset.ampm === state.ans.ampm); });
  }
  function press(k) {
    if (state.busy || $('game').classList.contains('hidden')) return;
    var f = CM.fields(state.level), a = state.active;
    if (k === '✔') return submit();
    if (k === '⌫') {
      if (state.ans[a]) state.ans[a] = state.ans[a].slice(0, -1);
      else if (f.length > 1 && a === 'm') state.active = 'h';
      return renderFields();
    }
    var v = state.ans[a];
    if (a === 'h' && k === '0' && (v === '' || v.length >= 2)) return nudge($('field-h')); // hours never start with 0
    if (v.length >= 2) v = '';                 // start over in a full box
    var nv = v + k, max = a === 'h' ? 12 : 59;
    if (parseInt(nv, 10) > max) nv = k;        // e.g. typing 7 after 3 for hour -> 7
    state.ans[a] = nv;
    // auto-advance hour -> minute when the hour can't take another digit
    if (a === 'h' && f.length > 1 && (nv.length === 2 || parseInt(nv, 10) > 1)) state.active = 'm';
    renderFields();
  }
  function submit() {
    var f = CM.fields(state.level), p = state.puzzle;
    for (var i = 0; i < f.length; i++) if (state.ans[f[i]] === '') { state.active = f[i]; renderFields(); nudge($('field-' + f[i])); return; }
    if (state.level === 2 && !state.ans.ampm) { nudge($('ampm')); return; }
    state.busy = true;
    if (CM.check(p, state.ans)) {
      state.streak++; renderStars(); Sound.right();
      feedback('✅ Yes! ' + CM.fmt(p), 'good');
      if (state.streak >= NEED) setTimeout(levelDone, 900);
      else setTimeout(newPuzzle, 1100);
    } else {
      state.streak = 0; renderStars(); Sound.wrong();
      // show the correct answer gently
      var f2 = CM.fields(state.level);
      if (f2.indexOf('h') >= 0) state.ans.h = String(p.h);
      if (f2.indexOf('m') >= 0) state.ans.m = (p.m < 10 ? '0' : '') + p.m;
      if (p.ampm) state.ans.ampm = p.ampm;
      renderFields();
      document.querySelectorAll('.field').forEach(function (b) { b.classList.add('reveal'); });
      feedback('Nice try! It is ' + CM.fmt(p) + ' 💛', 'soft');
      setTimeout(newPuzzle, 2800);
    }
  }
  function nudge(e) { if (!e) return; e.classList.remove('nudge'); void e.offsetWidth; e.classList.add('nudge'); }
  function feedback(t, cls) { var fb = $('feedback'); fb.textContent = t; fb.className = 'feedback ' + (cls || ''); }
  function renderStars() {
    var s = $('stars'); s.innerHTML = '';
    for (var i = 0; i < NEED; i++) { var d = document.createElement('span'); d.className = 'star' + (i < state.streak ? ' on' : ''); d.textContent = '★'; s.appendChild(d); }
  }

  // ---------- flow ----------
  function setLevel(n) {
    state.level = n; state.streak = 0;
    var url = new URL(location.href); url.searchParams.set('level', n);
    history.replaceState(null, '', url);
    $('levelBadge').textContent = 'Level ' + n;
    $('levelPick').value = String(n);
    renderStars();
  }
  function show(id) { ['start', 'game', 'celebrate', 'win'].forEach(function (s) { $(s).classList.toggle('hidden', s !== id); }); }
  function newPuzzle() {
    var p = CM.nextPuzzle(state.level, state.puzzle && state.puzzle.level === state.level ? state.puzzle.key : null);
    state.puzzle = p; state.ans = { h: '', m: '', ampm: '' };
    state.active = CM.fields(state.level)[0]; state.busy = false;
    drawClock(p);
    var sc = $('scene');
    if (p.scene) { sc.innerHTML = SCENE_SVG[p.scene] + '<div class="scenelabel">' + SCENE_WORDS[p.scene] + '</div>'; sc.classList.remove('hidden'); }
    else sc.classList.add('hidden');
    $('ampm').classList.toggle('hidden', state.level !== 2);
    $('game').dataset.level = state.level;
    $('prompt').textContent = PROMPTS[state.level];
    feedback('', '');
    renderFields();
    window.__puzzle = p; // handy for tests
  }
  function levelDone() {
    Sound.fanfare(); confetti();
    if (state.level >= 5) { show('win'); return; }
    $('celebrateText').textContent = 'Level ' + state.level + ' done!';
    setLevel(state.level + 1);
    show('celebrate');
  }
  function startGame() { show('game'); newPuzzle(); }
  function confetti() {
    var c = $('confetti'); c.innerHTML = '';
    for (var i = 0; i < 40; i++) {
      var s = document.createElement('i');
      s.style.left = Math.random() * 100 + 'vw'; s.style.background = COLORS[i % COLORS.length];
      s.style.animationDelay = Math.random() * 0.6 + 's'; s.style.transform = 'rotate(' + Math.random() * 360 + 'deg)';
      c.appendChild(s);
    }
    setTimeout(function () { c.innerHTML = ''; }, 3000);
  }

  // ---------- wiring ----------
  buildKeypad();
  setLevel(state.level);
  $('play').addEventListener('click', startGame);
  $('nextLevel').addEventListener('click', startGame);
  $('again').addEventListener('click', function () { setLevel(1); startGame(); });
  $('levelPick').addEventListener('change', function () { setLevel(parseInt(this.value, 10)); state.puzzle = null; startGame(); this.blur(); });
  document.querySelectorAll('#ampm button').forEach(function (b) {
    b.addEventListener('click', function () { if (state.busy) return; state.ans.ampm = b.dataset.ampm; renderFields(); });
  });
  var mute = $('mute');
  function muteIcon() { mute.textContent = Sound.isMuted() ? '🔇' : '🔊'; }
  muteIcon(); mute.addEventListener('click', function () { Sound.toggle(); muteIcon(); });
  document.addEventListener('keydown', function (e) {
    if (e.target && e.target.tagName === 'SELECT') return;
    if (!$('game').classList.contains('hidden')) {
      if (/^[0-9]$/.test(e.key)) { press(e.key); e.preventDefault(); }
      else if (e.key === 'Backspace') { press('⌫'); e.preventDefault(); }
      else if (e.key === 'Enter') { press('✔'); e.preventDefault(); }
      else if ((e.key === 'a' || e.key === 'A' || e.key === 'p' || e.key === 'P') && state.level === 2 && !state.busy) { state.ans.ampm = e.key.toUpperCase() + 'M'; renderFields(); }
      else if (e.key === ':' || e.key === 'Tab' || e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        var f = CM.fields(state.level); if (f.length > 1) { state.active = state.active === 'h' ? 'm' : 'h'; renderFields(); e.preventDefault(); }
      }
    } else if (e.key === 'Enter') {
      var vis = document.querySelector('.screen:not(.hidden) .btn-play'); if (vis) { vis.click(); e.preventDefault(); }
    }
  });
})();
