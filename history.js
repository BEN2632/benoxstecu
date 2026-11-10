/* ==========================================================================
   BenoxJK — Calculation History (LocalStorage)
   ========================================================================== */
(function (global) {
  'use strict';

  var KEY = 'benoxjk.history.v1';
  var LIMIT = 60;

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      var data = raw ? JSON.parse(raw) : [];
      return Array.isArray(data) ? data : [];
    } catch (e) { return []; }
  }

  function write(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* quota / private mode */ }
  }

  var History = {
    KEY: KEY,
    list: read,

    add: function (entry) {
      var list = read();
      var item = {
        id: 'h' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        type: entry.type || 'ipv4',
        title: entry.title || 'Perhitungan',
        input: entry.input || '',
        prefix: entry.prefix === 0 ? 0 : (entry.prefix || ''),
        summary: entry.summary || '',
        page: entry.page || '',
        query: entry.query || null,
        timestamp: new Date().toISOString()
      };
      list.unshift(item);
      if (list.length > LIMIT) list = list.slice(0, LIMIT);
      write(list);
      return item;
    },

    remove: function (id) {
      write(read().filter(function (item) { return item.id !== id; }));
    },

    clear: function () { write([]); },

    count: function () { return read().length; },

    toCSV: function () {
      var rows = [['Waktu', 'Modul', 'Input', 'Prefix', 'Ringkasan Hasil']];
      read().forEach(function (item) {
        rows.push([new Date(item.timestamp).toLocaleString('id-ID'), item.title, item.input, item.prefix, item.summary]);
      });
      return rows;
    }
  };

  global.BenoxHistory = History;

  /* --------------------------- Page controller -------------------------- */

  var ICONS = {
    ipv4: 'bi-globe',
    ipv6: 'bi-globe2',
    subnetting: 'bi-diagram-3',
    vlsm: 'bi-node-plus',
    planner: 'bi-signpost-split'
  };

  var LABELS = {
    ipv4: 'IPv4',
    ipv6: 'IPv6',
    subnetting: 'Subnetting',
    vlsm: 'VLSM',
    planner: 'IPv6 Planner'
  };

  function initHistoryPage() {
    var listEl = document.getElementById('historyList');
    if (!listEl) return;

    var searchEl = document.getElementById('historySearch');
    var filterEl = document.getElementById('historyFilter');
    var emptyEl = document.getElementById('historyEmpty');
    var clearBtn = document.getElementById('historyClear');
    var exportBtn = document.getElementById('historyExport');
    var countEl = document.getElementById('historyCount');

    function render() {
      var all = History.list();
      var q = (searchEl ? searchEl.value : '').trim().toLowerCase();
      var type = filterEl ? filterEl.value : 'all';

      var items = all.filter(function (item) {
        if (type !== 'all' && item.type !== type) return false;
        if (!q) return true;
        return (item.title + ' ' + item.input + ' ' + item.summary).toLowerCase().indexOf(q) !== -1;
      });

      if (countEl) countEl.textContent = all.length + ' tersimpan';
      if (clearBtn) clearBtn.disabled = all.length === 0;
      if (exportBtn) exportBtn.disabled = all.length === 0;

      if (!all.length) {
        listEl.innerHTML = '';
        emptyEl.classList.remove('d-none');
        emptyEl.innerHTML = '<div class="empty-icon"><i class="bi bi-clock-history"></i></div>' +
          '<h3>Riwayat masih kosong</h3><p>Hasil perhitungan akan tersimpan otomatis di sini setelah Anda memakai kalkulator.</p>' +
          '<a href="ipv4.html" class="btn-gradient btn-sm mt-3"><i class="bi bi-calculator"></i> Mulai Menghitung</a>';
        return;
      }

      emptyEl.classList.toggle('d-none', items.length > 0);
      if (!items.length) {
        emptyEl.innerHTML = '<div class="empty-icon"><i class="bi bi-search"></i></div>' +
          '<h3>Tidak ada hasil</h3><p>Tidak ada riwayat yang cocok dengan pencarian atau filter.</p>';
        listEl.innerHTML = '';
        return;
      }

      listEl.innerHTML = items.map(function (item) {
        return '<div class="history-item" data-id="' + item.id + '">' +
          '<span class="history-icon"><i class="bi ' + (ICONS[item.type] || 'bi-calculator') + '"></i></span>' +
          '<div class="history-main">' +
            '<div class="hi-title">' + escapeHtml(item.title) +
              ' <span class="badge-soft">' + (LABELS[item.type] || item.type) + '</span></div>' +
            '<div class="hi-input">' + escapeHtml(item.input || '-') + '</div>' +
            '<div class="hi-summary">' + escapeHtml(item.summary || '') + '</div>' +
            '<div class="hi-time"><i class="bi bi-clock"></i> ' + new Date(item.timestamp).toLocaleString('id-ID') + '</div>' +
          '</div>' +
          '<div class="history-actions">' +
            '<button type="button" class="icon-btn" data-rerun="' + item.id + '" title="Hitung ulang"><i class="bi bi-arrow-clockwise"></i></button>' +
            '<button type="button" class="icon-btn danger" data-delete="' + item.id + '" title="Hapus riwayat"><i class="bi bi-trash3"></i></button>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    listEl.addEventListener('click', function (e) {
      var del = e.target.closest('[data-delete]');
      if (del) {
        History.remove(del.getAttribute('data-delete'));
        render();
        BenoxApp.toast('Riwayat dihapus.', 'success');
        return;
      }

      var rerun = e.target.closest('[data-rerun]');
      if (rerun) {
        var item = History.list().filter(function (h) { return h.id === rerun.getAttribute('data-rerun'); })[0];
        if (!item) return;
        if (!item.page) { BenoxApp.toast('Riwayat ini tidak memiliki modul tujuan.', 'info'); return; }
        BenoxApp.go(item.page, item.query || undefined);
      }
    });

    if (searchEl) searchEl.addEventListener('input', render);
    if (filterEl) filterEl.addEventListener('change', render);

    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        if (!History.list().length) return;
        var modal = document.getElementById('clearHistoryModal');
        if (modal && global.bootstrap) bootstrap.Modal.getOrCreateInstance(modal).show();
      });
    }

    var confirmClear = document.getElementById('confirmClearHistory');
    if (confirmClear) {
      confirmClear.addEventListener('click', function () {
        History.clear();
        render();
        var modal = document.getElementById('clearHistoryModal');
        if (modal && global.bootstrap) bootstrap.Modal.getOrCreateInstance(modal).hide();
        BenoxApp.toast('Seluruh riwayat berhasil dihapus.', 'success');
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', function () {
        var rows = History.toCSV();
        if (rows.length <= 1) { BenoxApp.toast('Belum ada riwayat untuk diekspor.', 'warning'); return; }
        BenoxExport.csv('BenoxJK-Riwayat', rows);
        BenoxApp.toast('Riwayat diekspor ke CSV.', 'success');
      });
    }

    render();
  }

  function escapeHtml(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  document.addEventListener('DOMContentLoaded', initHistoryPage);
})(window);
