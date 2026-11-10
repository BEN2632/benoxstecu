/* ==========================================================================
   BenoxJK — Core Application Helpers
   ========================================================================== */
(function (global) {
  'use strict';

  var root = (global.BenoxNav && global.BenoxNav.root) || './';
  var App = {};

  /* ---------------------------- DOM helpers ----------------------------- */
  App.$ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  App.$$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  App.escape = function (str) {
    return String(str === null || str === undefined ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  /* ------------------------------- Toast -------------------------------- */
  var TOAST_ICONS = {
    success: 'bi-check-circle-fill',
    danger: 'bi-x-octagon-fill',
    warning: 'bi-exclamation-triangle-fill',
    info: 'bi-info-circle-fill'
  };

  App.toast = function (message, type) {
    type = TOAST_ICONS[type] ? type : 'info';
    var wrap = document.getElementById('toastContainer');
    if (!wrap) return;
    var el = document.createElement('div');
    el.className = 'toast benox-toast toast-' + type;
    el.setAttribute('role', 'alert');
    el.setAttribute('aria-live', 'assertive');
    el.setAttribute('aria-atomic', 'true');
    el.innerHTML =
      '<div class="d-flex align-items-start">' +
        '<div class="toast-body">' +
          '<i class="bi ' + TOAST_ICONS[type] + ' toast-icon"></i>' +
          '<span class="toast-message"></span>' +
        '</div>' +
        '<button type="button" class="btn-close btn-close-white me-3 mt-3" data-bs-dismiss="toast" aria-label="Tutup"></button>' +
      '</div>';
    el.querySelector('.toast-message').textContent = message;
    wrap.appendChild(el);
    var instance = global.bootstrap ? bootstrap.Toast.getOrCreateInstance(el, { delay: 3200 }) : null;
    if (instance) instance.show();
    el.addEventListener('hidden.bs.toast', function () { el.remove(); });
    if (!instance) setTimeout(function () { el.remove(); }, 3200);
  };

  /* ------------------------------- Copy --------------------------------- */
  App.copy = function (text, label) {
    var value = String(text === null || text === undefined ? '' : text);
    var done = function () { App.toast((label || 'Nilai') + ' berhasil disalin.', 'success'); };
    var fail = function () { App.toast('Gagal menyalin. Salin manual dari hasil.', 'danger'); };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(value).then(done).catch(function () { fallback(); });
    } else {
      fallback();
    }

    function fallback() {
      try {
        var ta = document.createElement('textarea');
        ta.value = value;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        if (ok) done(); else fail();
      } catch (e) { fail(); }
    }
  };

  /* ------------------------------ Download ------------------------------ */
  App.download = function (filename, content, mime) {
    var blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 800);
  };

  /* ------------------------------- Clock -------------------------------- */
  function tickClock() {
    var el = document.getElementById('liveClock');
    if (!el) return;
    var now = new Date();
    el.textContent = now.toLocaleTimeString('id-ID', { hour12: false });
  }

  /* ------------------------------ Sidebar ------------------------------- */
  function setSidebar(open) {
    var desktop = window.innerWidth >= 992;
    document.body.classList.toggle('sidebar-collapsed', !open && desktop);
    document.body.classList.toggle('nav-open', open && !desktop);
    var toggle = document.getElementById('sidebarToggle');
    if (toggle) toggle.setAttribute('aria-expanded', String(open));
    if (desktop) {
      try { localStorage.setItem('benoxjk.sidebar', open ? 'open' : 'collapsed'); } catch (e) { /* ignore */ }
    }
  }

  function sidebarIsOpen() {
    if (window.innerWidth < 992) return document.body.classList.contains('nav-open');
    return !document.body.classList.contains('sidebar-collapsed');
  }

  /* --------------------------- Date formatting -------------------------- */
  App.formatDate = function (iso) {
    try {
      return new Date(iso).toLocaleString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch (e) { return iso; }
  };

  /* --------------------------- Table helper ----------------------------- */
  /**
   * Membuat tabel dengan pencarian + pagination.
   * opts: { tbody, pagination, pageSize, rowRenderer(row), searchInput, searchText(row), emptyHtml }
   */
  App.createTable = function (opts) {
    var state = { data: opts.data || [], page: 1, query: '' };
    var pageSize = opts.pageSize || 10;
    var tbody = typeof opts.tbody === 'string' ? document.getElementById(opts.tbody) : opts.tbody;
    var paginationEl = typeof opts.pagination === 'string' ? document.getElementById(opts.pagination) : opts.pagination;
    var searchEl = typeof opts.searchInput === 'string' ? document.getElementById(opts.searchInput) : opts.searchInput;
    var infoEl = opts.info ? (typeof opts.info === 'string' ? document.getElementById(opts.info) : opts.info) : null;

    function filtered() {
      if (!state.query) return state.data;
      var q = state.query.toLowerCase();
      return state.data.filter(function (row, i) {
        var text = opts.searchText ? opts.searchText(row, i) : JSON.stringify(row);
        return String(text).toLowerCase().indexOf(q) !== -1;
      });
    }

    function render() {
      if (!tbody) return;
      var rows = filtered();
      var totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
      if (state.page > totalPages) state.page = totalPages;
      var start = (state.page - 1) * pageSize;
      var slice = rows.slice(start, start + pageSize);

      if (!slice.length) {
        tbody.innerHTML = '<tr><td colspan="' + (opts.colspan || 9) + '">' +
          '<div class="table-empty"><i class="bi bi-inbox"></i><span>' + (opts.emptyHtml || 'Tidak ada data yang cocok.') + '</span></div>' +
          '</td></tr>';
      } else {
        tbody.innerHTML = slice.map(function (row, i) { return opts.rowRenderer(row, start + i); }).join('');
      }

      if (infoEl) {
        infoEl.textContent = rows.length
          ? 'Menampilkan ' + (start + 1) + '–' + Math.min(start + pageSize, rows.length) + ' dari ' + rows.length + ' baris'
          : 'Tidak ada baris';
      }

      if (paginationEl) {
        if (totalPages <= 1) {
          paginationEl.innerHTML = '';
        } else {
          var html = '<button class="page-btn" data-page="' + (state.page - 1) + '"' + (state.page === 1 ? ' disabled' : '') + ' aria-label="Sebelumnya"><i class="bi bi-chevron-left"></i></button>';
          var pages = [];
          var from = Math.max(1, state.page - 2), to = Math.min(totalPages, from + 4);
          from = Math.max(1, to - 4);
          for (var p = from; p <= to; p++) pages.push(p);
          if (from > 1) {
            html += '<button class="page-btn" data-page="1">1</button>';
            if (from > 2) html += '<span class="page-dots">…</span>';
          }
          pages.forEach(function (p) {
            html += '<button class="page-btn' + (p === state.page ? ' active' : '') + '" data-page="' + p + '">' + p + '</button>';
          });
          if (to < totalPages) {
            if (to < totalPages - 1) html += '<span class="page-dots">…</span>';
            html += '<button class="page-btn" data-page="' + totalPages + '">' + totalPages + '</button>';
          }
          html += '<button class="page-btn" data-page="' + (state.page + 1) + '"' + (state.page === totalPages ? ' disabled' : '') + ' aria-label="Berikutnya"><i class="bi bi-chevron-right"></i></button>';
          paginationEl.innerHTML = html;
        }
      }
    }

    if (paginationEl) {
      paginationEl.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-page]');
        if (!btn || btn.disabled) return;
        state.page = parseInt(btn.getAttribute('data-page'), 10);
        render();
      });
    }

    if (searchEl) {
      searchEl.addEventListener('input', function () {
        state.query = searchEl.value.trim();
        state.page = 1;
        render();
      });
    }

    render();

    return {
      render: render,
      setData: function (data) { state.data = data; state.page = 1; render(); },
      getData: function () { return state.data; }
    };
  };

  /* ---------------------------- Result helpers -------------------------- */
  App.row = function (label, value, opts) {
    opts = opts || {};
    var copy = opts.copy === false ? '' :
      '<button class="copy-btn" data-copy="' + App.escape(value) + '" data-label="' + App.escape(label) + '" title="Salin ' + App.escape(label) + '"><i class="bi bi-clipboard"></i></button>';
    return '<div class="result-row' + (opts.className ? ' ' + opts.className : '') + '">' +
      '<span class="result-label">' + label + '</span>' +
      '<span class="result-value' + (opts.mono === false ? '' : ' mono') + '">' + value + '</span>' +
      copy +
    '</div>';
  };

  App.tone = function (tone, text) {
    return '<span class="tone tone-' + tone + '">' + text + '</span>';
  };

  /* ----------------------------- URL params ----------------------------- */
  App.param = function (name) {
    try { return new URLSearchParams(window.location.search).get(name); } catch (e) { return null; }
  };

  App.go = function (path, params) {
    var url = root + path;
    if (params) {
      var q = new URLSearchParams(params).toString();
      if (q) url += '?' + q;
    }
    window.location.href = url;
  };

  /* ------------------------------ Init ---------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    tickClock();
    setInterval(tickClock, 1000);

    // Restore desktop sidebar preference
    try {
      if (localStorage.getItem('benoxjk.sidebar') === 'collapsed') {
        document.body.classList.add('sidebar-collapsed');
        var tg = document.getElementById('sidebarToggle');
        if (tg) tg.setAttribute('aria-expanded', 'false');
      }
    } catch (e) { /* ignore */ }

    document.addEventListener('click', function (e) {
      if (e.target.closest('#sidebarToggle')) { setSidebar(!sidebarIsOpen()); }
      if (e.target.closest('#sidebarClose') || e.target.closest('#sidebarBackdrop')) {
        document.body.classList.remove('nav-open');
        document.body.classList.remove('sidebar-collapsed');
        var tg = document.getElementById('sidebarToggle');
        if (tg) tg.setAttribute('aria-expanded', 'false');
      }
      var copyBtn = e.target.closest('[data-copy]');
      if (copyBtn) {
        e.preventDefault();
        App.copy(copyBtn.getAttribute('data-copy'), copyBtn.getAttribute('data-label') || 'Nilai');
      }
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth >= 992) document.body.classList.remove('nav-open');
    });

    if (global.bootstrap) {
      App.$$('[data-bs-toggle="tooltip"]').forEach(function (el) {
        bootstrap.Tooltip.getOrCreateInstance(el);
      });
    }
  });

  global.BenoxApp = App;
})(window);
