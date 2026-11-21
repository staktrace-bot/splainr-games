// ButtPen interpreter: turns an AST into drawing actions and a final turtle state.
(function (root) {
  var MAX_STEPS_DEFAULT = 8000;
  var MAX_DEPTH_DEFAULT = 40;

  var COLOR_NAMES = {
    red: '#e63946',
    orange: '#ff924c',
    yellow: '#ffca3a',
    gold: '#ffb703',
    green: '#8ac926',
    lime: '#70e000',
    blue: '#1982c4',
    navy: '#023e8a',
    aqua: '#48cae4',
    cyan: '#00b4d8',
    teal: '#2a9d8f',
    purple: '#6a4c93',
    violet: '#7b2cbf',
    magenta: '#c05299',
    pink: '#ff70a6',
    hotpink: '#e64980',
    coral: '#ff6f61',
    peach: '#ffc4a3',
    brown: '#9c6644',
    black: '#222222',
    white: '#ffffff',
    gray: '#8d99ae',
    grey: '#8d99ae'
  };

  function RunError(message, line) {
    this.name = 'RunError';
    this.message = message;
    this.line = line || 1;
  }
  RunError.prototype = Object.create(Error.prototype);
  RunError.prototype.constructor = RunError;

  function levenshtein(a, b) {
    a = a || ''; b = b || '';
    var m = a.length, n = b.length;
    if (!m) return n;
    if (!n) return m;
    var prev = new Array(n + 1), cur = new Array(n + 1);
    for (var j = 0; j <= n; j++) prev[j] = j;
    for (var i = 1; i <= m; i++) {
      cur[0] = i;
      for (j = 1; j <= n; j++) {
        var cost = a[i - 1] === b[j - 1] ? 0 : 1;
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      }
      var tmp = prev; prev = cur; cur = tmp;
    }
    return prev[n];
  }

  function suggest(name, names) {
    var best = null, bestD = 99;
    for (var i = 0; i < names.length; i++) {
      var d = levenshtein(name, names[i]);
      if (d < bestD) { bestD = d; best = names[i]; }
    }
    if (best && bestD <= 2 && best !== name) return best;
    return null;
  }

  function defaultTurtle() {
    return { x: 0, y: 0, heading: 0, penDown: true, color: '#1982c4', width: 4, visible: true };
  }

  function resolveColor(value, line) {
    if (!value) throw new RunError('color needs a name or a code, like: color red   or   color #ff0000', line);
    var v = String(value).toLowerCase();
    if (COLOR_NAMES[v]) return COLOR_NAMES[v];
    if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(v)) {
      if (v.length === 4) {
        return '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
      }
      return v.slice(0, 7);
    }
    throw new RunError('I don\'t know the color "' + value + '". Try a name like red or a code like #ff0000.', line);
  }

  function evalExpr(node, env) {
    if (!node) throw new RunError('I was expecting a number here.', 1);
    if (node.type === 'num') return node.value;
    if (node.type === 'param') {
      if (!Object.prototype.hasOwnProperty.call(env, node.name)) {
        throw new RunError('I don\'t know :' + node.name + '. Use it inside a recipe that has :' + node.name + '.', node.line);
      }
      return env[node.name];
    }
    if (node.type === 'unary') {
      var a = evalExpr(node.arg, env);
      return -a;
    }
    if (node.type === 'bin') {
      var l = evalExpr(node.left, env);
      var r = evalExpr(node.right, env);
      if (node.op === '+') return l + r;
      if (node.op === '-') return l - r;
      if (node.op === '*') return l * r;
      if (node.op === '/') {
        if (r === 0) throw new RunError('I can\'t divide by zero.', node.line);
        return l / r;
      }
    }
    throw new RunError('I was expecting a number here.', node.line || 1);
  }

  function movePoint(t, dist) {
    var rad = t.heading * Math.PI / 180;
    return {
      x: t.x + dist * Math.sin(rad),
      y: t.y + dist * Math.cos(rad)
    };
  }

  // Collect `to` definitions from a statement list (top-level only).
  function collectProcs(body, procs, lineForErr) {
    for (var i = 0; i < body.length; i++) {
      var s = body[i];
      if (s.type === 'to') {
        if (procs[s.name]) {
          throw new RunError('You already have a recipe called "' + s.name + '". Pick a new name for this one.', s.line || lineForErr);
        }
        procs[s.name] = s;
      }
    }
  }

  function builtinNames() {
    var Parser = (typeof module !== 'undefined' && module.exports)
      ? (function () { try { return require('./parser.js'); } catch (e) { return null; } })()
      : (root.ButtPenParser || null);
    var list = Parser && Parser.BUILTINS ? Parser.BUILTINS.slice() : [
      'forward', 'fd', 'go', 'back', 'bk', 'left', 'lt', 'right', 'rt',
      'pen', 'penup', 'pu', 'pendown', 'pd', 'color', 'colour', 'width',
      'repeat', 'to', 'end', 'home', 'clear', 'cs', 'hide', 'show'
    ];
    var extra = ['forward', 'back', 'left', 'right', 'penup', 'pendown', 'color', 'width',
      'repeat', 'home', 'clear', 'hide', 'show'];
    for (var i = 0; i < extra.length; i++) {
      if (list.indexOf(extra[i]) === -1) list.push(extra[i]);
    }
    return list;
  }

  function run(ast, options) {
    options = options || {};
    var maxSteps = options.maxSteps == null ? MAX_STEPS_DEFAULT : options.maxSteps;
    var maxDepth = options.maxDepth == null ? MAX_DEPTH_DEFAULT : options.maxDepth;
    var turtle = options.turtle ? Object.assign({}, options.turtle) : defaultTurtle();
    var extraProcs = options.procedures || {};
    var actions = [];
    var lines = [];
    var steps = 0;
    var procs = {};

    function err(msg, line) { throw new RunError(msg, line); }

    function bump(line) {
      steps++;
      if (steps > maxSteps) {
        err('That\'s a really long drawing! I stopped after ' + maxSteps +
          ' steps so the page doesn\'t freeze. Try a smaller repeat.', line);
      }
    }

    try {
      if (!ast || ast.type !== 'program') err('I couldn\'t read that program.', 1);
      collectProcs(ast.body, procs);
      // Merge previously defined procedures (for the quick-command REPL) without
      // overwriting ones in the current program.
      Object.keys(extraProcs).forEach(function (k) {
        if (!procs[k]) procs[k] = extraProcs[k];
      });

      executeBlock(ast.body, {}, 0);

      return {
        ok: true,
        actions: actions,
        lines: lines,
        turtle: turtle,
        procedures: procs,
        steps: steps
      };
    } catch (e) {
      if (e instanceof RunError || e.name === 'RunError') {
        return {
          ok: false,
          error: { message: e.message, line: e.line },
          actions: actions,
          lines: lines,
          turtle: turtle,
          procedures: procs,
          steps: steps
        };
      }
      throw e;
    }

    function executeBlock(body, env, depth) {
      for (var i = 0; i < body.length; i++) execute(body[i], env, depth);
    }

    function execute(stmt, env, depth) {
      if (stmt.type === 'to') return;
      if (stmt.type === 'repeat') {
        var n = evalExpr(stmt.count, env);
        if (typeof n !== 'number' || !isFinite(n)) {
          err('I need a number of times to repeat, like repeat 4 [ forward 50 ].', stmt.line);
        }
        if (n < 0) err('I can\'t repeat a negative number of times.', stmt.line);
        n = Math.floor(n);
        for (var r = 0; r < n; r++) {
          executeBlock(stmt.body, env, depth);
        }
        return;
      }
      if (stmt.type === 'command') {
        runCommand(stmt, env);
        return;
      }
      if (stmt.type === 'call') {
        var proc = procs[stmt.name];
        if (!proc) {
          var names = builtinNames().concat(Object.keys(procs));
          var idea = suggest(stmt.name, names);
          var msg = 'I don\'t know "' + stmt.name + '".';
          if (idea) msg += ' Did you mean "' + idea + '"?';
          err(msg, stmt.line);
        }
        if (stmt.args.length !== proc.params.length) {
          var need = proc.params.length;
          var hint = need === 0
            ? 'just ' + proc.name
            : proc.name + ' ' + proc.params.map(function (_, i) { return (i === 0 ? '50' : '10'); }).join(' ');
          err('"' + proc.name + '" needs ' + need + ' number' + (need === 1 ? '' : 's') +
            ' (like ' + hint + ').', stmt.line);
        }
        if (depth >= maxDepth) {
          err('This recipe called itself too many times, so I stopped. Check that it eventually finishes.', stmt.line);
        }
        var newEnv = {};
        for (var p = 0; p < proc.params.length; p++) {
          newEnv[proc.params[p]] = evalExpr(stmt.args[p], env);
        }
        executeBlock(proc.body, newEnv, depth + 1);
        return;
      }
      err('I don\'t know how to run that.', stmt.line || 1);
    }

    function pushLine(x1, y1, x2, y2) {
      lines.push({
        x1: x1, y1: y1, x2: x2, y2: y2,
        color: turtle.color, width: turtle.width
      });
    }

    function runCommand(stmt, env) {
      var name = stmt.name;
      var line = stmt.line;
      bump(line);

      function numArg(defVal) {
        if (!stmt.args || !stmt.args.length) {
          if (defVal !== undefined) return defVal;
          err(name + ' needs a number.', line);
        }
        var v = evalExpr(stmt.args[0], env);
        if (typeof v !== 'number' || !isFinite(v)) err(name + ' needs a number.', line);
        return v;
      }

      if (name === 'forward' || name === 'back') {
        var dist = numArg();
        if (name === 'back') dist = -dist;
        var from = { x: turtle.x, y: turtle.y };
        var to = movePoint(turtle, dist);
        var drew = false;
        if (turtle.penDown) {
          pushLine(from.x, from.y, to.x, to.y);
          drew = true;
        }
        actions.push({
          type: 'move',
          from: from, to: to,
          heading: turtle.heading,
          draw: drew,
          color: turtle.color,
          width: turtle.width,
          line: line
        });
        turtle.x = to.x; turtle.y = to.y;
        return;
      }

      if (name === 'left' || name === 'right') {
        var deg = stmt.args && stmt.args.length ? numArg() : 90;
        var fromH = turtle.heading;
        var delta = name === 'right' ? deg : -deg;
        var toH = fromH + delta;
        actions.push({ type: 'turn', from: fromH, to: toH, line: line });
        // Normalize only for storage? Keep raw for smooth animation (e.g. 0 -> 360).
        // Final state can be normalized.
        turtle.heading = ((toH % 360) + 360) % 360;
        return;
      }

      if (name === 'penup') {
        turtle.penDown = false;
        actions.push({ type: 'pen', down: false, line: line });
        return;
      }
      if (name === 'pendown') {
        turtle.penDown = true;
        actions.push({ type: 'pen', down: true, line: line });
        return;
      }
      if (name === 'color') {
        var raw = stmt.args[0] && stmt.args[0].type === 'color' ? stmt.args[0].value : null;
        var col = resolveColor(raw, line);
        turtle.color = col;
        actions.push({ type: 'color', color: col, line: line });
        return;
      }
      if (name === 'width') {
        var w = numArg();
        if (w <= 0) err('The pen width needs to be a number bigger than 0, like width 4.', line);
        if (w > 80) w = 80;
        turtle.width = w;
        actions.push({ type: 'width', width: w, line: line });
        return;
      }
      if (name === 'home') {
        var hf = { x: turtle.x, y: turtle.y };
        var ht = { x: 0, y: 0 };
        var drewHome = false;
        if (turtle.penDown && (hf.x !== 0 || hf.y !== 0)) {
          pushLine(hf.x, hf.y, 0, 0);
          drewHome = true;
        }
        actions.push({
          type: 'home',
          from: hf, to: ht,
          fromHeading: turtle.heading, toHeading: 0,
          draw: drewHome, color: turtle.color, width: turtle.width,
          line: line
        });
        turtle.x = 0; turtle.y = 0; turtle.heading = 0;
        return;
      }
      if (name === 'clear') {
        lines.length = 0;
        actions.push({ type: 'clear', line: line });
        turtle.x = 0; turtle.y = 0; turtle.heading = 0;
        return;
      }
      if (name === 'hide') {
        turtle.visible = false;
        actions.push({ type: 'hide', line: line });
        return;
      }
      if (name === 'show') {
        turtle.visible = true;
        actions.push({ type: 'show', line: line });
        return;
      }
      err('I don\'t know "' + name + '".', line);
    }
  }

  function parseAndRun(src, options) {
    var Parser = (typeof module !== 'undefined' && module.exports)
      ? require('./parser.js')
      : root.ButtPenParser;
    var parsed = Parser.parse(src);
    if (!parsed.ok) return { ok: false, error: parsed.error, actions: [], lines: [], turtle: defaultTurtle(), procedures: {}, steps: 0 };
    return run(parsed.ast, options);
  }

  var api = {
    run: run,
    parseAndRun: parseAndRun,
    evalExpr: evalExpr,
    resolveColor: resolveColor,
    defaultTurtle: defaultTurtle,
    COLOR_NAMES: COLOR_NAMES,
    suggest: suggest,
    levenshtein: levenshtein,
    MAX_STEPS_DEFAULT: MAX_STEPS_DEFAULT,
    MAX_DEPTH_DEFAULT: MAX_DEPTH_DEFAULT,
    RunError: RunError
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ButtPenInterpreter = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
