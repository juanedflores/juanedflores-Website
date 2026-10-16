// Home page: the demo reel plays full screen at the top and pauses while
// it's scrolled out of sight. The header holds to the bottom of the reel
// (sticky, in site.css), so the name, Works and About wait there in white,
// then cross its edge as the header comes up: the edge cuts through the
// letters (white above, ink below) and breaks them into noise in the passage.
// Nothing here moves them; the browser does, in step with the scrolling.
// Once the reel has scrolled away entirely it's gone for good, leaving the
// works as a page of their own; only a reload brings it back.

(function () {
  var intro = document.querySelector('.intro');
  var reel = intro.querySelector('.reel');
  var header = document.querySelector('.site-header');
  var works = header.querySelector('.site-nav a[href="#works"]');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // The page starts at the reel; it's not put back where it was scrolled to.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  var visit = performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null;
  var reload = visit && visit.type === 'reload';

  // Sent to #works (the Works link on another page): straight to the works,
  // and the address loses the #works so a reload shows the reel again.
  var sent = location.hash === '#works';
  if (sent) history.replaceState(history.state, '', location.pathname + location.search);

  // coming back with the browser's back button isn't a reload either
  if ((visit && visit.type === 'back_forward') || (sent && !reload)) {
    intro.remove();
    window.scrollTo(0, 0);
    return;
  }
  window.scrollTo(0, 0);

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
    window.scrollTo({ top: intro.offsetTop + intro.offsetHeight, behavior: reduced ? 'auto' : 'smooth' });
  });

  // Muted, so browsers let it play on its own; and where they still won't
  // (an iPhone in Low Power Mode), a touch on the reel starts it.
  reel.muted = true;
  reel.playsInline = true;
  function start() {
    reel.play().catch(function () {});
  }
  intro.addEventListener('touchend', start, { passive: true });
  intro.addEventListener('click', start);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) start();
      else reel.pause();
    }).observe(intro);
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
    if (intro.isConnected && intro.getBoundingClientRect().bottom <= 1) dismiss();
    var edge = intro.isConnected ? intro.getBoundingClientRect().bottom : -Infinity;

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
