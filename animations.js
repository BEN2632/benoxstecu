/* ==========================================================================
   BenoxJK — Animations & Interactions
   ========================================================================== */
(function (global) {
  'use strict';

  var reduceMotion = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------- Animated network background ------------------- */
  function initNetworkCanvas() {
    var canvas = document.getElementById('networkCanvas');
    if (!canvas || reduceMotion) return;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var width = 0, height = 0, dpr = Math.min(global.devicePixelRatio || 1, 2);
    var nodes = [];
    var mouse = { x: -1000, y: -1000 };
    var running = true;
    var COLORS = ['59,130,246', '6,182,212', '139,92,246'];

    function resize() {
      width = canvas.clientWidth || global.innerWidth;
      height = canvas.clientHeight || global.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildNodes();
    }

    function buildNodes() {
      var count = Math.round(Math.min(78, Math.max(28, (width * height) / 26000)));
      nodes = [];
      for (var i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.28,
          vy: (Math.random() - 0.5) * 0.28,
          r: Math.random() * 1.8 + 0.8,
          color: COLORS[i % COLORS.length],
          phase: Math.random() * Math.PI * 2
        });
      }
    }

    function draw(time) {
      if (!running) return;
      ctx.clearRect(0, 0, width, height);

      var linkDist = width < 768 ? 110 : 150;
      for (var i = 0; i < nodes.length; i++) {
        var a = nodes[i];
        a.x += a.vx;
        a.y += a.vy;
        if (a.x < -20) a.x = width + 20;
        if (a.x > width + 20) a.x = -20;
        if (a.y < -20) a.y = height + 20;
        if (a.y > height + 20) a.y = -20;

        for (var j = i + 1; j < nodes.length; j++) {
          var b = nodes[j];
          var dx = a.x - b.x, dy = a.y - b.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < linkDist) {
            var alpha = (1 - dist / linkDist) * 0.16;
            ctx.strokeStyle = 'rgba(59,130,246,' + alpha.toFixed(3) + ')';
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }

        var mdx = a.x - mouse.x, mdy = a.y - mouse.y;
        var mdist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mdist < 170) {
          ctx.strokeStyle = 'rgba(6,182,212,' + ((1 - mdist / 170) * 0.24).toFixed(3) + ')';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }

        var twinkle = 0.45 + Math.sin(time / 1400 + a.phase) * 0.25;
        ctx.beginPath();
        ctx.fillStyle = 'rgba(' + a.color + ',' + twinkle.toFixed(2) + ')';
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = 'rgba(' + a.color + ',0.07)';
        ctx.arc(a.x, a.y, a.r * 5, 0, Math.PI * 2);
        ctx.fill();
      }
      requestAnimationFrame(draw);
    }

    global.addEventListener('mousemove', function (e) { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
    global.addEventListener('mouseout', function () { mouse.x = -1000; mouse.y = -1000; });
    global.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', function () {
      running = !document.hidden;
      if (running) requestAnimationFrame(draw);
    });

    resize();
    requestAnimationFrame(draw);
  }

  /* ----------------------------- Scroll reveal -------------------------- */
  function initReveal() {
    var items = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
    if (!items.length) return;

    if (reduceMotion || !('IntersectionObserver' in global)) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    items.forEach(function (el, i) {
      el.style.transitionDelay = Math.min(i * 40, 240) + 'ms';
      observer.observe(el);
    });
  }

  /* --------------------------- Animated counters ------------------------ */
  function initCounters() {
    var counters = Array.prototype.slice.call(document.querySelectorAll('[data-count-to]'));
    if (!counters.length) return;

    function animate(el) {
      var target = parseFloat(el.getAttribute('data-count-to'));
      var suffix = el.getAttribute('data-count-suffix') || '';
      if (isNaN(target)) return;
      if (reduceMotion) { el.textContent = target.toLocaleString('id-ID') + suffix; return; }
      var duration = 1400;
      var start = null;
      function frame(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased).toLocaleString('id-ID') + suffix;
        if (p < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }

    if (!('IntersectionObserver' in global)) {
      counters.forEach(animate);
      return;
    }
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { animate(entry.target); obs.unobserve(entry.target); }
      });
    }, { threshold: 0.4 });
    counters.forEach(function (el) { obs.observe(el); });
  }

  /* ------------------------------ Ripple -------------------------------- */
  function initRipple() {
    if (reduceMotion) return;
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.btn-gradient, .btn-ghost, .btn-tool, .nav-item');
      if (!btn || btn.classList.contains('disabled')) return;
      var rect = btn.getBoundingClientRect();
      var size = Math.max(rect.width, rect.height);
      var span = document.createElement('span');
      span.className = 'ripple';
      span.style.width = span.style.height = size + 'px';
      span.style.left = (e.clientX - rect.left - size / 2) + 'px';
      span.style.top = (e.clientY - rect.top - size / 2) + 'px';
      btn.appendChild(span);
      setTimeout(function () { span.remove(); }, 650);
    });
  }

  /* -------------------------- Page enter effect ------------------------- */
  function initPageEnter() {
    document.documentElement.classList.add('js-ready');
  }

  /* ------------------------- Loading button helper ---------------------- */
  global.BenoxLoading = {
    start: function (btn, text) {
      if (!btn) return;
      btn.dataset.originalHtml = btn.innerHTML;
      btn.disabled = true;
      btn.classList.add('is-loading');
      btn.innerHTML = '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span><span>' + (text || 'Menghitung…') + '</span>';
    },
    stop: function (btn) {
      if (!btn) return;
      btn.disabled = false;
      btn.classList.remove('is-loading');
      if (btn.dataset.originalHtml) btn.innerHTML = btn.dataset.originalHtml;
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    initPageEnter();
    initNetworkCanvas();
    initReveal();
    initCounters();
    initRipple();
  });
})(window);
