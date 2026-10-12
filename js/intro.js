// Home page: the demo reel plays full screen at the top. "works ↓" scrolls
// to the works, "sound off/on" toggles the reel's audio, and the reel pauses
// while it's scrolled out of sight.

(function () {
  var intro = document.querySelector('.intro');
  var reel = intro.querySelector('.reel');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  intro.querySelector('.scroll-cue').addEventListener('click', function (e) {
    e.preventDefault();
    // stop at the site header, so the name and nav show above the works
    document.querySelector('.site-header').scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth' });
  });

  var sound = intro.querySelector('.sound');
  sound.addEventListener('click', function () {
    reel.muted = !reel.muted;
    if (!reel.muted) reel.play();
    sound.setAttribute('aria-pressed', reel.muted ? 'false' : 'true');
    sound.textContent = reel.muted ? 'sound off' : 'sound on';
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) reel.play().catch(function () {});
      else reel.pause();
    }).observe(intro);
  }
})();
