// Canvas world + character overlay + action animation.
(function (root) {
  function TurtleWorld(stage, canvas, actor) {
    this.stage = stage;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.actor = actor;
    this.lines = [];
    this.pose = { x: 0, y: 0, heading: 0, wiggle: 0, visible: true };
    this.color = '#1982c4';
    this.width = 4;
    this.penDown = true;
    this.characterId = 'turtle';
    this.actorSize = 72;
    this._idle = 0;
    this._idleTimer = null;
    var self = this;
    this._onResize = function () { self.resize(); };
    window.addEventListener('resize', this._onResize);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', this._onResize);
    this.setCharacter(this.characterId);
    this.resize();
    this.startIdle();
  }

  TurtleWorld.prototype.cssSize = function () {
    var r = this.stage.getBoundingClientRect();
    return { w: Math.max(1, r.width), h: Math.max(1, r.height) };
  };

  TurtleWorld.prototype.resize = function () {
    var css = this.cssSize();
    var dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(css.w * dpr);
    this.canvas.height = Math.round(css.h * dpr);
    this.canvas.style.width = css.w + 'px';
    this.canvas.style.height = css.h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.redraw();
    this.placeActor();
  };

  TurtleWorld.prototype.worldToScreen = function (x, y) {
    var css = this.cssSize();
    return { x: css.w / 2 + x, y: css.h / 2 - y };
  };

  TurtleWorld.prototype.redraw = function () {
    var ctx = this.ctx;
    var css = this.cssSize();
    ctx.clearRect(0, 0, css.w, css.h);
    this.drawPaper(ctx, css.w, css.h);
    for (var i = 0; i < this.lines.length; i++) this.strokeLine(ctx, this.lines[i]);
  };

  TurtleWorld.prototype.drawPaper = function (ctx, w, h) {
    ctx.save();
    ctx.fillStyle = '#fffdf7';
    ctx.fillRect(0, 0, w, h);
    var cx = w / 2, cy = h / 2, step = 20;
    ctx.strokeStyle = 'rgba(80, 140, 180, 0.13)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var x = cx; x < w; x += step) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, h); }
    for (x = cx; x > 0; x -= step) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, h); }
    for (var y = cy; y < h; y += step) { ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); }
    for (y = cy; y > 0; y -= step) { ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(80, 140, 180, 0.28)';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(0, cy + 0.5); ctx.lineTo(w, cy + 0.5);
    ctx.moveTo(cx + 0.5, 0); ctx.lineTo(cx + 0.5, h);
    ctx.stroke();
    ctx.restore();
  };

  TurtleWorld.prototype.strokeLine = function (ctx, ln) {
    var a = this.worldToScreen(ln.x1, ln.y1);
    var b = this.worldToScreen(ln.x2, ln.y2);
    ctx.save();
    ctx.strokeStyle = ln.color;
    ctx.lineWidth = ln.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
  };

  TurtleWorld.prototype.setLines = function (lines) {
    this.lines = lines ? lines.slice() : [];
    this.redraw();
  };

  TurtleWorld.prototype.addLine = function (ln) {
    this.lines.push(ln);
    this.strokeLine(this.ctx, ln);
  };

  TurtleWorld.prototype.clearDrawing = function () {
    this.lines = [];
    this.redraw();
  };

  TurtleWorld.prototype.setColor = function (color) {
    this.color = color;
    var fills = this.actor.querySelectorAll('.buttpen-crayon, .buttpen-crayon-tip');
    for (var i = 0; i < fills.length; i++) fills[i].setAttribute('fill', color);
  };

  TurtleWorld.prototype.setCharacter = function (id) {
    var A = root.ButtPenAvatars;
    var av = A.get(id);
    this.characterId = av.id;
    this.actor.innerHTML = av.svg;
    this.actor.setAttribute('data-character', av.id);
    this.actor.setAttribute('aria-label', av.title);
    this.setColor(this.color);
    this.placeActor();
  };

  TurtleWorld.prototype.setVisible = function (v) {
    this.pose.visible = v;
    this.actor.style.opacity = v ? '1' : '0';
  };

  TurtleWorld.prototype.setPose = function (x, y, heading, wiggle) {
    this.pose.x = x;
    this.pose.y = y;
    this.pose.heading = heading;
    if (wiggle != null) this.pose.wiggle = wiggle;
    this.placeActor();
  };

  TurtleWorld.prototype.placeActor = function () {
    var A = root.ButtPenAvatars.VIEW;
    var css = this.cssSize();
    var short = css.h < 280;
    this.actorSize = short ? 54 : (css.w < 420 ? 62 : 76);
    var scale = this.actorSize / A.w;
    var s = this.worldToScreen(this.pose.x, this.pose.y);
    var px = A.penX * scale, py = A.penY * scale;
    var rot = this.pose.heading + (this.pose.wiggle || 0);
    this.actor.style.width = (A.w * scale) + 'px';
    this.actor.style.height = (A.h * scale) + 'px';
    this.actor.style.transformOrigin = '0 0';
    this.actor.style.transform =
      'translate(' + s.x + 'px,' + s.y + 'px) rotate(' + rot + 'deg) translate(' + (-px) + 'px,' + (-py) + 'px)';
  };

  TurtleWorld.prototype.startIdle = function () {
    var self = this;
    if (this._idleTimer) return;
    var last = performance.now();
    function tick(now) {
      var dt = now - last; last = now;
      if (!self._animating) {
        self._idle += dt / 1000;
        self.pose.wiggle = Math.sin(self._idle * 2.2) * 3;
        self.placeActor();
      }
      self._idleTimer = requestAnimationFrame(tick);
    }
    this._idleTimer = requestAnimationFrame(tick);
  };

  TurtleWorld.prototype.reset = function (turtle) {
    this.clearDrawing();
    var t = turtle || root.ButtPenInterpreter.defaultTurtle();
    this.setColor(t.color);
    this.width = t.width != null ? t.width : 4;
    this.penDown = t.penDown !== false;
    this.setVisible(t.visible !== false);
    this.setPose(t.x, t.y, t.heading, 0);
  };

  TurtleWorld.prototype.setWidth = function (w) { this.width = w; };
  TurtleWorld.prototype.setPen = function (down) { this.penDown = !!down; };

  TurtleWorld.prototype.getTurtle = function () {
    return {
      x: this.pose.x,
      y: this.pose.y,
      heading: ((this.pose.heading % 360) + 360) % 360,
      penDown: this.penDown !== false,
      color: this.color,
      width: this.width != null ? this.width : 4,
      visible: this.pose.visible !== false
    };
  };

  // Composite the paper + character onto a PNG data URL.
  TurtleWorld.prototype.toPNG = function (cb) {
    var self = this;
    var css = this.cssSize();
    var dpr = window.devicePixelRatio || 1;
    var out = document.createElement('canvas');
    out.width = Math.round(css.w * dpr);
    out.height = Math.round(css.h * dpr);
    var ctx = out.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.drawImage(this.canvas, 0, 0, css.w, css.h);
    if (!this.pose.visible) {
      cb(out.toDataURL('image/png'));
      return;
    }
    var svg = this.actor.querySelector('svg');
    if (!svg) { cb(out.toDataURL('image/png')); return; }
    var xml = new XMLSerializer().serializeToString(svg);
    var blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var img = new Image();
    img.onload = function () {
      var A = root.ButtPenAvatars.VIEW;
      var scale = self.actorSize / A.w;
      var s = self.worldToScreen(self.pose.x, self.pose.y);
      var rot = (self.pose.heading + (self.pose.wiggle || 0)) * Math.PI / 180;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(rot);
      ctx.drawImage(img, -A.penX * scale, -A.penY * scale, A.w * scale, A.h * scale);
      ctx.restore();
      URL.revokeObjectURL(url);
      cb(out.toDataURL('image/png'));
    };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      cb(out.toDataURL('image/png'));
    };
    img.src = url;
  };

  // World-space box around the ink (and optional character), with padding.
  TurtleWorld.prototype.contentBounds = function (includeCharacter) {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    function expand(x, y) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    var lines = this.lines || [];
    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i];
      expand(ln.x1, ln.y1); expand(ln.x2, ln.y2);
    }
    if (includeCharacter !== false && this.pose) {
      // Tight box around the character: local SVG corners, rotated by heading.
      var A = root.ButtPenAvatars.VIEW;
      var sc = this.actorSize / A.w;
      var rad = ((this.pose.heading % 360) + 360) % 360 * Math.PI / 180;
      var c = Math.cos(rad), s = Math.sin(rad);
      var corners = [
        { lx: -A.penX * sc, ly: A.penY * sc },
        { lx: (A.w - A.penX) * sc, ly: A.penY * sc },
        { lx: -A.penX * sc, ly: -(A.h - A.penY) * sc },
        { lx: (A.w - A.penX) * sc, ly: -(A.h - A.penY) * sc }
      ];
      for (var k = 0; k < corners.length; k++) {
        var p = corners[k];
        expand(this.pose.x + p.lx * c + p.ly * s, this.pose.y - p.lx * s + p.ly * c);
      }
    }
    if (!isFinite(minX)) {
      minX = -80; maxX = 80; minY = -80; maxY = 80;
    }
    var pad = 28;
    minX -= pad; minY -= pad; maxX += pad; maxY += pad;
    var w = maxX - minX, h = maxY - minY, minSize = 160;
    if (w < minSize) { var dx = (minSize - w) / 2; minX -= dx; maxX += dx; }
    if (h < minSize) { var dy = (minSize - h) / 2; minY -= dy; maxY += dy; }
    return { minX: minX, minY: minY, maxX: maxX, maxY: maxY, w: maxX - minX, h: maxY - minY };
  };

  // High-res cropped picture for saving or printing. Character is included by default.
  TurtleWorld.prototype.toPrintPNG = function (opts, cb) {
    if (typeof opts === 'function') { cb = opts; opts = {}; }
    opts = opts || {};
    var includeCharacter = opts.includeCharacter !== false && this.pose && this.pose.visible !== false;
    var self = this;
    var b = this.contentBounds(includeCharacter);
    var scale = 2;
    var maxPx = 2400;
    if (Math.max(b.w, b.h) * scale > maxPx) scale = maxPx / Math.max(b.w, b.h);
    var out = document.createElement('canvas');
    out.width = Math.max(1, Math.ceil(b.w * scale));
    out.height = Math.max(1, Math.ceil(b.h * scale));
    var ctx = out.getContext('2d');

    function wx(x) { return (x - b.minX) * scale; }
    function wy(y) { return (b.maxY - y) * scale; }

    ctx.fillStyle = '#fffdf7';
    ctx.fillRect(0, 0, out.width, out.height);
    // light grid, same 20-unit paper as the stage
    ctx.save();
    ctx.strokeStyle = 'rgba(80, 140, 180, 0.13)';
    ctx.lineWidth = Math.max(1, scale * 0.6);
    ctx.beginPath();
    var step = 20, gx, gy;
    var startX = Math.floor(b.minX / step) * step;
    var startY = Math.floor(b.minY / step) * step;
    for (gx = startX; gx <= b.maxX + 0.01; gx += step) {
      ctx.moveTo(wx(gx), 0); ctx.lineTo(wx(gx), out.height);
    }
    for (gy = startY; gy <= b.maxY + 0.01; gy += step) {
      ctx.moveTo(0, wy(gy)); ctx.lineTo(out.width, wy(gy));
    }
    ctx.stroke();
    ctx.restore();

    for (var i = 0; i < this.lines.length; i++) {
      var ln = this.lines[i];
      ctx.save();
      ctx.strokeStyle = ln.color;
      ctx.lineWidth = ln.width * scale;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(wx(ln.x1), wy(ln.y1));
      ctx.lineTo(wx(ln.x2), wy(ln.y2));
      ctx.stroke();
      ctx.restore();
    }

    function finish(url) { cb(url); }

    if (!includeCharacter) {
      finish(out.toDataURL('image/png'));
      return;
    }
    var svg = this.actor.querySelector('svg');
    if (!svg) { finish(out.toDataURL('image/png')); return; }
    var xml = new XMLSerializer().serializeToString(svg);
    var blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var img = new Image();
    img.onload = function () {
      var A = root.ButtPenAvatars.VIEW;
      var charScale = (self.actorSize / A.w) * scale;
      var rot = (self.pose.heading + (self.pose.wiggle || 0)) * Math.PI / 180;
      ctx.save();
      ctx.translate(wx(self.pose.x), wy(self.pose.y));
      ctx.rotate(rot);
      ctx.drawImage(img, -A.penX * charScale, -A.penY * charScale, A.w * charScale, A.h * charScale);
      ctx.restore();
      URL.revokeObjectURL(url);
      finish(out.toDataURL('image/png'));
    };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      finish(out.toDataURL('image/png'));
    };
    img.src = url;
  };

  // ---- animation runner ----
  var SPEEDS = {
    slow: { move: 420, turn: 260, px: 0.55 },
    medium: { move: 200, turn: 120, px: 0.28 },
    fast: { move: 70, turn: 50, px: 0.1 },
    instant: { move: 0, turn: 0, px: 0 }
  };

  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  function Animator(world) {
    this.world = world;
    this.queue = [];
    this.index = 0;
    this.playing = false;
    this._raf = null;
    this.speed = 'medium';
    this.onStatus = null;
    this.onDone = null;
    this._turtle = null;
  }

  Animator.prototype.setSpeed = function (s) {
    this.speed = SPEEDS[s] ? s : 'medium';
  };

  Animator.prototype.stop = function () {
    this.playing = false;
    this.world._animating = false;
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
  };

  Animator.prototype.load = function (result) {
    this.stop();
    this.queue = (result && result.actions) || [];
    this.index = 0;
    this._final = result;
  };

  Animator.prototype.remaining = function () {
    return this.queue.length - this.index;
  };

  Animator.prototype.playAll = function () {
    var self = this;
    this.playing = true;
    this.world._animating = true;
    function next() {
      if (!self.playing) return;
      if (self.index >= self.queue.length) {
        self.playing = false;
        self.world._animating = false;
        if (self._final && self._final.turtle) {
          var t = self._final.turtle;
          self.world.setColor(t.color);
          if (t.width != null) self.world.setWidth(t.width);
          if (t.penDown != null) self.world.setPen(t.penDown);
          self.world.setVisible(t.visible !== false);
          self.world.setPose(t.x, t.y, t.heading, 0);
          // Do not setLines(_final.lines): that list is only this run's strokes.
          // Quick commands would wipe anything already on the page.
        }
        if (self.onDone) self.onDone(true);
        return;
      }
      self.runOne(self.queue[self.index++], function () { next(); });
    }
    next();
  };

  Animator.prototype.stepOnce = function (cb) {
    if (this.index >= this.queue.length) {
      if (cb) cb(false);
      return;
    }
    this.playing = true;
    this.world._animating = true;
    var self = this;
    this.runOne(this.queue[this.index++], function () {
      self.playing = false;
      self.world._animating = false;
      if (self.index >= self.queue.length && self._final && self._final.turtle) {
        var t = self._final.turtle;
        self.world.setColor(t.color);
        if (t.width != null) self.world.setWidth(t.width);
        if (t.penDown != null) self.world.setPen(t.penDown);
        self.world.setVisible(t.visible !== false);
        self.world.setPose(t.x, t.y, t.heading, 0);
      }
      if (cb) cb(self.index < self.queue.length);
    });
  };

  Animator.prototype.runOne = function (act, done) {
    var world = this.world;
    var sp = SPEEDS[this.speed] || SPEEDS.medium;
    var instant = this.speed === 'instant' || (sp.move === 0 && sp.turn === 0);

    function finishPose(x, y, h) {
      world.setPose(x, y, h, 0);
    }

    if (act.type === 'move' || act.type === 'home') {
      if (act.type === 'home') {
        // also set heading at end; animate move then snap/lerp heading
      }
      var from = act.from, to = act.to;
      var heading = act.heading != null ? act.heading : (act.fromHeading != null ? act.fromHeading : world.pose.heading);
      var dist = Math.hypot(to.x - from.x, to.y - from.y);
      var dur = instant ? 0 : Math.max(sp.move * 0.5, Math.min(sp.move * 2.2, dist * (sp.px * 1000 / 60) + sp.move * 0.35));
      if (instant || dur < 8) {
        if (act.draw) world.addLine({ x1: from.x, y1: from.y, x2: to.x, y2: to.y, color: act.color, width: act.width });
        var endH = act.toHeading != null ? act.toHeading : heading;
        finishPose(to.x, to.y, endH);
        done();
        return;
      }
      var t0 = performance.now();
      var self = this;
      function tick(now) {
        if (!self.playing) { done(); return; }
        var p = Math.min(1, (now - t0) / dur);
        var e = ease(p);
        var x = lerp(from.x, to.x, e);
        var y = lerp(from.y, to.y, e);
        var wiggle = Math.sin(p * Math.PI * 4) * 10;
        world.setPose(x, y, heading, wiggle);
        // incremental line to current point: redraw last partial? Simpler: draw full line at start under the character.
        if (p >= 1) {
          if (act.draw) world.addLine({ x1: from.x, y1: from.y, x2: to.x, y2: to.y, color: act.color, width: act.width });
          var endH2 = act.toHeading != null ? act.toHeading : heading;
          if (act.type === 'home' && act.toHeading != null && act.fromHeading != act.toHeading) {
            world.setPose(to.x, to.y, act.toHeading, 0);
          } else {
            finishPose(to.x, to.y, endH2);
          }
          done();
          return;
        }
        // preview the in-progress stroke
        world.redraw();
        if (act.draw) {
          world.strokeLine(world.ctx, { x1: from.x, y1: from.y, x2: x, y2: y, color: act.color, width: act.width });
        }
        self._raf = requestAnimationFrame(tick);
      }
      this._raf = requestAnimationFrame(tick);
      return;
    }

    if (act.type === 'turn') {
      var durT = instant ? 0 : sp.turn;
      if (instant || durT < 8) {
        world.setPose(world.pose.x, world.pose.y, act.to, 0);
        // Normalize visually; pose heading can be the raw `to` or normalized
        done();
        return;
      }
      var startH = act.from;
      var endH = act.to;
      var t1 = performance.now();
      var selfT = this;
      function tickT(now) {
        if (!selfT.playing) { done(); return; }
        var p = Math.min(1, (now - t1) / durT);
        var e = ease(p);
        var h = lerp(startH, endH, e);
        world.setPose(world.pose.x, world.pose.y, h, 0);
        if (p >= 1) { world.setPose(world.pose.x, world.pose.y, endH, 0); done(); return; }
        selfT._raf = requestAnimationFrame(tickT);
      }
      this._raf = requestAnimationFrame(tickT);
      return;
    }

    if (act.type === 'color') { world.setColor(act.color); done(); return; }
    if (act.type === 'width') { world.setWidth(act.width); done(); return; }
    if (act.type === 'pen') { world.setPen(act.down); done(); return; }
    if (act.type === 'hide') { world.setVisible(false); done(); return; }
    if (act.type === 'show') { world.setVisible(true); done(); return; }
    if (act.type === 'clear') {
      world.clearDrawing();
      world.setPose(0, 0, 0, 0);
      done();
      return;
    }
    done();
  };

  var api = { TurtleWorld: TurtleWorld, Animator: Animator, SPEEDS: SPEEDS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ButtPenTurtle = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
