// Night/day mode, shared by the resources page and every post. Load it in
// <head> without defer so the theme is set before the page paints. Uses the
// visitor's choice if they've made one, else their device setting. Any
// .theme-toggle button on the page switches it; the button names the mode
// it switches to.
(function () {
  var KEY = 'jef-theme';
  var root = document.documentElement;

  function saved() {
    try {
      return localStorage.getItem(KEY);
    } catch (e) {
      return null;
    }
  }

  function apply(theme) {
    root.setAttribute('data-theme', theme);
    var night = theme === 'night';
    document.querySelectorAll('.theme-toggle').forEach(function (btn) {
      btn.textContent = night ? '☀ day' : '☾ night';
      btn.setAttribute('aria-label', night ? 'Switch to day mode' : 'Switch to night mode');
    });
  }

  apply(saved() || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'day'));

  document.addEventListener('DOMContentLoaded', function () {
    apply(root.getAttribute('data-theme'));
    document.querySelectorAll('.theme-toggle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var next = root.getAttribute('data-theme') === 'night' ? 'day' : 'night';
        try {
          localStorage.setItem(KEY, next);
        } catch (e) {}
        apply(next);
      });
    });
  });
})();
