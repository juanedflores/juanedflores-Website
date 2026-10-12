// Teaching & resources page (blog.html). Builds the cards from
// data/teaching.json (edited by hand), data/knowledgebase.json (guides built
// by KnowledgeBase/build.sh) and Blog/posts.json (kept up to date by
// Blog/newBlogEntry.py), with search and filters.
// Keyboard extras: / searches, t shows teaching, k the knowledge base,
// b notes, esc clears.

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
  var inner =
    '<img loading="lazy" src="' + it.cover + '" alt="">' +
    '<div class="card-body">' +
    '<p class="card-meta">' + escapeHTML(it.meta) + '</p>' +
    '<h3>' + escapeHTML(it.title) + '</h3>' +
    '<p>' + escapeHTML(it.description) + '</p>' +
    '</div>';
  if (!it.pdf) {
    return '<a class="card" href="' + it.url + '" data-search="' + escapeHTML(search) + '">' + inner + '</a>';
  }
  // guides: the card links to the page, with its own PDF download link
  return (
    '<div class="card" data-search="' + escapeHTML(search) + '">' +
    '<a class="card-link" href="' + it.url + '">' + inner + '</a>' +
    '<a class="card-pdf" href="' + it.pdf + '" download>Download PDF ↓ <small>' + escapeHTML(it.pdfSize || '') + '</small></a>' +
    '</div>'
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

function fromGuide(g) {
  var dir = 'KnowledgeBase/' + g.slug + '/';
  return {
    title: g.title,
    meta: 'guide · ' + (CATEGORY_LABELS[g.category] || g.category) + ' · ' + g.modified.slice(0, 4),
    url: dir + g.slug + '.html',
    description: g.description,
    tags: g.tags,
    cover: dir + g.cover,
    pdf: dir + g.pdf,
    pdfSize: g.pdfSize,
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
    } else if (e.key === 'k') {
      setFilter('kb');
    } else if (e.key === 'b') {
      setFilter('post');
    } else if (e.key === 'Escape') {
      search.value = '';
      setFilter('all');
    } else if (e.key === 'ArrowRight' && featured) {
      featured.go(featured.index + 1, true);
    } else if (e.key === 'ArrowLeft' && featured) {
      featured.go(featured.index - 1, true);
    }
  });
}

// ---------- featured walkthrough ----------
// Posts with "featured": n in posts.json, in that order. Advances every
// SLIDE_MS, pauses while hovered or focused, and stops for good once the
// visitor steps through it themselves (or prefers reduced motion).

var SLIDE_MS = 7000;
var featured = null;

