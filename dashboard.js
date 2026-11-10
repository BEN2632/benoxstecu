/* ==========================================================================
   BenoxJK — Dashboard Controller
   ========================================================================== */
(function () {
  'use strict';

  var ICONS = {
    ipv4: 'bi-globe',
    ipv6: 'bi-globe2',
    subnetting: 'bi-diagram-3',
    vlsm: 'bi-node-plus',
    planner: 'bi-signpost-split'
  };

  var PAGE_LABEL = {
    ipv4: 'IPv4 Calculator',
    ipv6: 'IPv6 Calculator',
    subnetting: 'Subnetting Calculator',
    vlsm: 'VLSM Calculator',
    planner: 'IPv6 Prefix Planner'
  };

  function timeAgo(iso) {
    var diff = Date.now() - new Date(iso).getTime();
    var mins = Math.floor(diff / 60000);
    if (mins < 1) return 'baru saja';
    if (mins < 60) return mins + ' menit lalu';
    var hours = Math.floor(mins / 60);
    if (hours < 24) return hours + ' jam lalu';
    var days = Math.floor(hours / 24);
    if (days < 7) return days + ' hari lalu';
    return BenoxApp.formatDate(iso);
  }

  function renderRecent() {
    var mount = document.getElementById('recentList');
    if (!mount) return;
    var list = BenoxHistory.list().slice(0, 5);

    if (!list.length) {
      mount.innerHTML = '<div class="recent-empty"><i class="bi bi-inbox"></i>' +
        '<div><strong style="color:#cbd5e1;font-weight:500">Belum ada perhitungan</strong><br>' +
        'Coba Quick Calculator di samping untuk memulai.</div></div>';
      return;
    }

    mount.innerHTML = list.map(function (item) {
      return '<button type="button" class="recent-row" data-history-id="' + item.id + '">' +
        '<span class="rr-icon"><i class="bi ' + (ICONS[item.type] || 'bi-calculator') + '"></i></span>' +
        '<span class="rr-main">' +
          '<span class="rr-input">' + BenoxApp.escape(item.input || item.title) + '</span>' +
          '<span class="rr-meta">' + BenoxApp.escape(item.summary || '') + '</span>' +
        '</span>' +
        '<span class="rr-time">' + timeAgo(item.timestamp) + '</span>' +
      '</button>';
    }).join('');

    mount.querySelectorAll('[data-history-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var item = BenoxHistory.list().filter(function (h) { return h.id === btn.getAttribute('data-history-id'); })[0];
        if (!item) return;
        if (!item.page) { BenoxApp.toast('Riwayat ini tidak memiliki modul tujuan.', 'info'); return; }
        BenoxApp.go(item.page, item.query || undefined);
      });
    });
  }

  function renderQuick(result) {
    var mount = document.getElementById('quickResult');
    if (!mount) return;
    var d = result.data;
    mount.innerHTML =
      '<div class="qr-head">' +
        '<span><i class="bi bi-check-circle-fill"></i> ' + d.input + '</span>' +
        '<a href="pages/ipv4.html?ip=' + encodeURIComponent(d.address) + '&prefix=' + d.prefix + '" class="text-decoration-none">Hasil lengkap <i class="bi bi-arrow-right"></i></a>' +
      '</div>' +
      '<div class="qr-grid">' +
        '<div class="qr-item"><span class="k">Network</span><span class="v">' + d.network + '</span></div>' +
        '<div class="qr-item"><span class="k">Broadcast</span><span class="v">' + d.broadcast + '</span></div>' +
        '<div class="qr-item"><span class="k">Host Range</span><span class="v">' + d.firstHost + ' – ' + d.lastHost + '</span></div>' +
        '<div class="qr-item"><span class="k">Subnet Mask</span><span class="v">' + d.mask + '</span></div>' +
        '<div class="qr-item"><span class="k">Usable Host</span><span class="v">' + BenoxUtils.formatNumber(d.usable) + '</span></div>' +
        '<div class="qr-item"><span class="k">Kelas / Tipe</span><span class="v">' + d.ipClass + ' • ' + d.ipType + '</span></div>' +
      '</div>';
    mount.classList.remove('d-none');
    mount.classList.add('result-enter');
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderRecent();

    var form = document.getElementById('quickForm');
    var input = document.getElementById('quickInput');
    var errorEl = document.getElementById('quickError');
    var errorText = document.getElementById('quickErrorText');
    if (!form) return;

    function showError(message) {
      errorText.textContent = message;
      errorEl.classList.add('show');
      input.classList.add('is-invalid');
      document.getElementById('quickResult').classList.add('d-none');
    }

    function clearError() {
      errorEl.classList.remove('show');
      input.classList.remove('is-invalid');
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      clearError();
      var raw = input.value.trim();
      if (!raw) { showError('Masukkan IP/CIDR, contoh: 192.168.1.10/24'); return; }
      var result = BenoxIPv4.calculateFromInputs(raw, '', '');
      if (!result.ok) { showError(result.error); return; }

      var d = result.data;
      renderQuick(result);
      BenoxHistory.add({
        type: 'ipv4',
        title: 'IPv4 Calculator',
        input: d.input,
        prefix: d.prefix,
        summary: 'NA ' + d.network + ' • BOARD ' + d.broadcast + ' • ' + BenoxUtils.formatNumber(d.usable) + ' host usable',
        page: 'pages/ipv4.html',
        query: { ip: d.address, prefix: d.prefix }
      });
      renderRecent();
      BenoxApp.toast('Hasil quick calculator siap.', 'success');
    });

    input.addEventListener('input', clearError);

    document.querySelectorAll('[data-quick]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        input.value = chip.getAttribute('data-quick');
        clearError();
        input.focus();
      });
    });
  });
})();
