(function () {
  "use strict";
  var S = window.SITE;
  var app = document.getElementById("app");
  var viewer = document.getElementById("viewer");
  var KIND = { slides: "Her slides", reading: "Reading", video: "Video" };

  // ---------- helpers ----------
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function pageSrc(item, n) { return item.dir + "/p" + String(n).padStart(3, "0") + ".jpg"; }
  function course(id) { return S.courses.filter(function (c) { return c.id === id; })[0]; }
  function countItems(c) { return c.units.reduce(function (a, u) { return a + u.items.length; }, 0); }
  function findItem(id) {
    for (var i = 0; i < S.courses.length; i++)
      for (var j = 0; j < S.courses[i].units.length; j++)
        for (var k = 0; k < S.courses[i].units[j].items.length; k++)
          if (S.courses[i].units[j].items[k].id === id)
            return { course: S.courses[i], unit: S.courses[i].units[j], item: S.courses[i].units[j].items[k] };
    return null;
  }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  // ---------- theme ----------
  var saved = store("theme");
  if (saved) document.documentElement.setAttribute("data-theme", saved);
  document.getElementById("theme").addEventListener("click", function () {
    var cur = document.documentElement.getAttribute("data-theme") ||
      (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    var next = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    store("theme", next);
  });

  // ---------- pages ----------
  function courseCards() {
    return '<div class="grid">' + S.courses.map(function (c) {
      var n = countItems(c);
      return '<a class="card course-card" href="#/course/' + c.id + '">' +
        (c.code ? '<span class="code">' + esc(c.code) + "</span>" : "") +
        "<h3>" + esc(c.title) + "</h3><p>" + esc(c.blurb) + "</p>" +
        '<div class="meta">' + (n ? c.units.length + " units, " + n + " documents" : '<span class="soon">Material coming soon</span>') + "</div></a>";
    }).join("") + "</div>";
  }

  function home(scrollTo) {
    var p = S.profile;
    app.innerHTML =
      '<section class="hero"><div class="wrap">' +
        '<div class="portrait"><img src="' + esc(p.photo) + '" alt="Portrait of ' + esc(p.name) + '"></div>' +
        '<div><p class="eyebrow">' + esc(p.location) + "</p><h1>" + esc(p.name) + "</h1>" +
        '<p class="role">' + esc(p.title) + "</p>" +
        '<ul class="chips">' + p.interests.map(function (i) { return "<li>" + esc(i) + "</li>"; }).join("") + "</ul>" +
        '<div class="actions"><a class="btn primary" href="#/courses">Course material</a><a class="btn ghost" href="#/about">About</a></div></div>' +
      "</div></section>" +
      '<section class="block" id="about"><div class="wrap about"><div><h2>About</h2>' +
        p.bio.map(function (b) { return "<p>" + esc(b) + "</p>"; }).join("") + "</div>" +
        '<div><h2>Career</h2><ul class="timeline">' + p.timeline.map(function (t) {
          return '<li><span class="yr">' + esc(t.years) + '</span><span class="rl">' + esc(t.role) + '</span><span class="pl">' + esc(t.place) + "</span></li>";
        }).join("") + "</ul></div></div></section>" +
      '<section class="block" id="courses"><div class="wrap"><h2>Course material</h2>' +
        '<p style="color:var(--muted);margin-top:0">Slides, readings and videos for each class, sorted by topic.</p>' + courseCards() +
      "</div></section>";
    if (scrollTo) { var el = document.getElementById(scrollTo); if (el) el.scrollIntoView(); }
    else window.scrollTo(0, 0);
  }

  function docCard(it) {
    var thumb = it.kind === "video"
      ? '<div class="thumb"><div class="play">▶</div></div>'
      : '<div class="thumb"><img loading="lazy" src="' + pageSrc(it, it.kind === "slides" && it.pages > 1 ? 2 : 1) + '" alt=""></div>';
    var size = it.kind === "video" ? "" : it.pages + (it.pages === 1 ? " page" : " pages");
    return '<button class="card doc" type="button" data-open="' + it.id + '" data-kind="' + it.kind + '" data-text="' +
      esc((it.title + " " + it.summary + " " + it.source).toLowerCase()) + '">' + thumb +
      '<div class="doc-body"><h3>' + esc(it.title) + "</h3>" +
      (it.summary ? "<p>" + esc(it.summary) + "</p>" : "") +
      (it.source ? '<p class="src">' + esc(it.source) + "</p>" : "") +
      '<div class="tags"><span class="tag ' + it.kind + '">' + (KIND[it.kind] || it.kind) + "</span>" + size + "</div></div></button>";
  }

  function coursePage(id) {
    var c = course(id);
    if (!c) return home();
    var kinds = {};
    c.units.forEach(function (u) { u.items.forEach(function (i) { kinds[i.kind] = 1; }); });
    var html = '<div class="wrap"><div class="course-head"><div class="crumbs"><a href="#/courses">Material</a> / ' + esc(c.title) + "</div>" +
      (c.code ? '<p class="eyebrow">' + esc(c.code) + "</p>" : "") +
      "<h1>" + esc(c.title) + "</h1><p>" + esc(c.blurb) + "</p></div>";
    if (!c.units.length) {
      html += '<div class="empty">The material for this course will be added soon.</div></div>';
      app.innerHTML = html; window.scrollTo(0, 0); return;
    }
    html += '<div class="toolbar"><input id="q" type="search" placeholder="Search this course" aria-label="Search this course">' +
      '<div class="filters" role="group" aria-label="Filter by type"><button class="on" data-f="all">All</button>' +
      Object.keys(kinds).map(function (k) { return '<button data-f="' + k + '">' + KIND[k] + "</button>"; }).join("") + "</div></div>" +
      '<ul class="unit-nav">' + c.units.map(function (u, i) { return '<li><a href="#/course/' + c.id + "/" + u.id + '">' + (i + 1) + ". " + esc(u.title) + "</a></li>"; }).join("") + "</ul>";
    html += c.units.map(function (u, i) {
      return '<section class="unit" id="unit-' + u.id + '"><div class="unit-title"><span class="num">' + String(i + 1).padStart(2, "0") +
        "</span><h2>" + esc(u.title) + "</h2></div>" + (u.about ? "<p>" + esc(u.about) + "</p>" : "") +
        '<div class="grid">' + u.items.map(docCard).join("") + "</div></section>";
    }).join("");
    html += '<div id="none" class="empty" hidden>Nothing matches your search.</div><div style="height:40px"></div></div>';
    app.innerHTML = html;

    var filter = "all", q = "";
    function apply() {
      var any = false;
      app.querySelectorAll(".unit").forEach(function (sec) {
        var shown = 0;
        sec.querySelectorAll(".doc").forEach(function (d) {
          var ok = (filter === "all" || d.dataset.kind === filter) && (!q || d.dataset.text.indexOf(q) >= 0);
          d.hidden = !ok; if (ok) shown++;
        });
        sec.hidden = !shown; if (shown) any = true;
      });
      document.getElementById("none").hidden = any;
    }
    document.getElementById("q").addEventListener("input", function (e) { q = e.target.value.trim().toLowerCase(); apply(); });
    app.querySelectorAll(".filters button").forEach(function (b) {
      b.addEventListener("click", function () {
        app.querySelectorAll(".filters button").forEach(function (x) { x.classList.toggle("on", x === b); });
        filter = b.dataset.f; apply();
      });
    });
  }

  // ---------- viewer ----------
  var cur = null, page = 1;
  function openViewer(id, n) {
    var f = findItem(id);
    if (!f) return;
    cur = f; page = Math.max(1, Math.min(n || 1, f.item.pages || 1));
    var it = f.item;
    var isVideo = it.kind === "video";
    viewer.innerHTML =
      '<div class="vbar"><button class="vbtn" data-v="close" title="Back (Esc)">← Back</button>' +
      '<div class="vt">' + esc(it.title) + "<small>" + esc(f.unit.title) + "</small></div>" +
      (isVideo ? "" : '<span class="vcount"><input id="vp" inputmode="numeric" aria-label="Page number"> / ' + it.pages + "</span>") +
      '<button class="vbtn" data-v="full" title="Full screen (F)">⛶</button></div>' +
      '<div class="vstage">' +
      (isVideo
        ? '<video src="' + esc(it.video) + '" controls controlsList="nodownload noremoteplayback" disablePictureInPicture playsinline preload="metadata"></video>'
        : '<button class="vnav prev" data-v="prev" aria-label="Previous page">‹</button><img id="vimg" alt="" draggable="false"><div class="shield"></div>' +
          '<button class="vnav next" data-v="next" aria-label="Next page">›</button>') +
      "</div>" +
      (isVideo || it.pages < 2 ? "" : '<div class="vstrip">' + Array.from({ length: it.pages }, function (_, i) {
        return '<button data-p="' + (i + 1) + '" aria-label="Page ' + (i + 1) + '"><img loading="lazy" src="' + pageSrc(it, i + 1) + '" alt=""></button>';
      }).join("") + "</div>");
    viewer.hidden = false;
    document.body.style.overflow = "hidden";
    if (!isVideo) show();
  }
  function show() {
    var it = cur.item;
    document.getElementById("vimg").src = pageSrc(it, page);
    document.getElementById("vp").value = page;
    viewer.querySelector(".prev").disabled = page <= 1;
    viewer.querySelector(".next").disabled = page >= it.pages;
    viewer.querySelectorAll(".vstrip button").forEach(function (b) {
      var on = +b.dataset.p === page; b.classList.toggle("on", on);
      if (on) b.scrollIntoView({ block: "nearest", inline: "center" });
    });
    if (page < it.pages) new Image().src = pageSrc(it, page + 1);
    var h = "#/view/" + it.id + "/" + page;
    if (location.hash !== h) history.replaceState(null, "", h);
  }
  function go(n) { if (!cur || cur.item.kind === "video") return; n = Math.max(1, Math.min(n, cur.item.pages)); if (n !== page) { page = n; show(); } }
  function closeViewer() {
    if (document.fullscreenElement) document.exitFullscreen();
    var back = cur ? "#/course/" + cur.course.id + "/" + cur.unit.id : "#/";
    viewer.hidden = true; viewer.innerHTML = ""; cur = null;
    document.body.style.overflow = "";
    location.hash = back;
  }
  viewer.addEventListener("click", function (e) {
    var b = e.target.closest("[data-v],[data-p]");
    if (!b) return;
    if (b.dataset.p) return go(+b.dataset.p);
    var v = b.dataset.v;
    if (v === "close") closeViewer();
    else if (v === "prev") go(page - 1);
    else if (v === "next") go(page + 1);
    else if (v === "full") { if (document.fullscreenElement) document.exitFullscreen(); else viewer.requestFullscreen && viewer.requestFullscreen(); }
  });
  viewer.addEventListener("change", function (e) { if (e.target.id === "vp") go(parseInt(e.target.value, 10) || page); });
  // swipe on touch screens
  var tx = null;
  viewer.addEventListener("touchstart", function (e) { tx = e.touches[0].clientX; }, { passive: true });
  viewer.addEventListener("touchend", function (e) {
    if (tx === null) return; var dx = e.changedTouches[0].clientX - tx; tx = null;
    if (Math.abs(dx) > 50) go(page + (dx < 0 ? 1 : -1));
  });

  document.addEventListener("keydown", function (e) {
    var k = e.key.toLowerCase();
    // keep the documents view-only: no save, print or view-source shortcuts
    if ((e.ctrlKey || e.metaKey) && (k === "s" || k === "p" || k === "u")) { e.preventDefault(); return; }
    if (viewer.hidden || e.target.tagName === "INPUT") return;
    if (k === "escape" && !document.fullscreenElement) closeViewer();
    else if (k === "arrowright" || k === "pagedown" || k === " ") { e.preventDefault(); go(page + 1); }
    else if (k === "arrowleft" || k === "pageup") { e.preventDefault(); go(page - 1); }
    else if (k === "home") go(1);
    else if (k === "end" && cur) go(cur.item.pages);
    else if (k === "f") viewer.querySelector('[data-v="full"]').click();
  });
  // no right-click menu or dragging on the material
  document.addEventListener("contextmenu", function (e) {
    if (e.target.closest(".viewer, .thumb, video")) e.preventDefault();
  });
  document.addEventListener("dragstart", function (e) { if (e.target.tagName === "IMG") e.preventDefault(); });

  app.addEventListener("click", function (e) {
    var d = e.target.closest("[data-open]");
    if (d) location.hash = "#/view/" + d.dataset.open + "/1";
  });

  // ---------- router ----------
  var BASE = document.title;
  function setTitle(t) { document.title = t ? t + " · " + BASE : BASE; }

  function route() {
    var parts = location.hash.replace(/^#\/?/, "").split("/");
    document.querySelectorAll("[data-nav]").forEach(function (a) {
      a.classList.toggle("on", (parts[0] === "course" || parts[0] === "courses") ? a.dataset.nav === "courses" : a.dataset.nav === "home" && parts[0] !== "view");
    });
    if (parts[0] === "view") {
      var f = findItem(parts[1]);
      if (!f) { location.hash = "#/"; return; }
      setTitle(f.item.title);
      if (app.dataset.course !== f.course.id) { coursePage(f.course.id); app.dataset.course = f.course.id; }
      if (!cur || cur.item.id !== parts[1]) openViewer(parts[1], parseInt(parts[2], 10) || 1);
      else go(parseInt(parts[2], 10) || 1);
      return;
    }
    if (!viewer.hidden) { viewer.hidden = true; viewer.innerHTML = ""; cur = null; document.body.style.overflow = ""; }
    if (parts[0] === "course") {
      setTitle(course(parts[1]) ? course(parts[1]).title : "");
      if (app.dataset.course !== parts[1]) { coursePage(parts[1]); app.dataset.course = parts[1]; window.scrollTo(0, 0); }
      var u = parts[2] && document.getElementById("unit-" + parts[2]);
      if (u) u.scrollIntoView();
      return;
    }
    app.dataset.course = "";
    setTitle(parts[0] === "courses" ? "Course material" : "");
    if (parts[0] === "courses") home("courses");
    else if (parts[0] === "about") home("about");
    else home();
  }
  window.addEventListener("hashchange", route);
  route();
})();
