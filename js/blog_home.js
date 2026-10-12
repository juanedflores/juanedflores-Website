// Teaching & resources page (blog.html). Lists teaching materials
// (data/teaching.json, edited by hand) and notes/tutorials (Blog/posts.json,
// kept up to date by Blog/newBlogEntry.py) in a telescope-style picker.
//
// Keys, when not typing: j/k or arrows move, enter opens, / searches,
// t shows teaching, b shows notes, a opens the artist website, g/G jump
// to the first/last result. While typing: arrows or ctrl-n/ctrl-p move,
// enter opens, esc leaves the search.

var CATEGORY_LABELS = {
  sound: 'sound',
  code: 'code',
  electronics: 'electronics',
  image: 'image & video',
  process: 'process',
};

var state = { items: [], visible: [], selected: 0, filter: 'all' };

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

// the title with the search term marked, like telescope's match highlight
function markMatch(text, q) {
  var i = q ? text.toLowerCase().indexOf(q) : -1;
  if (i === -1) return escapeHTML(text);
  return escapeHTML(text.slice(0, i)) + '<mark>' + escapeHTML(text.slice(i, i + q.length)) + '</mark>' + escapeHTML(text.slice(i + q.length));
}

function fromTeaching(t) {
  return {
    kind: 'teaching',
    title: t.title,
    where: t.where,
    year: t.year,
    url: t.url,
    description: t.description,
    tags: t.tags,
    cover: t.cover,
  };
}

function fromPost(p) {
  var dir = 'Blog/' + p.slug + '/';
  return {
    kind: 'post',
    title: p.title,
    where: (CATEGORY_LABELS[p.category] || p.category) + ' · updated ' + p.modified,
    year: p.modified.slice(0, 4),
    url: dir + p.slug + '.html',
    description: p.description,
    tags: p.tags,
    cover: dir + p.cover,
    sortKey: p.modified,
  };
}

// ---------- rendering ----------

function render() {
  var q = document.getElementById('search').value.trim().toLowerCase();
  state.visible = state.items.filter(function (it) {
    if (state.filter !== 'all' && it.kind !== state.filter) return false;
    return !q || it.haystack.indexOf(q) !== -1;
  });
  if (state.selected >= state.visible.length) state.selected = 0;

  var html = '';
  var lastKind = null;
  state.visible.forEach(function (it, i) {
    if (it.kind !== lastKind) {
      html += '<li class="group" role="presentation">' + (it.kind === 'teaching' ? 'Teaching' : 'Notes & tutorials') + '</li>';
      lastKind = it.kind;
    }
    html +=
      '<li class="item" role="option" id="opt-' + i + '" data-index="' + i + '" aria-selected="' + (i === state.selected) + '">' +
      '<span class="item-kind" aria-hidden="true">' + (it.kind === 'teaching' ? '▤' : '✎') + '</span>' +
      '<a class="item-title" href="' + it.url + '" tabindex="-1">' + markMatch(it.title, q) + '</a>' +
      '<span class="item-meta">' + it.year + '</span>' +
      '<span class="item-desc">' + escapeHTML(it.description) + '</span>' +
      '</li>';
  });
  document.getElementById('results').innerHTML = html;
  document.querySelector('.empty').hidden = state.visible.length > 0;
  document.getElementById('count').textContent = state.visible.length + '/' + state.items.length;
  renderPreview();
}

function renderPreview() {
  var it = state.visible[state.selected];
  var pv = document.getElementById('preview');
  updatePosition();
  document.querySelectorAll('#results .item').forEach(function (el) {
    el.setAttribute('aria-selected', el.dataset.index == state.selected ? 'true' : 'false');
  });
  if (!it) {
    pv.innerHTML = '';
    return;
  }
  pv.innerHTML =
    '<img class="pv-img" src="' + it.cover + '" alt="">' +
    '<h2 class="pv-title">' + escapeHTML(it.title) + '</h2>' +
    '<p class="pv-where">' + escapeHTML(it.where) + '</p>' +
    '<p class="pv-desc">' + escapeHTML(it.description) + '</p>' +
    '<ul class="pv-tags">' +
    it.tags
      .map(function (t) {
        return '<li>' + escapeHTML(t) + '</li>';
      })
      .join('') +
    '</ul>' +
    '<a class="pv-open" href="' + it.url + '">open ↵</a>';
}

// "Top", "Bot", "All" or a percentage, like the statusline's position
function updatePosition() {
  var n = state.visible.length;
  var pos = document.getElementById('pos');
  if (n <= 1) pos.textContent = 'All';
  else if (state.selected === 0) pos.textContent = 'Top';
  else if (state.selected === n - 1) pos.textContent = 'Bot';
  else pos.textContent = Math.round((state.selected / (n - 1)) * 100) + '%';
}

