/* ==========================================================================
   BenoxJK — IPv6 Calculation Engine (BigInt 128-bit)
   ========================================================================== */
(function (global) {
  'use strict';

  var U = global.BenoxUtils;

  function compute(address, prefix) {
    var parsed = U.parseIPv6(address);
    if (!parsed.ok) return { ok: false, error: parsed.error };
    if (!Number.isInteger(prefix) || prefix < 0 || prefix > 128) {
      return { ok: false, error: 'Prefix IPv6 harus berupa angka 0 sampai 128.' };
    }

    var value = parsed.value;
    var mask = U.ipv6Mask(prefix);
    var hostMask = U.ipv6HostMask(prefix);
    var network = value & mask;
    var last = value | hostMask;
    var hostId = value & hostMask;

    var total = U.powerOfTwo(128 - prefix);
    var compressed = U.compressIPv6(value);
    var expanded = U.expandIPv6(value);
    var prefixText = U.compressIPv6(network);
    var typeInfo = U.ipv6Type(value);

    var hextets = U.bigToHextets(value);
    var networkHextets = U.bigToHextets(network);

    // ROI: jumlah alamat host yang bisa dipakai (tanpa konsep broadcast)
    return {
      ok: true,
      data: {
        input: compressed.text + '/' + prefix,
        address: compressed.text,
        expanded: expanded.text,
        compressed: compressed.text,
        prefix: prefix,
        prefixText: '/' + prefix,
        mask: U.compressIPv6(mask).text + '/' + prefix,
        maskExpanded: U.expandIPv6(mask).text,
        network: prefixText.text,
        networkExpanded: U.expandIPv6(network).text,
        networkPrefix: prefixText.text + '/' + prefix,
        hostId: U.compressIPv6(hostId).text,
        hostIdExpanded: U.expandIPv6(hostId).text,
        hostBits: 128 - prefix,
        total: total,
        totalFormatted: U.formatBig(total),
        totalScientific: U.bigToScientific(total),
        firstAddress: prefixText.text,
        lastAddress: U.compressIPv6(last).text,
        lastAddressExpanded: U.expandIPv6(last).text,
        hextets: hextets,
        networkHextets: networkHextets,
        binaryPlain: value.toString(2).padStart(128, '0'),
        networkBinary: network.toString(2).padStart(128, '0'),
        maskBinary: mask.toString(2).padStart(128, '0'),
        type: typeInfo.label,
        typeTone: typeInfo.tone,
        value: value,
        networkValue: network
      }
    };
  }

  function calculateFromInputs(addressRaw, prefixRaw) {
    var raw = (addressRaw || '').trim();
    if (!raw) return { ok: false, error: 'Masukkan alamat IPv6 terlebih dahulu.', field: 'address' };

    var slashPrefix = null;
    var rawAddress = raw;
    if (raw.indexOf('/') !== -1) {
      var parts = raw.split('/');
      if (parts.length !== 2) return { ok: false, error: 'Format CIDR tidak valid. Contoh: 2001:db8::1/64', field: 'address' };
      rawAddress = parts[0].trim();
      var p = parts[1].trim();
      if (!/^\d{1,3}$/.test(p)) return { ok: false, error: 'Prefix IPv6 harus berupa angka 0-128.', field: 'address' };
      slashPrefix = parseInt(p, 10);
    }

    var parsed = U.parseIPv6(rawAddress);
    if (!parsed.ok) return { ok: false, error: parsed.error, field: 'address' };

    var prefix;
    if (slashPrefix !== null) prefix = slashPrefix;
    else if (prefixRaw !== null && prefixRaw !== undefined && String(prefixRaw).trim() !== '') {
      if (!/^\d{1,3}$/.test(String(prefixRaw).trim())) {
        return { ok: false, error: 'Prefix IPv6 harus berupa angka 0-128.', field: 'prefix' };
      }
      prefix = parseInt(prefixRaw, 10);
    } else {
      return { ok: false, error: 'Isi prefix IPv6 (0-128), contoh 64.', field: 'prefix' };
    }

    if (prefix < 0 || prefix > 128) {
      return { ok: false, error: 'Prefix IPv6 harus berada pada rentang 0-128.', field: 'prefix' };
    }

    return compute(compressedOf(parsed), prefix);
  }

  function compressedOf(parsed) {
    var c = U.compressIPv6(parsed.value);
    return c.text;
  }

  /* ------------------------------- Steps -------------------------------- */

  function hextetTable(hextets) {
    var rows = hextets.map(function (h, i) {
      return '<tr><td>' + (i + 1) + '</td><td class="mono">' + h.toString(16).padStart(4, '0') +
        '</td><td class="mono">' + h.toString(2).padStart(16, '0') + '</td><td class="mono">' + h + '</td></tr>';
    }).join('');
    return '<table class="calc-table"><thead><tr><th>#</th><th>Hextet</th><th>Biner (16 bit)</th><th>Desimal</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function buildSteps(data) {
    return [
      '<div class="step-item">' +
        '<div class="step-head"><span class="step-num">1</span><div><h4>Validasi alamat IPv6</h4>' +
        '<p>IPv6 terdiri dari 8 grup hextet (16 bit), total 128 bit.</p></div></div>' +
        '<div class="step-body"><p>Alamat yang diproses: <strong class="mono">' + data.address + '</strong>. ' +
        'Nilai hextet dibaca sebagai bilangan heksadesimal 0–ffff.</p>' +
        '<p>Alamat dinormalisasi ke bentuk terkompresi: <strong class="mono">' + data.compressed + '</strong>.</p></div>' +
      '</div>',
      '<div class="step-item">' +
        '<div class="step-head"><span class="step-num">2</span><div><h4>Ekspansi alamat</h4>' +
        '<p>Semua nol di depan diisi, lalu "::" dijabarkan menjadi grup 0000.</p></div></div>' +
        '<div class="step-body"><div class="formula"><strong>' + data.expanded + '</strong></div>' +
        hextetTable(data.hextets) + '</div>' +
      '</div>',
      '<div class="step-item">' +
        '<div class="step-head"><span class="step-num">3</span><div><h4>Kompresi alamat (RFC 5952)</h4>' +
        '<p>Grup nol berurutan terpanjang diganti "::" — hanya satu kali.</p></div></div>' +
        '<div class="step-body"><p>Hasil kompresi: <strong class="mono">' + data.compressed + '</strong></p>' +
        '<p>Aturan: huruf kecil, nol di depan dihilangkan, satu grup nol tidak dikompresi.</p></div>' +
      '</div>',
      '<div class="step-item">' +
        '<div class="step-head"><span class="step-num">4</span><div><h4>Network prefix dan host identifier</h4>' +
        '<p>Network = alamat AND mask. Host ID = alamat AND host mask.</p></div></div>' +
        '<div class="step-body">' +
        '<div class="formula"><span class="eq">Mask /' + data.prefix + ' =</span> ' + data.mask + '</div>' +
        '<div class="formula"><span class="eq">Network =</span> ' + data.network + '/' + data.prefix + '</div>' +
        '<div class="formula"><span class="eq">Host ID =</span> ' + data.hostId + '</div>' +
        '<p>Prefix panjang: <strong>' + data.prefix + ' bit network</strong> dan <strong>' + data.hostBits + ' bit host</strong>.</p></div>' +
      '</div>',
      '<div class="step-item">' +
        '<div class="step-head"><span class="step-num">5</span><div><h4>Kapasitas alamat</h4>' +
        '<p>Total alamat = 2^host bit (dihitung sebagai BigInt 128-bit).</p></div></div>' +
        '<div class="step-body">' +
        '<div class="formula"><span class="eq">Total =</span> 2^' + data.hostBits + ' <span class="eq">=</span> <strong>' + data.totalFormatted + '</strong></div>' +
        '<p>Kira-kira ' + data.totalScientific + ' alamat.</p>' +
        '<p>IPv6 <strong>tidak memiliki broadcast address</strong>, sehingga seluruh alamat dalam prefix dapat dipakai (kecuali praktik operasional tertentu).</p></div>' +
      '</div>',
      '<div class="step-item">' +
        '<div class="step-head"><span class="step-num">6</span><div><h4>Rentang prefix</h4>' +
        '<p>Alamat pertama dan terakhir dalam prefix.</p></div></div>' +
        '<div class="step-body">' +
        '<div class="formula"><span class="eq">First =</span> ' + data.firstAddress + '</div>' +
        '<div class="formula"><span class="eq">Last =</span> ' + data.lastAddress + '</div>' +
        '<p>Alamat pertama adalah network address; alamat terakhir bukan broadcast.</p></div>' +
      '</div>'
    ].join('');
  }

  /* --------------------------- Page controller -------------------------- */

  function initPage() {
    var form = document.getElementById('ipv6Form');
    if (!form) return;

    var addressEl = document.getElementById('ipv6Address');
    var prefixEl = document.getElementById('ipv6Prefix');
    var errorEl = document.getElementById('ipv6Error');
    var errorText = document.getElementById('ipv6ErrorText');
    var emptyEl = document.getElementById('ipv6Empty');
    var wrapEl = document.getElementById('ipv6ResultWrap');
    var submitBtn = document.getElementById('ipv6Submit');
    var state = { data: null, lastSaved: null };

    function primaryHtml(d) {
      var rows = [
        ['IPv6 Address', d.compressed],
        ['Network Prefix', d.networkPrefix],
        ['Network Address', d.network],
        ['Host Identifier', d.hostId],
        ['Prefix Length', '/' + d.prefix]
      ];
      return '<div class="latihan-title"><i class="bi bi-terminal"></i> HASIL IPv6</div>' +
        rows.map(function (r) {
          return '<div class="latihan-line"><span class="k">' + r[0] + '</span>' +
            '<span class="v">' + r[1] + '</span>' +
            '<button class="copy-btn" data-copy="' + r[1] + '" data-label="' + r[0] + '" title="Salin"><i class="bi bi-clipboard"></i></button></div>';
        }).join('');
    }

    function extraHtml(d) {
      var cards = [
        { label: 'Compressed Address', value: d.compressed, note: 'RFC 5952' },
        { label: 'Expanded Address', value: d.expanded, note: '8 grup × 4 digit' },
        { label: 'Tipe Alamat', value: d.type, note: 'Berdasarkan prefix baku', highlight: true },
        { label: 'Total Address', value: d.totalFormatted, note: '2^' + d.hostBits + ' ≈ ' + d.totalScientific },
        { label: 'Host Bits', value: d.hostBits + ' bit', note: (128 - d.hostBits) + ' network bit' },
        { label: 'Prefix Range Awal', value: d.firstAddress, note: 'Alamat pertama' },
        { label: 'Prefix Range Akhir', value: d.lastAddress, note: 'Bukan broadcast' },
        { label: 'Subnet Mask', value: d.mask, note: 'Prefix /' + d.prefix }
      ];
      return cards.map(function (c) {
        return '<div class="result-card' + (c.highlight ? ' highlight' : '') + '">' +
          '<div class="rc-label"><span>' + c.label + '</span>' +
          '<button class="copy-btn" data-copy="' + String(c.value).replace(/"/g, '&quot;') + '" data-label="' + c.label + '" title="Salin"><i class="bi bi-clipboard"></i></button></div>' +
          '<div class="rc-value">' + c.value + '</div><div class="rc-note">' + c.note + '</div></div>';
      }).join('');
    }

    function binaryHtml(d) {
      var bits = d.binaryPlain;
      var out = '';
      for (var g = 0; g < 8; g++) {
        out += '<span class="octet">';
        for (var i = 0; i < 16; i++) {
          if (i > 0 && i % 4 === 0) out += '<span class="bit-pad"> </span>';
          var idx = g * 16 + i;
          out += '<span class="' + (idx < d.prefix ? 'bit-net' : 'bit-host') + '">' + bits.charAt(idx) + '</span>';
        }
        out += '</span>';
      }
      return '<div class="binary-row"><div class="b-label"><span>IPv6 Address (128 bit)</span><span class="mono">' + d.compressed + '</span></div>' +
        '<div class="binary-bits">' + out + '</div></div>' +
        '<div class="legend"><span><i class="dot" style="background:#7dd3fc"></i> Network bit (' + d.prefix + ')</span>' +
        '<span><i class="dot" style="background:#c4b5fd"></i> Host bit (' + d.hostBits + ')</span>' +
        '<span><i class="dot" style="background:#475569"></i> Pemisah nibble</span></div>';
    }

    function render(d) {
      state.data = d;
      document.getElementById('ipv6Primary').innerHTML = primaryHtml(d);
      document.getElementById('ipv6Extra').innerHTML = extraHtml(d);
      document.getElementById('ipv6BinaryPane').innerHTML = binaryHtml(d);
      document.getElementById('ipv6StepsPane').innerHTML = buildSteps(d);

      var notice = document.getElementById('ipv6NoBroadcast');
      if (notice) {
        notice.innerHTML = '<i class="bi bi-info-circle"></i><span><strong>IPv6 tidak memiliki broadcast address.</strong> Kapasitas di atas adalah jumlah alamat dalam prefix, bukan usable host gaya IPv4.</span>';
      }

      emptyEl.classList.add('d-none');
      wrapEl.classList.remove('d-none');
      wrapEl.classList.add('result-enter');

      if (global.BenoxHistory && state.lastSaved !== d.input) {
        state.lastSaved = d.input;
        BenoxHistory.add({
          type: 'ipv6',
          title: 'IPv6 Calculator',
          input: d.input,
          prefix: d.prefix,
          summary: 'Network ' + d.networkPrefix + ' • ' + d.type,
          page: 'pages/ipv6.html',
          query: { ip: d.compressed, prefix: d.prefix }
        });
      }
    }

    function showError(message, field) {
      errorText.textContent = message;
      errorEl.classList.add('show');
      [addressEl, prefixEl].forEach(function (el) { el.classList.remove('is-invalid'); });
      var target = field === 'prefix' ? prefixEl : addressEl;
      if (target) { target.classList.add('is-invalid'); target.focus(); }
      emptyEl.classList.remove('d-none');
      wrapEl.classList.add('d-none');
    }

    function clearError() {
      errorEl.classList.remove('show');
      [addressEl, prefixEl].forEach(function (el) { el.classList.remove('is-invalid'); });
    }

    function run() {
      clearError();
      var result = calculateFromInputs(addressEl.value, prefixEl.value);
      if (!result.ok) { showError(result.error, result.field); return; }
      BenoxLoading.start(submitBtn, 'Menghitung…');
      setTimeout(function () {
        BenoxLoading.stop(submitBtn);
        render(result.data);
        if (window.innerWidth < 992) wrapEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        BenoxApp.toast('Perhitungan IPv6 selesai.', 'success');
      }, 220);
    }

    form.addEventListener('submit', function (e) { e.preventDefault(); run(); });

    document.getElementById('ipv6Reset').addEventListener('click', function () {
      form.reset();
      clearError();
      state.lastSaved = null;
      emptyEl.classList.remove('d-none');
      wrapEl.classList.add('d-none');
      addressEl.focus();
      BenoxApp.toast('Form IPv6 direset.', 'info');
    });

    document.querySelectorAll('[data-example-v6]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var value = chip.getAttribute('data-example-v6');
        var parts = value.split('/');
        addressEl.value = parts[0];
        prefixEl.value = parts[1] || '';
        run();
      });
    });

    var copyAll = document.getElementById('ipv6CopyAll');
    if (copyAll) {
      copyAll.addEventListener('click', function () {
        if (!state.data) return;
        var d = state.data;
        BenoxApp.copy([
          'HASIL IPv6',
          'Address        : ' + d.compressed,
          'Expanded       : ' + d.expanded,
          'Compressed     : ' + d.compressed,
          'Network Prefix : ' + d.networkPrefix,
          'Network        : ' + d.network,
          'Host ID        : ' + d.hostId,
          'Prefix Length  : /' + d.prefix,
          'Total Address  : ' + d.totalFormatted,
          'Range Awal     : ' + d.firstAddress,
          'Range Akhir    : ' + d.lastAddress,
          'Tipe           : ' + d.type
        ].join('\n'), 'Hasil IPv6');
      });
    }

    document.querySelectorAll('[data-export-ipv6]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!state.data) { BenoxApp.toast('Hitung dulu sebelum mengekspor.', 'warning'); return; }
        var d = state.data;
        var lines = [
          '=HASIL IPv6',
          'Address        : ' + d.compressed,
          'Expanded       : ' + d.expanded,
          'Compressed     : ' + d.compressed,
          'Network Prefix : ' + d.networkPrefix,
          'Network        : ' + d.network,
          'Host Identifier: ' + d.hostId,
          'Prefix Length  : /' + d.prefix,
          '',
          '=KAPASITAS & RENTANG',
          'Total Address  : ' + d.totalFormatted,
          'Total (ilmiah) : ' + d.totalScientific,
          'Range Awal     : ' + d.firstAddress,
          'Range Akhir    : ' + d.lastAddress,
          'Host Bits      : ' + d.hostBits,
          'Subnet Mask    : ' + d.mask,
          'Tipe Alamat    : ' + d.type,
          '',
          'Catatan: IPv6 tidak memiliki broadcast address.'
        ];
        var type = btn.getAttribute('data-export-ipv6');
        var base = 'BenoxJK-IPv6-' + d.prefix;
        if (type === 'csv') {
          BenoxExport.csv(base, [
            ['Parameter', 'Nilai'],
            ['IPv6 Address', d.compressed], ['Expanded', d.expanded], ['Compressed', d.compressed],
            ['Network Prefix', d.networkPrefix], ['Network Address', d.network], ['Host ID', d.hostId],
            ['Prefix Length', '/' + d.prefix], ['Total Address', d.total], ['Range Awal', d.firstAddress],
            ['Range Akhir', d.lastAddress], ['Host Bits', d.hostBits], ['Tipe', d.type]
          ]);
        } else if (type === 'pdf') {
          BenoxExport.pdf(base, 'BenoxJK — Hasil IPv6', lines, new Date().toLocaleString('id-ID'));
        } else {
          BenoxExport.print('BenoxJK — Hasil IPv6', lines);
        }
        BenoxApp.toast('Export ' + type.toUpperCase() + ' disiapkan.', 'success');
      });
    });

    var ipParam = BenoxApp.param('ip');
    if (ipParam) {
      addressEl.value = ipParam;
      prefixEl.value = BenoxApp.param('prefix') || '';
      run();
    }
  }

  global.BenoxIPv6 = { compute: compute, calculateFromInputs: calculateFromInputs, buildSteps: buildSteps };
  document.addEventListener('DOMContentLoaded', initPage);
})(window);
