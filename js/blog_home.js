// Teaching & resources page (blog.html). Builds the cards from
// data/teaching.json (edited by hand) and Blog/posts.json (kept up to date
// by Blog/newBlogEntry.py), with search and filters.
// Keyboard extras: / searches, t shows teaching, b shows notes, esc clears.
// The night/day toggle remembers the visitor's choice (see the <head> script).

var CATEGORY_LABELS = {
  sound: 'sound',
  code: 'code',
  electronics: 'electronics',
  image: 'image & video',
  process: 'process',
};

var filter = 'all';

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function cardHTML(it) {
  var search = [it.title, it.meta, it.description, it.tags.join(' ')].join(' ').toLowerCase();
  return (
    '<a class="card" href="' + it.url + '" data-search="' + escapeHTML(search) + '">' +
    '<img loading="lazy" src="' + it.cover + '" alt="">' +
    '<div class="card-body">' +
    '<p class="card-meta">' + escapeHTML(it.meta) + '</p>' +
    '<h3>' + escapeHTML(it.title) + '</h3>' +
    '<p>' + escapeHTML(it.description) + '</p>' +
    '</div></a>'
  );
}

function fromTeaching(t) {
  return { title: t.title, meta: t.where, url: t.url, description: t.description, tags: t.tags, cover: t.cover };
}

function fromPost(p) {
  var dir = 'Blog/' + p.slug + '/';
  return {
    title: p.title,
    meta: (CATEGORY_LABELS[p.category] || p.category) + ' · ' + p.modified.slice(0, 4),
    url: dir + p.slug + '.html',
    description: p.description,
    tags: p.tags,
    cover: dir + p.cover,
  };
}

function apply() {
  var q = document.getElementById('search').value.trim().toLowerCase();
  var shown = 0;
  document.querySelectorAll('.group').forEach(function (group) {
    var inFilter = filter === 'all' || group.dataset.kind === filter;
    var n = 0;
    group.querySelectorAll('.card').forEach(function (card) {
      var ok = inFilter && (!q || card.dataset.search.indexOf(q) !== -1);
      card.hidden = !ok;
      if (ok) n++;
    });
    group.hidden = n === 0;
    group.querySelector('.group-count').textContent = '(' + n + ')';
    shown += n;
  });
  document.querySelector('.empty').hidden = shown > 0;
}

function setFilter(f) {
  filter = f;
  document.querySelectorAll('.filters button').forEach(function (b) {
    b.setAttribute('aria-pressed', b.dataset.filter === f ? 'true' : 'false');
  });
  apply();
}

function setupEvents() {
  var search = document.getElementById('search');

  search.addEventListener('input', apply);

  document.querySelectorAll('.filters button').forEach(function (b) {
    b.addEventListener('click', function () {
      setFilter(b.dataset.filter);
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (document.activeElement === search) {
      if (e.key === 'Escape') {
        search.value = '';
        apply();
        search.blur();
      }
      return;
    }
    if (e.key === '/') {
      e.preventDefault();
      search.focus();
    } else if (e.key === 't') {
      setFilter('teaching');
    } else if (e.key === 'b') {
      setFilter('post');
    } else if (e.key === 'Escape') {
      search.value = '';
      setFilter('all');
    }
  });
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  var btn = document.getElementById('theme_toggle');
  var night = theme === 'night';
  // the button names the mode it switches to
  btn.textContent = night ? '☀ day' : '☾ night';
  btn.setAttribute('aria-label', night ? 'Switch to day mode' : 'Switch to night mode');
}

function setupTheme() {
  applyTheme(document.documentElement.getAttribute('data-theme') || 'night');
  document.getElementById('theme_toggle').addEventListener('click', function () {
    var next = document.documentElement.getAttribute('data-theme') === 'night' ? 'day' : 'night';
    try {
      localStorage.setItem('jef-theme', next);
    } catch (e) {}
    applyTheme(next);
  });
}

function getJSON(url) {
  return fetch(url).then(function (r) {
    if (!r.ok) throw new Error(url);
    return r.json();
  });
}

document.addEventListener('DOMContentLoaded', function () {
  setupTheme();
  setupEvents();
  Promise.all([getJSON('data/teaching.json'), getJSON('Blog/posts.json')])
    .then(function (data) {
      var posts = data[1].slice().sort(function (a, b) {
        return b.modified.localeCompare(a.modified);
      });
      document.querySelector('#teaching .grid').innerHTML = data[0].map(fromTeaching).map(cardHTML).join('');
      document.querySelector('#notes .grid').innerHTML = posts.map(fromPost).map(cardHTML).join('');
      apply();
    })
    .catch(function () {
      var empty = document.querySelector('.empty');
      empty.textContent = 'Could not load the list. Try reloading the page.';
      empty.hidden = false;
    });
});
