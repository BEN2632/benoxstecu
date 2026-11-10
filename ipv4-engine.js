/* ==========================================================================
   BenoxJK — IPv4 Calculation Engine
   Pure functions + controller halaman IPv4 Calculator.
   ========================================================================== */
(function (global) {
  'use strict';

  var U = global.BenoxUtils;

  /* ------------------------------ Engine -------------------------------- */

  function compute(address, prefix) {
    var parsed = U.parseIPv4(address);
    if (!parsed.ok) return { ok: false, error: parsed.error };
    if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
      return { ok: false, error: 'Prefix CIDR harus berupa angka 0 sampai 32.' };
    }

    var maskInt = U.prefixToMaskInt(prefix);
    var wildcardInt = (~maskInt) >>> 0;
    var networkInt = (parsed.value & maskInt) >>> 0;
    var broadcastInt = (networkInt | wildcardInt) >>> 0;
    var hostIdInt = (parsed.value & wildcardInt) >>> 0;

    var totalIp = Math.pow(2, 32 - prefix);
    var usable;
    if (prefix === 32) usable = 1;
    else if (prefix === 31) usable = 2;
    else usable = totalIp - 2;

    var firstHostInt = prefix >= 31 ? networkInt : (networkInt + 1) >>> 0;
    var lastHostInt = prefix >= 31 ? broadcastInt : (broadcastInt - 1) >>> 0;

    var classInfo = U.ipv4Class(parsed.octets[0]);
    var defaultPrefix = classInfo.defaultPrefix;
    var subnetCount = null;
    var subnetFormula = '';

    if (defaultPrefix === null) {
      subnetFormula = 'Tidak berlaku — kelas ' + classInfo.name + ' bukan ruang unicast.';
    } else if (prefix > defaultPrefix) {
      subnetCount = Math.pow(2, prefix - defaultPrefix);
      subnetFormula = '2^(' + prefix + ' − ' + defaultPrefix + ') = 2^' + (prefix - defaultPrefix) + ' = ' + U.formatNumber(subnetCount) + ' subnet';
    } else {
      subnetCount = 1;
      subnetFormula = prefix === defaultPrefix
        ? 'Prefix sama dengan prefix default kelas ' + classInfo.name + ' → 1 subnet (tanpa subnetting).'
        : 'Prefix lebih kecil dari prefix default kelas ' + classInfo.name + ' (' + defaultPrefix + ') → 1 blok supernet.';
    }

    var block = blockInfo(prefix);
    var typeInfo = U.ipv4Type(parsed.value);
    var network = U.intToIPv4(networkInt);

    return {
      ok: true,
      data: {
        input: parsed.normal + '/' + prefix,
        address: parsed.normal,
        addressInt: parsed.value,
        octets: parsed.octets,
        prefix: prefix,
        cidr: '/' + prefix,
        mask: U.intToIPv4(maskInt),
        maskInt: maskInt,
        wildcard: U.intToIPv4(wildcardInt),
        network: network,
        networkInt: networkInt,
        broadcast: U.intToIPv4(broadcastInt),
        broadcastInt: broadcastInt,
        firstHost: U.intToIPv4(firstHostInt),
        lastHost: U.intToIPv4(lastHostInt),
        hostId: U.intToIPv4(hostIdInt),
        hostIdInt: hostIdInt,
        totalIp: totalIp,
        usable: usable,
        netBits: prefix,
        hostBits: 32 - prefix,
        subnetCount: subnetCount,
        subnetFormula: subnetFormula,
        blockSize: block.size,
        blockOctet: block.octet,
        blockNotation: block.notation,
        defaultMask: defaultPrefix === null ? 'N/A' : U.intToIPv4(U.prefixToMaskInt(defaultPrefix)),
        ipClass: classInfo.name,
        classNote: classInfo.note,
        ipType: typeInfo.label,
        ipTypeTone: typeInfo.tone,
        binaryIp: U.ipv4ToBinary(parsed.value),
        binaryMask: U.ipv4ToBinary(maskInt),
        binaryNetwork: U.ipv4ToBinary(networkInt),
        binaryBroadcast: U.ipv4ToBinary(broadcastInt),
        networkBinaryPlain: U.intToBinary32(networkInt),
        special: prefix === 31 ? 'Prefix /31 (RFC 3021): 2 host dapat dipakai, tanpa network/broadcast tradisional.'
          : prefix === 32 ? 'Prefix /32: satu alamat tunggal (host route), tanpa host range.'
          : null
      }
    };
  }

  /** Ukuran blok subnet berdasarkan oktet mask yang berubah. */
  function blockInfo(prefix) {
    if (prefix === 0) {
      return { size: null, octet: null, notation: 'Seluruh ruang alamat (0.0.0.0 – 255.255.255.255)' };
    }
    if (prefix === 32) return { size: 1, octet: 4, notation: '1 alamat (host tunggal)' };
    if (prefix % 8 === 0) {
      var octet = prefix / 8; // 1-based last full octet
      return { size: 256, octet: octet, notation: '256 (oktet ke-' + octet + ' penuh)' };
    }
    var idx = Math.floor(prefix / 8); // 0-based
    var size = Math.pow(2, 8 - (prefix % 8));
    return { size: size, octet: idx + 1, notation: size + ' (oktet ke-' + (idx + 1) + ')' };
  }

  /**
   * Daftar subnet. Untuk kelas A/B/C, blok dihitung dari network kelasful
   * (sesuai cara pengajaran subnetting), lalu subnet yang memuat IP ditandai.
   */
  function buildSubnets(data, cap) {
    cap = cap || 2048;
    var def = data.defaultMask === 'N/A' ? null : U.maskToPrefix(data.defaultMask).prefix;
    var fromClass = def !== null && data.prefix >= def;
    var baseInt = fromClass ? ((data.addressInt & U.prefixToMaskInt(def)) >>> 0) : data.networkInt;
    var total = fromClass ? Math.pow(2, data.prefix - def) : 1;
    var step = Math.pow(2, 32 - data.prefix);
    var limit = Math.min(total, cap);
    var list = [];

    for (var i = 0; i < limit; i++) {
      var net = (baseInt + i * step) >>> 0;
      var broad = (net + step - 1) >>> 0;
      list.push({
        index: i + 1,
        network: U.intToIPv4(net),
        broadcast: U.intToIPv4(broad),
        first: U.intToIPv4(data.prefix >= 31 ? net : net + 1),
        last: U.intToIPv4(data.prefix >= 31 ? broad : broad - 1),
        cidr: U.intToIPv4(net) + '/' + data.prefix,
        isCurrent: net === data.networkInt
      });
    }

    return {
      list: list,
      total: total,
      shown: limit,
      truncated: total > limit,
      fromClass: fromClass,
      base: U.intToIPv4(baseInt),
      step: step
    };
  }

  /* --------------------------- Input resolver --------------------------- */

  function calculateFromInputs(ipRaw, prefixRaw, maskRaw) {
    var raw = (ipRaw || '').trim();
    if (!raw) return { ok: false, error: 'Masukkan alamat IPv4 terlebih dahulu.', field: 'ip' };

    var slashPrefix = null;
    if (raw.indexOf('/') !== -1) {
      var parts = raw.split('/');
      if (parts.length !== 2) return { ok: false, error: 'Format CIDR tidak valid. Gunakan contoh 192.168.1.10/24.', field: 'ip' };
      raw = parts[0].trim();
      if (!/^\d{1,2}$/.test(parts[1].trim())) {
        return { ok: false, error: 'Prefix CIDR harus berupa angka 0-32.', field: 'ip' };
      }
      slashPrefix = parseInt(parts[1], 10);
    }

    var parsed = U.parseIPv4(raw);
    if (!parsed.ok) return { ok: false, error: parsed.error, field: 'ip' };

    var prefix = null;
    var source = '';

    if (slashPrefix !== null) {
      prefix = slashPrefix;
      source = 'cidr';
    } else if (prefixRaw !== null && prefixRaw !== undefined && String(prefixRaw).trim() !== '') {
      if (!/^\d{1,2}$/.test(String(prefixRaw).trim())) {
        return { ok: false, error: 'Prefix CIDR harus berupa angka 0-32.', field: 'prefix' };
      }
      prefix = parseInt(prefixRaw, 10);
      source = 'prefix';
    } else if (maskRaw && String(maskRaw).trim() !== '') {
      var maskParsed = U.maskToPrefix(String(maskRaw));
      if (!maskParsed.ok) return { ok: false, error: maskParsed.error, field: 'mask' };
      prefix = maskParsed.prefix;
      source = 'mask';
    } else {
      return { ok: false, error: 'Isi Prefix CIDR atau Subnet Mask untuk menentukan panjang prefix.', field: 'prefix' };
    }

    if (prefix < 0 || prefix > 32) {
      return { ok: false, error: 'Prefix CIDR harus berada pada rentang 0-32.', field: 'prefix' };
    }

    var result = compute(parsed.normal, prefix);
    if (!result.ok) return { ok: false, error: result.error, field: 'ip' };
    result.data.prefixSource = source;
    return result;
  }

  /* ------------------------------- Steps -------------------------------- */

  function maskTable(mask) {
    var octets = mask.split('.');
    var rows = octets.map(function (o, i) {
      return '<tr><td>' + (i + 1) + '</td><td class="mono octet-bits">' + Number(o).toString(2).padStart(8, '0') +
        '</td><td class="mono">' + o + '</td></tr>';
    }).join('');
    return '<table class="calc-table"><thead><tr><th>Oktet</th><th>Biner</th><th>Desimal</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function buildSteps(data) {
    var srcLabel = data.prefixSource === 'mask' ? 'dari subnet mask yang dimasukkan'
      : data.prefixSource === 'cidr' ? 'dari notasi CIDR pada input'
      : 'dari kolom prefix yang diisi';

    var steps = [];

    steps.push(
      '<div class="step-item">' +
        '<div class="step-head"><span class="step-num">1</span><div><h4>Tentukan prefix CIDR</h4>' +
        '<p>Prefix menunjukkan jumlah bit 1 (network bit) pada subnet mask.</p></div></div>' +
        '<div class="step-body"><p>Nilai prefix diperoleh ' + srcLabel + ':</p>' +
        '<div class="formula"><strong>Prefix = /' + data.prefix + '</strong></div>' +
        '<p>Prefix juga dapat ditulis sebagai <strong>' + data.prefix + ' network bit</strong> dan <strong>' + data.hostBits + ' host bit</strong>.</p></div>' +
      '</div>'
    );

    steps.push(
      '<div class="step-item">' +
        '<div class="step-head"><span class="step-num">2</span><div><h4>Konversi prefix menjadi subnet mask</h4>' +
        '<p>Tulis ' + data.prefix + ' bit 1 dari kiri, sisanya bit 0, lalu kelompokkan per 8 bit.</p></div></div>' +
        '<div class="step-body">' +
        '<div class="formula">' + data.binaryMask.split('.').join('.') + '</div>' +
        maskTable(data.mask) +
        '<p>Hasil subnet mask aktual (SUB2): <strong>' + data.mask + '</strong></p></div>' +
      '</div>'
    );

    steps.push(
      '<div class="step-item">' +
        '<div class="step-head"><span class="step-num">3</span><div><h4>Subnet mask default (SUB1)</h4>' +
        '<p>SUB1 ditentukan oleh kelas alamat IP, bukan oleh prefix yang diminta.</p></div></div>' +
        '<div class="step-body">' +
        '<p>Oktet pertama <strong>' + data.octets[0] + '</strong> termasuk kelas <strong>' + data.ipClass + '</strong> (' + data.classNote + '). ' +
        (data.defaultMask === 'N/A'
          ? 'Kelas ini tidak memiliki subnet mask default unicast.'
          : 'Subnet mask default kelas ' + data.ipClass + ' adalah <strong>' + data.defaultMask + '</strong>.') + '</p>' +
        '<div class="formula"><span class="eq">SUB1 =</span> <strong>' + data.defaultMask + '</strong></div></div>' +
      '</div>'
    );

    steps.push(
      '<div class="step-item">' +
        '<div class="step-head"><span class="step-num">4</span><div><h4>Hitung Network Address (NA) dan Broadcast (BOARD)</h4>' +
        '<p>NA = IP AND subnet mask. Broadcast = NA OR wildcard mask.</p></div></div>' +
        '<div class="step-body">' +
        '<div class="formula"><span class="eq">NA =</span> ' + data.address + ' <span class="eq">AND</span> ' + data.mask + ' <span class="eq">=</span> <strong>' + data.network + '</strong></div>' +
        '<div class="formula"><span class="eq">BOARD =</span> ' + data.network + ' <span class="eq">OR</span> ' + data.wildcard + ' <span class="eq">=</span> <strong>' + data.broadcast + '</strong></div>' +
        '<p>Wildcard mask adalah kebalikan subnet mask: <strong>' + data.wildcard + '</strong>.</p></div>' +
      '</div>'
    );

    steps.push(
      '<div class="step-item">' +
        '<div class="step-head"><span class="step-num">5</span><div><h4>Host ID (HA) dan rentang host</h4>' +
        '<p>HA adalah bagian alamat IP di luar network address.</p></div></div>' +
        '<div class="step-body">' +
        '<div class="formula"><span class="eq">HA =</span> ' + data.address + ' <span class="eq">AND</span> ' + data.wildcard + ' <span class="eq">=</span> <strong>' + data.hostId + '</strong></div>' +
        (data.prefix >= 31
          ? '<p>Pada prefix /' + data.prefix + ' tidak ada host range tradisional. Alamat <strong>' + data.network + '</strong> sampai <strong>' + data.broadcast + '</strong> dapat dipakai sebagai host (RFC 3021).</p>'
          : '<p>IP AWAL = NA + 1 = <strong>' + data.firstHost + '</strong><br>IP AKHIR = BOARD − 1 = <strong>' + data.lastHost + '</strong></p>') +
        '</div>' +
      '</div>'
    );

    steps.push(
      '<div class="step-item">' +
        '<div class="step-head"><span class="step-num">6</span><div><h4>Jumlah subnet</h4>' +
        '<p>2^(prefix baru − prefix default kelas).</p></div></div>' +
        '<div class="step-body"><div class="formula"><strong>' + data.subnetFormula + '</strong></div>' +
        '<p>Jumlah subnet yang dapat dibentuk dari blok kelas ' + data.ipClass + ': <strong>' +
        (data.subnetCount === null ? 'N/A' : U.formatNumber(data.subnetCount)) + '</strong>.</p></div>' +
      '</div>'
    );

    steps.push(
      '<div class="step-item">' +
        '<div class="step-head"><span class="step-num">7</span><div><h4>Total IP dan usable host</h4>' +
        '<p>Total = 2^host bit. Usable = total − 2 (network dan broadcast).</p></div></div>' +
        '<div class="step-body">' +
        '<div class="formula"><span class="eq">Total IP =</span> 2^' + data.hostBits + ' <span class="eq">=</span> <strong>' + U.formatNumber(data.totalIp) + '</strong></div>' +
        '<div class="formula"><span class="eq">Usable =</span> 2^' + data.hostBits + ' − 2 <span class="eq">=</span> <strong>' + U.formatNumber(data.usable) + '</strong></div>' +
        (data.prefix >= 31 ? '<p>Untuk /31 dan /32, dua alamat network/broadcast tidak dikurangkan (lihat RFC 3021).</p>' : '') +
        '</div>' +
      '</div>'
    );

    steps.push(
      '<div class="step-item">' +
        '<div class="step-head"><span class="step-num">8</span><div><h4>Blok subnet</h4>' +
        '<p>256 − nilai oktet subnet mask yang berubah.</p></div></div>' +
        '<div class="step-body">' +
        (data.blockSize === null
          ? '<p>Prefix /0 tidak memiliki oktet mask yang berubah.</p>'
          : '<div class="formula"><span class="eq">Blok =</span> 256 − ' + (256 - data.blockSize) + ' <span class="eq">=</span> <strong>' + (data.blockSize === 256 ? '256' : data.blockSize) + '</strong></div>' +
            '<p>Oktet yang berubah: oktet ke-<strong>' + data.blockOctet + '</strong>. Subnet berikutnya bertambah ' + data.blockSize + ' pada oktet tersebut.</p>') +
        '</div>' +
      '</div>'
    );

    return steps.join('');
  }

  /* --------------------------- Page controller -------------------------- */

  function initPage() {
    var form = document.getElementById('ipv4Form');
    if (!form) return;

    var ipEl = document.getElementById('ipv4Address');
    var prefixEl = document.getElementById('ipv4Prefix');
    var maskEl = document.getElementById('ipv4Mask');
    var errorEl = document.getElementById('ipv4Error');
    var errorText = document.getElementById('ipv4ErrorText');
    var emptyEl = document.getElementById('ipv4Empty');
    var wrapEl = document.getElementById('ipv4ResultWrap');
    var submitBtn = document.getElementById('ipv4Submit');

    var state = { data: null, subnets: null, table: null };

    /* Render helpers */
    function latihanHtml(d) {
      var lines = [
        ['IP', d.input],
        ['NA', d.network],
        ['HA', d.hostId],
        ['SUB1', d.defaultMask],
        ['SUB2', d.mask],
        ['IP AWAL', d.firstHost],
        ['IP AKHIR', d.lastHost],
        ['BOARD', d.broadcast]
      ];
      return '<div class="latihan-title"><i class="bi bi-terminal"></i> LATIHAN IPv4</div>' +
        lines.map(function (pair) {
          return '<div class="latihan-line"><span class="k">' + pair[0] + '</span>' +
            '<span class="v">' + pair[1] + '</span>' +
            '<button class="copy-btn" data-copy="' + pair[1] + '" data-label="' + pair[0] + '" title="Salin ' + pair[0] + '"><i class="bi bi-clipboard"></i></button></div>';
        }).join('');
    }

    function extraHtml(d) {
      var cards = [
        { label: 'Wildcard Mask', value: d.wildcard, note: 'Kebalikan subnet mask' },
        { label: 'CIDR', value: '/' + d.prefix, note: 'Prefix length' },
        { label: 'Network Bits', value: d.netBits + ' bit', note: 'Bit 1 pada mask' },
        { label: 'Host Bits', value: d.hostBits + ' bit', note: 'Bit 0 pada mask' },
        { label: 'Total IP Address', value: U.formatNumber(d.totalIp), note: '2^' + d.hostBits },
        { label: 'Total Usable Host', value: U.formatNumber(d.usable), note: d.prefix >= 31 ? 'Tanpa −2 (RFC 3021)' : 'Dikurangi network + broadcast' },
        { label: 'Jumlah Subnet', value: d.subnetCount === null ? 'N/A' : U.formatNumber(d.subnetCount), note: 'Dari kelas ' + d.ipClass },
        { label: 'Blok Subnet', value: d.blockNotation, note: 'Increment oktet' },
        { label: 'Kelas IP', value: d.ipClass, note: d.classNote },
        { label: 'Jenis IP', value: d.ipType, note: 'Berdasarkan alamat', tone: d.ipTypeTone }
      ];
      return cards.map(function (c) {
        return '<div class="result-card' + (c.tone ? ' highlight' : '') + '">' +
          '<div class="rc-label"><span>' + c.label + '</span>' +
          '<button class="copy-btn" data-copy="' + String(c.value).replace(/"/g, '&quot;') + '" data-label="' + c.label + '" title="Salin"><i class="bi bi-clipboard"></i></button></div>' +
          '<div class="rc-value">' + c.value + '</div>' +
          '<div class="rc-note">' + c.note + '</div></div>';
      }).join('');
    }

    function colorBits(binary, prefix) {
      var bits = binary.replace(/\./g, '');
      var out = '';
      for (var i = 0; i < bits.length; i++) {
        var cls = i < prefix ? 'bit-net' : 'bit-host';
        if (i > 0 && i % 8 === 0) out += '<span class="bit-pad">.</span>';
        out += '<span class="' + cls + '">' + bits[i] + '</span>';
      }
      return out;
    }

    function binaryHtml(d) {
      var rows = [
        ['IP Address', d.binaryIp, d.prefix, true],
        ['Subnet Mask', d.binaryMask, d.prefix, true],
        ['Network Address', d.binaryNetwork, d.prefix, false],
        ['Broadcast Address', d.binaryBroadcast, d.prefix, false]
      ];
      return rows.map(function (r) {
        return '<div class="binary-row"><div class="b-label"><span>' + r[0] + '</span><span class="mono">' +
          (r[0] === 'Subnet Mask' ? '/' + d.prefix : (r[0] === 'IP Address' ? d.address : (r[0] === 'Network Address' ? d.network : d.broadcast))) +
          '</span></div><div class="binary-bits">' + colorBits(r[1], r[2]) + '</div></div>';
      }).join('') +
      '<div class="legend"><span><i class="dot" style="background:#7dd3fc"></i> Network bit (' + d.prefix + ')</span>' +
      '<span><i class="dot" style="background:#c4b5fd"></i> Host bit (' + d.hostBits + ')</span></div>';
    }

    function render(d) {
      state.data = d;
      document.getElementById('ipv4Latihan').innerHTML = latihanHtml(d);
      document.getElementById('ipv4Extra').innerHTML = extraHtml(d);
      document.getElementById('ipv4BinaryPane').innerHTML = binaryHtml(d);
      document.getElementById('ipv4StepsPane').innerHTML = buildSteps(d);

      var subnets = buildSubnets(d);
      state.subnets = subnets;
      var noteEl = document.getElementById('ipv4SubnetNote');
      var note = '';
      if (subnets.fromClass) {
        note = 'Daftar subnet dihitung dari network kelasful <span class="mono">' + subnets.base + '</span> (cara pengajaran subnetting). ' +
          'Subnet yang memuat IP Anda ditandai.';
      } else {
        note = 'Prefix tidak berada di dalam blok kelas unicast, sehingga ditampilkan sebagai satu blok.';
      }
      if (subnets.truncated) {
        note += ' Menampilkan ' + U.formatNumber(subnets.shown) + ' dari ' + U.formatNumber(subnets.total) + ' subnet pertama.';
      }
      if (noteEl) noteEl.innerHTML = note;

      document.getElementById('ipv4TotalSubnets').textContent = d.subnetCount === null ? 'N/A' : U.formatNumber(d.subnetCount);

      if (!state.table) {
        state.table = BenoxApp.createTable({
          tbody: 'ipv4SubnetTbody',
          pagination: 'ipv4SubnetPagination',
          searchInput: 'ipv4SubnetSearch',
          info: 'ipv4SubnetInfo',
          pageSize: 12,
          colspan: 6,
          data: subnets.list,
          rowRenderer: function (row) {
            return '<tr' + (row.isCurrent ? ' class="is-current"' : '') + '>' +
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
        state.table.setData(subnets.list);
      }

      emptyEl.classList.add('d-none');
      wrapEl.classList.remove('d-none');
      wrapEl.classList.add('result-enter');

      saveHistory(d);
    }

    function showError(message, field) {
      errorText.textContent = message;
      errorEl.classList.add('show');
      [ipEl, prefixEl, maskEl].forEach(function (el) { el.classList.remove('is-invalid'); });
      var target = field === 'prefix' ? prefixEl : field === 'mask' ? maskEl : ipEl;
      if (target) { target.classList.add('is-invalid'); target.focus(); }
      emptyEl.classList.remove('d-none');
      wrapEl.classList.add('d-none');
    }

    function clearError() {
      errorEl.classList.remove('show');
      [ipEl, prefixEl, maskEl].forEach(function (el) { el.classList.remove('is-invalid'); });
    }

    function saveHistory(d) {
      if (!global.BenoxHistory) return;
      var key = 'ipv4|' + d.input;
      if (state.lastSaved === key) return;
      state.lastSaved = key;
      BenoxHistory.add({
        type: 'ipv4',
        title: 'IPv4 Calculator',
        input: d.input,
        prefix: d.prefix,
        summary: 'NA ' + d.network + ' • BOARD ' + d.broadcast + ' • ' + U.formatNumber(d.usable) + ' host usable',
        page: 'pages/ipv4.html',
        query: { ip: d.address, prefix: d.prefix }
      });
    }

    function run(btn) {
      clearError();
      var result = calculateFromInputs(ipEl.value, prefixEl.value, maskEl.value);
      if (!result.ok) { showError(result.error, result.field); return false; }
      if (btn) BenoxLoading.start(btn, 'Menghitung…');
      setTimeout(function () {
        if (btn) BenoxLoading.stop(btn);
        render(result.data);
        if (window.innerWidth < 992) {
          wrapEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        BenoxApp.toast('Perhitungan IPv4 selesai.', 'success');
      }, 220);
      return true;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      run(submitBtn);
    });

    var resetBtn = document.getElementById('ipv4Reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        form.reset();
        clearError();
        state.lastSaved = null;
        emptyEl.classList.remove('d-none');
        wrapEl.classList.add('d-none');
        ipEl.focus();
        BenoxApp.toast('Form IPv4 direset.', 'info');
      });
    }

    document.querySelectorAll('[data-example]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var value = chip.getAttribute('data-example');
        var parts = value.split('/');
        ipEl.value = parts[0];
        prefixEl.value = parts[1] || '';
        maskEl.value = '';
        clearError();
        run(submitBtn);
      });
    });

    /* Copy all + export */
    var copyAll = document.getElementById('ipv4CopyAll');
    if (copyAll) {
      copyAll.addEventListener('click', function () {
        if (!state.data) return;
        var d = state.data;
        BenoxApp.copy([
          'LATIHAN IPv4',
          'IP       : ' + d.input,
          'NA       : ' + d.network,
          'HA       : ' + d.hostId,
          'SUB1     : ' + d.defaultMask,
          'SUB2     : ' + d.mask,
          'IP AWAL  : ' + d.firstHost,
          'IP AKHIR : ' + d.lastHost,
          'BOARD    : ' + d.broadcast,
          'Wildcard : ' + d.wildcard,
          'CIDR     : /' + d.prefix,
          'Total IP : ' + d.totalIp,
          'Usable   : ' + d.usable,
          'Kelas    : ' + d.ipClass,
          'Jenis    : ' + d.ipType
        ].join('\n'), 'Hasil IPv4');
      });
    }

    document.querySelectorAll('[data-export-ipv4]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!state.data) { BenoxApp.toast('Hitung dulu sebelum mengekspor.', 'warning'); return; }
        var d = state.data;
        var lines = [
          '=LATIHAN IPv4',
          'IP       : ' + d.input,
          'NA       : ' + d.network,
          'HA       : ' + d.hostId,
          'SUB1     : ' + d.defaultMask,
          'SUB2     : ' + d.mask,
          'IP AWAL  : ' + d.firstHost,
          'IP AKHIR : ' + d.lastHost,
          'BOARD    : ' + d.broadcast,
          '',
          '=INFORMASI TAMBAHAN',
          'Wildcard Mask : ' + d.wildcard,
          'Prefix CIDR   : /' + d.prefix,
          'Network Bits  : ' + d.netBits,
          'Host Bits     : ' + d.hostBits,
          'Total IP      : ' + U.formatNumber(d.totalIp),
          'Usable Host   : ' + U.formatNumber(d.usable),
          'Jumlah Subnet : ' + (d.subnetCount === null ? 'N/A' : U.formatNumber(d.subnetCount)),
          'Blok Subnet   : ' + d.blockNotation,
          'Kelas IP      : ' + d.ipClass,
          'Jenis IP      : ' + d.ipType,
          '',
          '=RENTANG SUBNET',
          'Network Address : ' + d.network,
          'First Host      : ' + d.firstHost,
          'Last Host       : ' + d.lastHost,
          'Broadcast       : ' + d.broadcast
        ];
        var type = btn.getAttribute('data-export-ipv4');
        var base = 'BenoxJK-IPv4-' + d.address.replace(/\./g, '-') + '-' + d.prefix;
        if (type === 'csv') {
          BenoxExport.csv(base, [
            ['Parameter', 'Nilai'],
            ['IP Address', d.input], ['Network Address', d.network], ['Host ID', d.hostId],
            ['Default Subnet Mask', d.defaultMask], ['Actual Subnet Mask', d.mask],
            ['First Usable', d.firstHost], ['Last Usable', d.lastHost], ['Broadcast', d.broadcast],
            ['Wildcard', d.wildcard], ['CIDR', '/' + d.prefix], ['Network Bits', d.netBits],
            ['Host Bits', d.hostBits], ['Total IP', d.totalIp], ['Usable Host', d.usable],
            ['Jumlah Subnet', d.subnetCount === null ? 'N/A' : d.subnetCount],
            ['Blok Subnet', d.blockNotation], ['Kelas IP', d.ipClass], ['Jenis IP', d.ipType]
          ]);
        } else if (type === 'pdf') {
          BenoxExport.pdf(base, 'BenoxJK — Hasil IPv4', lines, new Date().toLocaleString('id-ID'));
        } else {
          BenoxExport.print('BenoxJK — Hasil IPv4', lines);
        }
        BenoxApp.toast('Export ' + type.toUpperCase() + ' disiapkan.', 'success');
      });
    });

    /* Auto-run dari URL parameter */
    var ipParam = BenoxApp.param('ip');
    var prefixParam = BenoxApp.param('prefix');
    if (ipParam) {
      ipEl.value = ipParam;
      prefixEl.value = prefixParam !== null ? prefixParam : '';
      run(submitBtn);
    }
  }

  global.BenoxIPv4 = {
    compute: compute,
    calculateFromInputs: calculateFromInputs,
    buildSubnets: buildSubnets,
    buildSteps: buildSteps,
    blockInfo: blockInfo
  };

  document.addEventListener('DOMContentLoaded', initPage);
})(window);