function setupFeatured(posts) {
  var picks = posts
    .filter(function (p) {
      return p.featured;
    })
    .sort(function (a, b) {
      return a.featured - b.featured;
    });
  var root = document.querySelector('.featured');
  if (!picks.length) return;

  var n = picks.length;
  var pad = function (i) {
    return String(i).padStart(2, '0');
  };

  root.querySelector('.slides').innerHTML = picks
    .map(function (p, i) {
      var it = fromPost(p);
      return (
        '<article class="slide" role="group" aria-roledescription="slide" aria-label="' + (i + 1) + ' of ' + n + '">' +
        '<a class="slide-img" href="' + it.url + '" tabindex="-1"><img src="' + it.cover + '" alt=""></a>' +
        '<div class="slide-body">' +
        '<p class="slide-step"><b>' + pad(i + 1) + '</b> / ' + pad(n) + ' · ' + escapeHTML(it.meta) + '</p>' +
        '<h3>' + escapeHTML(it.title) + '</h3>' +
        '<p class="slide-desc">' + escapeHTML(it.description) + '</p>' +
        '<p class="slide-tags">' +
        it.tags
          .map(function (t) {
            return '#' + escapeHTML(t.replace(/\s+/g, '-'));
          })
          .join(' ') +
        '</p>' +
        '<a class="slide-read" href="' + it.url + '">Read →</a>' +
        '</div></article>'
      );
    })
    .join('');

  root.querySelector('.steps').innerHTML = picks
    .map(function (p, i) {
      return '<li><button type="button" aria-label="Show slide ' + (i + 1) + ': ' + escapeHTML(p.title) + '"><span>' + pad(i + 1) + ' ' + escapeHTML(p.title) + '</span></button></li>';
    })
    .join('');

  // keep small pixel-art covers crisp when they're scaled up
  root.querySelectorAll('.slide-img img').forEach(function (img) {
    img.addEventListener('load', function () {
      if (img.naturalWidth < 600) img.classList.add('pixel');
    });
  });

  var slides = root.querySelectorAll('.slide');
  var steps = root.querySelectorAll('.steps button');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var auto = !reduced && n > 1;
  var paused = false;
  var elapsed = 0;
  var last = null;

  featured = {
    index: 0,
    go: function (i, byVisitor) {
      if (byVisitor) auto = false;
      featured.index = (i + n) % n;
      elapsed = 0;
      slides.forEach(function (s, j) {
        var on = j === featured.index;
        s.classList.toggle('is-current', on);
        s.setAttribute('aria-hidden', on ? 'false' : 'true');
        s.querySelectorAll('a').forEach(function (a) {
          if (!a.classList.contains('slide-img')) a.tabIndex = on ? 0 : -1;
        });
      });
      steps.forEach(function (b, j) {
        b.setAttribute('aria-current', j === featured.index ? 'true' : 'false');
        // finished steps stay filled, like a walkthrough's progress
        b.style.setProperty('--fill', j < featured.index ? '100%' : j === featured.index && !auto ? '100%' : '0%');
      });
    },
  };

  steps.forEach(function (b, j) {
    b.addEventListener('click', function () {
      featured.go(j, true);
    });
  });
  root.querySelector('.fx-prev').addEventListener('click', function () {
    featured.go(featured.index - 1, true);
  });
  root.querySelector('.fx-next').addEventListener('click', function () {
    featured.go(featured.index + 1, true);
  });

  // swipe on touch screens
  var startX = null;
  var slidesEl = root.querySelector('.slides');
  slidesEl.addEventListener('touchstart', function (e) {
    startX = e.touches[0].clientX;
  }, { passive: true });
  slidesEl.addEventListener('touchend', function (e) {
    if (startX === null) return;
    var dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) featured.go(featured.index + (dx < 0 ? 1 : -1), true);
    startX = null;
  });

  root.addEventListener('mouseenter', function () {
    paused = true;
  });
  root.addEventListener('mouseleave', function () {
    paused = false;
  });
  root.addEventListener('focusin', function () {
    paused = true;
  });
  root.addEventListener('focusout', function () {
    paused = false;
  });

  function tick(now) {
    if (last !== null && auto && !paused && !document.hidden) {
      elapsed += now - last;
      steps[featured.index].style.setProperty('--fill', Math.min(100, (elapsed / SLIDE_MS) * 100) + '%');
      if (elapsed >= SLIDE_MS) featured.go(featured.index + 1);
    }
    last = now;
    if (auto) requestAnimationFrame(tick);
  }

  root.hidden = false;
  featured.go(0);
  if (auto) requestAnimationFrame(tick);
}

function getJSON(url) {
  return fetch(url).then(function (r) {
    if (!r.ok) throw new Error(url);
    return r.json();
  });
}

document.addEventListener('DOMContentLoaded', function () {
  setupEvents();
  Promise.all([getJSON('data/teaching.json'), getJSON('Blog/posts.json'), getJSON('data/knowledgebase.json')])
    .then(function (data) {
      var posts = data[1].slice().sort(function (a, b) {
        return b.modified.localeCompare(a.modified);
      });
      document.querySelector('#teaching .grid').innerHTML = data[0].map(fromTeaching).map(cardHTML).join('');
      document.querySelector('#notes .grid').innerHTML = posts.map(fromPost).map(cardHTML).join('');
      document.querySelector('#knowledgebase .grid').innerHTML = data[2].map(fromGuide).map(cardHTML).join('');
      apply();
      setupFeatured(posts);
      // the sections fill in after load, so jump to #knowledgebase etc. now,
      // and again once images and fonts above it have finished loading
      var target = location.hash && document.getElementById(location.hash.slice(1));
      if (target) {
        target.scrollIntoView();
        if (document.readyState !== 'complete') {
          window.addEventListener('load', function () {
            target.scrollIntoView();
          });
        }
      }
    })
    .catch(function () {
      var empty = document.querySelector('.empty');
      empty.textContent = 'Could not load the list. Try reloading the page.';
      empty.hidden = false;
    });
});
