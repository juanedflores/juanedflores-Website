// Home page: opening a work carries its picture across. The thumbnail
// clicked (in the grid, or the preview in the index) grows into the photo at
// the top of the work's page while the rest of the page passes through a
// fade, and Back (or Works, or the name) carries it home again.
// Browsers only morph across pages within one page, so this does the
// crossing itself: it fetches the work's page, swaps it in inside a view
// transition and puts its address in the location bar. Without view
// transitions, or with reduced motion asked for, links just go.

(function () {
  if (!document.startViewTransition || !window.DOMParser || !window.history.pushState) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var homeURL = location.href.split('#')[0];
  var homePath = new URL(homeURL).pathname;
  var homeTitle = document.title;
  var home = null; // the home page while a work is shown
  var origin = null; // the picture it came from
  var homeScroll = 0;
  var busy = false;

  var WORK = /\/works\/[^/]+\.html$/;

  // the tab's icon keeps its address when the location changes
  Array.prototype.forEach.call(document.querySelectorAll('link[rel~="icon"]'), function (link) {
    link.href = link.href;
  });

  // the home page, whether it's asked for as / or /index.html
  function isHome(url) {
    var bare = function (path) { return path.replace(/index\.html$/, ''); };
    return url.origin === location.origin && bare(url.pathname) === bare(homePath);
  }

  // the picture of that work on the home page, as it's showing now
  function pictureOf(link) {
    var preview = link.closest('.index-preview');
    if (preview) return preview.querySelector('img');
    var work = link.closest('.work');
    if (work) return work.querySelector('img');
    var path = new URL(link.href).pathname;
    var shown = document.querySelector('.index-preview:not([hidden])');
    if (shown && new URL(shown.href).pathname === path) return shown.querySelector('img');
    var cards = document.querySelectorAll('.works .work');
    for (var i = 0; i < cards.length; i++) {
      if (new URL(cards[i].href).pathname === path && !cards[i].closest('li').hidden) return cards[i].querySelector('img');
    }
    return null;
  }

  function name(el, on) {
    if (el) el.style.viewTransitionName = on ? 'work-photo' : '';
  }

  // bring the work's page in
  function go(url, from, push) {
    if (busy) return;
    busy = true;
    fetch(url.href)
      .then(function (response) {
        if (!response.ok) throw new Error(response.status);
        return response.text();
      })
      .then(function (html) {
        var page = new DOMParser().parseFromString(html, 'text/html');
        // its photo, loaded before the crossing so it arrives whole
        var hero = page.querySelector('.hero');
        var ready = hero ? new Image() : null;
        if (ready) {
          ready.src = new URL(hero.getAttribute('src'), url).href;
          return (ready.decode ? ready.decode() : Promise.resolve()).catch(function () {}).then(function () {
            return page;
          });
        }
        return page;
      })
      .then(function (page) {
        origin = from;
        homeScroll = window.scrollY;
        name(origin, true);
        var crossing = document.startViewTransition(function () {
          name(origin, false);
          if (push) history.pushState({ work: true }, '', url.href);
          home = document.body;
          document.title = page.title;
          document.body = document.adoptNode(page.body);
          name(document.querySelector('.hero'), true);
          window.scrollTo(0, 0);
          var script = document.createElement('script');
          script.src = new URL('js/work.js', homeURL).href;
          document.body.appendChild(script);
        });
        crossing.finished.then(function () {
          name(document.querySelector('.hero'), false);
          busy = false;
        });
      })
      .catch(function () {
        // anything off: just go there
        location.href = url.href;
      });
  }

  // and back home
  function back() {
    if (!home || busy) return;
    busy = true;
    var hero = document.querySelector('.hero');
    name(hero, true);
    var crossing = document.startViewTransition(function () {
      name(hero, false);
      document.body = home;
      home = null;
      document.title = homeTitle;
      if (origin && document.contains(origin)) name(origin, true);
      window.scrollTo(0, homeScroll);
    });
    crossing.finished.then(function () {
      name(origin, false);
      busy = false;
    });
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var link = e.target.closest('a[href]');
    if (!link || link.target) return;
    var url = new URL(link.href, location.href);
    if (url.origin !== location.origin) return;

    // on the home page, a work's link
    if (!home && document.querySelector('.home') && WORK.test(url.pathname)) {
      e.preventDefault();
      go(url, pictureOf(link), true);
      return;
    }
    // on a work brought in from home, the way back
    if (home && isHome(url)) {
      e.preventDefault();
      history.back();
    }
  });

  window.addEventListener('popstate', function () {
    var url = new URL(location.href);
    if (home && isHome(url)) back();
    else if (!home && WORK.test(url.pathname)) go(url, origin, false);
  });
})();
