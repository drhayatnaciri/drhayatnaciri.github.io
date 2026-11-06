(function () {
  "use strict";
  var S = window.SITE;
  var app = document.getElementById("app");
  var viewer = document.getElementById("viewer");
  var KIND = { slides: "Slides", reading: "Reading", video: "Video" };

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

  function toast(msg) {
    var old = document.querySelector(".toast-msg");
    if (old && old.parentNode) old.parentNode.removeChild(old);
    var t = document.createElement("div");
    t.className = "toast-msg";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 3500);
  }

  function makeCode(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    return "VER-HN-" + Math.abs(h).toString(16).toUpperCase().padStart(6, "0").slice(0, 6);
  }

  function maskName(name) {
    name = (name || "").trim();
    if (!name) return "Student #" + Math.floor(1000 + Math.random() * 9000);
    var parts = name.split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase() + "****";
    return parts[0].charAt(0).toUpperCase() + "**** " + parts[parts.length - 1].charAt(0).toUpperCase() + ".";
  }

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

  function aboutPage() {
    var p = S.profile;
    app.innerHTML =
      '<div class="wrap">' +
        '<section class="hero"><div class="wrap">' +
          '<div class="portrait"><img src="' + esc(p.photo) + '" alt="Portrait of ' + esc(p.name) + '"></div>' +
          '<div><p class="eyebrow">' + esc(p.location) + "</p><h1>" + esc(p.name) + "</h1>" +
          '<p class="role">' + esc(p.title) + "</p>" +
          '<ul class="chips">' + p.interests.map(function (i) { return "<li>" + esc(i) + "</li>"; }).join("") + "</ul>" +
          '<div class="actions">' +
            '<a class="btn primary" href="#/courses">Course material</a>' +
            '<a class="btn ghost" href="#/quizzes">Reading quizzes</a>' +
            '<a class="btn ghost" href="#/comments">Student feedback</a>' +
          '</div></div>' +
        "</div></section>" +
        '<section class="block" id="about"><div class="wrap about"><div><h2>About</h2>' +
          p.bio.map(function (b) { return "<p>" + esc(b) + "</p>"; }).join("") + "</div>" +
          '<div><h2>Career & Education</h2><ul class="timeline">' + p.timeline.map(function (t) {
            return '<li><span class="yr">' + esc(t.years) + '</span><span class="rl">' + esc(t.role) + '</span><span class="pl">' + esc(t.place) + "</span></li>";
          }).join("") + "</ul></div></div></section>" +
      "</div>";
    window.scrollTo(0, 0);
  }

  function materialPage() {
    app.innerHTML =
      '<div class="wrap" style="padding:40px 16px 60px">' +
        '<div class="course-head" style="padding-top:0">' +
          '<div class="crumbs"><a href="#/">Home</a> / Material</div>' +
          '<h1>Course Material</h1>' +
          '<p>Slides, readings and lecture presentations for each class, sorted by topic.</p>' +
        '</div>' +
        courseCards() +
      '</div>';
    window.scrollTo(0, 0);
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
    if (!c) return materialPage();
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
      var quizKey = c.id + "--" + u.id;
      var hasQuiz = S.quizzes && S.quizzes[quizKey];
      var qStatus = store("hn_quiz_" + quizKey);
      var qMeta = qStatus ? JSON.parse(qStatus) : null;
      var quizBanner = hasQuiz ? '<div class="unit-quiz-banner">' +
        '<div class="banner-text"><h4>📝 Reading Check: ' + esc(u.title) +
        (qMeta ? ' <span class="badge success">✓ Passed (' + qMeta.score + '/' + qMeta.total + ')</span>' : ' <span class="badge accent">Reading Check Quiz</span>') +
        '</h4><p>Take this 3-question quiz to assure you have read the slides. Email your screenshot result to Dr. Naciri.</p></div>' +
        '<a class="btn primary" href="#/quiz/' + c.id + '/' + u.id + '">' + (qMeta ? 'Retake Quiz' : 'Take Unit Quiz (3 min)') + ' →</a></div>' : '';

      return '<section class="unit" id="unit-' + u.id + '"><div class="unit-title"><span class="num">' + String(i + 1).padStart(2, "0") +
        "</span><h2>" + esc(u.title) + "</h2></div>" + (u.about ? "<p>" + esc(u.about) + "</p>" : "") +
        quizBanner +
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

  // ---------- quizzes hub ----------
  function quizzesHub() {
    var studentName = store("hn_student_name") || "";
    var studentId = store("hn_student_id") || "";
    var totalQuizzes = Object.keys(S.quizzes || {}).length;
    var completedCount = 0;
    Object.keys(S.quizzes || {}).forEach(function (k) {
      if (store("hn_quiz_" + k)) completedCount++;
    });

    var html = '<div class="wrap quiz-hub">' +
      '<div class="quiz-hub-head"><div class="crumbs"><a href="#/">Home</a> / Quizzes</div>' +
      '<h1>Reading Comprehension Quizzes</h1>' +
      '<p>Small quizzes about each topic to assure students read and understand the course material. Once completed, take a screenshot of your result card and email it to Dr. Naciri to confirm completion.</p>' +
      '</div>' +
      '<div class="quiz-student-bar">' +
        '<label for="st-name">Student Name (for result certificate):</label>' +
        '<input id="st-name" type="text" placeholder="e.g. Fatima Zahra / A. Mansouri" value="' + esc(studentName) + '">' +
        '<input id="st-id" type="text" placeholder="Student ID / Section (optional)" style="flex:0 1 180px" value="' + esc(studentId) + '">' +
        '<span class="badge ' + (completedCount > 0 ? "success" : "neutral") + '" style="margin-left:auto">' + completedCount + ' / ' + totalQuizzes + ' Completed</span>' +
      '</div>' +
      '<div class="quiz-courses">';

    S.courses.forEach(function (c) {
      html += '<div class="quiz-course-block">' +
        '<h2><span>' + esc(c.title) + '</span><span class="badge neutral">' + c.units.length + ' Units</span></h2>' +
        '<div class="quiz-units-list">';
      c.units.forEach(function (u, i) {
        var key = c.id + "--" + u.id;
        var q = S.quizzes && S.quizzes[key];
        var qStatus = store("hn_quiz_" + key);
        var qMeta = qStatus ? JSON.parse(qStatus) : null;
        html += '<div class="quiz-unit-row">' +
          '<div class="quiz-unit-info">' +
            '<h4>' + (i + 1) + '. ' + esc(u.title) +
            (qMeta ? ' <span class="badge success">✓ Score: ' + qMeta.score + '/' + qMeta.total + ' (' + qMeta.pct + '%)</span>' : ' <span class="badge neutral">3 Questions</span>') +
            '</h4>' +
            '<p>' + esc(q ? q.description : (u.about || "Reading check for this topic")) + '</p>' +
          '</div>' +
          '<div class="quiz-unit-actions">' +
            '<a class="btn ' + (qMeta ? "ghost" : "primary") + '" href="#/quiz/' + c.id + '/' + u.id + '">' +
            (qMeta ? "View / Retake" : "Start Quiz") + ' →</a>' +
          '</div>' +
        '</div>';
      });
      html += '</div></div>';
    });

    html += '</div></div>';
    app.innerHTML = html;

    var nameInput = document.getElementById("st-name");
    var idInput = document.getElementById("st-id");
    nameInput.addEventListener("change", function () { store("hn_student_name", nameInput.value.trim()); toast("Saved student name"); });
    idInput.addEventListener("change", function () { store("hn_student_id", idInput.value.trim()); });
  }

  // ---------- single quiz page ----------
  function quizPage(courseId, unitId) {
    var key = courseId + "--" + unitId;
    var qData = S.quizzes && S.quizzes[key];
    var c = course(courseId);
    var u = c && c.units.filter(function (x) { return x.id === unitId; })[0];
    if (!qData && (!c || !u)) { location.hash = "#/quizzes"; return; }

    var studentName = store("hn_student_name") || "";
    var studentId = store("hn_student_id") || "";
    var savedResult = store("hn_quiz_" + key);
    var result = savedResult ? JSON.parse(savedResult) : null;

    var title = qData ? qData.title : (u ? u.title : "Unit Quiz");
    var courseTitle = c ? c.title : "Course";

    if (result) {
      // Render Screenshot & Result Certificate View
      var html = '<div class="wrap quiz-container">' +
        '<div class="crumbs" style="margin-bottom:16px"><a href="#/quizzes">Quizzes</a> / <a href="#/course/' + esc(courseId) + '">' + esc(courseTitle) + '</a> / ' + esc(title) + '</div>' +
        '<div class="quiz-result-card" id="quiz-result-card">' +
          '<div class="result-header-row">' +
            '<div class="result-seal">' +
              '<div class="result-seal-icon">HN</div>' +
              '<div class="result-seal-text">' +
                '<h4>Dr. Hayat Naciri · Official Course Verification</h4>' +
                '<p>Moulay Ismail University (UMI) · Academic Reading Check</p>' +
              '</div>' +
            '</div>' +
            '<div class="result-score-badge">' + result.score + ' / ' + result.total +
              '<small>' + (result.pct >= 70 ? 'Passed · ' + result.pct + '%' : 'Completed · ' + result.pct + '%') + '</small>' +
            '</div>' +
          '</div>' +
          '<div class="result-grid">' +
            '<div class="result-grid-item"><div class="lbl">Student Name</div><div class="val">' + esc(result.studentName || "Anonymous Student") + '</div></div>' +
            (result.studentId ? '<div class="result-grid-item"><div class="lbl">Student ID / Group</div><div class="val">' + esc(result.studentId) + '</div></div>' : '') +
            '<div class="result-grid-item"><div class="lbl">Course</div><div class="val">' + esc(courseTitle) + '</div></div>' +
            '<div class="result-grid-item"><div class="lbl">Topic / Unit</div><div class="val">' + esc(title) + '</div></div>' +
            '<div class="result-grid-item"><div class="lbl">Date & Time</div><div class="val">' + esc(result.date) + '</div></div>' +
            '<div class="result-grid-item"><div class="lbl">Verification Code</div><div class="val code">' + esc(result.code) + '</div></div>' +
          '</div>' +
          '<div class="screenshot-notice-box">' +
            '<div class="icon">📸</div>' +
            '<p><strong>Take a Screenshot to Submit:</strong> Capture this result card (Press <kbd>Win</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd> or <kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>4</kbd>, or screenshot on your mobile phone) and email it to <strong>h.naciri@umi.ac.ma</strong> to confirm completion of your reading assignment.</p>' +
          '</div>' +
        '</div>' +
        '<div class="result-actions">' +
          '<a class="btn primary" id="btn-email" href="mailto:h.naciri@umi.ac.ma?subject=' + encodeURIComponent("[Quiz Result] " + title + " - " + (result.studentName || "Student")) +
          '&body=' + encodeURIComponent("Dear Dr. Naciri,\n\nI have completed the reading comprehension quiz for " + title + " (" + courseTitle + ").\n\nStudent: " + (result.studentName || "Student") + "\nID/Group: " + (result.studentId || "N/A") + "\nScore: " + result.score + "/" + result.total + " (" + result.pct + "%)\nVerification Code: " + result.code + "\nDate: " + result.date + "\n\n(Screenshot attached)\n\nBest regards,") +
          '">✉️ Email Results to Dr. Naciri</a>' +
          '<button class="btn ghost" id="btn-copy" type="button">📋 Copy Summary</button>' +
          '<button class="btn ghost" id="btn-print" type="button">🖨️ Print / Save as PDF</button>' +
          '<button class="btn ghost" id="btn-retake" type="button" style="margin-left:auto">🔄 Retake Quiz</button>' +
        '</div>' +
        '<div class="quiz-review-section">' +
          '<h3>Question Breakdown & Answers</h3>' +
          qData.questions.map(function (q, idx) {
            var userChoice = result.answers && result.answers[idx];
            var isCorrect = userChoice === q.answer;
            return '<div class="review-item ' + (isCorrect ? 'correct' : 'incorrect') + '">' +
              '<div class="review-q-title">' + (idx + 1) + '. ' + esc(q.q) + '</div>' +
              '<div class="review-ans ' + (isCorrect ? 'user-correct' : 'user-wrong') + '">Your answer: ' + esc(q.options[userChoice] != null ? q.options[userChoice] : "Not answered") + (isCorrect ? ' ✓' : ' ✗') + '</div>' +
              (!isCorrect ? '<div class="review-ans user-correct">Correct answer: ' + esc(q.options[q.answer]) + '</div>' : '') +
              '<div class="review-explain"><strong>Lecture takeaway:</strong> ' + esc(q.explain) + '</div>' +
            '</div>';
          }).join("") +
        '</div>' +
      '</div>';

      app.innerHTML = html;

      document.getElementById("btn-copy").addEventListener("click", function () {
        var text = "DR. HAYAT NACIRI — READING COMPREHENSION QUIZ RESULT\n" +
          "==================================================\n" +
          "Student:           " + (result.studentName || "Student") + "\n" +
          (result.studentId ? "Student ID/Group:  " + result.studentId + "\n" : "") +
          "Course:            " + courseTitle + "\n" +
          "Topic:             " + title + "\n" +
          "Score:             " + result.score + " / " + result.total + " (" + result.pct + "%)\n" +
          "Date:              " + result.date + "\n" +
          "Verification Code: " + result.code + "\n" +
          "==================================================";
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () { toast("Copied results summary to clipboard!"); });
        } else {
          toast("Results summary ready!");
        }
      });

      document.getElementById("btn-print").addEventListener("click", function () {
        document.body.classList.add("printing-quiz");
        window.print();
        window.addEventListener("afterprint", function () { document.body.classList.remove("printing-quiz"); }, { once: true });
      });

      document.getElementById("btn-retake").addEventListener("click", function () {
        try { localStorage.removeItem("hn_quiz_" + key); } catch (e) {}
        quizPage(courseId, unitId);
      });
      return;
    }

    // Render Quiz Questions Form View
    var html = '<div class="wrap quiz-container">' +
      '<div class="crumbs" style="margin-bottom:16px"><a href="#/quizzes">Quizzes</a> / <a href="#/course/' + esc(courseId) + '">' + esc(courseTitle) + '</a> / ' + esc(title) + '</div>' +
      '<div class="quiz-header-card">' +
        '<p class="eyebrow" style="margin-bottom:4px">' + esc(courseTitle) + ' · Reading Check</p>' +
        '<h1>' + esc(title) + '</h1>' +
        '<p style="color:var(--muted);margin:0">' + esc(qData ? qData.description : "Answer the 3 reading questions to verify completion of this unit.") + '</p>' +
        '<div class="quiz-student-prompt">' +
          '<div><label style="display:block;font-size:.8rem;font-weight:600;margin-bottom:4px" for="q-sname">Student Full Name *</label>' +
          '<input id="q-sname" type="text" placeholder="Your Name" value="' + esc(studentName) + '"></div>' +
          '<div><label style="display:block;font-size:.8rem;font-weight:600;margin-bottom:4px" for="q-sid">Student ID or Section (optional)</label>' +
          '<input id="q-sid" type="text" placeholder="e.g. Group 2 / UMI ID" value="' + esc(studentId) + '"></div>' +
        '</div>' +
      '</div>' +
      '<form id="quiz-form">' +
      qData.questions.map(function (q, qIdx) {
        return '<div class="quiz-q-card">' +
          '<div class="quiz-q-num">Question ' + (qIdx + 1) + ' of ' + qData.questions.length + '</div>' +
          '<div class="quiz-q-text">' + esc(q.q) + '</div>' +
          '<div class="quiz-options">' +
            q.options.map(function (opt, oIdx) {
              return '<label class="quiz-opt-label">' +
                '<input type="radio" name="q' + qIdx + '" value="' + oIdx + '">' +
                '<span>' + esc(opt) + '</span>' +
              '</label>';
            }).join("") +
          '</div>' +
        '</div>';
      }).join("") +
      '<div class="quiz-submit-bar">' +
        '<a class="btn ghost" href="#/quizzes">Cancel</a>' +
        '<button class="btn primary" type="submit">Submit Quiz Answers & Get Result Card →</button>' +
      '</div>' +
      '</form></div>';

    app.innerHTML = html;

    app.querySelectorAll(".quiz-opt-label").forEach(function (lbl) {
      lbl.addEventListener("click", function () {
        var radio = lbl.querySelector('input[type="radio"]');
        if (radio) {
          radio.checked = true;
          var groupName = radio.name;
          app.querySelectorAll('input[name="' + groupName + '"]').forEach(function (r) {
            r.closest(".quiz-opt-label").classList.toggle("selected", r.checked);
          });
        }
      });
    });

    document.getElementById("quiz-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var nameVal = document.getElementById("q-sname").value.trim();
      var idVal = document.getElementById("q-sid").value.trim();
      if (!nameVal) {
        alert("Please enter your name so your verification card can be issued.");
        document.getElementById("q-sname").focus();
        return;
      }
      store("hn_student_name", nameVal);
      store("hn_student_id", idVal);

      var answers = [];
      for (var i = 0; i < qData.questions.length; i++) {
        var sel = document.querySelector('input[name="q' + i + '"]:checked');
        if (!sel) {
          alert("Please answer Question " + (i + 1) + " before submitting.");
          return;
        }
        answers.push(parseInt(sel.value, 10));
      }

      var correct = 0;
      for (var j = 0; j < qData.questions.length; j++) {
        if (answers[j] === qData.questions[j].answer) correct++;
      }
      var total = qData.questions.length;
      var pct = Math.round((correct / total) * 100);
      var now = new Date();
      var dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + " " +
        now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      var vcode = makeCode(nameVal + ":" + key + ":" + correct + ":" + now.getTime());

      var record = {
        studentName: nameVal,
        studentId: idVal,
        score: correct,
        total: total,
        pct: pct,
        date: dateStr,
        code: vcode,
        answers: answers
      };

      store("hn_quiz_" + key, JSON.stringify(record));
      toast("Quiz submitted! Here is your verified result card.");
      quizPage(courseId, unitId);
    });
  }

  // ---------- comments page ----------
  function commentsPage() {
    var rawUser = store("hn_user_comments");
    var userComments = rawUser ? JSON.parse(rawUser) : [];
    var initialComments = S.comments || [];
    var allComments = [].concat(userComments, initialComments);

    var likedIds = {};
    try { (JSON.parse(store("hn_liked_comments") || "[]")).forEach(function (id) { likedIds[id] = true; }); } catch (e) {}

    var activeFilter = "all";
    var activeSort = "likes";
    var limit = 10;

    function render() {
      var filtered = allComments.filter(function (c) {
        return activeFilter === "all" || c.course === activeFilter;
      });

      if (activeSort === "likes") {
        filtered.sort(function (a, b) { return (b.likes || 0) - (a.likes || 0); });
      } else {
        filtered.sort(function (a, b) { return (b.id.localeCompare ? b.id.localeCompare(a.id) : 0); });
      }

      var visible = filtered.slice(0, limit);
      var hasMore = filtered.length > limit;

      var courseOpts = [
        { id: "business-writing", name: "Writing for Business" },
        { id: "public-speaking", name: "Public Speaking & Debating" },
        { id: "composition", name: "Composition (S2)" },
        { id: "english-grammar", name: "English Grammar" },
        { id: "leadership-communication", name: "Leadership and Communication" },
        { id: "general", name: "General / Other" }
      ];

      var html = '<div class="wrap comments-wrap">' +
        '<div class="comments-header-row">' +
          '<div><div class="crumbs"><a href="#/">Home</a> / Comments</div>' +
          '<h1 style="margin-bottom:6px">Student Comments & Feedback</h1>' +
          '<p style="color:var(--muted);margin:0">Read reflections, questions, and insights from students across Dr. Naciri\'s courses with hidden names.</p></div>' +
          '<span class="badge accent">' + allComments.length + ' Comments</span>' +
        '</div>' +

        '<div class="comments-form-card">' +
          '<h3>Leave a Comment or Question</h3>' +
          '<form id="comment-form">' +
            '<textarea id="cm-text" placeholder="Share your experience with the course materials, slides, or quizzes..." required></textarea>' +
            '<div class="comments-form-controls">' +
              '<input id="cm-name" type="text" placeholder="Your Name (e.g. Fatima / Karim)">' +
              '<select id="cm-course">' + courseOpts.map(function (o) { return '<option value="' + o.id + '">' + esc(o.name) + '</option>'; }).join("") + '</select>' +
              '<button class="btn primary" type="submit">Post Comment</button>' +
              '<label class="comments-hide-check">' +
                '<input id="cm-hide" type="checkbox" checked>' +
                '<span>Keep my name hidden (show as masked initials, e.g. <strong>F**** Z.</strong> or <strong>Student #1042</strong>)</span>' +
              '</label>' +
            '</div>' +
          '</form>' +
        '</div>' +

        '<div class="comments-toolbar">' +
          '<div class="comments-filters">' +
            '<button class="' + (activeFilter === "all" ? "on" : "") + '" data-cf="all">All (' + allComments.length + ')</button>' +
            courseOpts.map(function (o) {
              var cnt = allComments.filter(function (x) { return x.course === o.id; }).length;
              return '<button class="' + (activeFilter === o.id ? "on" : "") + '" data-cf="' + o.id + '">' + esc(o.name) + ' (' + cnt + ')</button>';
            }).join("") +
          '</div>' +
          '<div class="comments-sort">' +
            '<select id="sort-select">' +
              '<option value="likes"' + (activeSort === "likes" ? " selected" : "") + '>Sort by: Most Helpful</option>' +
              '<option value="newest"' + (activeSort === "newest" ? " selected" : "") + '>Sort by: Newest First</option>' +
            '</select>' +
          '</div>' +
        '</div>' +

        '<div class="comments-list">' +
          visible.map(function (c) {
            var isLiked = !!likedIds[c.id];
            var courseObj = courseOpts.filter(function (o) { return o.id === c.course; })[0];
            var courseLabel = courseObj ? courseObj.name : c.course;
            return '<div class="comment-card" data-cid="' + esc(c.id) + '">' +
              '<div class="comment-top">' +
                '<div class="comment-user">' +
                  '<div class="comment-avatar">' + esc(c.name.charAt(0)) + '</div>' +
                  '<div class="comment-meta">' +
                    '<h4>' + esc(c.name) + ' <span class="shield-pill">Hidden name</span></h4>' +
                    '<p>' + esc(c.affiliation) + '</p>' +
                  '</div>' +
                '</div>' +
                '<span class="comment-date">' + esc(c.date) + '</span>' +
              '</div>' +
              '<p class="comment-body">' + esc(c.text) + '</p>' +
              '<div class="comment-foot">' +
                '<span class="comment-course-tag">' + esc(courseLabel) + '</span>' +
                '<button class="comment-like-btn ' + (isLiked ? "liked" : "") + '" type="button" data-like="' + esc(c.id) + '">' +
                  '👍 ' + (isLiked ? "Helpful (" + (c.likes || 0) + ")" : "Helpful (" + (c.likes || 0) + ")") +
                '</button>' +
              '</div>' +
            '</div>';
          }).join("") +
        '</div>' +

        (hasMore ? '<div class="load-more-btn-wrap"><button class="btn ghost" id="btn-load-more" type="button">Load More Comments (' + (filtered.length - limit) + ' remaining)</button></div>' : '') +
      '</div>';

      app.innerHTML = html;

      // Filter clicks
      app.querySelectorAll(".comments-filters button").forEach(function (b) {
        b.addEventListener("click", function () {
          activeFilter = b.dataset.cf;
          limit = 10;
          render();
        });
      });

      // Sort change
      var sortSelect = document.getElementById("sort-select");
      if (sortSelect) {
        sortSelect.addEventListener("change", function () {
          activeSort = sortSelect.value;
          render();
        });
      }

      // Load more click
      var loadMoreBtn = document.getElementById("btn-load-more");
      if (loadMoreBtn) {
        loadMoreBtn.addEventListener("click", function () {
          limit += 10;
          render();
        });
      }

      // Like button click
      app.querySelectorAll(".comment-like-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var cid = btn.dataset.like;
          var targetComment = allComments.filter(function (x) { return x.id === cid; })[0];
          if (!targetComment) return;

          if (likedIds[cid]) {
            delete likedIds[cid];
            targetComment.likes = Math.max(0, (targetComment.likes || 1) - 1);
          } else {
            likedIds[cid] = true;
            targetComment.likes = (targetComment.likes || 0) + 1;
            toast("Marked comment as helpful!");
          }
          store("hn_liked_comments", JSON.stringify(Object.keys(likedIds)));
          render();
        });
      });

      // Post comment submit
      var form = document.getElementById("comment-form");
      if (form) {
        form.addEventListener("submit", function (e) {
          e.preventDefault();
          var txt = document.getElementById("cm-text").value.trim();
          var rawName = document.getElementById("cm-name").value.trim();
          var hideName = document.getElementById("cm-hide").checked;
          var courseVal = document.getElementById("cm-course").value;

          if (!txt) return;

          var displayName = hideName ? maskName(rawName) : (rawName || "Student #" + Math.floor(1000 + Math.random() * 9000));
          var courseObj = courseOpts.filter(function (o) { return o.id === courseVal; })[0];
          var affiliation = (courseObj ? courseObj.name : "Student") + " · Semester Student";

          var newComment = {
            id: "user-" + Date.now(),
            name: displayName,
            affiliation: affiliation,
            date: "Just now",
            course: courseVal,
            text: txt,
            likes: 1
          };

          userComments.unshift(newComment);
          store("hn_user_comments", JSON.stringify(userComments));
          allComments.unshift(newComment);
          likedIds[newComment.id] = true;
          store("hn_liked_comments", JSON.stringify(Object.keys(likedIds)));

          activeSort = "newest";
          toast("✓ Comment posted with hidden name!");
          render();
        });
      }
    }

    render();
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
      }).join("") + "</div>") +
      '<div class="vfoot">© Dr. Hayat Naciri. Course documents are shared for viewing on this site only.</div>';
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
    if ((e.ctrlKey || e.metaKey) && (k === "s" || (k === "p" && !document.body.classList.contains("printing-quiz")) || k === "u")) { e.preventDefault(); return; }
    if (viewer.hidden || e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
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
      var n = a.dataset.nav;
      if (parts[0] === "quizzes" || parts[0] === "quiz") a.classList.toggle("on", n === "quizzes");
      else if (parts[0] === "comments") a.classList.toggle("on", n === "comments");
      else if (parts[0] === "course" || parts[0] === "courses") a.classList.toggle("on", n === "courses");
      else a.classList.toggle("on", n === "home" && parts[0] !== "view");
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
    if (parts[0] === "quizzes") {
      app.dataset.course = "";
      setTitle("Reading Quizzes");
      quizzesHub();
      window.scrollTo(0, 0);
      return;
    }
    if (parts[0] === "quiz") {
      app.dataset.course = "";
      setTitle("Reading Quiz");
      quizPage(parts[1], parts[2]);
      window.scrollTo(0, 0);
      return;
    }
    if (parts[0] === "comments") {
      app.dataset.course = "";
      setTitle("Student Comments");
      commentsPage();
      window.scrollTo(0, 0);
      return;
    }
    if (parts[0] === "courses") {
      app.dataset.course = "";
      setTitle("Course material");
      materialPage();
      return;
    }
    app.dataset.course = "";
    setTitle(parts[0] === "about" ? "About" : "");
    aboutPage();
  }
  window.addEventListener("hashchange", route);
  route();
})();
