(function () {
  var $ = function (id) { return document.getElementById(id); };
  var Parser = window.ButtPenParser;
  var Interpreter = window.ButtPenInterpreter;
  var Avatars = window.ButtPenAvatars;
  var Examples = window.ButtPenExamples;

  var code = $('code');
  var gutter = $('gutter');
  var editorWrap = $('editorWrap');
  var statusEl = $('status');
  var quick = $('quick');
  var examplesSel = $('examples');
  var speedSel = $('speed');
  var picker = $('picker');

  var world = new window.ButtPenTurtle.TurtleWorld($('stage'), $('paper'), $('actor'));
  var animator = new window.ButtPenTurtle.Animator(world);

  var savedChar = localStorage.getItem('buttpen-character') || 'turtle';
  var savedSpeed = localStorage.getItem('buttpen-speed') || 'medium';
  var savedProg = localStorage.getItem('buttpen-program');

  var lastProcs = {};
  var sessionTurtle = null; // after a run / quick command, for stacking REPL on drawing
  var history = [];
  var histIdx = -1;
  var runningFrom = null; // 'run' | 'step' | 'quick'
  var saveTimer = 0;

  function setStatus(msg, kind) {
    statusEl.textContent = msg || '';
    statusEl.className = kind || '';
  }

  function updateGutter(errLine) {
    var n = code.value.split('\n').length;
    var lines = [];
    for (var i = 1; i <= n; i++) {
      lines.push(i === errLine ? '<span class="bad">' + i + '</span>' : String(i));
    }
    gutter.innerHTML = lines.join('\n');
  }

  function syncGutterScroll() { gutter.scrollTop = code.scrollTop; }

  function highlightError(line) {
    editorWrap.classList.toggle('err', !!line);
    updateGutter(line || 0);
    if (line) {
      var lineH = parseFloat(window.getComputedStyle(code).lineHeight) || 18;
      code.scrollTop = Math.max(0, (line - 2) * lineH);
      syncGutterScroll();
    }
  }

  function persist() {
    localStorage.setItem('buttpen-program', code.value);
  }

  code.addEventListener('input', function () {
    updateGutter();
    highlightError(0);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 250);
  });
  code.addEventListener('scroll', syncGutterScroll);

  // Tab inserts two spaces in the editor
  code.addEventListener('keydown', function (e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      insertText('  ', 2, 0);
    }
  });

  function insertText(text, selStart, selLen) {
    var start = code.selectionStart, end = code.selectionEnd;
    var before = code.value.slice(0, start);
    var after = code.value.slice(end);
    if (before.length && !/[\n\s]$/.test(before) && !/^\n/.test(text)) {
      text = '\n' + text;
      if (selStart != null) selStart += 1;
    }
    if (after.length && !/^\n/.test(after) && !/\n$/.test(text)) {
      after = '\n' + after;
    }
    code.value = before + text + after;
    var pos = start + (selStart == null ? text.length : selStart);
    var len = selLen || 0;
    code.focus();
    code.setSelectionRange(pos, pos + len);
    updateGutter();
    persist();
  }

  // Helper buttons insert at the cursor; Repeat puts the caret inside [  ].
  $('helpers').addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-ins]');
    if (!btn) return;
    var text = btn.getAttribute('data-ins');
    var sel = (btn.getAttribute('data-sel') || '').split(',');
    var s = sel.length === 2 ? parseInt(sel[0], 10) : text.length;
    var n = sel.length === 2 ? parseInt(sel[1], 10) : 0;
    insertText(text, s, n);
    if (window.Sound) Sound.pop();
  });

  // Character picker
  function buildPicker() {
    picker.innerHTML = '';
    Avatars.AVATARS.forEach(function (av) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'option');
      b.setAttribute('aria-label', av.title + ' (' + av.name + ')');
      b.title = av.title + ' — ' + av.name;
      b.dataset.id = av.id;
      b.innerHTML = av.svg;
      b.addEventListener('click', function () { chooseCharacter(av.id); });
      picker.appendChild(b);
    });
    markPicker(savedChar);
  }
  function markPicker(id) {
    var btns = picker.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute('aria-selected', btns[i].dataset.id === id ? 'true' : 'false');
    }
  }
  function chooseCharacter(id) {
    world.setCharacter(id);
    markPicker(id);
    localStorage.setItem('buttpen-character', id);
    if (window.Sound) Sound.pop();
  }

  // Examples
  Examples.EXAMPLES.forEach(function (ex) {
    var o = document.createElement('option');
    o.value = ex.id;
    o.textContent = ex.name + (ex.hint ? ' · ' + ex.hint : '');
    examplesSel.appendChild(o);
  });
  examplesSel.addEventListener('change', function () {
    var id = examplesSel.value;
    if (!id) return;
    var ex = null;
    for (var i = 0; i < Examples.EXAMPLES.length; i++) {
      if (Examples.EXAMPLES[i].id === id) ex = Examples.EXAMPLES[i];
    }
    if (ex) {
      code.value = ex.code;
      updateGutter();
      highlightError(0);
      persist();
      setStatus('Loaded “' + ex.name + '”. Press Run to draw it!', 'info');
    }
    examplesSel.value = '';
    code.focus();
  });

  speedSel.value = SPEEDS_SAFE(savedSpeed);
  animator.setSpeed(speedSel.value);
  speedSel.addEventListener('change', function () {
    animator.setSpeed(speedSel.value);
    localStorage.setItem('buttpen-speed', speedSel.value);
  });
  function SPEEDS_SAFE(s) {
    return { slow: 1, medium: 1, fast: 1, instant: 1 }[s] ? s : 'medium';
  }

  // Mute
  function refreshMute() {
    var m = window.Sound && Sound.isMuted();
    $('mute').textContent = m ? '🔇' : '🔊';
    $('mute').setAttribute('aria-label', m ? 'Sound is off' : 'Sound is on');
  }
  $('mute').addEventListener('click', function () {
    if (window.Sound) Sound.toggle();
    refreshMute();
  });

  function resetWorld() {
    animator.stop();
    var t = Interpreter.defaultTurtle();
    world.reset(t);
    sessionTurtle = t;
  }

  function showResultError(res) {
    var line = res.error && res.error.line;
    highlightError(line);
    setStatus(res.error.message, 'err');
    if (window.Sound) Sound.error();
  }

  function parseEditor() {
    var src = code.value;
    var parsed = Parser.parse(src);
    if (!parsed.ok) {
      highlightError(parsed.error.line);
      setStatus(parsed.error.message, 'err');
      if (window.Sound) Sound.error();
      return null;
    }
    highlightError(0);
    return parsed.ast;
  }

  function prepareRun(opts) {
    animator.stop();
    var ast = parseEditor();
    if (!ast) return null;
    var res = Interpreter.run(ast, opts || {});
    if (!res.ok) {
      showResultError(res);
      return null;
    }
    lastProcs = res.procedures || lastProcs;
    return res;
  }

  function startFreshRun(res) {
    // Predictable for kids: Run starts from a clean page at home.
    resetWorld();
    animator.load(res);
    animator.setSpeed(speedSel.value);
  }

  $('run').addEventListener('click', function () {
    var res = prepareRun();
    if (!res) return;
    startFreshRun(res);
    runningFrom = 'run';
    setStatus('Drawing…', 'info');
    if (window.Sound) Sound.start();
    animator.onDone = function () {
      sessionTurtle = res.turtle;
      setStatus('Done!', 'ok');
      if (window.Sound) Sound.done();
      runningFrom = null;
    };
    animator.playAll();
  });

  $('step').addEventListener('click', function () {
    if (runningFrom === 'run') return; // don't step a running play-all
    if (runningFrom !== 'step' || animator.remaining() <= 0 && animator.index === 0) {
      var res = prepareRun();
      if (!res) return;
      startFreshRun(res);
      runningFrom = 'step';
      setStatus('Step through the drawing. Press Step again for the next move.', 'info');
    }
    if (animator.remaining() <= 0) {
      setStatus('All done!', 'ok');
      runningFrom = null;
      return;
    }
    if (window.Sound) Sound.step();
    animator.stepOnce(function (more) {
      if (!more) {
        sessionTurtle = animator._final && animator._final.turtle;
        setStatus('All done!', 'ok');
        runningFrom = null;
        if (window.Sound) Sound.done();
      } else {
        setStatus('Step ' + animator.index + ' of ' + animator.queue.length + '. Press Step for the next move.', 'info');
      }
    });
  });

  $('stop').addEventListener('click', function () {
    if (!animator.playing && runningFrom == null) {
      setStatus('Already stopped.', 'info');
      return;
    }
    animator.stop();
    runningFrom = null;
    setStatus('Stopped. You can press Run to start over, or type a quick command.', 'info');
  });

  $('clear').addEventListener('click', function () {
    animator.stop();
    runningFrom = null;
    resetWorld();
    highlightError(0);
    setStatus('All clean! Ready to draw.', 'info');
    if (window.Sound) Sound.clear();
  });

  $('download').addEventListener('click', function () {
    world.toPNG(function (url) {
      var a = document.createElement('a');
      a.href = url;
      a.download = 'buttpen.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setStatus('Saved a picture of your drawing.', 'ok');
    });
  });

  // Quick-command REPL: runs immediately without clearing, can use recipes from the editor.
  function runQuick(src) {
    src = (src || '').trim();
    if (!src) return;
    if (history[history.length - 1] !== src) history.push(src);
    histIdx = history.length;
    animator.stop();
    runningFrom = null;

    // Refresh recipe definitions from the editor (without running its body).
    var parsedEditor = Parser.parse(code.value);
    var procs = {};
    if (parsedEditor.ok) {
      var def = Interpreter.run({ type: 'program', body: (parsedEditor.ast.body || []).filter(function (s) { return s.type === 'to'; }) });
      if (def.ok) procs = def.procedures;
    } else {
      procs = lastProcs;
    }

    var parsed = Parser.parse(src);
    if (!parsed.ok) {
      setStatus(parsed.error.message, 'err');
      if (window.Sound) Sound.error();
      return;
    }
    var res = Interpreter.run(parsed.ast, {
      turtle: sessionTurtle || worldPoseAsTurtle(),
      procedures: procs
    });
    if (!res.ok) {
      setStatus(res.error.message, 'err');
      if (window.Sound) Sound.error();
      return;
    }
    lastProcs = Object.assign({}, lastProcs, res.procedures);
    animator.load(res);
    animator.setSpeed(speedSel.value);
    setStatus('…', 'info');
    animator.onDone = function () {
      sessionTurtle = res.turtle;
      setStatus('OK!', 'ok');
    };
    // Don't clear — play these actions on top of the current drawing.
    // The result.lines are only the new lines; world already has old ones.
    animator.playAll();
  }

  function worldPoseAsTurtle() {
    var t = (sessionTurtle && Object.assign({}, sessionTurtle)) || Interpreter.defaultTurtle();
    t.x = world.pose.x; t.y = world.pose.y; t.heading = ((world.pose.heading % 360) + 360) % 360;
    t.visible = world.pose.visible !== false;
    t.color = world.color || t.color;
    return t;
  }

  quick.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      runQuick(quick.value);
      quick.value = '';
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!history.length) return;
      histIdx = Math.max(0, histIdx - 1);
      quick.value = history[histIdx];
      quick.setSelectionRange(quick.value.length, quick.value.length);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (histIdx < history.length - 1) {
        histIdx++;
        quick.value = history[histIdx];
      } else {
        histIdx = history.length;
        quick.value = '';
      }
    }
  });

  window.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      $('run').click();
    }
  });

  // Init
  buildPicker();
  world.setCharacter(savedChar);
  code.value = savedProg != null && savedProg !== '' ? savedProg : Examples.DEFAULT_PROGRAM;
  updateGutter();
  refreshMute();
  resetWorld();
  setStatus('Pick a character, type commands or tap the buttons, then press Run.', 'info');

  // Expose a tiny test hook for Playwright.
  window.ButtPenApp = {
    world: world,
    animator: animator,
    runProgram: function (src, cb) {
      code.value = src;
      updateGutter();
      var res = prepareRun();
      if (!res) { if (cb) cb(null); return; }
      startFreshRun(res);
      animator.setSpeed(speedSel.value);
      animator.onDone = function () {
        sessionTurtle = res.turtle;
        setStatus('Done!', 'ok');
        if (cb) cb(res);
      };
      animator.playAll();
    },
    setSpeed: function (s) { speedSel.value = s; animator.setSpeed(s); },
    chooseCharacter: chooseCharacter
  };
})();
