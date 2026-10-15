// Work pages: click a photo to see it large; click, Esc or "close" to go back.
// Runs once the page is parsed, or straight away when js/passage.js brings
// the page in from the home page.
(document.readyState === 'loading' ? function (start) {
  document.addEventListener('DOMContentLoaded', start);
} : function (start) {
  start();
})(function () {
  var box = document.querySelector('.lightbox');
  if (!box) return;
  var img = box.querySelector('img');
  var opener = null;

  function close() {
    box.hidden = true;
    img.removeAttribute('src');
    if (opener) opener.focus();
  }

  document.querySelectorAll('.piece-photos button, .hero-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var thumb = btn.querySelector('img');
      opener = btn;
      img.src = thumb.dataset.full || thumb.src;
      img.alt = thumb.alt;
      box.hidden = false;
      box.querySelector('.lightbox-close').focus();
    });
  });

  box.addEventListener('click', close);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !box.hidden) close();
  });
});
