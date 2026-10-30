/* курс «ИИ для бизнеса»: подбор задачи, окно «Написать», копирование, полоса снизу, фильтры, анимация первого экрана.
   Персональные данные не собираются и не хранятся: выбор человека живёт только в адресе страницы. */
(function () {
  "use strict";
  var CFG = window.SITE || {};
  var TG = CFG.tg || "andeulin";
  var MAX_PHONE = CFG.maxPhone || "";
  var MAX_PHONE_VIEW = CFG.maxPhoneView || MAX_PHONE;

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function goal(name, params) { try { if (window.ym && CFG.ym) window.ym(CFG.ym, "reachGoal", name, params || {}); } catch (e) {} }

  var toastEl;
  function toast(t) {
    if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "toast"; toastEl.setAttribute("role", "status"); document.body.appendChild(toastEl); }
    var host = document.querySelector("dialog[open]") || document.body;
    if (toastEl.parentNode !== host) host.appendChild(toastEl);
    toastEl.textContent = t; toastEl.classList.add("on");
    clearTimeout(toastEl._t); toastEl._t = setTimeout(function () { toastEl.classList.remove("on"); }, 2200);
  }
  function copy(text, done) {
    function ok() { toast(done || "Скопировано"); }
    if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text).then(ok, fallback); } else { fallback(); }
    function fallback() {
      var ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); ok(); } catch (e) { toast("Выделите текст и скопируйте вручную"); } document.body.removeChild(ta);
    }
  }

  /* ---------- Откуда пришёл человек: ?from=метка в ссылке партнёра, добавляется в текст сообщения ---------- */
  var SRC = "";
  try {
    var mm = location.search.match(/[?&]from=([A-Za-z0-9_-]{1,30})/);
    if (mm) { SRC = mm[1]; sessionStorage.setItem("iidd_from", SRC); } else { SRC = sessionStorage.getItem("iidd_from") || ""; }
  } catch (e) {}

  /* ---------- Окно «Написать» ---------- */
  var bg = $(".sheet-bg"), sheet = $(".sheet"), currentText = "", lastFocus = null;
  function openSheet(text, where) {
    if (!sheet) return;
    currentText = text || CFG.defaultText || "Здравствуйте! Вопрос про курс по нейросетям для бизнеса.";
    if (SRC) currentText = /^[^!]{1,40}!/.test(currentText) ? currentText.replace(/^([^!]{1,40}!)\s*/, "$1 (ссылка " + SRC + ") ") : "(ссылка " + SRC + ") " + currentText;
    $(".msg", sheet).textContent = currentText;
    $(".js-tg", sheet).href = "https://t.me/" + TG + "?text=" + encodeURIComponent(currentText);
    $(".max-info", sheet).classList.remove("on");
    lastFocus = document.activeElement;
    bg.classList.add("on"); sheet.classList.add("on"); sheet.setAttribute("aria-hidden", "false");
    $(".js-tg", sheet).focus();
    goal("write_open", { where: where || "" });
  }
  function closeSheet() {
    if (!sheet) return;
    bg.classList.remove("on"); sheet.classList.remove("on"); sheet.setAttribute("aria-hidden", "true");
    if (lastFocus) lastFocus.focus();
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-write]");
    if (b) { e.preventDefault(); var dd = b.closest("dialog"); if (dd && dd.open) dd.close(); openSheet(b.getAttribute("data-write"), b.getAttribute("data-where")); return; }
    if (e.target.closest(".sheet .x") || e.target === bg) { closeSheet(); return; }
    var c = e.target.closest("[data-copy]");
    if (c) { e.preventDefault(); var src = document.getElementById(c.getAttribute("data-copy")); copy(src ? src.textContent.trim() : c.getAttribute("data-copy-text"), c.getAttribute("data-done")); goal("prompt_copy"); return; }
    var s = e.target.closest("[data-share]");
    if (s) { e.preventDefault(); share(s.getAttribute("data-share") || location.href); }
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSheet(); });
  if (sheet) {
    $(".js-tg", sheet).addEventListener("click", function () { goal("msg_tg"); });
    $(".js-max", sheet).addEventListener("click", function (e) {
      e.preventDefault(); copy(currentText, "Текст скопирован");
      $(".max-info", sheet).classList.add("on"); goal("msg_max");
    });
    var cn = $(".js-copy-phone", sheet);
    if (cn) cn.addEventListener("click", function (e) { e.preventDefault(); copy(MAX_PHONE_VIEW, "Номер скопирован"); });
  }
  function share(url) {
    var u = url.split("#")[0] === location.href.split("#")[0] ? location.href : url;
    goal("share_click");
    if (navigator.share) { navigator.share({ title: document.title, url: u }).catch(function () {}); }
    else { copy(u, "Ссылка скопирована, отправьте её знакомому"); }
  }

  /* ---------- Полоса снизу на телефоне ---------- */
  var dock = $(".dock"), hero = $(".hero, .task-hero");
  if (dock && "IntersectionObserver" in window) {
    var heroGone = false, hide = 0;
    if (hero) new IntersectionObserver(function (en) { heroGone = !en[0].isIntersecting; upd(); }).observe(hero); else heroGone = true;
    var hiders = $$("#price, #final, .sheet");
    var io = new IntersectionObserver(function (en) { en.forEach(function (x) { x.target._v = x.isIntersecting; }); hide = hiders.some(function (h) { return h._v; }); upd(); });
    hiders.forEach(function (h) { io.observe(h); });
    function upd() { dock.classList.toggle("on", heroGone && !hide); }
  }

  /* ---------- Подбор задачи ---------- */
  var pk = $(".picker");
  if (pk) initPicker(pk);

  function initPicker(root) {
    var base = root.getAttribute("data-base") || "./";
    var steps = $$(".pk-step", root), res = $(".pk-res", root), bar = $(".pk-bar i", root), cnt = $(".pk-count", root);
    var state = { pains: [], spheres: [] }, data = window.TASKS_DATA || null, cur = 0;
    var PAIN_TASKS = {
      clients: ["otvety-klientam", "zapis-i-napominaniya", "otvety-na-otzyvy", "vozvrat-klientov"],
      docs: ["scheta-i-akty", "proverka-dogovorov", "kommercheskoe-predlozhenie", "dannye-iz-dokumentov", "pisma-v-nuzhnom-tone"],
      reports: ["svodka-nedeli", "kassovye-razryvy", "razbor-otzyvov", "konkurenty-i-ceny"],
      content: ["posty-i-kontent-plan", "kartochki-tovarov", "sait-bez-programmista", "foto-i-kartinki", "obyavleniya-avito", "reklamnyi-rolik"],
      sales: ["razbor-zayavok", "kalkulyator-stoimosti", "kommercheskoe-predlozhenie", "proverka-zvonkov", "vozvrat-klientov"],
      team: ["protokoly-vstrech", "zadachi-iz-chatov", "reglamenty-dlya-sotrudnikov", "svoi-uchet"],
      unknown: ["otvety-klientam", "svodka-nedeli", "pisma-v-nuzhnom-tone"]
    };
    function load(cb) {
      if (data) return cb();
      fetch(base + "data/tasks.json").then(function (r) { return r.json(); }).then(function (j) { data = j; cb(); })
        .catch(function () { res.innerHTML = '<p>Не получилось загрузить подборку. <a href="' + base + 'zadachi/">Откройте все задачи списком</a>.</p>'; show(2); });
    }
    function show(i) {
      cur = i;
      steps.forEach(function (s, k) { s.classList.toggle("hide", k !== i); });
      res.classList.toggle("on", i === 2);
      if (bar) bar.style.width = ((i + 1) / 3 * 100) + "%";
      if (cnt) cnt.textContent = "Шаг " + (i + 1) + " из 3";
    }
    $$(".opt", steps[0]).forEach(function (o) {
      o.addEventListener("click", function () {
        var v = o.getAttribute("data-v");
        if (v === "unknown") { state.pains = ["unknown"]; $$(".opt", steps[0]).forEach(function (x) { x.setAttribute("aria-pressed", x === o ? "true" : "false"); }); }
        else {
          state.pains = state.pains.filter(function (p) { return p !== "unknown"; });
          var u = $('.opt[data-v="unknown"]', steps[0]); if (u) u.setAttribute("aria-pressed", "false");
          var i = state.pains.indexOf(v);
          if (i < 0) state.pains.push(v); else state.pains.splice(i, 1);
          o.setAttribute("aria-pressed", i < 0 ? "true" : "false");
        }
        $(".js-next", steps[0]).disabled = !state.pains.length;
      });
    });
    $(".js-next", steps[0]).addEventListener("click", function () { if (state.pains.length) { show(1); goal("podbor_step", { step: 2 }); } });
    $$(".opt", steps[1]).forEach(function (o) {
      o.addEventListener("click", function () {
        var v = o.getAttribute("data-v");
        if (v === "other") { state.spheres = state.spheres[0] === "other" ? [] : ["other"]; }
        else {
          state.spheres = state.spheres.filter(function (x) { return x !== "other"; });
          var i = state.spheres.indexOf(v);
          if (i < 0) state.spheres.push(v); else state.spheres.splice(i, 1);
        }
        $$(".opt", steps[1]).forEach(function (x) { x.setAttribute("aria-pressed", state.spheres.indexOf(x.getAttribute("data-v")) >= 0 ? "true" : "false"); });
      });
    });
    $(".js-show", steps[1]).addEventListener("click", function () {
      load(function () { render(); show(2); writeHash(); openRes(); goal("podbor_result", { pains: state.pains.join(","), sphere: state.spheres.join(",") }); });
    });
    $$(".js-back", root).forEach(function (b) { b.addEventListener("click", function () { show(Math.max(0, cur - 1)); }); });
    function restart() { state = { pains: [], spheres: [] }; $$(".opt", root).forEach(function (x) { x.setAttribute("aria-pressed", "false"); }); $(".js-next", steps[0]).disabled = true; history.replaceState(null, "", location.pathname + location.search); show(0); }
    root.addEventListener("click", function (e) {
      if (e.target.closest(".js-restart")) { e.preventDefault(); restart(); }
      if (e.target.closest(".js-open")) { e.preventDefault(); openRes(); }
    });
    var dlg = null;
    function modal() {
      if (dlg) return dlg;
      dlg = document.createElement("dialog");
      dlg.className = "pk-modal"; dlg.setAttribute("aria-labelledby", "pkm-t");
      document.body.appendChild(dlg);
      dlg.addEventListener("click", function (e) {
        if (e.target === dlg || e.target.closest(".js-pkm-close")) { dlg.close(); return; }
        if (e.target.closest(".js-restart")) { e.preventDefault(); dlg.close(); restart(); root.scrollIntoView({ behavior: "smooth", block: "start" }); }
      });
      return dlg;
    }
    function openRes() { var d = modal(); if (d.open) return; if (d.showModal) d.showModal(); else d.setAttribute("open", ""); goal("podbor_open"); }
    function taskHref(t) { return (CFG.taskBase || base + "zadachi/") + t.slug + "/"; }

    function pick() {
      var by = {}; data.tasks.forEach(function (t) { by[t.slug] = t; });
      var out = [], seen = {};
      var lists = state.pains.map(function (p) { return (PAIN_TASKS[p] || []).slice(); });
      var sp = state.spheres.filter(function (x) { return x !== "other"; });
      function score(slug) { var t = by[slug]; return t ? sp.filter(function (x) { return t.spheres.indexOf(x) >= 0 || t.spheres.indexOf("any") >= 0; }).length : 0; }
      lists = lists.map(function (l) { return l.map(function (x, k) { return [x, k]; }).sort(function (a, b) { return (score(b[0]) - score(a[0])) || (a[1] - b[1]); }).map(function (x) { return x[0]; }); });
      for (var round = 0; out.length < 3 && round < 6; round++) {
        lists.forEach(function (l) { var s = l[round]; if (s && !seen[s] && by[s] && out.length < 3) { seen[s] = 1; out.push(by[s]); } });
      }
      return out;
    }
    function sphereName() { return $$('.opt[aria-pressed="true"]', steps[1]).filter(function (o) { return o.getAttribute("data-v") !== "other"; }).map(function (o) { return o.textContent.trim(); }).join(", "); }
    function render() {
      var list = pick(), sn = sphereName(), t = list[0];
      var names = list.map(function (x) { return x.title.toLowerCase(); });
      var code = (CFG.site || "main") + "-" + state.pains.join("+") + "-" + (state.spheres.join("+") || "none");
      var msg = (CFG.writePrefix || "Здравствуйте! Подобрал на сайте курса") + ": " + (sn ? sn + ". " : "") + "Задачи: " + names.join("; ") + ". Получится собрать это за 6 встреч? Код " + code;
      var head = state.pains[0] === "unknown" ? "Задачи, с которых удобно начать" : (list.length > 1 ? list.length + " задачи, которые ИИ может взять на себя" : "Что ИИ может взять на себя");
      var h = '<div class="pkm-in"><button class="x js-pkm-close" type="button" aria-label="Закрыть">×</button>' +
        '<span class="eyebrow">ВАША ПОДБОРКА</span><h3 id="pkm-t">' + esc(head) + "</h3>" + (sn ? '<p class="pkm-for">Для сфер: ' + esc(sn.toLowerCase()) + "</p>" : "") +
        '<article class="pkm-main"><span class="pkm-label">Начните с этого</span><h4>' + esc(t.title) + '</h4><p class="muted small">' + esc(t.pain) + "</p>" +
        '<p class="pkm-sub">Первый шаг сегодня, бесплатно: скопируйте задание, замените слова в скобках и вставьте в любую нейросеть</p>' +
        '<div class="prompt"><span id="pkm-pr">' + esc(t.prompt) + '</span><button class="btn btn-line btn-sm copy" data-copy="pkm-pr" data-done="Задание скопировано: вставьте его в нейросеть">Скопировать задание</button></div>' +
        '<p class="small"><b>На курсе соберёте:</b> ' + esc(t.build) + '</p><p class="small" style="margin:0"><a href="' + taskHref(t) + '">Пошагово, с примером и ошибками нейросети →</a></p></article>';
      if (list.length > 1) h += '<div class="pkm-more"><span class="pkm-label">Ещё подойдёт</span>' + list.slice(1).map(function (x) {
        return '<a class="pkm-row" href="' + taskHref(x) + '"><span><b>' + esc(x.title) + "</b><small>" + esc(x.build) + "</small></span><i>→</i></a>"; }).join("") + "</div>";
      h += '<div class="pkm-cta"><h4>' + esc(CFG.courseTitle || "Довести до работы на ваших данных: 6 встреч") + "</h4><p>" + esc(CFG.courseText || "") + '</p><div class="cta-row">' +
        '<button class="btn btn-main" data-write="' + esc(msg) + '" data-where="podbor">Хочу собрать это на курсе <span class="arr">→</span></button>' +
        '<button class="btn btn-line" data-share="">Отправить знакомому</button></div><p class="small" style="margin:6px 0 0"><button class="linkbtn js-restart">Подобрать заново</button></p></div></div>';
      modal().innerHTML = h;
      res.innerHTML = '<div class="pk-sum"><p class="pk-q">Подборка готова</p><ul class="pk-chips">' + list.map(function (x) { return "<li>" + esc(x.title) + "</li>"; }).join("") +
        '</ul><div class="cta-row"><button type="button" class="btn btn-main js-open">Открыть подборку</button><button type="button" class="btn btn-line js-restart">Подобрать заново</button></div></div>';
    }
    function writeHash() { history.replaceState(null, "", "#p=" + state.pains.join(",") + "&s=" + state.spheres.join(",")); }
    function readHash() {
      var m = location.hash.match(/p=([a-z,]+)&s=([a-z,]*)/);
      if (!m) return;
      state.pains = m[1].split(",").filter(function (p) { return PAIN_TASKS[p]; });
      state.spheres = m[2] ? m[2].split(",") : [];
      if (!state.pains.length) return;
      state.pains.forEach(function (p) { var o = $('.opt[data-v="' + p + '"]', steps[0]); if (o) o.setAttribute("aria-pressed", "true"); });
      state.spheres.forEach(function (x) { var so = $('.opt[data-v="' + x + '"]', steps[1]); if (so) so.setAttribute("aria-pressed", "true"); });
      $(".js-next", steps[0]).disabled = false;
      load(function () { render(); show(2); openRes(); });
    }
    $(".js-next", steps[0]).disabled = true;
    show(0); readHash();
  }

  /* ---------- Анимация первого экрана: запрос печатается, ИИ-помощник собирает страницу ---------- */
  var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var demo = $(".demo");
  if (demo && !calm) {
    var full = $(".d-full", demo), live = $(".d-live", demo), text = full ? full.textContent : "";
    demo.classList.add("play");
    var caret = document.createElement("i"); caret.className = "d-caret"; live.appendChild(caret);
    var k = 0, node = document.createTextNode(""); live.insertBefore(node, caret);
    var steps2 = [[600, "s2"], [1400, "s3"], [250, "s4"], [900, "s5"], [600, "s6"]];   // думает, собирает, готово, выбор окна, запись
    function next(i) { if (i >= steps2.length) return; setTimeout(function () { demo.classList.add(steps2[i][1]); next(i + 1); }, steps2[i][0]); }
    function type() { if (k <= text.length) { node.nodeValue = text.slice(0, k); k += 2; setTimeout(type, 34); } else { node.nodeValue = text; next(0); } }
    setTimeout(type, 500);
  }

  var reveals = $$(".reveal");
  if (reveals.length && "IntersectionObserver" in window && !calm) {
    document.documentElement.classList.add("js-reveal");
    var vh = window.innerHeight || 800;
    reveals.forEach(function (el) { if (el.getBoundingClientRect().top < vh) el.classList.add("in"); });
    var ro = new IntersectionObserver(function (en) {
      en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add("in"); countUp(x.target); ro.unobserve(x.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { if (!el.classList.contains("in")) ro.observe(el); });
  }
  function countUp(root) {
    $$("[data-count]", root).forEach(function (b) {
      var n = +b.getAttribute("data-count"), t0 = 0;
      function fmt(v) { return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0"); }
      function step(t) { if (!t0) t0 = t; var p = Math.min(1, (t - t0) / 1100); b.textContent = fmt(Math.round(n * (1 - Math.pow(1 - p, 3)))); if (p < 1) requestAnimationFrame(step); }
      requestAnimationFrame(step);
    });
  }

  /* ---------- Отклик карточек: на ПК подсветка за курсором, на телефоне карточка в центре экрана приподнимается ---------- */
  var CARDS = ".persona, .out, .tier, .story, .lead2";
  var fine = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (!calm && fine) {
    document.addEventListener("pointermove", function (e) {
      var c = e.target.closest && e.target.closest(CARDS);
      if (!c) return;
      var r = c.getBoundingClientRect();
      c.style.setProperty("--mx", (e.clientX - r.left) + "px"); c.style.setProperty("--my", (e.clientY - r.top) + "px");
    }, { passive: true });
  } else if (!calm && "IntersectionObserver" in window) {
    var fo = new IntersectionObserver(function (en) { en.forEach(function (x) { x.target.classList.toggle("focus", x.isIntersecting); }); }, { rootMargin: "-42% 0px -42% 0px" });
    $$(CARDS).forEach(function (c) { fo.observe(c); });
  }
  /* маркер: ключевая фраза подчёркивается, когда до неё дочитали */
  var hls = $$("mark.hl");
  if (calm || !("IntersectionObserver" in window)) hls.forEach(function (m) { m.classList.add("on"); });
  else {
    var ho = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add("on"); ho.unobserve(x.target); } }); }, { rootMargin: "0px 0px -15% 0px" });
    hls.forEach(function (m) { ho.observe(m); });
  }

  /* ---------- Плашка cookie: есть на странице, только когда подключена Метрика ---------- */
  var ck = $(".cookie");
  if (ck) {
    var ok = false; try { ok = localStorage.getItem("iidd_cookie_ok") === "1"; } catch (e) {}
    if (!ok) ck.hidden = false;
    ck.addEventListener("click", function (e) {
      if (e.target.closest(".js-cookie-ok")) { ck.hidden = true; try { localStorage.setItem("iidd_cookie_ok", "1"); } catch (e2) {} }
    });
  }

  /* ---------- Фильтры каталога и библиотеки ---------- */
  $$(".filters").forEach(function (f) {
    var target = $(f.getAttribute("data-target")), attr = f.getAttribute("data-attr");
    $$(".opt", f).forEach(function (o) {
      o.addEventListener("click", function () {
        var v = o.getAttribute("data-v");
        $$(".opt", f).forEach(function (x) { x.setAttribute("aria-pressed", x === o ? "true" : "false"); });
        $$("[data-" + attr + "]", target).forEach(function (c) {
          var vals = (c.getAttribute("data-" + attr) || "").split(" ");
          c.classList.toggle("hide", v !== "all" && vals.indexOf(v) < 0 && vals.indexOf("any") < 0);
        });
      });
    });
  });
})();
