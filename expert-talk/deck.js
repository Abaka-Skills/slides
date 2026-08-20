/* ============================================================
   Abaka Open Day deck — slider engine
   One slide at a time. Advance: click, →/↓/Space/PageDown, swipe up.
   Back: ←/↑/PageUp, swipe down. F or button: fullscreen.
   URL: ?slide=N jumps straight to slide N (1-based) — used by the
   headless render check.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- watermark tile (icons style, fixed settings) ---------- */
  var ICON_DEFS =
    "<g id='h'><rect x='-30' y='-20' width='60' height='40' rx='12'/><path d='M0 -20V-32'/><circle cx='0' cy='-38' r='5'/><circle cx='-10' cy='2' r='4'/><circle cx='10' cy='2' r='4'/></g>" +
    "<g id='g'><circle r='15'/><path d='M0 -29v8M0 21v8M-29 0h8M21 0h8M-20 -20l5.5 5.5M14.5 14.5l5.5 5.5M20 -20l-5.5 5.5M-14.5 14.5l-5.5 5.5'/></g>" +
    "<g id='c'><path d='M-20 10V-8H20V10M-13 10v12M13 10v12M0 -8V-20'/><circle cx='0' cy='-27' r='6'/></g>" +
    "<g id='r'><path d='M-22 22L0 -6L24 -14'/><circle cx='-22' cy='22' r='5.5'/><circle cx='0' cy='-6' r='5.5'/><circle cx='24' cy='-14' r='5.5'/></g>" +
    "<g id='n'><path d='M18 0L9 15.6L-9 15.6L-18 0L-9 -15.6L9 -15.6Z'/><circle r='7'/></g>" +
    "<g id='p'><rect x='-16' y='-16' width='32' height='32' rx='4'/><path d='M-16 -8h-8M-16 8h-8M16 -8h8M16 8h8M-8 -16v-8M8 -16v-8M-8 16v8M8 16v8'/></g>" +
    "<g id='e'><circle r='16'/><circle r='5'/></g>" +
    "<g id='j'><path d='M-18 20H18M0 20V-6'/><circle cx='0' cy='-14' r='8'/></g>" +
    "<g id='s'><circle cx='0' cy='16' r='4'/><path d='M-8 8A11.3 11.3 0 0 1 8 8M-15 1A21.2 21.2 0 0 1 15 1'/></g>";
  var USES = [
    ['h',60,55,-9],['g',185,40,22,.85],['p',305,78,11],['c',418,48,-14,.9],
    ['s',118,158,6],['r',252,172,-12],['n',396,178,24,.9],['j',48,262,9],
    ['e',172,292,0,.85],['h',312,300,15,.8],['g',428,262,-28],['c',86,392,13,.85],
    ['n',222,420,-18,.8],['r',362,408,28,.9]
  ];
  function wmTile() {
    var uses = USES.map(function (u) {
      return "<use href='#" + u[0] + "' transform='translate(" + u[1] + " " + u[2] + ")" +
        (u[3] ? " rotate(" + u[3] + ")" : "") + " scale(" + (u[4] || 1) + ")'/>";
    }).join('');
    var svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 480 480'><defs>" + ICON_DEFS +
      "</defs><g fill='none' stroke='#000' stroke-width='7' stroke-linecap='round' stroke-linejoin='round'>" +
      uses + "</g></svg>";
    return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
  }
  document.documentElement.style.setProperty('--wm-svg', wmTile());

  /* ---------- collect slides ---------- */
  var stage = document.querySelector('.stage');
  var slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
  var cur = 0;

  /* ---------- scale stage to window ---------- */
  function fit() {
    var s = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
    stage.style.transform = 'scale(' + s + ')';
  }
  window.addEventListener('resize', fit);
  fit();

  /* ---------- media management: only the active slide plays ---------- */
  function mediaOn(slide) {
    slide.querySelectorAll('video').forEach(function (v) {
      v.muted = true; v.loop = true; v.playsInline = true;
      var start = parseFloat(v.dataset.start || '0');
      if (start > 0) {
        if (v.currentTime < start) { try { v.currentTime = start; } catch (e) {} }
        if (!v._startHooked) {
          v._startHooked = true;
          v.addEventListener('timeupdate', function () {
            if (v.currentTime < start - 0.4) { try { v.currentTime = start; } catch (e) {} }
          });
        }
      }
      var p = v.play(); if (p) p.catch(function () {});
    });
    /* lazy iframes: swap data-src in on first activation */
    slide.querySelectorAll('iframe[data-src]').forEach(function (f) {
      f.src = f.getAttribute('data-src');
      f.removeAttribute('data-src');
    });
  }
  function mediaOff(slide) {
    slide.querySelectorAll('video').forEach(function (v) { v.pause(); });
    if (slide.querySelector('#panda-gl') && window._pandaHandle) window._pandaHandle.stop();
  }

  /* lazy-load the in-slide 3D Panda (heavy mesh data) on first visit */
  var pandaLoading = false;
  function ensurePanda(slide) {
    var cnv = slide.querySelector('#panda-gl');
    if (!cnv) return;
    if (window._pandaHandle) { window._pandaHandle.start(); return; }
    if (pandaLoading) return;
    pandaLoading = true;
    var srcs = ['embeds/assets/three.min.js', 'embeds/assets/ColladaLoader.js',
                'embeds/assets/panda-data.js', 'embeds/panda-slide.js'];
    (function load(i) {
      if (i >= srcs.length) {
        window._pandaHandle = window.initPandaSlide(cnv);
        window._pandaHandle.start();
        return;
      }
      var sc = document.createElement('script');
      sc.src = srcs[i];
      sc.onload = function () { load(i + 1); };
      document.head.appendChild(sc);
    })(0);
  }

  /* ---------- typewriter (elements with data-type) ---------- */
  function typewrite(slide) {
    slide.querySelectorAll('[data-type]').forEach(function (el) {
      var full = el.getAttribute('data-type');
      el.textContent = '';
      var i = 0;
      clearInterval(el._tw);
      el._tw = setInterval(function () {
        el.textContent = full.slice(0, ++i);
        if (i >= full.length) clearInterval(el._tw);
      }, 55);
    });
  }

  /* ---------- navigation ---------- */
  var cnt = document.querySelector('.hud .cnt');
  var bar = document.querySelector('.progress i');
  function show(n, instant) {
    n = Math.max(0, Math.min(slides.length - 1, n));
    if (n === cur && !instant) return;
    var prev = slides[cur];
    if (typeof closeZoom === 'function') closeZoom();
    prev.classList.remove('active');
    prev.classList.add('leaving');
    mediaOff(prev);
    setTimeout(function () { prev.classList.remove('leaving'); }, 500);
    cur = n;
    var s = slides[cur];
    s.classList.add('active');
    mediaOn(s);
    ensurePanda(s);
    typewrite(s);
    if (cnt) cnt.textContent = (cur + 1) + ' / ' + slides.length;
    if (bar) bar.style.width = ((cur + 1) / slides.length * 100) + '%';
    if (history.replaceState) history.replaceState(null, '', '?slide=' + (cur + 1));
  }
  function next() { show(cur + 1); }
  function back() { show(cur - 1); }

  /* video-wall lightbox: click a tile to zoom it out (with sound); click again to close */
  function closeZoom() {
    document.querySelectorAll('.a-wall .tile.zoomed').forEach(function (t) {
      t.classList.remove('zoomed');
      var v = t.querySelector('video'); if (v) v.muted = true;
    });
    document.querySelectorAll('.a-wall .tiles.haszoom').forEach(function (t) { t.classList.remove('haszoom'); });
    document.querySelectorAll('.wall-dim.on').forEach(function (d) { d.classList.remove('on'); });
  }
  document.querySelectorAll('.a-wall').forEach(function (wall) {
    var dim = document.createElement('div');
    dim.className = 'wall-dim';
    wall.appendChild(dim);
  });

  /* click advances — but not on interactive things */
  document.addEventListener('click', function (e) {
    var tile = e.target.closest('.a-wall .tile');
    if (tile) {
      var was = tile.classList.contains('zoomed');
      closeZoom();
      if (!was) {
        tile.classList.add('zoomed');
        var tl = tile.closest('.tiles'); if (tl) tl.classList.add('haszoom');
        var dim = tile.closest('.a-wall').querySelector('.wall-dim');
        if (dim) dim.classList.add('on');
        var v = tile.querySelector('video'); if (v) { v.muted = false; var p = v.play(); if (p) p.catch(function(){}); }
      }
      return;
    }
    if (e.target.closest('.wall-dim')) { closeZoom(); return; }
    if (document.querySelector('.a-wall .tile.zoomed')) { closeZoom(); return; }
    if (e.target.closest('.hud, a, iframe, button, canvas, video[controls]')) return;
    next();
  });

  document.addEventListener('keydown', function (e) {
    if (['ArrowRight', 'ArrowDown', ' ', 'PageDown'].indexOf(e.key) >= 0) { e.preventDefault(); next(); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp'].indexOf(e.key) >= 0) { e.preventDefault(); back(); }
    else if (e.key === 'f' || e.key === 'F') { toggleFS(); }
    else if (e.key === 'Home') { show(0); }
    else if (e.key === 'End') { show(slides.length - 1); }
  });

  /* swipe: up = next, down = back */
  var ty = null;
  document.addEventListener('touchstart', function (e) { ty = e.touches[0].clientY; }, { passive: true });
  document.addEventListener('touchend', function (e) {
    if (ty === null) return;
    var dy = e.changedTouches[0].clientY - ty;
    if (dy < -40) next(); else if (dy > 40) back();
    ty = null;
  }, { passive: true });

  /* wheel: one step per gesture */
  var wheelLock = false;
  document.addEventListener('wheel', function (e) {
    if (wheelLock) return;
    if (Math.abs(e.deltaY) < 24) return;
    wheelLock = true;
    setTimeout(function () { wheelLock = false; }, 650);
    if (e.deltaY > 0) next(); else back();
  }, { passive: true });

  /* ---------- fullscreen ---------- */
  function toggleFS() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  }
  var fsBtn = document.querySelector('.hud .fs');
  if (fsBtn) fsBtn.addEventListener('click', function (e) { e.stopPropagation(); toggleFS(); });
  var pBtn = document.querySelector('.hud .prev');
  var nBtn = document.querySelector('.hud .next');
  if (pBtn) pBtn.addEventListener('click', function (e) { e.stopPropagation(); back(); });
  if (nBtn) nBtn.addEventListener('click', function (e) { e.stopPropagation(); next(); });

  /* ---------- hud idle fade ---------- */
  var hud = document.querySelector('.hud');
  var prog = document.querySelector('.progress');
  var idleT = null;
  function wake() {
    if (hud) hud.classList.remove('idle');
    if (prog) prog.classList.remove('idle');
    clearTimeout(idleT);
    idleT = setTimeout(function () {
      if (hud) hud.classList.add('idle');
      if (prog) prog.classList.add('idle');
    }, 2500);
  }
  ['mousemove', 'keydown', 'touchstart'].forEach(function (ev) {
    document.addEventListener(ev, wake, { passive: true });
  });
  wake();

  /* ---------- boot ---------- */
  var q = new URLSearchParams(location.search);
  var start = parseInt(q.get('slide') || '1', 10) - 1;
  if (isNaN(start)) start = 0;
  slides.forEach(function (s) { s.classList.remove('active'); });
  cur = Math.max(0, Math.min(slides.length - 1, start));
  slides[cur].classList.add('active');
  mediaOn(slides[cur]);
  ensurePanda(slides[cur]);
  typewrite(slides[cur]);
  if (cnt) cnt.textContent = (cur + 1) + ' / ' + slides.length;
  if (bar) bar.style.width = ((cur + 1) / slides.length * 100) + '%';
})();
