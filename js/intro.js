// Home page: the demo reel plays full screen at the top and pauses while
// it's scrolled out of sight. The header holds to the bottom of the reel
// (sticky, in site.css), so the name, Works and About wait there in white,
// then cross its edge as the header comes up: the edge cuts through the
// letters (white above, ink below) and breaks them into noise in the passage.
// Nothing here moves them; the browser does, in step with the scrolling.
// Below its edge the colour at the foot of the picture spills onto the page
// like light, in a waveform: the more colour, the further it reaches. It
// shows as the reel goes, none at the top, all of it once the reel is
// scrolled away; then the reel stays above, blurred, to scroll back up to
// (.away and .bleed, in site.css).
// On a phone, Works tapped on the reel sends it away for good instead.

(function () {
  var intro = document.querySelector('.intro');
  var reel = intro.querySelector('.reel');
  var header = document.querySelector('.site-header');
  var works = header.querySelector('.site-nav a[href="#works"]');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var phone = window.matchMedia('(hover: none) and (pointer: coarse)');
  var home = document.querySelector('.home');
  var chosen = false; // Works was clicked on the reel

  // The page starts at the reel; it's not put back where it was scrolled to.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  var visit = performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null;
  var reload = visit && visit.type === 'reload';

  // Sent to #works (the Works link on another page): straight to the works,
  // and the address loses the #works so a reload shows the reel again.
  var sent = location.hash === '#works';
  if (sent) history.replaceState(history.state, '', location.pathname + location.search);

  // coming back with the browser's back button isn't a reload either; on a
  // phone the reel goes, elsewhere it's just scrolled past
  var past = (visit && visit.type === 'back_forward') || (sent && !reload);
  if (past && phone.matches) {
    intro.remove();
    window.scrollTo(0, 0);
    return;
  }
  window.scrollTo(0, past ? intro.offsetHeight : 0);

  // what the passage leaves in place of a letter; the spaces drop it outright
  var NOISE = '#%&*+=-_/\\|<>~^:;01    ';

  var riders = Array.prototype.slice.call(header.querySelectorAll('[data-ride]')).map(function (el) {
    // screen readers get the words; the letters on screen can turn to noise
    var text = el.textContent;
    var shown = document.createElement('span');
    shown.setAttribute('aria-hidden', 'true');
    shown.textContent = text;
    el.setAttribute('aria-label', text);
    el.setAttribute('data-shown', text);
    el.textContent = '';
    el.appendChild(shown);
    return { el: el, shown: shown, text: text, rolled: 0, noisy: false };
  });

  // Works: glide down past the reel, rather than jump past the header to the
  // list. By the reel's height, not to the header: the header is held at the
  // bottom of the window, so the browser thinks it's already in view.
  works.addEventListener('click', function (e) {
    if (!intro.isConnected) return;
    e.preventDefault();
    chosen = true;
    window.scrollTo({ top: intro.offsetTop + intro.offsetHeight, behavior: reduced ? 'auto' : 'smooth' });
  });

  // Muted, so browsers let it play on its own. Where they still won't (an
  // iPhone in Low Power Mode, or with Auto-Play Video Previews off), the reel
  // says so (.blocked, in site.css) and a touch on it starts it.
  reel.muted = true;
  reel.playsInline = true;
  function start() {
    reel.play().catch(function (err) {
      if (err && err.name === 'NotAllowedError') intro.classList.add('blocked');
    });
  }
  reel.addEventListener('playing', function () {
    intro.classList.remove('blocked');
  });
  intro.addEventListener('touchend', start, { passive: true });
  intro.addEventListener('click', start);

  // Paused while it's well out of sight, and started again a little before
  // it comes back into view, so it isn't starting up under a finger
  // mid-scroll.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(
      function (entries) {
        if (entries[0].isIntersecting) start();
        else reel.pause();
      },
      { rootMargin: '50% 0px' }
    ).observe(intro);
  }

  function garble(text, amount) {
    return text.replace(/\S/g, function (c) {
      return Math.random() < amount ? NOISE.charAt(Math.floor(Math.random() * NOISE.length)) : c;
    });
  }

  // the letters, and their white copy for above the edge
  function show(r, text) {
    r.shown.textContent = text;
    r.el.setAttribute('data-shown', text);
  }

  var running = false;

  function tick(now) {
    // scrolled past on a phone after Works was tapped, the reel goes
    if (intro.isConnected && chosen && phone.matches && intro.getBoundingClientRect().bottom <= 1) dismiss();
    var edge = intro.isConnected ? intro.getBoundingClientRect().bottom : -Infinity;
    // scrolled past and kept, it blurs
    home.classList.toggle('away', intro.isConnected && !phone.matches && edge <= 1);
    // the light below its edge shows as far as the reel has gone: a twentieth
    // of the way down, a twentieth of it
    lit = intro.isConnected && !phone.matches ? Math.max(0, Math.min(1, 1 - edge / intro.offsetHeight)) : 0;
    bleed.style.opacity = lit;
    if (lit > 0) wave();

    var noisy = false;
    riders.forEach(function (r) {
      var box = r.el.getBoundingClientRect();
      var height = box.height;

      // the reel's edge, measured from the top of the letters
      var cut = edge - box.top;
      r.el.style.setProperty('--cut', Math.max(-1, Math.min(height + 1, cut)) + 'px');
      r.el.classList.toggle('on-reel', cut > height / 2);

      // in the passage: the nearer the edge is to the middle of the letters,
      // the more of them are lost to noise, flickering while they're there
      var amount = reduced ? 0 : Math.max(0, 1 - Math.abs(cut - height / 2) / (height / 2 + 14));
      if (amount > 0) {
        if (now - r.rolled > 60) {
          show(r, garble(r.text, Math.min(0.9, amount * 1.3)));
          r.rolled = now;
        }
        r.noisy = true;
        noisy = true;
      } else if (r.noisy) {
        show(r, r.text);
        r.noisy = false;
      }
    });

    // keep flickering while anything is in the passage, even if the
    // scrolling stops there
    if (noisy) {
      requestAnimationFrame(tick);
    } else {
      running = false;
    }
  }

  function wake() {
    if (!running) {
      running = true;
      requestAnimationFrame(tick);
    }
  }

  // ---- the waveform along the reel's edge

  var COLS = 72; // points across
  var ROWS = 24; // and down, before it's spread over the page
  var REACH = 0.15; // the least it hangs down, of its full height
  var bleed = document.createElement('canvas');
  bleed.className = 'bleed';
  bleed.setAttribute('aria-hidden', 'true');
  intro.appendChild(bleed);
  var pen = bleed.getContext('2d');
  // the foot of the picture, shrunk to a strip a few pixels deep
  var strip = document.createElement('canvas');
  strip.width = COLS;
  strip.height = 4;
  var lens = strip.getContext('2d', { willReadFrequently: true });
  // the light, drawn small and spread out smooth over the page
  var glow = document.createElement('canvas');
  glow.width = COLS;
  glow.height = ROWS;
  var brush = glow.getContext('2d');
  var light = brush.createImageData(COLS, ROWS);
  var level = new Float32Array(COLS); // how far down, 0 to 1, eased
  var hue = []; // the colour at each point, eased
  for (var c = 0; c < COLS; c++) hue.push([0, 0, 0]);
  var waving = false;
  var lit = 0; // how much of it shows, as the reel scrolls away
  var EASE = reduced ? 1 : 0.2; // drawn once with reduced motion, so in full

  function wave() {
    if (!waving) {
      waving = true;
      requestAnimationFrame(draw);
    }
  }

  function draw() {
    waving = false;
    if (lit <= 0 || reel.readyState < 2) return;

    // the part of the frame on show at the foot of the reel (object-fit:
    // cover crops the rest), its bottom eighth
    var vw = reel.videoWidth, vh = reel.videoHeight;
    var bw = intro.clientWidth, bh = intro.clientHeight;
    var scale = Math.max(bw / vw, bh / vh);
    var sw = bw / scale, sh = bh / scale;
    try {
      lens.drawImage(reel, (vw - sw) / 2, (vh + sh) / 2 - sh / 8, sw, sh / 8, 0, 0, COLS, 4);
      var px = lens.getImageData(0, 0, COLS, 4).data;
    } catch (e) {
      return; // a picture it isn't allowed to read
    }

    var raw = new Float32Array(COLS);
    for (var c = 0; c < COLS; c++) {
      var rgb = [0, 0, 0];
      for (var row = 0; row < 4; row++) {
        for (var k = 0; k < 3; k++) rgb[k] += px[(row * COLS + c) * 4 + k] / 4;
      }
      // colour, not light: how far apart its channels are
      var most = Math.max(rgb[0], rgb[1], rgb[2]);
      var least = Math.min(rgb[0], rgb[1], rgb[2]);
      raw[c] = Math.sqrt((most - least) / 255);
      // shown richer and lighter than it is
      var grey = (rgb[0] + rgb[1] + rgb[2]) / 3;
      for (k = 0; k < 3; k++) {
        var v = Math.min(255, (grey + (rgb[k] - grey) * 2.2) * 1.5 + 40);
        hue[c][k] += (Math.max(0, v) - hue[c][k]) * EASE;
      }
    }
    // measured against the most colourful point in the frame, so it always
    // swings (though a grey frame stays low); smoothed across, then eased in
    // time, so it ripples rather than jumps
    var peak = Math.max(0.35, Math.max.apply(null, raw));
    for (c = 0; c < COLS; c++) {
      var near = (raw[Math.max(0, c - 1)] + raw[c] * 2 + raw[Math.min(COLS - 1, c + 1)]) / 4;
      level[c] += (Math.min(1, near / peak) - level[c]) * EASE;
    }

    // each point a fall of light from the edge, strongest there and gone
    // by its depth, falling off fast, so it melts into the page with no
    // outline
    for (c = 0; c < COLS; c++) {
      var reach = REACH + (1 - REACH) * level[c];
      for (row = 0; row < ROWS; row++) {
        var t = (row + 0.5) / ROWS / reach;
        var at = (row * COLS + c) * 4;
        light.data[at] = hue[c][0];
        light.data[at + 1] = hue[c][1];
        light.data[at + 2] = hue[c][2];
        light.data[at + 3] = t < 1 ? 230 * (1 - t) * (1 - t) : 0;
      }
    }
    brush.putImageData(light, 0, 0);

    var dpr = window.devicePixelRatio || 1;
    var w = Math.round(bleed.clientWidth * dpr);
    var h = Math.round(bleed.clientHeight * dpr);
    if (bleed.width !== w || bleed.height !== h) {
      bleed.width = w;
      bleed.height = h;
    }
    pen.clearRect(0, 0, w, h);
    pen.imageSmoothingEnabled = true;
    pen.imageSmoothingQuality = 'high';
    pen.drawImage(glow, 0, 0, w, h);

    // on with the picture; with reduced motion, it holds still
    if (!reduced) wave();
  }

  function dismiss() {
    window.removeEventListener('scroll', wake);
    intro.remove();
    // with the reel gone the header is at the top, right where it was
    window.scrollTo(0, 0);
  }

  window.addEventListener('scroll', wake, { passive: true });
  window.addEventListener('resize', wake);
  wake();
})();