function select(i) {
  if (!state.visible.length) return;
  state.selected = Math.max(0, Math.min(state.visible.length - 1, i));
  renderPreview();
  var el = document.getElementById('opt-' + state.selected);
  if (el) el.scrollIntoView({ block: 'nearest' });
}

function openSelected() {
  var it = state.visible[state.selected];
  if (it) location.href = it.url;
}

function setFilter(filter) {
  state.filter = filter;
  state.selected = 0;
  document.querySelectorAll('.modes button').forEach(function (b) {
    b.setAttribute('aria-pressed', b.dataset.filter === filter ? 'true' : 'false');
  });
  render();
}

function setMode(insert) {
  var mode = document.getElementById('mode');
  mode.textContent = insert ? 'INSERT' : 'NORMAL';
  mode.classList.toggle('insert', insert);
}

function showPicker() {
  document.getElementById('picker').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ---------- events ----------

function setupEvents() {
  var search = document.getElementById('search');
  var results = document.getElementById('results');

  search.addEventListener('input', function () {
    state.selected = 0;
    render();
  });
  search.addEventListener('focus', function () {
    setMode(true);
  });
  search.addEventListener('blur', function () {
    setMode(false);
  });

  document.querySelectorAll('.modes button').forEach(function (b) {
    b.addEventListener('click', function () {
      setFilter(b.dataset.filter);
    });
  });

  // hovering a result previews it; clicking opens it
  results.addEventListener('mousemove', function (e) {
    var item = e.target.closest('.item');
    if (item && +item.dataset.index !== state.selected) {
      state.selected = +item.dataset.index;
      renderPreview();
    }
  });
  results.addEventListener('click', function (e) {
    var item = e.target.closest('.item');
    if (!item || e.target.closest('a')) return;
    state.selected = +item.dataset.index;
    openSelected();
  });

  // dashboard buttons
  document.querySelectorAll('.buttons a[data-filter]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      runKey(a.dataset.key);
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.altKey) return;
    var typing = document.activeElement === search;

    if (typing) {
      if (e.key === 'Escape') {
        search.blur();
      } else if (e.key === 'ArrowDown' || (e.ctrlKey && e.key === 'n')) {
        e.preventDefault();
        select(state.selected + 1);
      } else if (e.key === 'ArrowUp' || (e.ctrlKey && e.key === 'p')) {
        e.preventDefault();
        select(state.selected - 1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        openSelected();
      }
      return;
    }

    if (e.ctrlKey) return;
    // let enter work normally on a focused link or button
    if (e.key === 'Enter' && /^(A|BUTTON)$/.test(document.activeElement.tagName)) return;
    if (runKey(e.key)) e.preventDefault();
  });
}

// the dashboard and normal-mode keys; returns true if the key did something
function runKey(key) {
  var search = document.getElementById('search');
  switch (key) {
    case 'j':
    case 'ArrowDown':
      select(state.selected + 1);
      return true;
    case 'k':
    case 'ArrowUp':
      select(state.selected - 1);
      return true;
    case 'g':
      select(0);
      return true;
    case 'G':
      select(state.visible.length - 1);
      return true;
    case 'Enter':
      openSelected();
      return true;
    case '/':
      setFilter('all');
      showPicker();
      search.focus({ preventScroll: true });
      return true;
    case 't':
      setFilter('teaching');
      showPicker();
      return true;
    case 'b':
      setFilter('post');
      showPicker();
      return true;
    case 'a':
      location.href = 'index.html';
      return true;
    case 'Escape':
      search.value = '';
      setFilter('all');
      return true;
  }
  return false;
}

// ---------- load ----------

function getJSON(url) {
  return fetch(url).then(function (r) {
    if (!r.ok) throw new Error(url);
    return r.json();
  });
}

document.addEventListener('DOMContentLoaded', function () {
  setupEvents();
  Promise.all([getJSON('data/teaching.json'), getJSON('Blog/posts.json')])
    .then(function (data) {
      var teaching = data[0].map(fromTeaching);
      var posts = data[1].map(fromPost).sort(function (a, b) {
        return b.sortKey.localeCompare(a.sortKey);
      });
      state.items = teaching.concat(posts);
      state.items.forEach(function (it) {
        it.haystack = [it.title, it.where, it.description, it.tags.join(' ')].join(' ').toLowerCase();
      });
      render();
    })
    .catch(function () {
      document.getElementById('cmdline').textContent = 'E484: Can’t open resources: try reloading the page';
    });
});
