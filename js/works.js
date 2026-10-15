// Home page: the bar above the works.
// Index opens a list of every work by title over the left column of the grid;
// pointing at one (or tabbing to it) previews it over the right column: its
// picture, title, year and materials, and the line about it from the list
// (data-blurb). Index again, or Esc, closes it. The list and previews are
// read off the works themselves, so a new work shows up here on its own.
// On a phone the list takes the whole width and a tapped title opens its
// preview right under it; with no pointer to hover, the first tap on a title
// previews it and the second opens it.
// The page index on the right shows the works four at a time once there are
// more than fit one screen, turned with its arrows or the ← and → keys; until
// then it reads 1 / 1.

(function () {
  var PER_PAGE = 4;

  var shelf = document.querySelector('.home .shelf');
  var list = shelf && shelf.querySelector('.works');
  var pages = document.querySelector('.pages');
  if (!list || !pages) return;

  var items = Array.prototype.slice.call(list.children);

  // ---- the index

  var toggle = document.querySelector('.index-toggle');
  var works = items.map(function (li) {
    var link = li.querySelector('.work');
    var img = li.querySelector('img');
    var meta = li.querySelector('.work-meta').textContent;
    return {
      href: link.getAttribute('href'),
      title: li.querySelector('.work-title').textContent,
      meta: meta,
      year: (meta.match(/\d{4}/) || [''])[0],
      src: img.getAttribute('src'),
      alt: img.getAttribute('alt'),
      blurb: li.getAttribute('data-blurb') || ''
    };
  });

  var panel = document.createElement('div');
  panel.className = 'index-panel';
  panel.id = 'index-panel';
  panel.hidden = true;
  var titles = document.createElement('ul');
  titles.className = 'index-list';
  panel.appendChild(titles);

  var preview = document.createElement('a');
  preview.className = 'index-preview';
  preview.hidden = true;
  preview.innerHTML =
    '<img alt="" /><span class="work-title"></span><span class="work-meta"></span><p class="index-blurb"></p>' +
    '<span class="index-go">View work →</span>';

  // a phone: the preview opens under its title; no hover: tap to preview
  var narrow = window.matchMedia('(max-width: 760px)');
  var touch = window.matchMedia('(hover: none)');
  function tapping() {
    return narrow.matches || touch.matches;
  }

  works.forEach(function (work, i) {
    var li = document.createElement('li');
    var a = document.createElement('a');
    a.className = 'index-title';
    a.href = work.href;
    var title = document.createElement('span');
    title.textContent = work.title;
    var year = document.createElement('span');
    year.className = 'index-year';
    year.textContent = work.year;
    a.appendChild(title);
    a.appendChild(year);
    a.addEventListener('mouseenter', function () { if (!tapping()) show(i); });
    a.addEventListener('focus', function () { if (!tapping()) show(i); });
    a.addEventListener('click', function (e) {
      // the first tap previews, the second goes to the work
      if (tapping() && showing !== i) {
        e.preventDefault();
        show(i);
      }
    });
    li.appendChild(a);
    titles.appendChild(li);
  });

  shelf.appendChild(panel);
  shelf.appendChild(preview);

  var showing = -1;
  function show(i) {
    place(i);
    if (i === showing) return;
    showing = i;
    var work = works[i];
    preview.href = work.href;
    preview.querySelector('img').src = work.src;
    preview.querySelector('img').alt = work.alt;
    preview.querySelector('.work-title').textContent = work.title;
    preview.querySelector('.work-meta').textContent = work.meta;
    var blurb = preview.querySelector('.index-blurb');
    blurb.textContent = work.blurb;
    blurb.hidden = !work.blurb;
    Array.prototype.forEach.call(titles.querySelectorAll('.index-title'), function (a, j) {
      a.classList.toggle('previewing', j === i);
    });
    preview.hidden = false;
    // on a phone, bring the opened one into view within the list
    if (preview.classList.contains('inline')) {
      var row = titles.children[i].getBoundingClientRect();
      var box = panel.getBoundingClientRect();
      if (row.bottom > box.bottom) panel.scrollTop += Math.min(row.bottom - box.bottom, row.top - box.top);
    }
  }

  // over the right of the grid, or on a phone under its title in the list
  function place(i) {
    var inline = narrow.matches;
    preview.classList.toggle('inline', inline);
    var home = inline ? titles.children[i] : shelf;
    if (preview.parentNode !== home) home.appendChild(preview);
  }
  narrow.addEventListener('change', function () {
    if (showing >= 0) place(showing);
  });

  function open(on) {
    toggle.setAttribute('aria-expanded', on ? 'true' : 'false');
    panel.hidden = !on;
    if (!on) {
      preview.hidden = true;
      showing = -1;
      Array.prototype.forEach.call(titles.querySelectorAll('.index-title'), function (a) {
        a.classList.remove('previewing');
      });
    }
  }

  toggle.addEventListener('click', function () {
    open(panel.hidden);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !panel.hidden) {
      open(false);
      toggle.focus();
    }
  });
  toggle.hidden = false;

  // ---- the pages

  var at = pages.querySelector('.page-at');
  var turns = pages.querySelectorAll('.page-turn');
  var count = Math.max(1, Math.ceil(items.length / PER_PAGE));
  var page = 0;

  function turn(to) {
    page = Math.max(0, Math.min(count - 1, to));
    items.forEach(function (li, i) {
      li.hidden = Math.floor(i / PER_PAGE) !== page;
    });
    at.textContent = page + 1 + ' / ' + count;
    turns[0].disabled = page === 0;
    turns[1].disabled = page === count - 1;
  }

  Array.prototype.forEach.call(turns, function (button) {
    button.addEventListener('click', function () {
      turn(page + +button.getAttribute('data-turn'));
    });
  });

  document.addEventListener('keydown', function (e) {
    if (count < 2 || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;
    // only once the works are the page, not while the reel is up
    if (document.querySelector('.intro')) return;
    if (e.key === 'ArrowLeft') turn(page - 1);
    else if (e.key === 'ArrowRight') turn(page + 1);
  });

  turn(0);
})();
