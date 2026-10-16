// Home page: the bar above the works.
// Index opens a list of every work by title over the left column of the grid;
// pointing at one (or tabbing to it) previews it over the right column: its
// picture, title, year and materials laid out like a thumbnail in the grid,
// and the line about it from the list (data-blurb) below. It opens on the
// work at the top right of the page, and the work previewed last stays there
// when the index closes, the others fading back in around it. Index again,
// Esc, or (with a mouse) leaving the list closes it. The list and previews
// are read off the works themselves, so a new work shows up here on its own.
// On a phone the list takes the whole width and a tapped title opens its
// preview right under it; with no pointer to hover, the first tap on a title
// previews it and the second opens it.
// The page index on the right shows the works four at a time once there are
// more than fit one screen, turned with its arrows or the ← and → keys; until
// then it reads 1 / 1. While the index is open it steps aside, since the
// index already shows every work.

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
      blurb: li.getAttribute('data-blurb') || '',
      li: li
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
    '<span class="preview-card"><img alt="" /><span class="work-title"></span><span class="work-meta"></span></span>' +
    '<p class="index-blurb"></p>' +
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
  // `kept`: it opens over this same work in the grid, whose title and
  // meta are already showing there, so only the line about it is new
  function show(i, kept) {
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
    // fade the words in again (see .fresh in site.css)
    preview.classList.remove('fresh');
    preview.classList.toggle('kept', !!kept);
    void preview.offsetWidth;
    preview.classList.add('fresh');
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

  // Closing on a preview over the grid: that work keeps the place it was
  // shown in, the top right of the page, trading places with the one there.
  function keep(i) {
    var at = Math.min(items.length - 1, page * PER_PAGE + 1);
    var li = works[i].li;
    var from = items.indexOf(li);
    if (from === at) return;
    var other = items[at];
    var mark = document.createElement('li');
    li.replaceWith(mark);
    other.replaceWith(li);
    mark.replaceWith(other);
    items[at] = li;
    items[from] = other;
    turn(page);
  }

  // back to the grid: the works the index covered fade back in, one after
  // another; the one at the top right was showing all along
  function reveal() {
    var top = Math.min(items.length - 1, page * PER_PAGE + 1);
    var n = 0;
    items.forEach(function (li, i) {
      if (li.hidden || i === top) return;
      li.classList.remove('arriving');
      void li.offsetWidth;
      li.style.animationDelay = n++ * 70 + 'ms';
      li.classList.add('arriving');
      li.addEventListener('animationend', function done() {
        li.classList.remove('arriving');
        li.style.animationDelay = '';
        li.removeEventListener('animationend', done);
      });
    });
  }

  function open(on) {
    clearTimeout(leaving); // a close still waiting from before doesn't count
    leaving = null;
    toggle.setAttribute('aria-expanded', on ? 'true' : 'false');
    panel.hidden = !on;
    pages.classList.toggle('away', on);
    if (!on) {
      if (showing >= 0 && !preview.classList.contains('inline')) {
        keep(showing);
        reveal();
      }
      preview.hidden = true;
      showing = -1;
      Array.prototype.forEach.call(titles.querySelectorAll('.index-title'), function (a) {
        a.classList.remove('previewing');
      });
    }
  }

  toggle.addEventListener('click', function () {
    open(panel.hidden);
    // it opens on the work at the top right of the page, which it covers
    if (!panel.hidden && !narrow.matches) {
      var there = items[Math.min(items.length - 1, page * PER_PAGE + 1)];
      show(works.findIndex(function (work) { return work.li === there; }), true);
    }
  });
  // With a mouse, leaving the index goes back to the grid, after a moment's
  // grace in case the pointer only slipped off. "The index" is one region,
  // from the top of the Index button down to the bottom of the list, and
  // across to the preview when one is showing: the gaps between them are in
  // it too, so moving between them slowly never closes it.
  var leaving = null;
  function inside(x, y) {
    var top = toggle.getBoundingClientRect().top;
    var list = panel.getBoundingClientRect();
    var right = preview.hidden || preview.classList.contains('inline') ? list.right : preview.getBoundingClientRect().right;
    return x >= list.left && x <= right && y >= top && y <= list.bottom;
  }
  function watch(x, y) {
    if (tapping() || panel.hidden) return;
    if (inside(x, y)) {
      clearTimeout(leaving);
      leaving = null;
    } else if (leaving === null) {
      leaving = setTimeout(function () {
        leaving = null;
        if (!panel.hidden) open(false);
      }, 250);
    }
  }
  document.addEventListener('mousemove', function (e) {
    watch(e.clientX, e.clientY);
  }, { passive: true });
  // the pointer leaving the window altogether
  document.addEventListener('mouseout', function (e) {
    if (!e.relatedTarget) watch(-1, -1);
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
    // nor behind the index, which shows every work at once
    if (pages.classList.contains('away')) return;
    if (e.key === 'ArrowLeft') turn(page - 1);
    else if (e.key === 'ArrowRight') turn(page + 1);
  });

  turn(0);
})();
