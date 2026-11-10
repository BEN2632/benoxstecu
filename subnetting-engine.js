/* ==========================================================================
   BenoxJK — Subnetting Engine (FLSM & Host-based)
   ========================================================================== */
(function (global) {
  'use strict';

  var U = global.BenoxUtils;
  var CAP = 2048;

  function resolveNetwork(networkRaw, prefixRaw) {
    var raw = (networkRaw || '').trim();
    if (!raw) return { ok: false, error: 'Masukkan network address terlebih dahulu.', field: 'network' };

    var slashPrefix = null;
    if (raw.indexOf('/') !== -1) {
      var parts = raw.split('/');
      if (parts.length !== 2) return { ok: false, error: 'Format CIDR tidak valid. Contoh: 192.168.1.0/24.', field: 'network' };
      raw = parts[0].trim();
      if (!/^\d{1,2}$/.test(parts[1].trim())) return { ok: false, error: 'Prefix CIDR harus 0-32.', field: 'network' };
      slashPrefix = parseInt(parts[1], 10);
    }

    var parsed = U.parseIPv4(raw);
    if (!parsed.ok) return { ok: false, error: parsed.error, field: 'network' };

    var prefix;
    if (slashPrefix !== null) prefix = slashPrefix;
    else {
      if (prefixRaw === null || prefixRaw === undefined || String(prefixRaw).trim() === '') {
        return { ok: false, error: 'Isi prefix jaringan (0-32).', field: 'prefix' };
      }
      if (!/^\d{1,2}$/.test(String(prefixRaw).trim())) {
        return { ok: false, error: 'Prefix jaringan harus angka 0-32.', field: 'prefix' };
      }
      prefix = parseInt(prefixRaw, 10);
    }

    if (prefix < 0 || prefix > 32) return { ok: false, error: 'Prefix jaringan harus berada pada 0-32.', field: 'prefix' };

    var maskInt = U.prefixToMaskInt(prefix);
    var networkInt = (parsed.value & maskInt) >>> 0;
    return {
      ok: true,
      baseInt: networkInt,
      prefix: prefix,
      address: parsed.normal,
      base: U.intToIPv4(networkInt)
    };
  }

  function usableHosts(prefix) {
    if (prefix === 32) return 1;
    if (prefix === 31) return 2;
    return Math.pow(2, 32 - prefix) - 2;
  }

  function buildTable(baseInt, basePrefix, newPrefix, mode, requested) {
    var step = Math.pow(2, 32 - newPrefix);
    var total = Math.pow(2, newPrefix - basePrefix);
    var limit = Math.min(total, CAP);
    var list = [];
    for (var i = 0; i < limit; i++) {
      var net = (baseInt + i * step) >>> 0;
      var broad = (net + step - 1) >>> 0;
      list.push({
        index: i + 1,
        network: U.intToIPv4(net),
        first: U.intToIPv4(newPrefix >= 31 ? net : net + 1),
        last: U.intToIPv4(newPrefix >= 31 ? broad : broad - 1),
        broadcast: U.intToIPv4(broad),
        cidr: U.intToIPv4(net) + '/' + newPrefix
      });
    }

    var mask = U.intToIPv4(U.prefixToMaskInt(newPrefix));
    return {
      mode: mode,
      requested: requested,
      base: U.intToIPv4(baseInt),
      basePrefix: basePrefix,
      newPrefix: newPrefix,
      mask: mask,
      wildcard: U.wildcard(newPrefix),
      borrowedBits: newPrefix - basePrefix,
      actualSubnets: total,
      hostBits: 32 - newPrefix,
      hostsPerSubnet: usableHosts(newPrefix),
      blockSize: Math.pow(2, 32 - newPrefix),
      totalUsable: total * usableHosts(newPrefix),
      subnets: list,
      shown: limit,
      truncated: total > limit,
      allAddresses: Math.pow(2, 32 - basePrefix),
      utilization: (total * step / Math.pow(2, 32 - basePrefix)) * 100
    };
  }

  /** FLSM berdasarkan jumlah subnet yang dibutuhkan. */
  function flsm(networkRaw, prefixRaw, subnetCountRaw) {
    var base = resolveNetwork(networkRaw, prefixRaw);
    if (!base.ok) return base;

    var raw = String(subnetCountRaw === undefined || subnetCountRaw === null ? '' : subnetCountRaw).trim();
    if (!raw) return { ok: false, error: 'Masukkan jumlah subnet yang dibutuhkan.', field: 'count' };
    if (!/^\d+$/.test(raw)) return { ok: false, error: 'Jumlah subnet harus bilangan bulat positif.', field: 'count' };
    var count = parseInt(raw, 10);
    if (count < 1) return { ok: false, error: 'Jumlah subnet minimal 1.', field: 'count' };
    if (count > Math.pow(2, 32)) return { ok: false, error: 'Jumlah subnet terlalu besar.', field: 'count' };

    var borrowed = Math.ceil(Math.log2(count));
    var newPrefix = base.prefix + borrowed;
    if (newPrefix > 32) {
      return {
        ok: false,
        error: 'Jumlah subnet terlalu besar untuk prefix /' + base.prefix + '. Maksimum subnet yang mungkin adalah 2^' + (32 - base.prefix) + '.',
        field: 'count'
      };
    }

    var data = buildTable(base.baseInt, base.prefix, newPrefix, 'flsm', count);
    data.originalAddress = base.address;
    return { ok: true, data: data };
  }

  /** Subnetting berdasarkan kebutuhan host per subnet. */
  function byHosts(networkRaw, prefixRaw, hostsRaw) {
    var base = resolveNetwork(networkRaw, prefixRaw);
    if (!base.ok) return base;

    var raw = String(hostsRaw === undefined || hostsRaw === null ? '' : hostsRaw).trim();
    if (!raw) return { ok: false, error: 'Masukkan jumlah host yang dibutuhkan per subnet.', field: 'need' };
    if (!/^\d+$/.test(raw)) return { ok: false, error: 'Jumlah host harus bilangan bulat positif.', field: 'need' };
    var hosts = parseInt(raw, 10);
    if (hosts < 1) return { ok: false, error: 'Jumlah host minimal 1.', field: 'need' };
    if (hosts > 4294967294) return { ok: false, error: 'Jumlah host melebihi kapasitas IPv4.', field: 'need' };

    var hostBits = Math.ceil(Math.log2(hosts + 2));
    var newPrefix = 32 - hostBits;
    if (hostBits > 32 - base.prefix) {
      return { ok: false, error: 'Kebutuhan ' + U.formatNumber(hosts) + ' host per subnet tidak muat dalam jaringan /' + base.prefix + '.', field: 'need' };
    }
    if (newPrefix < base.prefix) newPrefix = base.prefix;

    var data = buildTable(base.baseInt, base.prefix, newPrefix, 'host', hosts);
    data.originalAddress = base.address;
    return { ok: true, data: data };
  }

  /* --------------------------- Page controller -------------------------- */

  function initPage() {
    var flsmForm = document.getElementById('flsmForm');
    if (!flsmForm) return;

    var hostForm = document.getElementById('hostForm');
    var emptyEl = document.getElementById('subnetEmpty');
    var wrapEl = document.getElementById('subnetResultWrap');
    var state = { data: null, table: null };

    function showError(el, textEl, message, field) {
      textEl.textContent = message;
      el.classList.add('show');
      var fieldEl = document.querySelector('[data-subnet-field="' + field + '"]');
      if (fieldEl) { fieldEl.classList.add('is-invalid'); fieldEl.focus(); }
      emptyEl.classList.remove('d-none');
      wrapEl.classList.add('d-none');
    }

    function clearErrors() {
      document.querySelectorAll('.field-error').forEach(function (el) { el.classList.remove('show'); });
      document.querySelectorAll('.is-invalid').forEach(function (el) { el.classList.remove('is-invalid'); });
    }

    function render(d) {
      state.data = d;

      var cards = [
        { label: 'Network Induk', value: d.base + '/' + d.basePrefix, small: true },
        { label: 'Subnet Mask Baru', value: d.mask, small: true },
        { label: 'Prefix Baru', value: '/' + d.newPrefix },
        { label: 'Jumlah Subnet', value: U.formatNumber(d.actualSubnets) },
        { label: 'Host per Subnet', value: U.formatNumber(d.hostsPerSubnet) },
        { label: 'Bit Dipinjam', value: d.borrowedBits + ' bit' },
        { label: 'Block Size', value: U.formatNumber(d.blockSize) },
        { label: 'Total Host Terpakai', value: U.formatNumber(d.totalUsable) }
      ];

      document.getElementById('subnetSummary').innerHTML = cards.map(function (c) {
        return '<div class="summary-item"><span class="si-label">' + c.label + '</span>' +
          '<span class="si-value' + (c.small ? ' small' : '') + '">' + c.value + '</span></div>';
      }).join('');

      var methodText = d.mode === 'flsm'
        ? 'FLSM: ' + U.formatNumber(d.requested) + ' subnet diminta → ' + U.formatNumber(d.actualSubnets) + ' subnet dibuat (pembulatan ke pangkat 2).'
        : 'Kebutuhan ' + U.formatNumber(d.requested) + ' host per subnet → prefix /' + d.newPrefix + ' dengan ' + U.formatNumber(d.hostsPerSubnet) + ' host usable.';

      var noteEl = document.getElementById('subnetNote');
      noteEl.innerHTML = methodText + ' ' +
        (d.truncated ? 'Menampilkan ' + U.formatNumber(d.shown) + ' dari ' + U.formatNumber(d.actualSubnets) + ' subnet pertama. ' : '') +
        'Seluruh ruang jaringan induk terbagi ke dalam subnet berukuran sama.';

      if (!state.table) {
        state.table = BenoxApp.createTable({
          tbody: 'subnetTableBody',
          pagination: 'subnetPagination',
          searchInput: 'subnetSearch',
          info: 'subnetInfo',
          pageSize: 12,
          colspan: 6,
          data: d.subnets,
          rowRenderer: function (row) {
            return '<tr>' +
              '<td class="td-index">' + row.index + '</td>' +
              '<td class="mono">' + row.network + '</td>' +
              '<td class="mono">' + row.first + '</td>' +
              '<td class="mono">' + row.last + '</td>' +
              '<td class="mono">' + row.broadcast + '</td>' +
              '<td><span class="badge-soft mono">' + row.cidr + '</span></td>' +
            '</tr>';
          },
          searchText: function (row) { return row.network + ' ' + row.broadcast + ' ' + row.cidr + ' ' + row.index; },
          emptyHtml: 'Subnet tidak ditemukan.'
        });
      } else {
        state.table.setData(d.subnets);
      }

      emptyEl.classList.add('d-none');
      wrapEl.classList.remove('d-none');
      wrapEl.classList.add('result-enter');
      wrapEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

      if (global.BenoxHistory) {
        BenoxHistory.add({
          type: 'subnetting',
          title: d.mode === 'flsm' ? 'Subnetting FLSM' : 'Subnetting by Host',
          input: d.base + '/' + d.basePrefix,
          prefix: d.newPrefix,
          summary: (d.mode === 'flsm' ? 'FLSM' : 'Host-based') + ' • /' + d.newPrefix + ' × ' + U.formatNumber(d.actualSubnets) + ' subnet • ' + U.formatNumber(d.hostsPerSubnet) + ' host/subnet',
          page: 'pages/subnetting.html',
          query: d.mode === 'flsm'
            ? { mode: 'flsm', network: d.base, prefix: d.basePrefix, count: d.requested }
            : { mode: 'host', network: d.base, prefix: d.basePrefix, need: d.requested }
        });
      }
    }

    flsmForm.addEventListener('submit', function (e) {
      e.preventDefault();
      clearErrors();
      var errorEl = document.getElementById('flsmError');
      var errorText = document.getElementById('flsmErrorText');
      var result = flsm(
        document.getElementById('flsmNetwork').value,
        document.getElementById('flsmPrefix').value,
        document.getElementById('flsmCount').value
      );
      if (!result.ok) { showError(errorEl, errorText, result.error, result.field); return; }
      var btn = document.getElementById('flsmSubmit');
      BenoxLoading.start(btn, 'Menyusun…');
      setTimeout(function () { BenoxLoading.stop(btn); render(result.data); BenoxApp.toast('Subnet FLSM berhasil dibuat.', 'success'); }, 200);
    });

    hostForm.addEventListener('submit', function (e) {
      e.preventDefault();
      clearErrors();
      var errorEl = document.getElementById('hostError');
      var errorText = document.getElementById('hostErrorText');
      var result = byHosts(
        document.getElementById('hostNetwork').value,
        document.getElementById('hostPrefix').value,
        document.getElementById('hostNeed').value
      );
      if (!result.ok) { showError(errorEl, errorText, result.error, result.field); return; }
      var btn = document.getElementById('hostSubmit');
      BenoxLoading.start(btn, 'Menyusun…');
      setTimeout(function () { BenoxLoading.stop(btn); render(result.data); BenoxApp.toast('Subnet berdasarkan host berhasil dibuat.', 'success'); }, 200);
    });

    function resetForm(form, emptyTarget) {
      form.reset();
      clearErrors();
      state.data = null;
      emptyTarget.classList.remove('d-none');
      wrapEl.classList.add('d-none');
    }

    document.getElementById('flsmReset').addEventListener('click', function () {
      resetForm(flsmForm, emptyEl);
      BenoxApp.toast('Form FLSM direset.', 'info');
    });

    document.getElementById('hostReset').addEventListener('click', function () {
      resetForm(hostForm, emptyEl);
      BenoxApp.toast('Form subnetting host direset.', 'info');
    });

    document.querySelectorAll('[data-example-net]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var mode = chip.getAttribute('data-mode');
        var net = chip.getAttribute('data-net');
        var prefix = chip.getAttribute('data-prefix') || '';
        if (mode === 'host') {
          document.getElementById('hostNetwork').value = net;
          document.getElementById('hostPrefix').value = prefix;
          document.getElementById('hostNeed').value = chip.getAttribute('data-need') || '';
          document.getElementById('hostNeed').focus();
        } else {
          document.getElementById('flsmNetwork').value = net;
          document.getElementById('flsmPrefix').value = prefix;
          document.getElementById('flsmCount').value = chip.getAttribute('data-count') || '';
          document.getElementById('flsmCount').focus();
        }
        clearErrors();
      });
    });

    /* Copy & export */
    var copyAll = document.getElementById('subnetCopyAll');
    if (copyAll) {
      copyAll.addEventListener('click', function () {
        if (!state.data) return;
        var d = state.data;
        var lines = [
          'SUBNETTING ' + d.mode.toUpperCase(),
          'Network Induk : ' + d.base + '/' + d.basePrefix,
          'Subnet Mask   : ' + d.mask,
          'Prefix Baru   : /' + d.newPrefix,
          'Jumlah Subnet : ' + d.actualSubnets,
          'Host / Subnet : ' + d.hostsPerSubnet,
          'Block Size    : ' + d.blockSize,
          '',
          '#  Network         First Host      Last Host       Broadcast       CIDR'
        ];
        d.subnets.slice(0, 100).forEach(function (s) {
          lines.push([
            String(s.index).padEnd(2), s.network.padEnd(15), s.first.padEnd(15),
            s.last.padEnd(15), s.broadcast.padEnd(15), s.cidr
          ].join(' '));
        });
        if (d.subnets.length > 100) lines.push('… (lihat tabel lengkap di BenoxJK)');
        BenoxApp.copy(lines.join('\n'), 'Hasil subnetting');
      });
    }

    document.querySelectorAll('[data-export-subnet]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!state.data) { BenoxApp.toast('Generate subnet terlebih dahulu.', 'warning'); return; }
        var d = state.data;
        var type = btn.getAttribute('data-export-subnet');
        var base = 'BenoxJK-Subnetting-' + d.base.replace(/\./g, '-') + '-' + d.newPrefix;
        var csvRows = [['#', 'Network', 'First Host', 'Last Host', 'Broadcast', 'CIDR']];
        d.subnets.slice(0, 2048).forEach(function (s) {
          csvRows.push([s.index, s.network, s.first, s.last, s.broadcast, s.cidr]);
        });
        var lines = [
          '=SUBNETTING ' + d.mode.toUpperCase(),
          'Network Induk : ' + d.base + '/' + d.basePrefix,
          'Subnet Mask   : ' + d.mask + '  (prefix /' + d.newPrefix + ')',
          'Jumlah Subnet : ' + d.actualSubnets,
          'Host / Subnet : ' + d.hostsPerSubnet,
          'Bit Dipinjam  : ' + d.borrowedBits,
          'Block Size    : ' + d.blockSize,
          '',
          '=DAFTAR SUBNET'
        ];
        d.subnets.forEach(function (s) {
          lines.push(String(s.index).padStart(3) + '. ' + s.network.padEnd(15) + ' - ' + s.broadcast.padEnd(15) + '  ' + s.cidr);
        });

        if (type === 'csv') BenoxExport.csv(base, csvRows);
        else if (type === 'pdf') BenoxExport.pdf(base, 'BenoxJK — Subnetting ' + d.mode.toUpperCase(), lines, new Date().toLocaleString('id-ID'));
        else BenoxExport.print('BenoxJK — Subnetting ' + d.mode.toUpperCase(), lines);
        BenoxApp.toast('Export ' + type.toUpperCase() + ' disiapkan.', 'success');
      });
    });

    /* Auto-run dari riwayat */
    var mode = BenoxApp.param('mode');
    var network = BenoxApp.param('network');
    if (mode && network) {
      if (mode === 'host') {
        document.getElementById('hostNetwork').value = network;
        document.getElementById('hostPrefix').value = BenoxApp.param('prefix') || '';
        document.getElementById('hostNeed').value = BenoxApp.param('need') || '';
        hostForm.requestSubmit();
      } else {
        document.getElementById('flsmNetwork').value = network;
        document.getElementById('flsmPrefix').value = BenoxApp.param('prefix') || '';
        document.getElementById('flsmCount').value = BenoxApp.param('count') || '';
        flsmForm.requestSubmit();
      }
    }
  }

  global.BenoxSubnetting = { flsm: flsm, byHosts: byHosts, resolveNetwork: resolveNetwork, usableHosts: usableHosts };
  document.addEventListener('DOMContentLoaded', initPage);
})(window);
