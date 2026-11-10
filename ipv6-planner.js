/* ==========================================================================
   BenoxJK — IPv6 Prefix Planner
   Perencanaan subnet IPv6 berbasis BigInt 128-bit.
   ========================================================================== */
(function (global) {
  'use strict';

  var U = global.BenoxUtils;

  function generate(networkRaw, parentPrefixRaw, newPrefixRaw, countRaw) {
    var raw = (networkRaw || '').trim();
    if (!raw) return { ok: false, error: 'Masukkan IPv6 network terlebih dahulu.', field: 'network' };

    var slashParent = null;
    if (raw.indexOf('/') !== -1) {
      var parts = raw.split('/');
      if (parts.length !== 2) return { ok: false, error: 'Format CIDR tidak valid. Contoh: 2001:db8::/32.', field: 'network' };
      raw = parts[0].trim();
      if (!/^\d{1,3}$/.test(parts[1].trim())) return { ok: false, error: 'Parent prefix harus 0-128.', field: 'network' };
      slashParent = parseInt(parts[1], 10);
    }

    var parsed = U.parseIPv6(raw);
    if (!parsed.ok) return { ok: false, error: parsed.error, field: 'network' };

    var parentPrefix;
    if (slashParent !== null) parentPrefix = slashParent;
    else {
      if (parentPrefixRaw === null || parentPrefixRaw === undefined || String(parentPrefixRaw).trim() === '') {
        return { ok: false, error: 'Isi parent prefix (0-128).', field: 'parent' };
      }
      if (!/^\d{1,3}$/.test(String(parentPrefixRaw).trim())) {
        return { ok: false, error: 'Parent prefix harus angka 0-128.', field: 'parent' };
      }
      parentPrefix = parseInt(parentPrefixRaw, 10);
    }
    if (parentPrefix < 0 || parentPrefix > 128) return { ok: false, error: 'Parent prefix harus berada pada 0-128.', field: 'parent' };

    if (newPrefixRaw === null || newPrefixRaw === undefined || String(newPrefixRaw).trim() === '') {
      return { ok: false, error: 'Isi new prefix untuk subnet.', field: 'newPrefix' };
    }
    if (!/^\d{1,3}$/.test(String(newPrefixRaw).trim())) {
      return { ok: false, error: 'New prefix harus angka 0-128.', field: 'newPrefix' };
    }
    var newPrefix = parseInt(newPrefixRaw, 10);
    if (newPrefix < 0 || newPrefix > 128) return { ok: false, error: 'New prefix harus berada pada 0-128.', field: 'newPrefix' };
    if (newPrefix < parentPrefix) {
      return { ok: false, error: 'New prefix (' + newPrefix + ') harus lebih besar atau sama dengan parent prefix (' + parentPrefix + ').', field: 'newPrefix' };
    }

    if (countRaw === null || countRaw === undefined || String(countRaw).trim() === '') {
      return { ok: false, error: 'Isi jumlah subnet yang dibutuhkan.', field: 'count' };
    }
    if (!/^\d+$/.test(String(countRaw).trim())) {
      return { ok: false, error: 'Jumlah subnet harus bilangan bulat positif.', field: 'count' };
    }
    var count = parseInt(countRaw, 10);
    if (count < 1) return { ok: false, error: 'Jumlah subnet minimal 1.', field: 'count' };

    var subnetBits = newPrefix - parentPrefix;
    var maxSubnets = 1n << BigInt(subnetBits);
    if (BigInt(count) > maxSubnets) {
      return {
        ok: false,
        error: 'Jumlah subnet melebihi kapasitas: /' + newPrefix + ' hanya dapat membentuk ' + U.formatBig(maxSubnets) + ' subnet dari /' + parentPrefix + '.',
        field: 'count'
      };
    }

    var parentNetwork = parsed.value & U.ipv6Mask(parentPrefix);
    var childSize = 1n << BigInt(128 - newPrefix);
    var capacity = childSize;
    var limit = Math.min(count, 512);
    var rows = [];

    for (var i = 0; i < limit; i++) {
      var net = parentNetwork + childSize * BigInt(i);
      var last = net + childSize - 1n;
      rows.push({
        index: i + 1,
        network: U.compressIPv6(net).text,
        expanded: U.expandIPv6(net).text,
        prefix: newPrefix,
        cidr: U.compressIPv6(net).text + '/' + newPrefix,
        capacity: capacity,
        capacityFormatted: U.formatBig(capacity),
        capacityScientific: U.bigToScientific(capacity),
        first: U.compressIPv6(net).text,
        last: U.compressIPv6(last).text
      });
    }

    return {
      ok: true,
      data: {
        parentInput: U.compressIPv6(parentNetwork).text + '/' + parentPrefix,
        parentNetwork: U.compressIPv6(parentNetwork).text,
        parentPrefix: parentPrefix,
        newPrefix: newPrefix,
        subnetBits: subnetBits,
        maxSubnets: maxSubnets,
        requested: count,
        capacityPerSubnet: capacity,
        capacityFormatted: U.formatBig(capacity),
        capacityScientific: U.bigToScientific(capacity),
        rows: rows,
        shown: limit,
        truncated: count > limit
      }
    };
  }

  /* --------------------------- Page controller -------------------------- */

  function initPage() {
    var form = document.getElementById('plannerForm');
    if (!form) return;
    var state = { data: null, table: null };

    function render(d) {
      state.data = d;

      var summary = [
        { label: 'Parent Network', value: d.parentInput, small: true },
        { label: 'Subnet Baru', value: '/' + d.newPrefix },
        { label: 'Subnet Bits', value: d.subnetBits + ' bit' },
        { label: 'Maksimum Subnet', value: U.formatBig(d.maxSubnets), small: true },
        { label: 'Subnet Diminta', value: U.formatNumber(d.requested) },
        { label: 'Kapasitas / Subnet', value: d.capacityFormatted, small: true }
      ];

      document.getElementById('plannerSummary').innerHTML = summary.map(function (s) {
        return '<div class="summary-item"><span class="si-label">' + s.label + '</span>' +
          '<span class="si-value' + (s.small ? ' small' : '') + '">' + s.value + '</span>' +
          (s.label === 'Kapasitas / Subnet' ? '<div class="rc-note">≈ ' + d.capacityScientific + ' alamat</div>' : '') +
        '</div>';
      }).join('');

      document.getElementById('plannerNote').innerHTML =
        'Setiap subnet berukuran sama dan dialokasikan berurutan dari parent network. IPv6 tidak memiliki broadcast address. ' +
        (d.truncated ? 'Menampilkan ' + U.formatNumber(d.shown) + ' dari ' + U.formatNumber(d.requested) + ' subnet.' : '');

      if (!state.table) {
        state.table = BenoxApp.createTable({
          tbody: 'plannerTableBody',
          pagination: 'plannerPagination',
          searchInput: 'plannerSearch',
          info: 'plannerInfo',
          pageSize: 12,
          colspan: 6,
          data: d.rows,
          rowRenderer: function (row) {
            return '<tr>' +
              '<td class="td-index">' + row.index + '</td>' +
              '<td class="mono">' + row.cidr + '</td>' +
              '<td class="mono">' + row.network + '</td>' +
              '<td class="mono">/' + row.prefix + '</td>' +
              '<td class="mono">' + row.capacityFormatted + '</td>' +
              '<td class="mono" style="font-size:.72rem;color:#94a3b8">' + row.first + ' – ' + row.last + '</td>' +
            '</tr>';
          },
          searchText: function (row) { return row.cidr + ' ' + row.network + ' ' + row.index; },
          emptyHtml: 'Subnet tidak ditemukan.'
        });
      } else {
        state.table.setData(d.rows);
      }

      document.getElementById('plannerEmpty').classList.add('d-none');
      var wrap = document.getElementById('plannerResultWrap');
      wrap.classList.remove('d-none');
      wrap.classList.add('result-enter');
      wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });

      if (global.BenoxHistory) {
        BenoxHistory.add({
          type: 'planner',
          title: 'IPv6 Prefix Planner',
          input: d.parentInput,
          prefix: d.newPrefix,
          summary: U.formatNumber(d.requested) + ' subnet /' + d.newPrefix + ' • kapasitas ' + d.capacityFormatted,
          page: 'pages/ipv6-planner.html',
          query: {
            network: d.parentNetwork,
            parent: d.parentPrefix,
            newPrefix: d.newPrefix,
            count: d.requested
          }
        });
      }
    }

    function showError(message, field) {
      document.getElementById('plannerErrorText').textContent = message;
      document.getElementById('plannerError').classList.add('show');
      document.querySelectorAll('#plannerForm .is-invalid').forEach(function (el) { el.classList.remove('is-invalid'); });
      var target = document.querySelector('[data-planner-field="' + field + '"]');
      if (target) { target.classList.add('is-invalid'); target.focus(); }
      document.getElementById('plannerEmpty').classList.remove('d-none');
      document.getElementById('plannerResultWrap').classList.add('d-none');
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      document.getElementById('plannerError').classList.remove('show');
      var result = generate(
        document.getElementById('plannerNetwork').value,
        document.getElementById('plannerParent').value,
        document.getElementById('plannerNewPrefix').value,
        document.getElementById('plannerCount').value
      );
      if (!result.ok) { showError(result.error, result.field); return; }
      var btn = document.getElementById('plannerSubmit');
      BenoxLoading.start(btn, 'Menyusun…');
      setTimeout(function () {
        BenoxLoading.stop(btn);
        render(result.data);
        BenoxApp.toast('Rencana prefix IPv6 selesai.', 'success');
      }, 200);
    });

    document.getElementById('plannerReset').addEventListener('click', function () {
      form.reset();
      document.getElementById('plannerError').classList.remove('show');
      document.getElementById('plannerEmpty').classList.remove('d-none');
      document.getElementById('plannerResultWrap').classList.add('d-none');
      BenoxApp.toast('Form planner direset.', 'info');
    });

    document.querySelectorAll('[data-example-planner]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        document.getElementById('plannerNetwork').value = chip.getAttribute('data-net');
        document.getElementById('plannerParent').value = chip.getAttribute('data-parent');
        document.getElementById('plannerNewPrefix').value = chip.getAttribute('data-new');
        document.getElementById('plannerCount').value = chip.getAttribute('data-count');
        form.requestSubmit();
      });
    });

    var copyAll = document.getElementById('plannerCopyAll');
    if (copyAll) {
      copyAll.addEventListener('click', function () {
        if (!state.data) return;
        var d = state.data;
        var lines = [
          'IPv6 PREFIX PLAN',
          'Parent        : ' + d.parentInput,
          'New Prefix    : /' + d.newPrefix,
          'Subnet Bits   : ' + d.subnetBits,
          'Maksimum      : ' + U.formatBig(d.maxSubnets),
          'Diminta       : ' + d.requested,
          '',
          '#   Subnet Prefix                    Kapasitas'
        ];
        d.rows.forEach(function (r) {
          lines.push(String(r.index).padEnd(4) + r.cidr.padEnd(33) + r.capacityFormatted);
        });
        BenoxApp.copy(lines.join('\n'), 'IPv6 prefix plan');
      });
    }

    document.querySelectorAll('[data-export-planner]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!state.data) { BenoxApp.toast('Generate prefix plan terlebih dahulu.', 'warning'); return; }
        var d = state.data;
        var type = btn.getAttribute('data-export-planner');
        var base = 'BenoxJK-IPv6Planner-' + d.newPrefix;
        var csvRows = [['#', 'Subnet Prefix', 'Network', 'Prefix Length', 'Address Capacity', 'First', 'Last']];
        d.rows.forEach(function (r) {
          csvRows.push([r.index, r.cidr, r.network, '/' + r.prefix, r.capacity, r.first, r.last]);
        });
        var lines = [
          '=IPv6 PREFIX PLAN',
          'Parent Network : ' + d.parentInput,
          'New Prefix     : /' + d.newPrefix,
          'Subnet Bits    : ' + d.subnetBits,
          'Maksimum Subnet: ' + U.formatBig(d.maxSubnets),
          'Subnet Diminta : ' + d.requested,
          'Kapasitas/Subnet: ' + d.capacityFormatted + '  (~' + d.capacityScientific + ')',
          '',
          '=DAFTAR SUBNET'
        ];
        d.rows.forEach(function (r) {
          lines.push(String(r.index).padStart(3) + '. ' + r.cidr.padEnd(34) + ' kapasitas ' + r.capacityFormatted);
        });

        if (type === 'csv') BenoxExport.csv(base, csvRows);
        else if (type === 'pdf') BenoxExport.pdf(base, 'BenoxJK — IPv6 Prefix Plan', lines, new Date().toLocaleString('id-ID'));
        else BenoxExport.print('BenoxJK — IPv6 Prefix Plan', lines);
        BenoxApp.toast('Export ' + type.toUpperCase() + ' disiapkan.', 'success');
      });
    });

    var network = BenoxApp.param('network');
    if (network) {
      document.getElementById('plannerNetwork').value = network;
      document.getElementById('plannerParent').value = BenoxApp.param('parent') || '';
      document.getElementById('plannerNewPrefix').value = BenoxApp.param('newPrefix') || '';
      document.getElementById('plannerCount').value = BenoxApp.param('count') || '';
      form.requestSubmit();
    }
  }

  global.BenoxIPv6Planner = { generate: generate };
  document.addEventListener('DOMContentLoaded', initPage);
})(window);
