// About page, an easter egg: the mark (two points, A and
// B, joined by a winding road) is a button. Pressed, "point A" and "point B"
// lift out of the statement as points like the mark's, dots that can be
// dragged anywhere, and once they're far enough
// apart they talk. A sends a burst of points out of its side facing B: a
// small flock (steering after Craig Reynolds, by way of The Nature of Code),
// each keeping a little room from the others, leaning the way they go,
// drifting with them and wandering, while the lie of the page draws them
// through the text: the letters are walls, and the flock threads the gaps.
// Every passage costs something. A point's signal fades as it flies, and more
// with each letter it runs into; some never make it, and stop where they
// are. A letter a point knocks is knocked aside for good, and the point may
// take it up and carry it; if the point dies, the letter falls there. Over
// the portrait a point picks up colour and smears it along its trail.
// Whatever arrives is heard: B answers with as many points as reached it,
// carrying back what it was given, and so on to and fro, until nothing gets
// across and A begins again. Where the points go most, a path is worn: a
// line from A to B along the way most travelled. Pressed again, or Esc, and
// all of it is put back as it was.

(function () {
  var toggle = document.querySelector('.mark-toggle');
  // the words, found afresh each time: the statement is rewritten when its
  // language changes
  function pick() {
    return { a: document.querySelector('[data-point="a"]'), b: document.querySelector('[data-point="b"]') };
  }
  var words = pick();
  if (!toggle || !words.a || !words.b) return;

  var BURST = 10; // points in an opening burst
  var CONE = 55; // degrees either side of the way across they may set out at
  var TRAIL = 150; // px of line each draws behind it
  var PACE = 140; // px a point flies each second
  var GIVE_UP = 25000; // ms before a point that hasn't arrived lets go
  var REST = 500; // ms of quiet once the last trail has faded
  var APART = 400; // px A and B must be from each other before points set out
  var INK = '20, 20, 20';

  var on = false;
  var chips, canvas, ctx, dpr, frame, last, quiet;
  var ink = null; // where the letters are, one cell a pixel
  var flock = []; // the points in flight, and those whose trails are fading
  var lie = null; // how far each pixel is from where the points are headed
  var talk = null; // who is speaking to whom, and how it went
  var fallen = []; // letters dropped where their carriers died
  var heard = { a: null, b: null }; // what each side last received

  // ---- the points

  function chip(key) {
    var word = words[key];
    var box = word.getBoundingClientRect();
    var el = document.createElement('div');
    el.className = 'point-chip point-' + key;
    el.setAttribute('aria-hidden', 'true');
    // a point, as in the mark: a dot, with its letter beside it
    el.setAttribute('data-label', key.toUpperCase());
    document.body.appendChild(el);
    // where the word was, the point it names
    place(el, box.left + box.width / 2 - el.offsetWidth / 2, box.top + box.height / 2 - el.offsetHeight / 2);
    word.classList.add('lifted');
    drag(el);
    return el;
  }

  function place(el, x, y) {
    el.x = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, x));
    el.y = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, y));
    el.style.left = el.x + 'px';
    el.style.top = el.y + 'px';
  }

  function drag(el) {
    var dx, dy, held = false, recharting = null;
    el.addEventListener('pointerdown', function (e) {
      el.setPointerCapture(e.pointerId);
      el.classList.add('dragging');
      held = true;
      dx = e.clientX - el.x;
      dy = e.clientY - el.y;
      e.preventDefault();
    });
    el.addEventListener('pointermove', function (e) {
      if (!held) return;
      place(el, e.clientX - dx, e.clientY - dy);
      // the one being spoken to moving: the way to it, mapped again as it goes
      if (talk && el === chips[talk.to] && lie && !recharting) recharting = setTimeout(function () { recharting = null; chart(); }, 150);
    });
    var drop = function () {
      if (!held) return;
      held = false;
      el.classList.remove('dragging');
      clearTimeout(recharting);
      recharting = null;
      if (talk && el === chips[talk.to] && lie) chart();
    };
    el.addEventListener('pointerup', drop);
    el.addEventListener('pointercancel', drop);
  }

  // A and B far enough apart for points to set out between them
  function far() {
    var a = centre(chips.a), b = centre(chips.b);
    return Math.hypot(b[0] - a[0], b[1] - a[1]) >= APART;
  }

  function centre(el) {
    return [el.x + el.offsetWidth / 2, el.y + el.offsetHeight / 2];
  }

  // ---- the letters: each in its own box, so a point can knock it aside. A
  // word's letters stay together, so lines break where they did.

  var soup = []; // [the text it was, what stands in for it]
  var loose = []; // the loosened letters themselves
  var near = {}; // the letters by where they are, in 24px squares
  var settling = null;

  function stir() {
    restore();
    var walker = document.createTreeWalker(document.querySelector('.about'), NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        return node.parentElement.closest('.lifted, .visually-hidden') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [];
    for (var n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n);
    var letters = (loose = []);
    nodes.forEach(function (node) {
      var wrap = document.createElement('span');
      wrap.className = 'soup';
      node.nodeValue.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) {
          wrap.appendChild(document.createTextNode(part));
          return;
        }
        var word = document.createElement('span');
        word.className = 'soup-w';
        for (var i = 0; i < part.length; i++) {
          var l = document.createElement('span');
          l.className = 'soup-l';
          l.textContent = part[i];
          l.dx = l.dy = l.turn = 0;
          word.appendChild(l);
          letters.push(l);
        }
        wrap.appendChild(word);
      });
      node.replaceWith(wrap);
      soup.push([node, wrap]);
    });
  }

  // a loosened letter, at rest
  function settled(l) {
    return 'translate(' + l.dx + 'px, ' + l.dy + 'px) rotate(' + l.turn + 'deg)';
  }

  // where each letter is, to find the ones a point passes
  function index() {
    near = {};
    loose.forEach(function (l) {
      var at = laid(l);
      l.cx = at.x + at.w / 2 + l.dx;
      l.cy = at.y + at.h / 2 + l.dy;
      l.r = Math.max(at.w, at.h * 0.6) / 2;
      var key = ((l.cx / 24) | 0) + ',' + ((l.cy / 24) | 0);
      (near[key] = near[key] || []).push(l);
    });
  }

  // a point brushing past knocks a letter on, a few px its way, and there it
  // stays, though never further than DRIFT from where it began
  var KNOCK = 4; // px
  var DRIFT = 12; // px
  function knock(p, ux, uy, now) {
    var gx = (p[0] / 24) | 0, gy = (p[1] / 24) | 0;
    for (var y = gy - 1; y <= gy + 1; y++) {
      for (var x = gx - 1; x <= gx + 1; x++) {
        var here = near[x + ',' + y];
        if (!here) continue;
        for (var i = 0; i < here.length; i++) {
          var l = here[i];
          if (now - (l.hit || 0) < 600) continue;
          if (Math.hypot(p[0] - l.cx, p[1] - l.cy) > l.r + 3) continue;
          l.hit = now;
          bump(l, ux * KNOCK, uy * KNOCK, (Math.random() - 0.5) * 20);
          return l;
        }
      }
    }
    return null;
  }
  function bump(l, kx, ky, kt) {
    var x = l.dx + kx, y = l.dy + ky;
    var far = Math.hypot(x, y);
    if (far > DRIFT) {
      x *= DRIFT / far;
      y *= DRIFT / far;
    }
    l.cx += x - l.dx;
    l.cy += y - l.dy;
    l.dx = x;
    l.dy = y;
    l.turn = Math.max(-45, Math.min(45, l.turn + kt));
    l.classList.add('knocked');
    l.style.transition = 'transform 0.25s ease-out';
    l.style.transform = settled(l);
    setTimeout(function () {
      if (on) l.style.transition = '';
    }, 260);
  }


  function unstir() {
    loose.forEach(function (l) {
      l.style.transition = '';
      l.style.transform = '';
    });
    loose = [];
    near = {};
    clearTimeout(settling);
    settling = setTimeout(restore, 650);
  }

  // the text exactly as it was
  function restore() {
    clearTimeout(settling);
    soup.forEach(function (pair) {
      pair[1].replaceWith(pair[0]);
    });
    soup = [];
  }

  // where a box sits in the layout, before any turning or nudging
  function laid(el) {
    var x = 0, y = 0;
    for (var e = el; e; e = e.offsetParent) {
      x += e.offsetLeft;
      y += e.offsetTop;
    }
    return { x: x - window.scrollX, y: y - window.scrollY, w: el.offsetWidth, h: el.offsetHeight };
  }

  // ---- the ink: every letter on the page drawn again, unseen, in its place

  function survey() {
    var w = window.innerWidth, h = window.innerHeight;
    var paper = document.createElement('canvas');
    paper.width = w;
    paper.height = h;
    var g = paper.getContext('2d', { willReadFrequently: true });
    g.fillStyle = '#000';
    g.textBaseline = 'alphabetic';

    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        var parent = node.parentElement;
        if (!parent || parent.closest('script, style, .point-chip, .lifted, .visually-hidden')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var range = document.createRange();
    for (var node = walker.nextNode(); node; node = walker.nextNode()) {
      var style = getComputedStyle(node.parentElement);
      if (style.visibility === 'hidden' || +style.opacity === 0) continue;
      g.font = style.fontStyle + ' ' + style.fontWeight + ' ' + style.fontSize + ' ' + style.fontFamily;
      var text = node.nodeValue;
      var upper = style.textTransform === 'uppercase';

      // a loose letter: drawn where it's going, nudged and turned about its middle
      var loose = node.parentElement.classList.contains('soup-l') ? node.parentElement : null;
      if (loose) {
        var at = laid(loose);
        var lm = g.measureText(upper ? text.toUpperCase() : text);
        var tall = lm.fontBoundingBoxAscent + lm.fontBoundingBoxDescent;
        var cx = at.x + at.w / 2, cy = at.y + at.h / 2;
        g.save();
        g.translate(cx + loose.dx, cy + loose.dy);
        g.rotate((loose.turn * Math.PI) / 180);
        g.fillText(upper ? text.toUpperCase() : text, -at.w / 2, (at.h - tall) / 2 + lm.fontBoundingBoxAscent - at.h / 2);
        g.restore();
        continue;
      }

      for (var i = 0; i < text.length; i++) {
        var ch = text[i];
        if (!ch.trim()) continue;
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        var r = range.getBoundingClientRect();
        if (!r.width || r.bottom < 0 || r.top > h || r.right < 0 || r.left > w) continue;
        if (upper) ch = ch.toUpperCase();
        var m = g.measureText(ch);
        // the box is the font's height; the letter sits on its baseline in it
        g.fillText(ch, r.left, r.top + (m.fontBoundingBoxAscent || r.height * 0.8));
      }
    }

    var px = g.getImageData(0, 0, w, h).data;
    var cells = new Uint8Array(w * h);
    for (var k = 0; k < cells.length; k++) cells[k] = px[k * 4 + 3] > 90 ? 1 : 0;
    ink = { w: w, h: h, cells: cells, open: reachable(w, h, cells) };
    index();
  }

  // The open space joined up with the page's margins: the hole in an o or an
  // e is open but walled in all round, and nothing gets in or out of it.
  function reachable(w, h, cells) {
    var seen = new Uint8Array(w * h);
    var queue = new Int32Array(w * h);
    var head = 0, end = 0;
    var seed = function (i) {
      if (!cells[i] && !seen[i]) { seen[i] = 1; queue[end++] = i; }
    };
    for (var x = 0; x < w; x++) { seed(x); seed((h - 1) * w + x); }
    for (var y = 0; y < h; y++) { seed(y * w); seed(y * w + w - 1); }
    while (head < end) {
      var i = queue[head++], cx = i % w;
      if (cx > 0) seed(i - 1);
      if (cx < w - 1) seed(i + 1);
      if (i >= w) seed(i - w);
      if (i < w * (h - 1)) seed(i + w);
    }
    return seen;
  }

  // the reachable pixel nearest a point: a tag dropped on text can have its
  // middle on a letter, or in one
  function open(c) {
    var x0 = Math.max(0, Math.min(ink.w - 1, Math.round(c[0]))), y0 = Math.max(0, Math.min(ink.h - 1, Math.round(c[1])));
    for (var r = 0; r < 40; r++) {
      for (var dy = -r; dy <= r; dy++) {
        for (var dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          var x = x0 + dx, y = y0 + dy;
          if (x >= 0 && y >= 0 && x < ink.w && y < ink.h && ink.open[y * ink.w + x]) return [x, y];
        }
      }
    }
    return [x0, y0];
  }

  function walled(p) {
    var x = Math.round(p[0]), y = Math.round(p[1]);
    return x < 0 || y < 0 || x >= ink.w || y >= ink.h || !ink.open[y * ink.w + x];
  }

  // ---- the lie of the page: from every open pixel, how far it is to the
  // listener going only through open space. Downhill is always the way through.

  function chart() {
    var w = ink.w, h = ink.h, n = w * h;
    var dist = new Int32Array(n).fill(-1);
    var queue = new Int32Array(n);
    var goal = open(centre(chips[talk.to]));
    var head = 0, end = 0;
    dist[goal[1] * w + goal[0]] = 0;
    queue[end++] = goal[1] * w + goal[0];
    while (head < end) {
      var i = queue[head++], x = i % w, d = dist[i] + 1;
      if (x > 0 && dist[i - 1] < 0 && ink.open[i - 1]) { dist[i - 1] = d; queue[end++] = i - 1; }
      if (x < w - 1 && dist[i + 1] < 0 && ink.open[i + 1]) { dist[i + 1] = d; queue[end++] = i + 1; }
      if (i >= w && dist[i - w] < 0 && ink.open[i - w]) { dist[i - w] = d; queue[end++] = i - w; }
      if (i < n - w && dist[i + w] < 0 && ink.open[i + w]) { dist[i + w] = d; queue[end++] = i + w; }
    }
    lie = dist;
  }

  // which way is downhill from a point: the lowest of the spots round it
  var ROUND = [];
  for (var t = 0; t < 16; t++) ROUND.push([Math.cos((t / 16) * Math.PI * 2), Math.sin((t / 16) * Math.PI * 2)]);
  function downhill(x, y, b) {
    var best = -1, bx = 0, by = 0;
    probe: for (var k = 0; k < 16; k++) {
      // only where the way there is open, not across a letter's stroke
      for (var r = 1; r <= 5; r++) {
        var px = Math.round(x + ROUND[k][0] * r), py = Math.round(y + ROUND[k][1] * r);
        if (px < 0 || py < 0 || px >= ink.w || py >= ink.h || !ink.open[py * ink.w + px]) continue probe;
      }
      var d = lie[py * ink.w + px];
      if (d >= 0 && (best < 0 || d < best)) { best = d; bx = ROUND[k][0]; by = ROUND[k][1]; }
    }
    if (best >= 0) return [bx, by];
    // lost off the map: straight for the listener
    var dx = b[0] - x, dy = b[1] - y, l = Math.hypot(dx, dy) || 1;
    return [dx / l, dy / l];
  }

  // ---- the portrait: the colour under a point

  var photo = null;
  function look() {
    var img = document.querySelector('.about .portrait');
    if (!img || !img.complete || !img.naturalWidth) return;
    if (!photo || photo.img !== img) {
      var c = document.createElement('canvas');
      c.width = 160;
      c.height = Math.round((160 * img.naturalHeight) / img.naturalWidth);
      var g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, 0, c.width, c.height);
      photo = { img: img, w: c.width, h: c.height, px: g.getImageData(0, 0, c.width, c.height).data };
    }
    photo.box = img.getBoundingClientRect();
  }
  function colourAt(x, y) {
    if (!photo || !photo.box) return null;
    var r = photo.box;
    if (x < r.left || y < r.top || x >= r.right || y >= r.bottom) return null;
    // the photo fills its box, cropped about its middle
    var scale = Math.max(r.width / photo.w, r.height / photo.h);
    var ix = Math.floor((x - r.left - (r.width - photo.w * scale) / 2) / scale);
    var iy = Math.floor((y - r.top - (r.height - photo.h * scale) / 2) / scale);
    if (ix < 0 || iy < 0 || ix >= photo.w || iy >= photo.h) return null;
    var i = (iy * photo.w + ix) * 4;
    // a little richer than the photo, which is quiet, so the smear shows
    var r0 = photo.px[i], g0 = photo.px[i + 1], b0 = photo.px[i + 2], grey = (r0 + g0 + b0) / 3;
    return [r0, g0, b0].map(function (c) { return Math.max(0, Math.min(255, grey + (c - grey) * 1.8)); });
  }

  // ---- a turn in the conversation: points set out one after another from
  // the same spot, on the speaker's edge facing the listener

  var waiting = 0; // points still to set out this turn
  function turn() {
    if (!talk || !talk.sent) {
      talk = { from: 'a', to: 'b', size: BURST };
    } else if (talk.arrived) {
      // heard: the answer is as big as what got across
      talk = { from: talk.to, to: talk.from, size: talk.arrived };
    } else {
      // nothing got through: A begins again
      talk = { from: 'a', to: 'b', size: BURST };
    }
    talk.sent = 0;
    talk.arrived = 0;
    // old ways grow over a little, turn by turn
    if (traffic) for (var i = 0; i < traffic.length; i++) traffic[i] *= 0.85;
    talk.carry = heard[talk.from] ? heard[talk.from].text.split('') : [];
    heard[talk.to] = { text: '', at: 0 };
    // the letters knocked out of place last turn are walls where they are now
    survey();
    look();
    chart();
    waiting = talk.size;
  }

  function mouth() {
    var from = chips[talk.from], a = centre(from), b = centre(chips[talk.to]);
    var ux = b[0] - a[0], uy = b[1] - a[1], l = Math.hypot(ux, uy) || 1;
    ux /= l;
    uy /= l;
    var hw = from.offsetWidth / 2, hh = from.offsetHeight / 2;
    var t = Math.min(ux ? hw / Math.abs(ux) : Infinity, uy ? hh / Math.abs(uy) : Infinity);
    return { x: a[0] + ux * (t + 3), y: a[1] + uy * (t + 3), ux: ux, uy: uy };
  }

  function launch(now) {
    var m = mouth();
    var ang = Math.atan2(m.uy, m.ux) + ((Math.random() - 0.5) * 2 * CONE * Math.PI) / 180;
    var speed = (PACE / 60) * (0.8 + Math.random() * 0.4);
    flock.push({
      x: m.x, y: m.y,
      vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
      wander: Math.random() * Math.PI * 2,
      col: [20, 20, 20],
      trail: [[m.x, m.y, 20, 20, 20]], length: 0, left: TRAIL,
      life: 1,
      // an answer carries back what was heard, a letter a point
      carry: talk.carry.length ? talk.carry.shift() : null,
      born: now, home: false, dead: false
    });
    talk.sent++;
  }

  // ---- the flock (Reynolds: steer = desired - velocity, no more than MAXF)

  var MAXF = 0.07; // the most a point can turn in a frame: gently
  var SLOW = 100; // px from the listener a point begins to slow and settle
  var NOISE = 0.0011; // signal lost each frame, on average
  var CRASH = 0.05; // signal lost running into a letter

  function steer(dx, dy, speed, p) {
    var l = Math.hypot(dx, dy);
    if (!l) return [0, 0];
    var sx = (dx / l) * speed - p.vx, sy = (dy / l) * speed - p.vy;
    var m = Math.hypot(sx, sy);
    if (m > MAXF) { sx *= MAXF / m; sy *= MAXF / m; }
    return [sx, sy];
  }

  function fly(p, b, dt, now) {
    var top = PACE / 60;
    var toB = Math.hypot(b[0] - p.x, b[1] - p.y);
    // arriving: slower inside SLOW, and the flock and wandering let go
    var speed = toB < SLOW ? top * Math.max(0.35, toB / SLOW) : top;
    var free = Math.min(1, toB / SLOW);

    var hill = downhill(p.x, p.y, b);
    var fx = 0, fy = 0, f;
    f = steer(hill[0], hill[1], speed, p); fx += f[0]; fy += f[1];

    // wandering: towards a spot drifting round a small circle just ahead
    p.wander += (Math.random() - 0.5) * 0.5 * dt;
    var vl = Math.hypot(p.vx, p.vy) || 1;
    f = steer((p.vx / vl) * 24 + Math.cos(p.wander) * 10, (p.vy / vl) * 24 + Math.sin(p.wander) * 10, speed, p);
    fx += f[0] * 0.45 * free; fy += f[1] * 0.45 * free;

    // the others: a little room, the way they go, where they are
    var sx = 0, sy = 0, ax = 0, ay = 0, cx = 0, cy = 0, ns = 0, n = 0;
    for (var i = 0; i < flock.length; i++) {
      var o = flock[i];
      if (o === p || o.home || o.dead) continue;
      var dx = p.x - o.x, dy = p.y - o.y, d = Math.hypot(dx, dy);
      if (d === 0 || d > 50) continue;
      if (d < 16) { sx += dx / d / d; sy += dy / d / d; ns++; }
      ax += o.vx; ay += o.vy; cx += o.x; cy += o.y; n++;
    }
    if (ns) { f = steer(sx, sy, speed, p); fx += f[0] * 1.5 * free; fy += f[1] * 1.5 * free; }
    if (n) {
      f = steer(ax, ay, speed, p); fx += f[0] * 0.6 * free; fy += f[1] * 0.6 * free;
      f = steer(cx / n - p.x, cy / n - p.y, speed, p); fx += f[0] * 0.4 * free; fy += f[1] * 0.4 * free;
    }

    p.vx += fx * dt;
    p.vy += fy * dt;
    var v = Math.hypot(p.vx, p.vy);
    if (v > speed) { p.vx *= speed / v; p.vy *= speed / v; }

    // a pixel at a time, never into ink. Where the way ahead is walled, the
    // point squeezes through instead: for a moment it keeps strictly to the
    // open pixels nearest the listener, so even a gap a pixel wide between
    // two letters lets it through, and then it flies on with the others
    var steps = Math.max(1, Math.ceil(Math.hypot(p.vx, p.vy) * dt));
    var scraped = false;
    p.squeeze = Math.max(0, (p.squeeze || 0) - dt);
    for (var st = 0; st < steps; st++) {
      var nx = p.x + (p.vx * dt) / steps, ny = p.y + (p.vy * dt) / steps;
      if (!p.squeeze && !walled([nx, ny])) {
        p.x = nx;
        p.y = ny;
        continue;
      }
      var cx0 = Math.round(p.x), cy0 = Math.round(p.y), best = -1, bx = 0, by = 0;
      for (var k = 0; k < 8; k++) {
        var ox = [1, 1, 0, -1, -1, -1, 0, 1][k], oy = [0, 1, 1, 1, 0, -1, -1, -1][k];
        var qx = cx0 + ox, qy = cy0 + oy;
        if (qx < 0 || qy < 0 || qx >= ink.w || qy >= ink.h || !ink.open[qy * ink.w + qx]) continue;
        var dd = lie[qy * ink.w + qx];
        if (dd >= 0 && (best < 0 || dd < best)) { best = dd; bx = ox; by = oy; }
      }
      if (best < 0) break;
      if (!p.squeeze) scraped = true;
      p.squeeze = Math.max(p.squeeze, 12);
      p.x = cx0 + bx;
      p.y = cy0 + by;
      var ol = Math.hypot(bx, by);
      // easing round to the new heading, not snapping to it
      p.vx = p.vx * 0.85 + (bx / ol) * speed * 0.15;
      p.vy = p.vy * 0.85 + (by / ol) * speed * 0.15;
    }

    // what the passage costs: a little all the time, more at every collision
    p.life -= NOISE * (0.5 + Math.random()) * dt;
    if (scraped) p.life -= CRASH * 0.5;
    vl = Math.hypot(p.vx, p.vy) || 1;
    var struck = knock([p.x, p.y], p.vx / vl, p.vy / vl, now);
    if (struck) {
      p.life -= CRASH;
      // and it may take up the letter it struck
      if (!p.carry && Math.random() < 0.35) p.carry = struck.textContent;
    }

    // colour picked up from what it crosses, letting go of it slowly after
    var under = colourAt(p.x, p.y);
    var take = under ? 0.25 : 0.0015, aim = under || [20, 20, 20];
    for (var c = 0; c < 3; c++) p.col[c] += (aim[c] - p.col[c]) * take * dt;

    tread(p.x, p.y, dt);

    var last = p.trail[p.trail.length - 1];
    var moved = Math.hypot(p.x - last[0], p.y - last[1]);
    if (moved >= 2) {
      p.trail.push([p.x, p.y, p.col[0], p.col[1], p.col[2]]);
      p.length += moved;
    }

    var reach = 18; // px from the listening point's middle that counts as there
    if (Math.hypot(b[0] - p.x, b[1] - p.y) < reach) {
      p.home = true;
      talk.arrived++;
      if (p.carry) heard[talk.to].text += p.carry;
      heard[talk.to].at = now;
    } else if (p.life <= 0 || now - p.born > GIVE_UP) {
      // lost on the way; what it carried falls where it stopped
      p.dead = true;
      if (p.carry) fallen.push({ ch: p.carry, x: p.x, y: p.y, col: p.col.slice(), at: now });
    }
  }

  // ---- the path most travelled: where points have flown, counted in 8px
  // squares; and the way from A to B that keeps to the busiest of them, as a
  // footpath forms across a lawn

  var CELL = 8;
  var traffic = null, tw = 0, th = 0;
  var worn = null; // the path: its points, and how well trodden it is
  var lastWorn = 0;

  function clearTraffic() {
    tw = Math.ceil(window.innerWidth / CELL);
    th = Math.ceil(window.innerHeight / CELL);
    traffic = new Float32Array(tw * th);
    worn = null;
  }

  function tread(x, y, dt) {
    var cx = (x / CELL) | 0, cy = (y / CELL) | 0;
    if (cx >= 0 && cy >= 0 && cx < tw && cy < th) traffic[cy * tw + cx] += dt;
  }

  // the cheapest way across, where a busy square costs little and an untrodden
  // one a lot (Dijkstra, on the squares)
  function wear() {
    if (!traffic) return;
    var a = centre(chips.a), b = centre(chips.b);
    var start = Math.min(th - 1, (a[1] / CELL) | 0) * tw + Math.min(tw - 1, (a[0] / CELL) | 0);
    var goal = Math.min(th - 1, (b[1] / CELL) | 0) * tw + Math.min(tw - 1, (b[0] / CELL) | 0);
    var n = tw * th, cost = new Float32Array(n).fill(Infinity), came = new Int32Array(n).fill(-1), done = new Uint8Array(n);
    var heap = [];
    var push = function (i) {
      heap.push(i);
      for (var c = heap.length - 1; c > 0; ) {
        var q = (c - 1) >> 1;
        if (cost[heap[q]] <= cost[heap[c]]) break;
        var t = heap[q]; heap[q] = heap[c]; heap[c] = t; c = q;
      }
    };
    var pop = function () {
      var top = heap[0], end = heap.pop();
      if (heap.length) {
        heap[0] = end;
        for (var c = 0; ; ) {
          var l = 2 * c + 1, r = l + 1, m = c;
          if (l < heap.length && cost[heap[l]] < cost[heap[m]]) m = l;
          if (r < heap.length && cost[heap[r]] < cost[heap[m]]) m = r;
          if (m === c) break;
          var t = heap[m]; heap[m] = heap[c]; heap[c] = t; c = m;
        }
      }
      return top;
    };
    cost[start] = 0;
    push(start);
    while (heap.length) {
      var i = pop();
      if (i === goal) break;
      if (done[i]) continue;
      done[i] = 1;
      var x = i % tw, y = (i / tw) | 0;
      for (var dy = -1; dy <= 1; dy++) {
        for (var dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          var nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= tw || ny >= th) continue;
          var j = ny * tw + nx;
          var c = cost[i] + (dx && dy ? Math.SQRT2 : 1) * (1 + 24 / (1 + traffic[j]));
          if (c < cost[j]) { cost[j] = c; came[j] = i; push(j); }
        }
      }
    }
    if (came[goal] === -1) return;
    var pts = [], use = 0;
    for (var at = goal; at !== -1; at = came[at]) {
      pts.push([((at % tw) + 0.5) * CELL, (((at / tw) | 0) + 0.5) * CELL]);
      use += traffic[at];
    }
    pts.reverse();
    pts[0] = a;
    pts[pts.length - 1] = b;
    // rounded off, corners cut again and again (Chaikin)
    for (var pass = 0; pass < 4; pass++) {
      var out = [pts[0]];
      for (var k = 0; k < pts.length - 1; k++) {
        var p0 = pts[k], p1 = pts[k + 1];
        out.push([p0[0] * 0.75 + p1[0] * 0.25, p0[1] * 0.75 + p1[1] * 0.25]);
        out.push([p0[0] * 0.25 + p1[0] * 0.75, p0[1] * 0.25 + p1[1] * 0.75]);
      }
      out.push(pts[pts.length - 1]);
      pts = out;
    }
    worn = { pts: pts, use: use / Math.max(1, pts.length / 16) };
  }

  function drawWorn() {
    if (!worn || worn.use < 1) return;
    ctx.beginPath();
    ctx.moveTo(worn.pts[0][0] * dpr, worn.pts[0][1] * dpr);
    for (var i = 1; i < worn.pts.length; i++) ctx.lineTo(worn.pts[i][0] * dpr, worn.pts[i][1] * dpr);
    // the more it's travelled, the plainer it is
    ctx.strokeStyle = rgba([20, 20, 20], Math.min(0.75, 0.12 + worn.use / 60));
    ctx.lineWidth = 1.5 * dpr;
    ctx.stroke();
  }

  // ---- drawing

  function rgba(c, a) {
    return 'rgba(' + Math.round(c[0]) + ', ' + Math.round(c[1]) + ', ' + Math.round(c[2]) + ', ' + a + ')';
  }

  // a point's trail: its last TRAIL px of flight, in the colours it carried,
  // fading toward the tail. Arrived or lost, the trail shortens until it's gone.
  function draw(p) {
    var pts = p.trail;
    while (pts.length > 2 && p.length - Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]) > p.left) {
      p.length -= Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]);
      pts.shift();
    }
    // drawn as a curve: from the middle of each step to the middle of the
    // next, bending through the point between
    var run = 0;
    var mid = function (i) { return [(pts[i - 1][0] + pts[i][0]) / 2, (pts[i - 1][1] + pts[i][1]) / 2]; };
    for (var i = 1; i < pts.length; i++) {
      run += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      var from = i === 1 ? pts[0] : mid(i - 1);
      var to = mid(i);
      ctx.beginPath();
      ctx.moveTo(from[0] * dpr, from[1] * dpr);
      if (i === 1) ctx.lineTo(to[0] * dpr, to[1] * dpr);
      else ctx.quadraticCurveTo(pts[i - 1][0] * dpr, pts[i - 1][1] * dpr, to[0] * dpr, to[1] * dpr);
      ctx.strokeStyle = rgba([pts[i][2], pts[i][3], pts[i][4]], (0.85 * Math.max(0, run - (p.length - p.left))) / p.left);
      ctx.stroke();
    }
    if (!p.home && !p.dead) {
      // fainter as its signal fades
      var a = 0.35 + 0.65 * Math.max(0, p.life);
      ctx.fillStyle = rgba(p.col, a);
      ctx.fillRect((p.x - 1.5) * dpr, (p.y - 1.5) * dpr, 3 * dpr, 3 * dpr);
      if (p.carry) ctx.fillText(p.carry, (p.x + 4) * dpr, (p.y - 4) * dpr);
    }
  }

  // letters that fell, fading where they lie; and under each tag, what it
  // last heard
  function marks(now) {
    for (var i = fallen.length - 1; i >= 0; i--) {
      var f = fallen[i], age = (now - f.at) / 6000;
      if (age >= 1) { fallen.splice(i, 1); continue; }
      ctx.fillStyle = rgba(f.col, 0.8 * (1 - age));
      ctx.fillText(f.ch, f.x * dpr, f.y * dpr);
    }
    ['a', 'b'].forEach(function (key) {
      var h = heard[key];
      if (!h || !h.text) return;
      var age = (now - h.at) / 8000;
      if (age >= 1) return;
      var el = chips[key];
      ctx.fillStyle = rgba([20, 20, 20], 0.9 * Math.min(1, 1.6 * (1 - age)));
      ctx.fillText(h.text, el.x * dpr, (el.y + el.offsetHeight + 14) * dpr);
    });
  }

  var staggered = 0;
  function step(now) {
    var dt = Math.min(3, (now - last) / 16.7);
    last = now;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (ink) {
      if (waiting) {
        // one after another, a few frames apart
        staggered += dt;
        if (staggered >= 3) {
          launch(now);
          waiting--;
          staggered = 0;
        }
      } else if (!flock.length) {
        // all quiet a moment: the next turn
        quiet += dt * 16.7;
        if (quiet >= REST && far() && !document.querySelector('.point-chip.dragging')) {
          turn();
          quiet = 0;
        }
      }
      if (now - lastWorn > 500) {
        wear();
        lastWorn = now;
      }
      ctx.lineCap = 'round';
      drawWorn();
      ctx.lineWidth = 1.25 * dpr;
      ctx.font = 11 * dpr + 'px ' + getComputedStyle(document.body).getPropertyValue('--mono');
      var b = talk ? centre(chips[talk.to]) : null;
      for (var k = flock.length - 1; k >= 0; k--) {
        var p = flock[k];
        if (!p.home && !p.dead) fly(p, b, dt, now);
        else p.left -= (PACE * dt) / 60;
        if ((p.home || p.dead) && p.left <= 0) {
          flock.splice(k, 1);
          continue;
        }
        draw(p);
      }
      marks(now);
    }
    frame = requestAnimationFrame(step);
  }

  function size() {
    dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    if (chips) {
      place(chips.a, chips.a.x, chips.a.y);
      place(chips.b, chips.b.x, chips.b.y);
    }
    survey();
    // a window of another size: the squares no longer line up
    if (traffic && (Math.ceil(window.innerWidth / CELL) !== tw || Math.ceil(window.innerHeight / CELL) !== th)) clearTraffic();
  }

  var scrolled = null;
  function rescan() {
    clearTimeout(scrolled);
    scrolled = setTimeout(survey, 120);
  }

  // ---- on and off

  function start() {
    on = true;
    toggle.setAttribute('aria-pressed', 'true');
    canvas = document.createElement('canvas');
    canvas.className = 'egg-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    words = pick();
    chips = { a: chip('a'), b: chip('b') };
    stir();
    flock = [];
    waiting = 0;
    talk = null;
    fallen = [];
    heard = { a: null, b: null };
    quiet = REST; // the first burst straight away
    size();
    clearTraffic();
    last = performance.now();
    frame = requestAnimationFrame(step);
    window.addEventListener('resize', size);
    window.addEventListener('scroll', rescan, { passive: true });
  }

  function stop() {
    on = false;
    toggle.setAttribute('aria-pressed', 'false');
    cancelAnimationFrame(frame);
    window.removeEventListener('resize', size);
    window.removeEventListener('scroll', rescan);
    canvas.remove();
    chips.a.remove();
    chips.b.remove();
    chips = null;
    flock = [];
    waiting = 0;
    ink = null;
    lie = null;
    traffic = null;
    worn = null;
    unstir();
    [words.a, words.b].forEach(function (word) {
      word.classList.remove('lifted');
      if (!word.className) word.removeAttribute('class');
    });
  }

  toggle.addEventListener('click', function () {
    if (on) stop();
    else start();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && on) stop();
  });
})();
