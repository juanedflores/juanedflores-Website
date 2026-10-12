// Blog posts (built by pandoc from pandoc/blog_template.html). Highlights
// code blocks, runs the contents drop-down and marks the section you're
// reading, and fills in the category, tags, cover and previous/next links
// from Blog/posts.json.

var CATEGORY_LABELS = {
  sound: 'sound',
  code: 'code',
  electronics: 'electronics',
  image: 'image & video',
  process: 'process',
};

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

// ---------- code ----------

function setupCode() {
  if (window.hljs) {
    document.querySelectorAll('#ArticleBody pre code').forEach(function (el) {
      hljs.highlightElement(el);
    });
  }
  if (window.highlightJsBadge) {
    window.highlightJsBadge({
      contentSelector: '#ArticleBody',
      copyIconClass: 'fa fa-copy',
      checkIconClass: 'fa fa-check',
    });
  }
}

// ---------- contents ----------

function setupToc() {
  var toc = document.getElementById('toc');
  var toggle = document.querySelector('.toc-toggle');
  var links = toc.querySelectorAll('a[href^="#"]');

  // posts without headings have no contents
  if (!links.length) {
    toc.hidden = true;
    toggle.hidden = true;
    document.body.classList.add('no-toc');
    return;
  }

  function setOpen(open) {
    document.body.classList.toggle('toc-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  toggle.addEventListener('click', function () {
    setOpen(!document.body.classList.contains('toc-open'));
  });
  toc.addEventListener('click', function (e) {
    if (e.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setOpen(false);
  });

  // mark the section currently at the top of the screen
  var byId = {};
  links.forEach(function (a) {
    byId[decodeURIComponent(a.getAttribute('href').slice(1))] = a;
  });
  var headings = Array.prototype.filter.call(document.querySelectorAll('#ArticleBody [id]'), function (h) {
    return byId[h.id];
  });
  if (!headings.length) return;

  var current = null;
  var queued = false;
  function update() {
    queued = false;
    // the last heading that has scrolled up near the top bar
    var top = headings[0];
    headings.forEach(function (h) {
      if (h.getBoundingClientRect().top < 140) top = h;
    });
    var link = byId[top.id];
    if (link === current) return;
    if (current) current.removeAttribute('aria-current');
    current = link;
    current.setAttribute('aria-current', 'true');
    // keep it in view when the contents list is long
    if (toc.scrollHeight > toc.clientHeight) current.scrollIntoView({ block: 'nearest' });
  }
  window.addEventListener(
    'scroll',
    function () {
      if (!queued) {
        queued = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true }
  );
  update();
}

// ---------- details from posts.json ----------
// Notes are blog posts (Blog/posts.json) and guides
// (data/knowledgebase.json, pages in KnowledgeBase/) together.

function setupDetails() {
  // /Blog/<slug>/<slug>.html or /KnowledgeBase/<slug>/<slug>.html
  var parts = location.pathname.split('/').filter(Boolean);
  var slug = decodeURIComponent(parts[parts.length - 2] || '');
  var dir = parts[parts.length - 3] === 'KnowledgeBase' ? 'KnowledgeBase' : 'Blog';
  var withDir = function (d) {
    return function (list) {
      return list.map(function (p) {
        p.dir = d;
        return p;
      });
    };
  };

  Promise.all([
    fetch('../../Blog/posts.json')
      .then(function (r) {
        return r.json();
      })
      .then(withDir('Blog')),
    fetch('../../data/knowledgebase.json')
      .then(function (r) {
        return r.json();
      })
      .then(withDir('KnowledgeBase'))
      .catch(function () {
        return [];
      }),
  ])
    .then(function (lists) {
      var posts = lists[0].concat(lists[1]);
      posts.sort(function (a, b) {
        return b.modified.localeCompare(a.modified);
      });
      var i = posts.findIndex(function (p) {
        return p.slug === slug && p.dir === dir;
      });
      if (i === -1) return; // a draft

      var post = posts[i];
      var meta = document.getElementById('post-meta');
      var created = meta.textContent.trim();
      meta.textContent = [CATEGORY_LABELS[post.category] || post.category, 'updated ' + post.modified]
        .concat(created ? [created] : [])
        .join(' · ');

      document.getElementById('post-tags').innerHTML = post.tags
        .map(function (t) {
          return '<span>#' + escapeHTML(t.replace(/\s+/g, '-')) + '</span>';
        })
        .join(' ');

      // guides come with a PDF version
      if (post.pdf) {
        var dl = document.createElement('a');
        dl.className = 'post-download';
        dl.href = './' + post.pdf;
        dl.setAttribute('download', '');
        dl.innerHTML = 'Download PDF ↓ <small>' + escapeHTML(post.pdfSize || '') + '</small>';
        var tags = document.getElementById('post-tags');
        tags.parentNode.insertBefore(dl, tags.nextSibling);
      }

      // covers can be .png or .gif
      var cover = document.getElementById('cover-img');
      if (post.cover && cover.getAttribute('src') !== './' + post.cover) {
        cover.hidden = false;
        cover.src = './' + post.cover;
      }

      var nav = document.getElementById('post-nav');
      var newer = posts[i - 1];
      var older = posts[i + 1];
      var link = function (p, label, cls) {
        return (
          '<a class="' + cls + '" href="../../' + p.dir + '/' + p.slug + '/' + p.slug + '.html">' +
          '<span class="post-nav-label">' + label + '</span>' +
          '<span class="post-nav-title">' + escapeHTML(p.title) + '</span></a>'
        );
      };
      nav.innerHTML =
        (newer ? link(newer, '← newer', 'post-nav-prev') : '<span></span>') +
        (older ? link(older, 'older →', 'post-nav-next') : '<span></span>') +
        '<a class="post-nav-all" href="../../blog.html">all notes</a>';
    })
    .catch(function () {});
}

document.addEventListener('DOMContentLoaded', function () {
  setupCode();
  setupToc();
  setupDetails();
});
