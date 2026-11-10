/* ==========================================================================
   BenoxJK — Practice & Quiz Engine
   Soal dibuat dinamis dari mesin perhitungan, bukan soal statis.
   ========================================================================== */
(function (global) {
  'use strict';

  var U = global.BenoxUtils;

  var CATEGORIES = [
    { id: 'ipv4-basic', label: 'IPv4 Basic', icon: 'bi-globe', desc: 'Kelas, privat, tipe alamat', gen: ipv4Basic },
    { id: 'subnet-mask', label: 'Subnet Mask', icon: 'bi-bounding-box', desc: 'Mask, prefix, wildcard', gen: subnetMask },
    { id: 'network-address', label: 'Network Address', icon: 'bi-bounding-box-circles', desc: 'Menghitung NA', gen: networkAddress },
    { id: 'broadcast', label: 'Broadcast Address', icon: 'bi-broadcast', desc: 'Alamat broadcast', gen: broadcastAddress },
    { id: 'host-range', label: 'Host Range', icon: 'bi-pc-display', desc: 'First, last, usable', gen: hostRange },
    { id: 'flsm', label: 'FLSM', icon: 'bi-grid-3x3-gap', desc: 'Subnet berukuran sama', gen: flsmQuiz },
    { id: 'vlsm', label: 'VLSM', icon: 'bi-node-plus', desc: 'Alokasi fleksibel', gen: vlsmQuiz },
    { id: 'ipv6', label: 'IPv6', icon: 'bi-globe2', desc: 'Prefix, kompresi, tipe', gen: ipv6Quiz }
  ];

  /* ------------------------------ Helpers ------------------------------- */

  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function pick(arr) { return arr[randInt(0, arr.length - 1)]; }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function unique(list) {
    var out = [];
    list.forEach(function (v) {
      if (out.indexOf(v) === -1) out.push(v);
    });
    return out;
  }

  function choice(prompt, answer, distractors, explanation, answerType) {
    var opts = unique([String(answer)].concat(distractors.map(String))).slice(0, 4);
    var filler = ['Tidak ada jawaban yang benar', 'Semua jawaban salah', 'Tidak dapat ditentukan'];
    var fi = 0;
    while (opts.length < 4) opts.push(filler[fi++ % filler.length] + (fi > 3 ? ' ' + fi : ''));
    return {
      type: 'choice',
      prompt: prompt,
      answer: String(answer),
      answerType: answerType || 'text',
      options: shuffle(opts),
      explanation: explanation
    };
  }

  function inputQ(prompt, answer, explanation, unit) {
    return {
      type: 'input',
      prompt: prompt,
      answer: String(answer),
      answerType: 'number',
      unit: unit || '',
      explanation: explanation
    };
  }

  function randomHostAddress(bitsFree) {
    var pools = [
      function () { return '10.' + randInt(1, 254) + '.' + randInt(1, 254) + '.' + randInt(1, 254); },
      function () { return '192.168.' + randInt(1, 254) + '.' + randInt(1, 254); },
      function () { return '172.' + randInt(16, 31) + '.' + randInt(1, 254) + '.' + randInt(1, 254); },
      function () { return '198.51.100.' + randInt(1, 254); },
      function () { return '203.0.113.' + randInt(1, 254); }
    ];
    return pick(pools)();
  }

  function computeOf(ip, prefix) { return global.BenoxIPv4.compute(ip, prefix).data; }
  function prefixMask(p) { return U.intToIPv4(U.prefixToMaskInt(p)); }

  function ipExpl(d, extra) {
    return 'Network: <strong class="mono">' + d.network + '</strong>, broadcast: <strong class="mono">' + d.broadcast +
      '</strong>, host ' + d.firstHost + '–' + d.lastHost + '. ' + (extra || '');
  }

  /* --------------------------- Generators ------------------------------- */

  function ipv4Basic() {
    var privateIp = pick([
      '10.' + randInt(1, 254) + '.' + randInt(0, 255) + '.' + randInt(1, 254),
      '172.' + randInt(16, 31) + '.' + randInt(0, 255) + '.' + randInt(1, 254),
      '192.168.' + randInt(0, 255) + '.' + randInt(1, 254)
    ]);
    var publicIp = pick(['8.8.8.8', '1.1.1.1', '203.0.113.' + randInt(1, 254), '198.51.100.' + randInt(1, 254)]);
    var multicastIp = '224.0.' + randInt(0, 10) + '.' + randInt(1, 254);

    var classOctet = pick([randInt(1, 126), randInt(128, 191), randInt(192, 223)]);
    var cls = classOctet < 127 ? 'A' : classOctet < 192 ? 'B' : 'C';

    return shuffle([
      choice('Alamat IP berikut yang termasuk <strong>alamat privat</strong> adalah…', privateIp,
        [publicIp, multicastIp, '127.0.0.1'],
        'Alamat privat IPv4: 10.0.0.0/8, 172.16.0.0/12, dan 192.168.0.0/16.'),
      choice('Alamat <span class="mono">' + classOctet + '.10.1.1</span> termasuk kelas…', 'Kelas ' + cls,
        ['Kelas A', 'Kelas B', 'Kelas C', 'Kelas D'].filter(function (x) { return x !== 'Kelas ' + cls; }),
        'Oktet pertama 1–126 kelas A, 128–191 kelas B, 192–223 kelas C.'),
      inputQ('Berapa jumlah bit pada alamat IPv4?', 32, 'IPv4 tersusun dari 32 bit (4 oktet × 8 bit).'),
      choice('Alamat <span class="mono">127.0.0.1</span> termasuk jenis…', 'Loopback',
        ['Private', 'Multicast', 'Public'], '127.0.0.0/8 adalah alamat loopback untuk menguji perangkat sendiri.'),
      choice('Subnet mask default untuk kelas B adalah…', '255.255.0.0', ['255.0.0.0', '255.255.255.0', '255.255.254.0'],
        'Kelas B memiliki default mask /16 = 255.255.0.0.'),
      choice('CIDR <span class="mono">/24</span> sama dengan subnet mask…', '255.255.255.0',
        ['255.255.0.0', '255.255.255.128', '255.255.255.240'], '24 bit pertama bernilai 1: 255.255.255.0.'),
      inputQ('Berapa jumlah oktet pada alamat IPv4?', 4, 'IPv4 ditulis sebagai 4 oktet desimal.'),
      inputQ('Berapa nilai maksimum satu oktet IPv4?', 255, 'Setiap oktet terdiri dari 8 bit, rentang 0–255.'),
      choice('Alamat <span class="mono">' + multicastIp + '</span> termasuk…', 'Multicast',
        ['Private', 'Loopback', 'Global Unicast'], 'Rentang 224.0.0.0–239.255.255.255 adalah multicast.'),
      choice('Rentang alamat privat kelas B adalah…', '172.16.0.0 – 172.31.255.255',
        ['172.0.0.0 – 172.255.255.255', '172.16.0.0 – 172.16.255.255', '10.16.0.0 – 10.31.255.255'],
        'RFC 1918 menetapkan 172.16.0.0/12 untuk alamat privat kelas B.')
    ]);
  }

  function subnetMask() {
    var p = pick([9, 11, 12, 18, 20, 22, 25, 26, 27, 28, 29, 30]);
    var p2 = pick([8, 16, 24, 25, 26, 27, 28, 30]);
    var validMask = prefixMask(pick([24, 25, 26, 27, 28, 30]));
    var invalidMask = pick(['255.0.255.0', '255.255.0.255', '255.255.255.127', '0.255.255.0']);

    return shuffle([
      choice('Subnet mask untuk prefix <span class="mono">/' + p + '</span> adalah…', prefixMask(p),
        [prefixMask(Math.max(0, p - 1)), prefixMask(Math.min(32, p + 1)), prefixMask(Math.max(0, p - 2))],
        'Prefix /' + p + ' berarti ' + p + ' bit 1 diikuti 0, setara ' + prefixMask(p) + '.'),
      choice('Subnet mask <span class="mono">' + prefixMask(p2) + '</span> setara dengan prefix…', '/' + p2,
        ['/' + Math.max(0, p2 - 1), '/' + Math.min(32, p2 + 1), '/' + Math.max(0, p2 - 2)],
        'Hitung jumlah bit 1 pada mask: ' + p2 + ' bit → /' + p2 + '.'),
      choice('Wildcard mask untuk prefix <span class="mono">/26</span> adalah…', '0.0.0.63',
        ['0.0.0.64', '0.0.0.32', '255.255.255.192'],
        'Wildcard = kebalikan subnet mask 255.255.255.192 → 0.0.0.63.'),
      inputQ('Berapa <strong>host bit</strong> pada prefix /' + p + '?', 32 - p,
        'Host bit = 32 − prefix = 32 − ' + p + ' = ' + (32 - p) + '.'),
      inputQ('Berapa <strong>network bit</strong> pada prefix /' + p2 + '?', p2,
        'Prefix menunjukkan langsung jumlah network bit: ' + p2 + '.'),
      choice('Manakah subnet mask yang <strong>valid (contiguous)</strong>?', validMask,
        [invalidMask, '255.255.0.255', '255.255.255.127', '255.0.255.0'].filter(function (x) { return x !== validMask; }),
        'Mask valid adalah deretan bit 1 diikuti bit 0 tanpa jeda.'),
      choice('Subnet mask default kelas C adalah…', '255.255.255.0', ['255.255.0.0', '255.0.0.0', '255.255.255.128'],
        'Kelas C memiliki default /24 = 255.255.255.0.'),
      choice('Subnet mask untuk <span class="mono">/30</span> adalah…', '255.255.255.252',
        ['255.255.255.248', '255.255.255.254', '255.255.255.240'], '/30 = 11111111.11111111.11111111.11111100 = 255.255.255.252.'),
      choice('Subnet mask untuk <span class="mono">/11</span> adalah…', '255.224.0.0',
        ['255.192.0.0', '255.240.0.0', '255.255.224.0'], '/11 menyisakan 5 host bit pada oktet kedua: 255.224.0.0.'),
      choice('Subnet mask <span class="mono">255.255.255.192</span> setara prefix…', '/26',
        ['/25', '/27', '/28'], '192 = 11000000 → 2 bit tambahan setelah /24 → /26.')
    ]);
  }

  function networkAddress() {
    var cases = [
      ['10.10.10.10', 11], ['192.168.1.130', 26], ['172.16.5.4', 16],
      ['8.8.8.8', 29], ['192.168.10.77', 22], ['10.20.30.40', 8],
      ['203.0.113.99', 28], ['198.51.100.25', 27], ['192.168.1.200', 25], ['172.20.4.9', 20]
    ];
    var c = pick(cases);
    var d = computeOf(c[0], c[1]);

    return shuffle([
      choice('Berapa <strong>network address</strong> dari <span class="mono">' + d.input + '</span>?', d.network,
        [d.broadcast, d.firstHost, d.lastHost],
        'NA = IP AND mask. ' + ipExpl(d)),
      choice('Berapa <strong>network address</strong> dari <span class="mono">192.168.1.130/26</span>?', '192.168.1.128',
        ['192.168.1.0', '192.168.1.192', '192.168.1.130'],
        '/26 memiliki blok 64: 0, 64, 128, 192. Alamat .130 berada di blok 128.'),
      choice('Network address dari <span class="mono">10.10.10.10/11</span> adalah…', '10.0.0.0',
        ['10.10.0.0', '10.0.0.10', '10.31.255.255'],
        'Mask /11 = 255.224.0.0. 10.10.10.10 AND 255.224.0.0 = 10.0.0.0.'),
      choice('Alamat network selalu memiliki bit host bernilai…', '0',
        ['1', '255', 'Tergantung mask'], 'Pada network address, seluruh host bit bernilai 0.'),
      inputQ('Berapa oktet pertama dari network address <span class="mono">10.20.30.40/8</span>?', 10,
        'Dengan /8, hanya oktet pertama yang dipertahankan: 10.0.0.0.'),
      choice('Network address dari <span class="mono">172.16.5.4/16</span> adalah…', '172.16.0.0',
        ['172.0.0.0', '172.16.5.0', '172.16.255.255'],
        'Mask /16 menjaga dua oktet pertama: 172.16.0.0.'),
      choice('Network address dari <span class="mono">8.8.8.8/29</span> adalah…', '8.8.8.8',
        ['8.8.8.0', '8.8.8.15', '8.8.8.9'],
        'Blok /29 = 8 alamat. 8.8.8.8 jatuh tepat di awal blok, sehingga NA = 8.8.8.8.'),
      choice('Operasi yang dipakai untuk menghitung network address adalah…', 'AND',
        ['OR', 'XOR', 'NOT'], 'IP AND subnet mask menghasilkan network address.'),
      inputQ('Blok subnet /28 berukuran berapa alamat?', 16,
        '2^(32−28) = 2^4 = 16 alamat per blok.'),
      choice('Network address dan broadcast address <span class="mono">192.168.1.0/24</span> adalah…',
        '192.168.1.0 dan 192.168.1.255',
        ['192.168.1.1 dan 192.168.1.254', '192.168.1.0 dan 192.168.1.254', '192.168.1.1 dan 192.168.1.255'],
        'NA adalah alamat pertama (.0), broadcast alamat terakhir (.255).')
    ]);
  }

  function broadcastAddress() {
    var c = pick([
      ['192.168.1.10', 24], ['10.10.10.10', 11], ['172.16.5.4', 20],
      ['192.168.1.130', 26], ['203.0.113.99', 28], ['198.51.100.25', 27],
      ['10.20.30.40', 8], ['192.168.1.200', 25], ['8.8.8.8', 29], ['172.16.0.55', 16]
    ]);
    var d = computeOf(c[0], c[1]);

    return shuffle([
      choice('Berapa <strong>broadcast address</strong> dari <span class="mono">' + d.input + '</span>?', d.broadcast,
        [d.network, d.firstHost, d.lastHost],
        'Broadcast = NA OR wildcard. ' + ipExpl(d)),
      choice('Broadcast address <span class="mono">192.168.1.130/26</span> adalah…', '192.168.1.191',
        ['192.168.1.255', '192.168.1.128', '192.168.1.190'],
        'Subnet .128/26 berakhir di .191, itulah broadcast-nya.'),
      choice('Broadcast address <span class="mono">10.0.0.0/11</span> adalah…', '10.31.255.255',
        ['10.0.255.255', '10.15.255.255', '10.255.255.255'],
        'Host bit /11 = 21 bit, semuanya diisi 1 → 10.31.255.255.'),
      choice('Rumus broadcast address adalah…', 'Network OR Wildcard',
        ['Network AND Mask', 'Network XOR Wildcard', 'Network + 1'],
        'Broadcast dihasilkan dari operasi OR antara network address dan wildcard mask.'),
      choice('Pada subnet /26, alamat broadcast selalu…', 'Alamat terakhir pada blok subnet',
        ['Alamat pertama subnet', 'Alamat sebelum network', 'Sama dengan network'],
        'Broadcast berada di alamat terakhir setiap blok dan tidak dapat dipakai host.'),
      choice('Berapa broadcast dari <span class="mono">172.16.0.0/20</span>?', '172.16.15.255',
        ['172.16.255.255', '172.16.0.255', '172.31.255.255'],
        '/20 menyisakan 12 host bit: blok 172.16.0.0–172.16.15.255.'),
      choice('Prefix /31 menurut RFC 3021…', 'Tidak memiliki broadcast tradisional',
        ['Memiliki 2 broadcast', 'Broadcast = network', 'Tidak dapat dipakai'],
        '/31 dipakai untuk point-to-point dengan 2 host; broadcast tradisional tidak berlaku.'),
      inputQ('Berapa alamat total pada blok /29?', 8, '2^(32−29) = 2^3 = 8 alamat.'),
      choice('Alamat broadcast <span class="mono">255.255.255.255</span> disebut…', 'Limited broadcast',
        ['Network address', 'Loopback', 'Multicast'],
        '255.255.255.255 adalah limited broadcast yang tidak diteruskan router.'),
      choice('Broadcast dari <span class="mono">192.168.10.0/23</span> adalah…', '192.168.11.255',
        ['192.168.10.255', '192.168.12.255', '192.168.11.0'],
        '/23 menggabungkan dua blok /24: 192.168.10.0–192.168.11.255.')
    ]);
  }

  function hostRange() {
    var c = pick([
      ['192.168.1.0', 26], ['192.168.1.0', 25], ['10.0.0.0', 11],
      ['172.16.5.0', 27], ['203.0.113.0', 28], ['8.8.8.0', 29],
      ['198.51.100.0', 30], ['10.20.30.0', 24], ['192.168.1.0', 23], ['172.16.0.0', 20]
    ]);
    var d = computeOf(c[0], c[1]);

    return shuffle([
      choice('Berapa <strong>first host</strong> dari <span class="mono">' + c[0] + '/' + c[1] + '</span>?', d.firstHost,
        [d.network, d.broadcast, d.lastHost],
        'First host = network + 1 = ' + d.firstHost + '.'),
      choice('Berapa <strong>last host</strong> dari <span class="mono">' + c[0] + '/' + c[1] + '</span>?', d.lastHost,
        [d.broadcast, d.firstHost, d.network],
        'Last host = broadcast − 1 = ' + d.lastHost + '.'),
      inputQ('Berapa jumlah host <strong>usable</strong> pada /26?', 62, '2^(32−26) − 2 = 64 − 2 = 62.'),
      inputQ('Berapa jumlah host <strong>usable</strong> pada /24?', 254, '2^8 − 2 = 256 − 2 = 254.'),
      inputQ('Berapa host usable pada prefix /30?', 2, '2^2 − 2 = 2 host usable.'),
      inputQ('Berapa host usable pada prefix /31 (RFC 3021)?', 2, 'Pada /31 tidak ada pengurangan network/broadcast: 2 alamat dapat dipakai.'),
      choice('Rentang host dari <span class="mono">192.168.1.0/25</span> adalah…',
        '192.168.1.1 – 192.168.1.126',
        ['192.168.1.0 – 192.168.1.127', '192.168.1.1 – 192.168.1.127', '192.168.1.0 – 192.168.1.126'],
        'NA .0, broadcast .127, sehingga host .1–.126.'),
      choice('Alamat yang <strong>tidak boleh</strong> diberikan ke host adalah…',
        'Network dan broadcast address',
        ['First host', 'Last host', 'Alamat tengah subnet'],
        'Network dan broadcast dicadangkan, sehingga usable = total − 2.'),
      choice('Host range dari <span class="mono">10.0.0.0/11</span> adalah…',
        '10.0.0.1 – 10.31.255.254',
        ['10.0.0.0 – 10.31.255.255', '10.0.0.1 – 10.31.255.255', '10.0.0.0 – 10.31.255.254'],
        'NA 10.0.0.0 dan broadcast 10.31.255.255, sehingga host .1 sampai .254.'),
      inputQ('Berapa total alamat pada /29?', 8, '2^(32−29) = 8 alamat; 6 di antaranya usable.')
    ]);
  }

  function flsmQuiz() {
    var base = pick([24, 16, 20, 22, 25]);
    var count = pick([2, 4, 8, 16]);
    var borrowed = Math.ceil(Math.log2(count));
    var newPrefix = base + borrowed;
    var step = Math.pow(2, 32 - newPrefix);
    var d = computeOf('192.168.1.0', newPrefix);

    return shuffle([
      choice('Jaringan /' + base + ' dibagi menjadi ' + count + ' subnet sama besar. Prefix barunya adalah…', '/' + newPrefix,
        ['/' + (base + 1), '/' + (newPrefix + 1), '/' + (newPrefix - 1)],
        'Butuh ' + borrowed + ' bit tambahan: ' + base + ' + ' + borrowed + ' = ' + newPrefix + '.'),
      choice('Jaringan /16 dibagi 8 subnet sama besar. Prefix barunya…', '/19',
        ['/18', '/20', '/24'], 'log2(8) = 3 bit → 16 + 3 = /19.'),
      inputQ('Berapa host usable per subnet pada /26?', 62, '2^6 − 2 = 64 − 2 = 62 host.'),
      inputQ('Berapa jumlah subnet jika meminjam 3 bit?', 8, '2^3 = 8 subnet.'),
      choice('Ciri utama FLSM adalah…', 'Semua subnet berukuran sama',
        ['Setiap subnet boleh berbeda ukuran', 'Tidak menggunakan subnet mask', 'Hanya untuk IPv6'],
        'Fixed Length Subnet Mask menggunakan panjang prefix yang sama untuk semua subnet.'),
      choice('192.168.1.0/24 dibagi 4 subnet FLSM. Subnet <strong>kedua</strong> adalah…',
        '192.168.1.64/26',
        ['192.168.1.32/26', '192.168.1.128/26', '192.168.1.192/26'],
        'Blok /26 berukuran 64: .0, .64, .128, .192. Subnet kedua = .64/26.'),
      inputQ('Berapa host usable per subnet pada /25?', 126, '2^7 − 2 = 126 host.'),
      inputQ('Berapa subnet yang terbentuk jika /24 dipinjam 2 bit?', 4, '2^2 = 4 subnet.'),
      choice('Subnet mask baru untuk /24 yang dipinjam 3 bit adalah…', '255.255.255.224',
        ['255.255.255.240', '255.255.255.192', '255.255.255.128'],
        '/27 = 255.255.255.224.'),
      choice('Rumus jumlah subnet FLSM adalah…', '2^bit pinjam',
        ['2^(32−prefix)', '2 × bit pinjam', 'prefix − 2'],
        'Jumlah subnet = 2^bit yang dipinjam dari bagian host.')
    ]);
  }

  function vlsmQuiz() {
    return shuffle([
      choice('Kebutuhan 50 host per subnet. Prefix minimum yang tepat adalah…', '/26',
        ['/25', '/27', '/24'], '/26 memberi 62 host usable; /27 hanya 30 sehingga tidak cukup.'),
      choice('Kebutuhan 100 host per subnet. Prefix yang tepat…', '/25',
        ['/24', '/26', '/27'], '/25 memberi 126 host usable, /26 hanya 62.'),
      choice('Kebutuhan 10 host per subnet. Prefix paling efisien…', '/28',
        ['/27', '/29', '/30'], '/28 memberi 14 host usable; /29 hanya 6.'),
      choice('Kebutuhan 2 host per subnet. Prefix paling efisien…', '/30',
        ['/29', '/28', '/31'], '/30 memberi tepat 2 host usable.'),
      choice('Urutan alokasi VLSM yang benar adalah…', 'Dari kebutuhan host terbesar ke terkecil',
        ['Dari terkecil ke terbesar', 'Acak', 'Berdasarkan abjad nama subnet'],
        'Blok besar dialokasikan lebih dulu agar tidak meninggalkan ruang yang tidak dapat dipakai blok besar.'),
      inputQ('Berapa ukuran blok (alamat) untuk kebutuhan 25 host?', 32,
        'Host + 2 = 27 → pangkat 2 berikutnya = 32.'),
      inputQ('Berapa host usable pada prefix /27?', 30, '2^(32−27) − 2 = 32 − 2 = 30.'),
      choice('Perbedaan utama VLSM dan FLSM adalah…', 'VLSM memakai prefix berbeda tiap subnet',
        ['VLSM hanya untuk IPv6', 'VLSM tidak memakai subnet mask', 'FLSM lebih hemat alamat'],
        'VLSM (Variable Length Subnet Mask) menyesuaikan ukuran subnet dengan kebutuhan.'),
      inputQ('Berapa jumlah alamat pada blok yang dibutuhkan 100 host (termasuk network dan broadcast)?', 128,
        '100 + 2 = 102 → pangkat 2 berikutnya 128.'),
      choice('Kebutuhan 500 host per subnet. Prefix yang tepat…', '/23',
        ['/24', '/22', '/25'], '/23 memberi 510 host usable; /24 hanya 254.')
    ]);
  }

  function ipv6Quiz() {
    var hextets = [
      '2001', '0db8', '0000', '0000', '0000', 'ff00', '0042', '0001'
    ];
    var expanded = hextets.join(':');
    var compressed = U.compressIPv6(expanded).text;
    var randomHex = [
      'fe80', '0000', '0000', '0000', '0201', '00ff', 'fe00', '0001'
    ];
    var randomExpanded = randomHex.join(':');
    var randomCompressed = U.compressIPv6(randomExpanded).text;

    return shuffle([
      choice('Bentuk kompresi dari <span class="mono">' + expanded + '</span> adalah…', compressed,
        [randomCompressed, '2001:db8::ff00:42:1', '2001:db8:0:0:0:ff00:42::1'],
        'Grup nol berurutan terpanjang diganti "::". Hasil: ' + compressed + '.'),
      choice('Bentuk ekspansi dari <span class="mono">' + randomCompressed + '</span> adalah…', randomExpanded,
        [expanded, 'fe80:0:0:0:201:ff:fe00:1', 'fe80:0000:0000:0000:0201:00ff:fe00:0000'],
        '"::" diisi grup 0000 hingga total 8 hextet: ' + randomExpanded + '.'),
      inputQ('Berapa total bit pada alamat IPv6?', 128, 'IPv6 menggunakan 128 bit = 8 hextet × 16 bit.'),
      inputQ('Berapa jumlah grup hextet pada alamat IPv6 lengkap?', 8, 'Alamat IPv6 lengkap terdiri dari 8 grup hextet.'),
      choice('Alamat <span class="mono">fe80::1</span> termasuk…', 'Link-Local Unicast',
        ['Global Unicast', 'Multicast', 'Loopback'], 'Prefix fe80::/10 adalah link-local unicast.'),
      choice('Alamat <span class="mono">ff02::1</span> termasuk…', 'Multicast',
        ['Unicast', 'Anycast', 'Loopback'], 'ff00::/8 adalah ruang multicast IPv6.'),
      choice('Alamat <span class="mono">::1</span> adalah…', 'Loopback',
        ['Unspecified', 'Link-Local', 'Global Unicast'], '::1 adalah loopback IPv6, setara 127.0.0.1.'),
      inputQ('Pada prefix /64, berapa host bit yang tersedia?', 64, '128 − 64 = 64 host bit.'),
      choice('Pernyataan yang benar tentang broadcast IPv6 adalah…', 'IPv6 tidak memiliki broadcast address',
        ['IPv6 memakai broadcast di ff02::', 'Broadcast IPv6 adalah alamat terakhir', 'Broadcast IPv6 = ::'],
        'IPv6 menggantikan broadcast dengan multicast.'),
      choice('Kapasitas alamat pada prefix /64 adalah…', '2^64 alamat',
        ['2^32 alamat', '2^128 alamat', '2^96 alamat'], 'Kapasitas = 2^(128−64) = 2^64 ≈ 1,84 × 10^19 alamat.')
    ]);
  }

  /* ------------------------------ Controller ---------------------------- */

  function init() {
    var setup = document.getElementById('quizSetup');
    if (!setup) return;

    var stage = document.getElementById('quizStage');
    var resultStage = document.getElementById('quizResultStage');
    var catWrap = document.getElementById('quizCats');
    var startBtn = document.getElementById('quizStart');
    var timerToggle = document.getElementById('quizTimerToggle');
    var countSelect = document.getElementById('quizCount');
    var selected = 'ipv4-basic';
    var state = { questions: [], index: 0, answers: [], category: null, timerId: null, remaining: 0, locked: false };

    catWrap.innerHTML = CATEGORIES.map(function (c) {
      return '<button type="button" class="quiz-cat' + (c.id === selected ? ' selected' : '') + '" data-category="' + c.id + '">' +
        '<span class="cat-icon"><i class="bi ' + c.icon + '"></i></span>' +
        '<strong>' + c.label + '</strong><small>' + c.desc + '</small></button>';
    }).join('');

    catWrap.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-category]');
      if (!btn) return;
      selected = btn.getAttribute('data-category');
      catWrap.querySelectorAll('.quiz-cat').forEach(function (el) {
        el.classList.toggle('selected', el === btn);
      });
    });

    function categoryById(id) {
      return CATEGORIES.filter(function (c) { return c.id === id; })[0] || CATEGORIES[0];
    }

    function generateQuestions(cat, count) {
      var all = cat.gen();
      var mixed = [];
      for (var i = 0; i < count; i++) {
        mixed.push(all[i % all.length]);
      }
      return shuffle(mixed).slice(0, count);
    }

    function stopTimer() {
      if (state.timerId) {
        clearInterval(state.timerId);
        state.timerId = null;
      }
    }

    function renderTimer() {
      var el = document.getElementById('quizTimer');
      if (!el) return;
      if (!timerToggle.checked) { el.classList.add('d-none'); return; }
      el.classList.remove('d-none');
      var m = Math.floor(state.remaining / 60);
      var s = state.remaining % 60;
      el.innerHTML = '<i class="bi bi-stopwatch"></i> ' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
      el.classList.toggle('warning', state.remaining <= 60);
    }

    function startTimer(seconds) {
      stopTimer();
      state.remaining = seconds;
      renderTimer();
      if (!timerToggle.checked) return;
      state.timerId = setInterval(function () {
        state.remaining--;
        renderTimer();
        if (state.remaining <= 0) {
          stopTimer();
          finish(true);
        }
      }, 1000);
    }

    function renderProgress() {
      document.getElementById('quizProgressText').textContent =
        'Soal ' + (state.index + 1) + ' / ' + state.questions.length;
      document.getElementById('quizCatLabel').innerHTML =
        '<i class="bi ' + state.category.icon + '"></i> ' + state.category.label;
      var pct = (state.index / state.questions.length) * 100;
      document.getElementById('quizProgressBar').style.width = pct + '%';
    }

    function renderQuestion() {
      state.locked = false;
      renderProgress();
      var q = state.questions[state.index];
      var mount = document.getElementById('quizQuestionMount');
      var feedback = document.getElementById('quizFeedback');
      var nextBtn = document.getElementById('quizNext');
      feedback.className = 'quiz-feedback d-none';
      feedback.innerHTML = '';
      nextBtn.disabled = true;
      nextBtn.innerHTML = 'Jawab dulu <i class="bi bi-lock"></i>';

      var html = '<div class="quiz-question">' + q.prompt + '</div>';

      if (q.type === 'choice') {
        html += '<div class="quiz-options">' + q.options.map(function (opt, i) {
          return '<button type="button" class="quiz-option">' +
            '<span class="opt-key">' + String.fromCharCode(65 + i) + '</span>' +
            '<span>' + opt + '</span></button>';
        }).join('') + '</div>';
      } else {
        html += '<form class="quiz-answer-input" id="quizAnswerForm">' +
          '<input type="text" inputmode="decimal" class="form-control" id="quizAnswerInput" placeholder="Ketik jawaban angka…" autocomplete="off">' +
          '<button type="submit" class="btn-gradient"><i class="bi bi-send"></i> Kirim</button>' +
          '</form>';
      }
      mount.innerHTML = html;

      if (q.type === 'choice') {
        mount.querySelectorAll('.quiz-option').forEach(function (btn) {
          btn.addEventListener('click', function () {
            if (state.locked) return;
            submitAnswer(btn.querySelector('span:last-child').textContent);
          });
        });
      } else {
        var form = document.getElementById('quizAnswerForm');
        var inputEl = document.getElementById('quizAnswerInput');
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          if (state.locked) return;
          if (!inputEl.value.trim()) {
            inputEl.classList.add('is-invalid');
            BenoxApp.toast('Isi jawaban terlebih dahulu.', 'warning');
            return;
          }
          submitAnswer(inputEl.value);
        });
        inputEl.focus();
      }
    }

    function isCorrect(q, response) {
      var raw = String(response === undefined || response === null ? '' : response).trim();
      if (q.answerType === 'number') {
        var cleaned = raw.replace(/[.\s]/g, '');
        if (!/^-?\d+$/.test(cleaned)) return false;
        return Number(cleaned) === Number(q.answer);
      }
      if (q.answerType === 'ip') {
        var parsed = U.parseIPv4(raw);
        return parsed.ok && parsed.normal === q.answer;
      }
      return raw.toLowerCase() === String(q.answer).toLowerCase();
    }

    function submitAnswer(response) {
      state.locked = true;
      var q = state.questions[state.index];
      var correct = isCorrect(q, response);
      state.answers.push({ question: q, response: response, correct: correct });

      if (q.type === 'choice') {
        document.querySelectorAll('.quiz-option').forEach(function (btn) {
          btn.disabled = true;
          var text = btn.querySelector('span:last-child').textContent;
          if (text === q.answer) btn.classList.add('correct');
          else if (text === String(response)) btn.classList.add('wrong');
        });
      } else {
        var inputEl = document.getElementById('quizAnswerInput');
        if (inputEl) { inputEl.disabled = true; }
        var form = document.getElementById('quizAnswerForm');
        if (form) form.querySelector('button').disabled = true;
      }

      var feedback = document.getElementById('quizFeedback');
      feedback.className = 'quiz-feedback ' + (correct ? 'correct' : 'wrong');
      feedback.innerHTML =
        '<strong><i class="bi ' + (correct ? 'bi-check-circle-fill' : 'bi-x-circle-fill') + '"></i> ' +
        (correct ? 'Jawaban benar' : 'Jawaban belum tepat') + '</strong>' +
        (correct ? '' : '<div>Jawaban benar: <span class="mono">' + q.answer + '</span></div>') +
        '<div class="fb-detail">' + q.explanation + '</div>';

      var nextBtn = document.getElementById('quizNext');
      nextBtn.disabled = false;
      nextBtn.innerHTML = (state.index === state.questions.length - 1 ? 'Lihat Hasil' : 'Soal Berikutnya') + ' <i class="bi bi-arrow-right"></i>';
      document.getElementById('quizProgressBar').style.width = ((state.index + 1) / state.questions.length * 100) + '%';
    }

    function finish(timeUp) {
      stopTimer();
      stage.classList.add('d-none');
      resultStage.classList.remove('d-none');
      var total = state.questions.length;
      var answered = state.answers.length;
      var correct = state.answers.filter(function (a) { return a.correct; }).length;
      var pct = Math.round((correct / total) * 100);

      var message = pct >= 90 ? 'Luar biasa! Penguasaan materi sangat baik.'
        : pct >= 75 ? 'Bagus! Sedikit latihan lagi untuk sempurna.'
        : pct >= 60 ? 'Cukup baik. Pelajari kembali pembahasan yang salah.'
        : 'Perlu latihan tambahan. Baca Learning Center lalu coba lagi.';

      var scoreRing = document.getElementById('quizScoreRing');
      scoreRing.style.setProperty('--pct', pct);
      document.getElementById('quizScoreValue').textContent = pct + '%';
      document.getElementById('quizScoreTitle').textContent = message;
      document.getElementById('quizScoreDetail').innerHTML =
        '<span class="badge-soft"><i class="bi bi-check2"></i> ' + correct + ' benar</span> ' +
        '<span class="badge-soft"><i class="bi bi-x"></i> ' + (answered - correct) + ' salah</span> ' +
        '<span class="badge-soft"><i class="bi bi-list-ol"></i> ' + answered + '/' + total + ' dijawab</span>' +
        (timeUp ? ' <span class="badge-soft text-warning"><i class="bi bi-stopwatch"></i> Waktu habis</span>' : '');

      var review = state.answers.map(function (a, i) {
        return '<div class="review-item">' +
          '<div class="ri-head"><i class="bi ' + (a.correct ? 'bi-check-circle-fill" style="color:#34d399' : 'bi-x-circle-fill" style="color:#f87171') + '"></i>' +
          '<span class="ri-q">' + (i + 1) + '. ' + a.question.prompt + '</span></div>' +
          '<div class="ri-a">Jawaban Anda: ' + BenoxApp.escape(a.response) + ' • Kunci: ' + a.question.answer + '</div>' +
        '</div>';
      }).join('');

      var unanswered = state.questions.slice(answered).map(function (q, i) {
        return '<div class="review-item"><div class="ri-head"><i class="bi bi-dash-circle" style="color:#94a3b8"></i>' +
          '<span class="ri-q">' + (answered + i + 1) + '. ' + q.prompt + '</span></div>' +
          '<div class="ri-a">Tidak dijawab • Kunci: ' + q.answer + '</div></div>';
      }).join('');

      document.getElementById('quizReview').innerHTML = review + unanswered;
      resultStage.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function startQuiz() {
      var cat = categoryById(selected);
      var count = parseInt(countSelect.value, 10) || 10;
      state.category = cat;
      state.questions = generateQuestions(cat, count);
      state.index = 0;
      state.answers = [];
      state.locked = false;

      setup.classList.add('d-none');
      resultStage.classList.add('d-none');
      stage.classList.remove('d-none');
      stage.classList.add('result-enter');
      renderQuestion();
      startTimer(60 * count);
      stage.scrollIntoView({ behavior: 'smooth', block: 'start' });
      BenoxApp.toast(count + ' soal ' + cat.label + ' dibuat.', 'info');
    }

    startBtn.addEventListener('click', startQuiz);

    document.getElementById('quizNext').addEventListener('click', function () {
      if (!state.locked) return;
      if (state.index >= state.questions.length - 1) {
        finish(false);
      } else {
        state.index++;
        renderQuestion();
      }
    });

    document.getElementById('quizQuit').addEventListener('click', function () {
      stopTimer();
      stage.classList.add('d-none');
      resultStage.classList.add('d-none');
      setup.classList.remove('d-none');
      setup.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    document.getElementById('quizRetry').addEventListener('click', function () {
      startQuiz();
    });

    document.getElementById('quizChangeCategory').addEventListener('click', function () {
      stopTimer();
      resultStage.classList.add('d-none');
      setup.classList.remove('d-none');
      setup.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  global.BenoxQuiz = { categories: CATEGORIES, init: init };
  document.addEventListener('DOMContentLoaded', init);
})(window);
