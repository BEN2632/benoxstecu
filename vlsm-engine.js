/* ==========================================================================
   BenoxJK — VLSM Engine
   Alokasi subnet tidak sama besar, diurutkan dari kebutuhan host terbesar.
   ========================================================================== */
(function (global) {
  'use strict';

  var U = global.BenoxUtils;

  function usableOf(prefix) {
    if (prefix === 32) return 1;
    if (prefix === 31) return 2;
    return Math.pow(2, 32 - prefix) - 2;
  }

  function nextPow2(n) {
    var p = 1;
    while (p < n) p *= 2;
    return p;
  }

  function parseBase(networkRaw, prefixRaw) {
    var raw = (networkRaw || '').trim();
    if (!raw) return { ok: false, error: 'Masukkan network address utama.', field: 'network' };
    var slash = null;
    if (raw.indexOf('/') !== -1) {
      var parts = raw.split('/');
      if (parts.length !== 2) return { ok: false, error: 'Format CIDR tidak valid.', field: 'network' };
      raw = parts[0].trim();
      if (!/^\d{1,2}$/.test(parts[1].trim())) return { ok: false, error: 'Prefix CIDR harus 0-32.', field: 'network' };
      slash = parseInt(parts[1], 10);
    }
    var parsed = U.parseIPv4(raw);
    if (!parsed.ok) return { ok: false, error: parsed.error, field: 'network' };

    var prefix;
    if (slash !== null) prefix = slash;
    else {
      if (prefixRaw === null || prefixRaw === undefined || String(prefixRaw).trim() === '') {
        return { ok: false, error: 'Isi prefix jaringan utama.', field: 'prefix' };
      }
      if (!/^\d{1,2}$/.test(String(prefixRaw).trim())) return { ok: false, error: 'Prefix harus angka 0-32.', field: 'prefix' };
      prefix = parseInt(prefixRaw, 10);
    }
    if (prefix < 0 || prefix > 32) return { ok: false, error: 'Prefix harus berada pada 0-32.', field: 'prefix' };

    var maskInt = U.prefixToMaskInt(prefix);
    var networkInt = (parsed.value & maskInt) >>> 0;
    return {
      ok: true,
      networkInt: networkInt,
      prefix: prefix,
      mask: U.intToIPv4(maskInt),
      base: U.intToIPv4(networkInt),
      size: Math.pow(2, 32 - prefix),
      broadcastInt: (networkInt + Math.pow(2, 32 - prefix) - 1) >>> 0
    };
  }

  /**
   * @param {string} networkRaw
   * @param {string} prefixRaw
   * @param {{name:string, hosts:number|string}[]} requirements
   */
  function generate(networkRaw, prefixRaw, requirements) {
    var base = parseBase(networkRaw, prefixRaw);
    if (!base.ok) return base;

    if (!Array.isArray(requirements) || !requirements.length) {
      return { ok: false, error: 'Tambahkan minimal satu subnet beserta jumlah host.', field: 'rows' };
    }

    var cleaned = [];
    for (var i = 0; i < requirements.length; i++) {
      var item = requirements[i] || {};
      var name = String(item.name || '').trim() || 'Subnet ' + (i + 1);
      var hostsRaw = String(item.hosts === undefined || item.hosts === null ? '' : item.hosts).trim();
      if (!hostsRaw) return { ok: false, error: 'Jumlah host untuk "' + name + '" belum diisi.', field: 'rows' };
      if (!/^\d+$/.test(hostsRaw)) return { ok: false, error: 'Jumlah host untuk "' + name + '" harus bilangan bulat positif.', field: 'rows' };
      var hosts = parseInt(hostsRaw, 10);
      if (hosts < 1) return { ok: false, error: 'Jumlah host untuk "' + name + '" minimal 1.', field: 'rows' };
      if (hosts > base.size) {
        return { ok: false, error: 'Kebutuhan "' + name + '" (' + U.formatNumber(hosts) + ' host) melebihi kapasitas jaringan induk /' + base.prefix + '.', field: 'rows' };
      }
      cleaned.push({ name: name, hosts: hosts, order: i });
    }

    // Urutan alokasi: kebutuhan host terbesar lebih dulu.
    var ordered = cleaned.slice().sort(function (a, b) {
      return b.hosts - a.hosts || a.order - b.order;
    });

    var cursor = base.networkInt;
    var rows = [];
    var totalAllocated = 0;

    for (var j = 0; j < ordered.length; j++) {
      var req = ordered[j];
      var need = req.hosts + 2;
      var size = nextPow2(need);
      var hostBits = Math.log2(size);
      var prefix = 32 - hostBits;

      if (prefix < base.prefix) {
        // Jaringan induk /31 atau /32 tetap bisa dipakai jika kapasitasnya cukup.
        if (base.prefix >= 31 && req.hosts <= usableOf(base.prefix)) {
          prefix = base.prefix;
          size = Math.pow(2, 32 - prefix);
        } else {
          return {
            ok: false,
            error: '"' + req.name + '" membutuhkan blok /' + prefix + ' yang lebih besar dari jaringan induk /' + base.prefix + '.',
            field: 'rows'
          };
        }
      }

      var start = Math.ceil(cursor / size) * size;
      var end = start + size - 1;

      if (end > base.broadcastInt) {
        var remaining = Math.max(0, base.broadcastInt - cursor + 1);
        return {
          ok: false,
          error: 'Kapasitas jaringan induk tidak cukup untuk "' + req.name + '" (butuh ' + U.formatNumber(size) +
            ' alamat, sisa ' + U.formatNumber(remaining) + '). Kecilkan kebutuhan host atau gunakan jaringan induk yang lebih besar.',
          field: 'rows'
        };
      }

      var usable = usableOf(prefix);
      rows.push({
        id: 'v' + j,
        index: j + 1,
        name: req.name,
        hostsRequested: req.hosts,
        prefix: prefix,
        mask: U.intToIPv4(U.prefixToMaskInt(prefix)),
        size: size,
        blockSize: size,
        networkInt: start,
        broadcastInt: end,
        network: U.intToIPv4(start),
        broadcast: U.intToIPv4(end),
        first: U.intToIPv4(prefix >= 31 ? start : start + 1),
        last: U.intToIPv4(prefix >= 31 ? end : end - 1),
        cidr: U.intToIPv4(start) + '/' + prefix,
        usable: usable,
        waste: usable - req.hosts
      });

      totalAllocated += size;
      cursor = end + 1;
    }

    // Deteksi overlap (verifikasi independen dari alokasi sekuensial).
    var byAddress = rows.slice().sort(function (a, b) { return a.networkInt - b.networkInt; });
    for (var k = 1; k < byAddress.length; k++) {
      if (byAddress[k].networkInt <= byAddress[k - 1].broadcastInt) {
        return {
          ok: false,
          error: 'Terdeteksi overlap antara "' + byAddress[k - 1].name + '" dan "' + byAddress[k].name + '".',
          field: 'rows'
        };
      }
    }

    var remaining = base.size - totalAllocated;
    return {
      ok: true,
      data: {
        base: base.base,
        basePrefix: base.prefix,
        baseMask: base.mask,
        baseBroadcast: U.intToIPv4(base.broadcastInt),
        parentSize: base.size,
        parentUsable: usableOf(base.prefix),
        rows: rows,
        totalAllocated: totalAllocated,
        remaining: remaining,
        utilization: (totalAllocated / base.size) * 100,
        subnetCount: rows.length
      }
    };
  }

  /* --------------------------- Page controller -------------------------- */

  function initPage() {
    var form = document.getElementById('vlsmForm');
    if (!form) return;

    var listEl = document.getElementById('vlsmList');
    var state = { data: null };
    var presets = [
      { name: 'Administrasi', hosts: 100 },
      { name: 'Keuangan', hosts: 50 },
      { name: 'Akademik', hosts: 25 },
      { name: 'Server', hosts: 10 }
    ];

    function rowHtml(item) {
      return '<div class="vlsm-row">' +
        '<input type="text" class="form-control" data-name placeholder="Nama subnet" value="' + BenoxApp.escape(item.name || '') + '" aria-label="Nama subnet">' +
        '<input type="text" inputmode="numeric" class="form-control mono-input" data-hosts placeholder="Host" value="' + (item.hosts || '') + '" aria-label="Jumlah host">' +
        '<button type="button" class="remove-row" title="Hapus subnet" aria-label="Hapus subnet"><i class="bi bi-trash3"></i></button>' +
      '</div>';
    }

    function readRows() {
      return Array.prototype.slice.call(listEl.querySelectorAll('.vlsm-row')).map(function (row) {
        return {
          name: row.querySelector('[data-name]').value,
          hosts: row.querySelector('[data-hosts]').value
        };
      });
    }

    function addRow(item) {
      listEl.insertAdjacentHTML('beforeend', rowHtml(item || {}));
      var rows = listEl.querySelectorAll('.vlsm-row');
      var last = rows[rows.length - 1];
      if (last) last.querySelector('[data-name]').focus();
    }

    function resetList(items) {
      listEl.innerHTML = '';
      items.forEach(function (item) { listEl.insertAdjacentHTML('beforeend', rowHtml(item)); });
    }

    resetList(presets);

    listEl.addEventListener('click', function (e) {
      var btn = e.target.closest('.remove-row');
      if (!btn) return;
      var rows = listEl.querySelectorAll('.vlsm-row');
      if (rows.length <= 1) {
        BenoxApp.toast('Minimal satu subnet harus ada.', 'warning');
        return;
      }
      btn.closest('.vlsm-row').remove();
      hideResults();
    });

    function showError(message) {
      var el = document.getElementById('vlsmError');
      document.getElementById('vlsmErrorText').textContent = message;
      el.classList.add('show');
      document.getElementById('vlsmEmpty').classList.remove('d-none');
      document.getElementById('vlsmResultWrap').classList.add('d-none');
    }

    function clearError() {
      document.getElementById('vlsmError').classList.remove('show');
    }

    function hideResults() {
      document.getElementById('vlsmEmpty').classList.remove('d-none');
      document.getElementById('vlsmResultWrap').classList.add('d-none');
    }

    function render(d) {
      state.data = d;

      var summary = [
        { label: 'Network Induk', value: d.base + '/' + d.basePrefix, small: true },
        { label: 'Total Subnet', value: U.formatNumber(d.subnetCount) },
        { label: 'Alamat Terpakai', value: U.formatNumber(d.totalAllocated) },
        { label: 'Sisa Alamat', value: U.formatNumber(d.remaining) },
        { label: 'Efisiensi Alokasi', value: d.utilization.toFixed(1) + '%' }
      ];

      document.getElementById('vlsmSummary').innerHTML = summary.map(function (s) {
        return '<div class="summary-item"><span class="si-label">' + s.label + '</span>' +
          '<span class="si-value' + (s.small ? ' small' : '') + '">' + s.value + '</span>' +
          (s.label === 'Efisiensi Alokasi'
            ? '<div class="progress-track mt-2"><span style="width:' + Math.min(100, d.utilization).toFixed(1) + '%"></span></div>'
            : '') +
        '</div>';
      }).join('');

      document.getElementById('vlsmTableBody').innerHTML = d.rows.map(function (r) {
        return '<tr>' +
          '<td class="td-index">' + r.index + '</td>' +
          '<td><strong style="font-weight:500;color:#eef6ff">' + BenoxApp.escape(r.name) + '</strong></td>' +
          '<td class="mono">' + U.formatNumber(r.hostsRequested) + '</td>' +
          '<td class="mono">/' + r.prefix + '</td>' +
          '<td class="mono">' + r.mask + '</td>' +
          '<td class="mono">' + r.network + '</td>' +
          '<td class="mono">' + r.first + '</td>' +
          '<td class="mono">' + r.last + '</td>' +
          '<td class="mono">' + r.broadcast + '</td>' +
          '<td class="mono">' + U.formatNumber(r.usable) + '</td>' +
        '</tr>';
      }).join('');

      document.getElementById('vlsmNote').innerHTML = 'Dialokasikan berurutan dari kebutuhan terbesar. Setiap subnet disejajarkan pada batas bloknya sehingga tidak ada overlap.';

      document.getElementById('vlsmEmpty').classList.add('d-none');
      var wrap = document.getElementById('vlsmResultWrap');
      wrap.classList.remove('d-none');
      wrap.classList.add('result-enter');
      wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });

      if (global.BenoxHistory) {
        BenoxHistory.add({
          type: 'vlsm',
          title: 'VLSM Calculator',
          input: d.base + '/' + d.basePrefix,
          prefix: d.basePrefix,
          summary: d.subnetCount + ' subnet • terpakai ' + U.formatNumber(d.totalAllocated) + ' alamat',
          page: 'pages/vlsm.html',
          query: {
            network: d.base,
            prefix: d.basePrefix,
            req: JSON.stringify(d.rows.map(function (r) { return { name: r.name, hosts: r.hostsRequested }; }))
          }
        });
      }
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      clearError();
      var result = generate(
        document.getElementById('vlsmNetwork').value,
        document.getElementById('vlsmPrefix').value,
        readRows()
      );
      if (!result.ok) { showError(result.error); return; }
      var btn = document.getElementById('vlsmSubmit');
      BenoxLoading.start(btn, 'Mengalokasikan…');
      setTimeout(function () {
        BenoxLoading.stop(btn);
        render(result.data);
        BenoxApp.toast('VLSM berhasil dialokasikan.', 'success');
      }, 220);
    });

    document.getElementById('vlsmAdd').addEventListener('click', function () {
      addRow({});
    });

    document.getElementById('vlsmExample').addEventListener('click', function () {
      document.getElementById('vlsmNetwork').value = '192.168.1.0';
      document.getElementById('vlsmPrefix').value = '24';
      resetList(presets);
      clearError();
      hideResults();
      state.data = null;
      BenoxApp.toast('Contoh VLSM dimuat. Tekan Generate VLSM.', 'info');
    });

    document.getElementById('vlsmReset').addEventListener('click', function () {
      form.reset();
      resetList([{}]);
      clearError();
      hideResults();
      state.data = null;
      BenoxApp.toast('Form VLSM direset.', 'info');
    });

    var copyAll = document.getElementById('vlsmCopyAll');
    if (copyAll) {
      copyAll.addEventListener('click', function () {
        if (!state.data) return;
        var d = state.data;
        var lines = [
          'VLSM PLAN',
          'Network Induk : ' + d.base + '/' + d.basePrefix,
          'Subnet        : ' + d.subnetCount,
          '',
          'Nama            Host   Prefix  Network         Broadcast       Range Host'
        ];
        d.rows.forEach(function (r) {
          lines.push(r.name.padEnd(15) + String(r.hostsRequested).padEnd(7) + ('/' + r.prefix).padEnd(8) +
            r.network.padEnd(16) + r.broadcast.padEnd(16) + r.first + ' - ' + r.last);
        });
        BenoxApp.copy(lines.join('\n'), 'Hasil VLSM');
      });
    }

    document.querySelectorAll('[data-export-vlsm]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!state.data) { BenoxApp.toast('Generate VLSM terlebih dahulu.', 'warning'); return; }
        var d = state.data;
        var type = btn.getAttribute('data-export-vlsm');
        var base = 'BenoxJK-VLSM-' + d.base.replace(/\./g, '-') + '-' + d.basePrefix;
        var csvRows = [['#', 'Nama', 'Host Diminta', 'Prefix', 'Subnet Mask', 'Network', 'First Host', 'Last Host', 'Broadcast', 'Kapasitas']];
        d.rows.forEach(function (r) {
          csvRows.push([r.index, r.name, r.hostsRequested, '/' + r.prefix, r.mask, r.network, r.first, r.last, r.broadcast, r.usable]);
        });
        var lines = [
          '=VLSM PLAN',
          'Network Induk : ' + d.base + '/' + d.basePrefix + '  (' + d.baseMask + ')',
          'Total Subnet  : ' + d.subnetCount,
          'Alamat Dipakai: ' + U.formatNumber(d.totalAllocated),
          'Sisa Alamat   : ' + U.formatNumber(d.remaining),
          '',
          '=TABEL ALOKASI'
        ];
        d.rows.forEach(function (r) {
          lines.push(String(r.index).padStart(2) + '. ' + r.name + ' — host ' + r.hostsRequested + ' — /' + r.prefix +
            ' (' + r.mask + ')');
          lines.push('    Network ' + r.network + '  Broadcast ' + r.broadcast + '  Host ' + r.first + ' - ' + r.last);
        });

        if (type === 'csv') BenoxExport.csv(base, csvRows);
        else if (type === 'pdf') BenoxExport.pdf(base, 'BenoxJK — VLSM Plan', lines, new Date().toLocaleString('id-ID'));
        else BenoxExport.print('BenoxJK — VLSM Plan', lines);
        BenoxApp.toast('Export ' + type.toUpperCase() + ' disiapkan.', 'success');
      });
    });

    // Muat ulang dari riwayat
    var network = BenoxApp.param('network');
    if (network) {
      document.getElementById('vlsmNetwork').value = network;
      document.getElementById('vlsmPrefix').value = BenoxApp.param('prefix') || '';
      var reqRaw = BenoxApp.param('req');
      if (reqRaw) {
        try {
          var req = JSON.parse(reqRaw);
          if (Array.isArray(req) && req.length) resetList(req);
        } catch (err) { /* abaikan */ }
      }
      form.requestSubmit();
    }
  }

  global.BenoxVLSM = { generate: generate, parseBase: parseBase, usableOf: usableOf };
  document.addEventListener('DOMContentLoaded', initPage);
})(window);
