// Home page: a work's title too long for its line (on a phone, where each
// title gets one) slides along to show the rest, there and back, resting at
// each end. A title that fits stays still, and with reduced motion a long
// one is just cut short, as before. Each title is watched for its size, so
// this follows page turns, rotation and the fonts arriving.

(function () {
  var titles = document.querySelectorAll('.home .works .work-title');
  if (!titles.length || !window.ResizeObserver) return;
  var still = window.matchMedia('(prefers-reduced-motion: reduce)');

  var PACE = 30; // px a second
  var REST = 1.6; // seconds held at the two ends, together

  function fit(title) {
    var text = title.firstElementChild;
    var over = text.getBoundingClientRect().width - title.clientWidth;
    if (over > 1 && !still.matches) {
      title.style.setProperty('--shift', -Math.ceil(over) + 'px');
      title.style.setProperty('--slide', (over / PACE + REST).toFixed(2) + 's');
      title.classList.add('marquee');
    } else {
      title.classList.remove('marquee');
    }
  }

  var watch = new ResizeObserver(function (entries) {
    entries.forEach(function (entry) {
      fit(entry.target);
    });
  });
  Array.prototype.forEach.call(titles, function (title) {
    // the words in a span of their own, to be measured and moved
    var text = document.createElement('span');
    text.className = 'title-text';
    while (title.firstChild) text.appendChild(title.firstChild);
    title.appendChild(text);
    watch.observe(title);
  });
  still.addEventListener('change', function () {
    Array.prototype.forEach.call(titles, fit);
  });
})();
