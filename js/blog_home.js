// Blog home (blog.html): builds the post cards from Blog/posts.json, grouped
// by the year each post was last updated, with search and category filters.
// To add a post, run Blog/newBlogEntry.py, which writes to posts.json.

// Filter chips, in this order. Each post in posts.json names one category.
var CATEGORIES = [
  { key: 'sound', label: 'Sound' },
  { key: 'code', label: 'Code' },
  { key: 'electronics', label: 'Electronics', fg: '#1d2433' },
  { key: 'image', label: 'Image & Video' },
  { key: 'process', label: 'Process' },
];

var THEME_KEY = 'jef-blog-theme';
var MOON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
var SUN =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/>' +
  '<path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function formatDate(iso) {
  var d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ---------- theme ----------

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  var btn = document.getElementById('theme_toggle');
  var dark = theme === 'dark';
  btn.innerHTML = dark ? SUN : MOON;
  btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
  btn.title = btn.getAttribute('aria-label');
}

function setupTheme() {
  applyTheme(document.documentElement.getAttribute('data-theme') || 'light');
  document.getElementById('theme_toggle').addEventListener('click', function () {
    var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (e) {}
    applyTheme(next);
  });
}

// ---------- drawer (small screens) ----------
// On desktop the yellow J·E·F block links to the artist website; on smaller
// screens it shows a menu icon and opens the sidebar.

function setupDrawer() {
  var btn = document.querySelector('.menu-btn');
  var scrim = document.querySelector('.scrim');
  var narrow = window.matchMedia('(max-width: 1050px)');

  function setOpen(open) {
    document.body.classList.toggle('drawer-open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    scrim.hidden = !open;
  }

  btn.addEventListener('click', function () {
    if (!narrow.matches) {
      location.href = 'index.html';
      return;
    }
    setOpen(!document.body.classList.contains('drawer-open'));
  });
  scrim.addEventListener('click', function () {
    setOpen(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setOpen(false);
  });
  // close after picking a link in the drawer (e.g. jumping to a year)
  document.getElementById('sidebar').addEventListener('click', function (e) {
    if (e.target.closest('a')) setOpen(false);
  });
  narrow.addEventListener('change', function () {
    setOpen(false);
  });
}

// ---------- posts ----------

function cardHTML(post) {
  var cat =
    CATEGORIES.find(function (c) {
      return c.key === post.category;
    }) || CATEGORIES[CATEGORIES.length - 1];
  var dir = 'Blog/' + post.slug + '/';
  var href = dir + post.slug + '.html';
  var search = [post.title, post.description, post.tags.join(' '), cat.label].join(' ').toLowerCase();
  var style = '--accent: var(--cat-' + cat.key + ')' + (cat.fg ? '; --tag-fg: ' + cat.fg : '');
  return (
    '<div class="tp-item" data-type="' + cat.key + '" data-search="' + escapeHTML(search) + '">' +
    '<a class="topic-card" href="' + href + '" style="' + style + '">' +
    '<div class="topic-thumb"><img loading="lazy" src="' + dir + post.cover + '" alt="">' +
    '<div class="topic-tags"><span class="topic-tag">' + cat.label + '</span></div></div>' +
    '<h3 class="cardtitle">' + escapeHTML(post.title) + '</h3>' +
    '<p class="card-desc">' + escapeHTML(post.description) + '</p>' +
    '</a>' +
    '<p class="tp-meta"><span>Updated ' + formatDate(post.modified) + '</span>' +
    // Disqus fills this link in with the comment count
    '<a href="https://juanedflores.com/' + href + '#disqus_thread">Comments</a></p>' +
    '</div>'
  );
}

function render(posts) {
  posts.sort(function (a, b) {
    return b.modified.localeCompare(a.modified);
  });

  var years = [];
  posts.forEach(function (p) {
    var y = p.modified.slice(0, 4);
    if (years.indexOf(y) === -1) years.push(y);
  });

  document.getElementById('tp-units').innerHTML = years
    .map(function (y) {
      var items = posts.filter(function (p) {
        return p.modified.slice(0, 4) === y;
      });
      return '<section class="tp-unit" id="y' + y + '"><h2>' + y + '</h2><div class="topics-grid">' + items.map(cardHTML).join('') + '</div></section>';
    })
    .join('');

  document.getElementById('year-nav').innerHTML = years
    .map(function (y) {
      return '<li><a href="#y' + y + '">' + y + '</a></li>';
    })
    .join('');

  // only offer categories that have posts
  var present = CATEGORIES.filter(function (c) {
    return posts.some(function (p) {
      return p.category === c.key;
    });
  });
  var filters = document.querySelector('.tp-filters');
  filters.innerHTML =
    '<button data-type="all" aria-pressed="true">All</button>' +
    present
      .map(function (c) {
        return '<button data-type="' + c.key + '" aria-pressed="false">' + c.label + '</button>';
      })
      .join('');

  var root = document.getElementById('topics');
  var search = root.querySelector('.tp-search');
  var type = 'all';

  function apply() {
    var q = search.value.trim().toLowerCase();
    var shown = 0;
    root.querySelectorAll('.tp-item').forEach(function (item) {
      var ok = (type === 'all' || item.dataset.type === type) && (!q || item.dataset.search.indexOf(q) !== -1);
      item.hidden = !ok;
      if (ok) shown++;
    });
    root.querySelectorAll('.tp-unit').forEach(function (unit) {
      unit.hidden = !unit.querySelector('.tp-item:not([hidden])');
    });
    root.querySelector('.tp-empty').hidden = shown > 0;
    root.querySelector('.tp-count').textContent = shown + (shown === 1 ? ' post' : ' posts');
  }

  search.addEventListener('input', apply);
  filters.querySelectorAll('button').forEach(function (b) {
    b.addEventListener('click', function () {
      type = b.dataset.type;
      filters.querySelectorAll('button').forEach(function (x) {
        x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
      });
      apply();
    });
  });
  apply();

  // comment counts: count.js scans the page for #disqus_thread links once it loads
  var dsq = document.createElement('script');
  dsq.id = 'dsq-count-scr';
  dsq.src = 'https://juanedflores-blog.disqus.com/count.js';
  dsq.async = true;
  document.body.appendChild(dsq);
}

document.addEventListener('DOMContentLoaded', function () {
  setupTheme();
  setupDrawer();
  fetch('Blog/posts.json')
    .then(function (r) {
      return r.json();
    })
    .then(render)
    .catch(function () {
      document.querySelector('.tp-count').textContent = 'Could not load posts.';
    });
});
