// ButtPen Logo-style parser. Works in the browser and in Node tests.
(function (root) {
  var BUILTINS = [
    'forward', 'fd', 'go', 'forwards', 'fwd',
    'back', 'bk', 'backward', 'backwards',
    'left', 'lt', 'right', 'rt', 'turn',
    'pen', 'penup', 'pu', 'pendown', 'pd',
    'color', 'colour',
    'width', 'size', 'pensize', 'penwidth',
    'repeat', 'to', 'end',
    'home', 'clear', 'cs', 'clearscreen',
    'hide', 'ht', 'hideturtle', 'show', 'st', 'showturtle'
  ];

  function isWordChar(c) {
    return /[A-Za-z0-9_]/.test(c);
  }

  // Only longer command names: short aliases like "go" / "to" are too typo-prone.
  var TYPO_TARGETS = [
    'forward', 'backward', 'backwards', 'left', 'right', 'turn',
    'penup', 'pendown', 'color', 'colour', 'width', 'pensize', 'penwidth',
    'repeat', 'clearscreen', 'hideturtle', 'showturtle', 'home', 'clear', 'hide', 'show'
  ];

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

  function closestBuiltin(name) {
    var best = null, bestD = 99;
    for (var i = 0; i < TYPO_TARGETS.length; i++) {
      var d = levenshtein(name, TYPO_TARGETS[i]);
      if (d < bestD) { bestD = d; best = TYPO_TARGETS[i]; }
    }
    if (!best || best === name) return null;
    if (name.length >= 5 && bestD <= 2) return best;
    if (name.length >= 4 && bestD === 1) return best;
    return null;
  }

  function tokenize(src) {
    var tokens = [];
    var i = 0, line = 1, col = 1, n = src.length;

    function pos() { return { line: line, col: col }; }
    function adv() {
      if (src[i] === '\n') { line++; col = 1; } else { col++; }
      i++;
    }

    while (i < n) {
      var c = src[i];
      if (c === ' ' || c === '\t' || c === '\r') { adv(); continue; }
      if (c === '\n') { adv(); continue; }
      // comments
      if (c === ';' || (c === '/' && src[i + 1] === '/')) {
        while (i < n && src[i] !== '\n') adv();
        continue;
      }
      var p = pos();
      if (c === '[') { tokens.push({ type: 'LBRACK', value: '[', line: p.line, col: p.col }); adv(); continue; }
      if (c === ']') { tokens.push({ type: 'RBRACK', value: ']', line: p.line, col: p.col }); adv(); continue; }
      if (c === '(') { tokens.push({ type: 'LPAREN', value: '(', line: p.line, col: p.col }); adv(); continue; }
      if (c === ')') { tokens.push({ type: 'RPAREN', value: ')', line: p.line, col: p.col }); adv(); continue; }
      if (c === '+' || c === '*' || c === '/') {
        tokens.push({ type: 'OP', value: c, line: p.line, col: p.col }); adv(); continue;
      }
      if (c === '-') {
        tokens.push({ type: 'OP', value: '-', line: p.line, col: p.col }); adv(); continue;
      }
      if (c === '#') {
        var hex = '#';
        adv();
        while (i < n && /[0-9A-Fa-f]/.test(src[i]) && hex.length < 9) { hex += src[i]; adv(); }
        if (hex.length === 4 || hex.length === 7 || hex.length === 9) {
          tokens.push({ type: 'HEX', value: hex, line: p.line, col: p.col });
        } else {
          tokens.push({ type: 'BAD', value: hex, line: p.line, col: p.col, message: 'That color code looks unfinished. Try something like #ff0000.' });
        }
        continue;
      }
      if (c === ':' && i + 1 < n && /[A-Za-z_]/.test(src[i + 1])) {
        var prm = '';
        adv();
        while (i < n && isWordChar(src[i])) { prm += src[i]; adv(); }
        tokens.push({ type: 'PARAM', value: prm.toLowerCase(), line: p.line, col: p.col });
        continue;
      }
      if (/[0-9]/.test(c) || (c === '.' && i + 1 < n && /[0-9]/.test(src[i + 1]))) {
        var num = '';
        while (i < n && /[0-9]/.test(src[i])) { num += src[i]; adv(); }
        if (src[i] === '.') {
          num += '.'; adv();
          while (i < n && /[0-9]/.test(src[i])) { num += src[i]; adv(); }
        }
        tokens.push({ type: 'NUMBER', value: parseFloat(num), raw: num, line: p.line, col: p.col });
        continue;
      }
      if (/[A-Za-z_]/.test(c)) {
        var w = '';
        while (i < n && isWordChar(src[i])) { w += src[i]; adv(); }
        tokens.push({ type: 'WORD', value: w, line: p.line, col: p.col });
        continue;
      }
      tokens.push({ type: 'BAD', value: c, line: p.line, col: p.col, message: 'I don\'t know what "' + c + '" means here.' });
      adv();
    }
    var lastLine = src.length && src[src.length - 1] === '\n' ? line - 1 : line;
    tokens.push({ type: 'EOF', value: '', line: lastLine || 1, col: col });
    return tokens;
  }

  function ParseError(message, line) {
    this.name = 'ParseError';
    this.message = message;
    this.line = line || 1;
  }
  ParseError.prototype = Object.create(Error.prototype);
  ParseError.prototype.constructor = ParseError;

  function parse(src) {
    var tokens = tokenize(src == null ? '' : String(src));
    var i = 0;

    function peek() { return tokens[i]; }
    function at(type) { return peek().type === type; }
    function eat() { return tokens[i++]; }

    function err(msg, tok) {
      throw new ParseError(msg, (tok || peek()).line);
    }

    function expect(type, msg) {
      if (peek().type !== type) err(msg, peek());
      return eat();
    }

    function parseProgram() {
      var body = [];
      // Allow a leading BAD token to surface its message.
      while (!at('EOF')) {
        if (peek().type === 'BAD') err(peek().message, peek());
        if (at('RBRACK')) err('I found a "]" that doesn\'t have a matching "[".', peek());
        if (at('RPAREN')) err('I found a ")" that doesn\'t have a matching "(".', peek());
        body.push(parseStatement());
      }
      return { type: 'program', body: body };
    }

    function wordVal() {
      return peek().type === 'WORD' ? peek().value.toLowerCase() : null;
    }

    function parseStatement() {
      if (peek().type === 'BAD') err(peek().message, peek());
      if (!at('WORD')) {
        if (at('EOF')) err('I was expecting a command, but the program ended.', peek());
        if (at('LBRACK')) err('I found a "[" by itself. Use it with repeat, like: repeat 4 [ forward 50 ]', peek());
        err('I was expecting a command, but I found "' + String(peek().value) + '".', peek());
      }
      var w = wordVal();
      if (w === 'to') return parseTo();
      if (w === 'end') err('I found "end" but there\'s no recipe to finish. Start a recipe with "to name" first.', peek());
      if (w === 'repeat') return parseRepeat();
      return parseCommandOrCall();
    }

    function parseTo() {
      var start = eat(); // to
      if (!at('WORD')) err('After "to" I need a name for your recipe, like: to square', peek());
      var nameTok = eat();
      var name = nameTok.value.toLowerCase();
      if (BUILTINS.indexOf(name) !== -1) {
        err('"' + name + '" is already a built-in command, so I can\'t use it as a recipe name. Try a different name.', nameTok);
      }
      var params = [];
      while (at('PARAM')) params.push(eat().value);
      var body = [];
      while (!at('EOF') && wordVal() !== 'end') {
        if (wordVal() === 'to') {
          err('You can\'t start a new "to" recipe inside another one. Finish "' + name + '" with "end" first.', peek());
        }
        if (at('RBRACK')) err('I found a "]" inside the "' + name + '" recipe that doesn\'t belong there.', peek());
        body.push(parseStatement());
      }
      if (at('EOF')) {
        err('I was looking for "end" to finish the "to ' + name + '" recipe, but I got to the end.', start);
      }
      eat(); // end
      return { type: 'to', name: name, params: params, body: body, line: start.line };
    }

    function parseRepeat() {
      var start = eat(); // repeat
      if (at('LBRACK')) {
        err('repeat needs a number first, like: repeat 4 [ forward 50 right 90 ]', start);
      }
      if (at('EOF') || at('RBRACK') || at('WORD')) {
        err('repeat needs a number and a list in [ square brackets ], like: repeat 4 [ forward 50 right 90 ]', start);
      }
      var count = parseExpr();
      if (!at('LBRACK')) {
        err('repeat needs a list in [ square brackets ], like: repeat 4 [ forward 50 right 90 ]', peek().type === 'EOF' ? start : peek());
      }
      eat(); // [
      var body = [];
      while (!at('RBRACK') && !at('EOF')) {
        if (peek().type === 'BAD') err(peek().message, peek());
        if (wordVal() === 'to') {
          err('You can\'t define a "to" recipe inside a repeat. Put the recipe above, then call it in the loop.', peek());
        }
        if (wordVal() === 'end') {
          err('I found "end" inside a repeat. Finish the repeat with "]" first.', peek());
        }
        body.push(parseStatement());
      }
      if (at('EOF')) {
        err('I was looking for a "]" to finish this repeat, but I got to the end.', start);
      }
      eat(); // ]
      return { type: 'repeat', count: count, body: body, line: start.line };
    }

    function startsExpr(t) {
      return t.type === 'NUMBER' || t.type === 'PARAM' || t.type === 'LPAREN' ||
        (t.type === 'OP' && t.value === '-');
    }

    function parseCommandOrCall() {
      var tok = eat();
      var w = tok.value.toLowerCase();
      var line = tok.line;

      if (w === 'turn') {
        if (!at('WORD') || !/^(left|lt|right|rt)$/.test(wordVal() || '')) {
          err('Do you want to turn left or right? Try: turn right 90', tok);
        }
        var dirTok = eat();
        var dir = dirTok.value.toLowerCase();
        var turnName = (dir === 'left' || dir === 'lt') ? 'left' : 'right';
        var turnArgs = startsExpr(peek()) ? [parseExpr()] : [];
        return { type: 'command', name: turnName, args: turnArgs, line: line };
      }

      if (w === 'pen') {
        if (!at('WORD') || !/^(up|down)$/.test(wordVal() || '')) {
          err('Do you want pen up or pen down? Try: pen up   or   pen down', tok);
        }
        var pd = eat().value.toLowerCase();
        return { type: 'command', name: pd === 'up' ? 'penup' : 'pendown', args: [], line: line };
      }

      if (w === 'penup' || w === 'pu') return { type: 'command', name: 'penup', args: [], line: line };
      if (w === 'pendown' || w === 'pd') return { type: 'command', name: 'pendown', args: [], line: line };

      if (w === 'color' || w === 'colour') {
        var c = peek();
        if (c.type === 'HEX') {
          eat();
          return { type: 'command', name: 'color', args: [{ type: 'color', value: c.value.toLowerCase(), line: c.line }], line: line };
        }
        if (c.type === 'WORD') {
          eat();
          return { type: 'command', name: 'color', args: [{ type: 'color', value: c.value.toLowerCase(), line: c.line }], line: line };
        }
        err('color needs a name or a code, like: color red   or   color #ff0000', tok);
      }

      var ZERO = {
        home: 'home',
        clear: 'clear', cs: 'clear', clearscreen: 'clear',
        hide: 'hide', ht: 'hide', hideturtle: 'hide',
        show: 'show', st: 'show', showturtle: 'show'
      };
      if (ZERO[w]) return { type: 'command', name: ZERO[w], args: [], line: line };

      var MOVE = { forward: 'forward', fd: 'forward', go: 'forward', forwards: 'forward', fwd: 'forward',
        back: 'back', bk: 'back', backward: 'back', backwards: 'back' };
      if (MOVE[w]) {
        if (!startsExpr(peek())) err(MOVE[w] + ' needs a number, like ' + MOVE[w] + ' 50.', tok);
        return { type: 'command', name: MOVE[w], args: [parseExpr()], line: line };
      }

      var TURN = { left: 'left', lt: 'left', right: 'right', rt: 'right' };
      if (TURN[w]) {
        var tArgs = startsExpr(peek()) ? [parseExpr()] : [];
        return { type: 'command', name: TURN[w], args: tArgs, line: line };
      }

      var WIDTH = { width: 'width', size: 'width', pensize: 'width', penwidth: 'width' };
      if (WIDTH[w]) {
        if (!startsExpr(peek())) err('width needs a number, like width 4.', tok);
        return { type: 'command', name: 'width', args: [parseExpr()], line: line };
      }

      // Procedure call: take numeric expressions only (a WORD starts the next statement).
      // Catch typos of built-in commands (especially "repeat") before they turn into
      // confusing follow-on errors like a leftover "[".
      var typo = closestBuiltin(w);
      if (typo) {
        err('I don\'t know "' + w + '". Did you mean "' + typo + '"?', tok);
      }
      var args = [];
      while (startsExpr(peek())) args.push(parseExpr());
      if (at('LBRACK')) {
        err('I found "[" after "' + w + '". If you want a loop, try: repeat 4 [ forward 50 right 90 ]', peek());
      }
      return { type: 'call', name: w, args: args, line: line };
    }

    // Expressions: + - * / and parentheses, with unary minus. Words are not part of expressions.
    function parseExpr() { return parseAdd(); }

    function parseAdd() {
      var left = parseMul();
      while (at('OP') && (peek().value === '+' || peek().value === '-')) {
        var op = eat();
        left = { type: 'bin', op: op.value, left: left, right: parseMul(), line: op.line };
      }
      return left;
    }

    function parseMul() {
      var left = parseUnary();
      while (at('OP') && (peek().value === '*' || peek().value === '/')) {
        var op = eat();
        left = { type: 'bin', op: op.value, left: left, right: parseUnary(), line: op.line };
      }
      return left;
    }

    function parseUnary() {
      if (at('OP') && peek().value === '-') {
        var op = eat();
        return { type: 'unary', op: '-', arg: parseUnary(), line: op.line };
      }
      return parsePrimary();
    }

    function parsePrimary() {
      var t = peek();
      if (t.type === 'NUMBER') { eat(); return { type: 'num', value: t.value, line: t.line }; }
      if (t.type === 'PARAM') { eat(); return { type: 'param', name: t.value, line: t.line }; }
      if (t.type === 'LPAREN') {
        eat();
        var e = parseExpr();
        if (!at('RPAREN')) err('I was looking for a ")" to finish this calculation.', t);
        eat();
        return e;
      }
      if (t.type === 'BAD') err(t.message, t);
      err('I was expecting a number here.', t);
    }

    try {
      var ast = parseProgram();
      return { ok: true, ast: ast };
    } catch (e) {
      if (e instanceof ParseError || e.name === 'ParseError') {
        return { ok: false, error: { message: e.message, line: e.line } };
      }
      throw e;
    }
  }

  var api = { parse: parse, tokenize: tokenize, BUILTINS: BUILTINS, ParseError: ParseError, closestBuiltin: closestBuiltin, levenshtein: levenshtein };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ButtPenParser = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
