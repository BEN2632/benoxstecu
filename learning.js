/* ==========================================================================
   BenoxJK — Learning Center
   Materi dasar jaringan, IPv4/IPv6, subnetting, dan prefix planning.
   ========================================================================== */
(function (global) {
  'use strict';

  var TOPICS = [
    {
      id: 'dasar-jaringan',
      num: '01',
      icon: 'bi-diagram-3',
      category: 'Dasar',
      title: 'Dasar-Dasar Jaringan Komputer',
      summary: 'Konsep jaringan, perangkat, dan peran alamat IP dalam pengiriman data.',
      html:
        '<h4><i class="bi bi-info-circle"></i> Penjelasan</h4>' +
        '<p>Jaringan komputer adalah kumpulan perangkat yang saling terhubung sehingga dapat bertukar data. Agar data sampai ke perangkat yang benar, setiap perangkat membutuhkan alamat logis. Pada jaringan modern, alamat logis tersebut adalah <strong>IP Address</strong>.</p>' +
        '<p>Data dikirim dalam bentuk <strong>paket</strong>. Paket berisi alamat sumber, alamat tujuan, dan potongan data. Router membaca alamat tujuan lalu meneruskan paket ke jaringan yang tepat.</p>' +
        '<h4><i class="bi bi-table"></i> Ilustrasi Peran Alamat</h4>' +
        '<table class="calc-table"><thead><tr><th>Perangkat</th><th>Alamat IP</th><th>Peran</th></tr></thead><tbody>' +
        '<tr><td>Laptop</td><td class="mono">192.168.1.10</td><td>Mengirim permintaan</td></tr>' +
        '<tr><td>Server</td><td class="mono">192.168.1.20</td><td>Menyediakan data</td></tr>' +
        '<tr><td>Router</td><td class="mono">192.168.1.1</td><td>Menghubungkan antarjaringan</td></tr>' +
        '</tbody></table>' +
        '<h4><i class="bi bi-calculator"></i> Contoh Sederhana</h4>' +
        '<p>Laptop <span class="mono">192.168.1.10</span> mengirim data ke server <span class="mono">192.168.1.20</span>. Karena keduanya berada dalam subnet yang sama (<span class="mono">192.168.1.0/24</span>), paket dikirim langsung tanpa melewati router.</p>' +
        '<div class="callout"><strong>Kesimpulan:</strong> Jaringan membutuhkan pengalamatan yang konsisten. Subnetting membagi jaringan besar menjadi bagian yang lebih kecil agar pengelolaan dan keamanan lebih baik.</div>'
    },
    {
      id: 'pengertian-ipv4',
      num: '02',
      icon: 'bi-globe',
      category: 'IPv4',
      title: 'Pengertian IPv4',
      summary: 'Alamat 32-bit, kelas A–E, alamat privat, dan keterbatasannya.',
      html:
        '<h4><i class="bi bi-info-circle"></i> Penjelasan</h4>' +
        '<p><strong>IPv4 (Internet Protocol version 4)</strong> adalah pengalamatan 32 bit yang ditulis sebagai empat oktet desimal dipisahkan titik. Setiap oktet bernilai 0–255, sehingga total ada <span class="mono">2^32 ≈ 4,29 miliar</span> alamat.</p>' +
        '<h4><i class="bi bi-table"></i> Struktur dan Kelas</h4>' +
        '<table class="calc-table"><thead><tr><th>Kelas</th><th>Oktet Pertama</th><th>Default Mask</th></tr></thead><tbody>' +
        '<tr><td>A</td><td class="mono">1 – 126</td><td class="mono">255.0.0.0 (/8)</td></tr>' +
        '<tr><td>B</td><td class="mono">128 – 191</td><td class="mono">255.255.0.0 (/16)</td></tr>' +
        '<tr><td>C</td><td class="mono">192 – 223</td><td class="mono">255.255.255.0 (/24)</td></tr>' +
        '<tr><td>D</td><td class="mono">224 – 239</td><td>Multicast</td></tr>' +
        '<tr><td>E</td><td class="mono">240 – 255</td><td>Reserved</td></tr>' +
        '</tbody></table>' +
        '<p>Alamat privat tidak dirutekan di internet: <span class="mono">10.0.0.0/8</span>, <span class="mono">172.16.0.0/12</span>, dan <span class="mono">192.168.0.0/16</span>.</p>' +
        '<h4><i class="bi bi-binary"></i> Contoh Konversi</h4>' +
        '<p><span class="mono">192.168.1.10</span> dalam biner:</p>' +
        '<div class="formula">11000000.10101000.00000001.00001010</div>' +
        '<div class="callout"><strong>Kesimpulan:</strong> IPv4 mudah dibaca tetapi jumlah alamatnya terbatas. Karena itu muncul subnetting, NAT, dan IPv6.</div>'
    },
    {
      id: 'pengertian-ipv6',
      num: '03',
      icon: 'bi-globe2',
      category: 'IPv6',
      title: 'Pengertian IPv6',
      summary: 'Pengalamatan 128-bit, hextet, notasi "::", dan tipe alamat.',
      html:
        '<h4><i class="bi bi-info-circle"></i> Penjelasan</h4>' +
        '<p><strong>IPv6</strong> menggunakan 128 bit sehingga menyediakan <span class="mono">2^128 ≈ 3,4 × 10^38</span> alamat. Alamat ditulis sebagai 8 grup hextet (16 bit per grup), dipisahkan titik dua. Huruf heksadesimal ditulis kecil.</p>' +
        '<p>Contoh: <span class="mono">2001:0db8:abcd:0012:0000:0000:0000:0001</span> dapat dikompresi menjadi <span class="mono">2001:db8:abcd:12::1</span>.</p>' +
        '<h4><i class="bi bi-table"></i> Tipe Alamat Umum</h4>' +
        '<table class="calc-table"><thead><tr><th>Prefix</th><th>Tipe</th><th>Fungsi</th></tr></thead><tbody>' +
        '<tr><td class="mono">2000::/3</td><td>Global Unicast</td><td>Alamat publik</td></tr>' +
        '<tr><td class="mono">fe80::/10</td><td>Link-Local</td><td>Komunikasi satu link</td></tr>' +
        '<tr><td class="mono">fc00::/7</td><td>Unique Local</td><td>Setara alamat privat</td></tr>' +
        '<tr><td class="mono">ff00::/8</td><td>Multicast</td><td>Pengganti broadcast</td></tr>' +
        '<tr><td class="mono">::1</td><td>Loopback</td><td>Uji perangkat sendiri</td></tr>' +
        '</tbody></table>' +
        '<h4><i class="bi bi-calculator"></i> Contoh</h4>' +
        '<div class="formula">2001:db8:abcd:0012::1/64</div>' +
        '<p>Prefix /64 berarti 64 bit pertama adalah network, 64 bit terakhir adalah host identifier.</p>' +
        '<div class="callout"><strong>Kesimpulan:</strong> IPv6 <strong>tidak memiliki broadcast address</strong>. Alamat multicast menggantikan fungsi broadcast.</div>'
    },
    {
      id: 'ip-address',
      num: '04',
      icon: 'bi-hdd-network',
      category: 'Dasar',
      title: 'IP Address: Network dan Host',
      summary: 'Membaca bagian network dan host pada sebuah alamat.',
      html:
        '<h4><i class="bi bi-info-circle"></i> Penjelasan</h4>' +
        '<p>Sebuah alamat IP selalu mengandung dua informasi: <strong>network</strong> (jaringan tempat perangkat berada) dan <strong>host</strong> (identitas perangkat di jaringan tersebut). Batas keduanya ditentukan oleh subnet mask atau prefix.</p>' +
        '<h4><i class="bi bi-table"></i> Contoh Pembagian</h4>' +
        '<table class="calc-table"><thead><tr><th>Alamat</th><th>Prefix</th><th>Network</th><th>Host</th></tr></thead><tbody>' +
        '<tr><td class="mono">192.168.1.10</td><td class="mono">/24</td><td class="mono">192.168.1.0</td><td class="mono">0.0.0.10</td></tr>' +
        '<tr><td class="mono">10.10.10.10</td><td class="mono">/11</td><td class="mono">10.0.0.0</td><td class="mono">0.10.10.10</td></tr>' +
        '<tr><td class="mono">172.16.5.4</td><td class="mono">/16</td><td class="mono">172.16.0.0</td><td class="mono">0.0.5.4</td></tr>' +
        '</tbody></table>' +
        '<h4><i class="bi bi-calculator"></i> Rumus</h4>' +
        '<div class="formula"><span class="eq">Network =</span> IP AND Mask</div>' +
        '<div class="formula"><span class="eq">Host ID =</span> IP AND Wildcard</div>' +
        '<p>Host ID pada contoh di atas ditulis sebagai 4 oktet, yaitu bagian alamat di luar network.</p>' +
        '<div class="callout"><strong>Kesimpulan:</strong> Dua perangkat bisa berkomunikasi langsung jika network-nya sama. Jika berbeda network, diperlukan router.</div>'
    },
    {
      id: 'subnet-mask',
      num: '05',
      icon: 'bi-bounding-box',
      category: 'Subnetting',
      title: 'Subnet Mask',
      summary: 'Deretan bit 1 dan 0 yang memisahkan network dari host.',
      html:
        '<h4><i class="bi bi-info-circle"></i> Penjelasan</h4>' +
        '<p><strong>Subnet mask</strong> adalah angka 32 bit berisi deretan 1 diikuti deretan 0. Bit 1 menandai bagian network, bit 0 menandai bagian host. Mask harus <strong>contiguous</strong> — tidak boleh ada 1 setelah 0.</p>' +
        '<h4><i class="bi bi-table"></i> Konversi Prefix ke Mask</h4>' +
        '<table class="calc-table"><thead><tr><th>Oktet</th><th>Biner</th><th>Desimal</th></tr></thead><tbody>' +
        '<tr><td>1</td><td class="mono">11111111</td><td class="mono">255</td></tr>' +
        '<tr><td>2</td><td class="mono">11100000</td><td class="mono">224</td></tr>' +
        '<tr><td>3</td><td class="mono">00000000</td><td class="mono">0</td></tr>' +
        '<tr><td>4</td><td class="mono">00000000</td><td class="mono">0</td></tr>' +
        '</tbody></table>' +
        '<h4><i class="bi bi-calculator"></i> Contoh /11</h4>' +
        '<p>Prefix 11 berarti 11 bit pertama bernilai 1:</p>' +
        '<div class="formula">11111111.11100000.00000000.00000000</div>' +
        '<div class="formula"><span class="eq">SUB2 =</span> <strong>255.224.0.0</strong></div>' +
        '<p>SUB1 adalah mask default kelas: untuk kelas A <span class="mono">255.0.0.0</span>.</p>' +
        '<div class="callout"><strong>Kesimpulan:</strong> Subnet mask menentukan ukuran jaringan. Semakin banyak bit 1, semakin kecil jumlah host.</div>'
    },
    {
      id: 'cidr',
      num: '06',
      icon: 'bi-slash-circle',
      category: 'Subnetting',
      title: 'CIDR & Prefix Length',
      summary: 'Notasi /n, hubungannya dengan mask, dan jumlah host.',
      html:
        '<h4><i class="bi bi-info-circle"></i> Penjelasan</h4>' +
        '<p><strong>CIDR (Classless Inter-Domain Routing)</strong> menulis subnet mask sebagai jumlah bit network setelah garis miring, contoh <span class="mono">192.168.1.0/24</span>. Notasi ini tidak terikat kelas A/B/C.</p>' +
        '<h4><i class="bi bi-table"></i> Tabel Prefix</h4>' +
        '<table class="calc-table"><thead><tr><th>Prefix</th><th>Subnet Mask</th><th>Total IP</th><th>Usable</th></tr></thead><tbody>' +
        '<tr><td class="mono">/24</td><td class="mono">255.255.255.0</td><td class="mono">256</td><td class="mono">254</td></tr>' +
        '<tr><td class="mono">/25</td><td class="mono">255.255.255.128</td><td class="mono">128</td><td class="mono">126</td></tr>' +
        '<tr><td class="mono">/26</td><td class="mono">255.255.255.192</td><td class="mono">64</td><td class="mono">62</td></tr>' +
        '<tr><td class="mono">/30</td><td class="mono">255.255.255.252</td><td class="mono">4</td><td class="mono">2</td></tr>' +
        '</tbody></table>' +
        '<h4><i class="bi bi-calculator"></i> Rumus</h4>' +
        '<div class="formula"><span class="eq">Total IP =</span> 2^(32 − prefix)</div>' +
        '<div class="formula"><span class="eq">Usable =</span> 2^(32 − prefix) − 2</div>' +
        '<p>Contoh /26: <span class="mono">2^6 = 64</span> alamat, <span class="mono">64 − 2 = 62</span> host usable.</p>' +
        '<div class="callout"><strong>Kesimpulan:</strong> CIDR membuat pembagian jaringan lebih fleksibel dan menjadi dasar FLSM serta VLSM.</div>'
    },
    {
      id: 'network-address',
      num: '07',
      icon: 'bi-bounding-box-circles',
      category: 'Subnetting',
      title: 'Network Address',
      summary: 'Alamat pertama subnet, hasil operasi AND antara IP dan mask.',
      html:
        '<h4><i class="bi bi-info-circle"></i> Penjelasan</h4>' +
        '<p><strong>Network address (NA)</strong> adalah alamat yang mewakili sebuah jaringan. Semua bit host pada NA bernilai 0. NA tidak dapat diberikan kepada host.</p>' +
        '<h4><i class="bi bi-table"></i> Contoh Biner</h4>' +
        '<table class="calc-table"><thead><tr><th>Komponen</th><th>Biner</th></tr></thead><tbody>' +
        '<tr><td>IP 10.10.10.10</td><td class="mono">00001010.00001010.00001010.00001010</td></tr>' +
        '<tr><td>Mask /11</td><td class="mono">11111111.11100000.00000000.00000000</td></tr>' +
        '<tr><td>AND (NA)</td><td class="mono">00001010.00000000.00000000.00000000</td></tr>' +
        '</tbody></table>' +
        '<h4><i class="bi bi-calculator"></i> Contoh</h4>' +
        '<div class="formula"><span class="eq">10.10.10.10 AND 255.224.0.0 =</span> <strong>10.0.0.0</strong></div>' +
        '<p>Jadi network address dari <span class="mono">10.10.10.10/11</span> adalah <span class="mono">10.0.0.0</span>.</p>' +
        '<div class="callout"><strong>Kesimpulan:</strong> Selalu hitung NA terlebih dahulu; dari NA kita bisa menentukan broadcast dan rentang host.</div>'
    },
    {
      id: 'broadcast-address',
      num: '08',
      icon: 'bi-broadcast',
      category: 'Subnetting',
      title: 'Broadcast Address',
      summary: 'Alamat terakhir subnet, hasil OR network dengan wildcard mask.',
      html:
        '<h4><i class="bi bi-info-circle"></i> Penjelasan</h4>' +
        '<p><strong>Broadcast address</strong> adalah alamat terakhir dalam subnet, dengan semua bit host bernilai 1. Paket ke alamat ini diterima semua host di subnet tersebut. Broadcast tidak dapat dipakai sebagai alamat host.</p>' +
        '<h4><i class="bi bi-table"></i> Contoh</h4>' +
        '<table class="calc-table"><thead><tr><th>Item</th><th>Nilai</th></tr></thead><tbody>' +
        '<tr><td>Network</td><td class="mono">10.0.0.0</td></tr>' +
        '<tr><td>Wildcard /11</td><td class="mono">0.31.255.255</td></tr>' +
        '<tr><td>Broadcast</td><td class="mono">10.31.255.255</td></tr>' +
        '</tbody></table>' +
        '<h4><i class="bi bi-calculator"></i> Rumus</h4>' +
        '<div class="formula"><span class="eq">Wildcard =</span> 255.255.255.255 − Mask</div>' +
        '<div class="formula"><span class="eq">BOARD =</span> NA OR Wildcard</div>' +
        '<div class="formula"><span class="eq">BOARD =</span> NA + Total IP − 1</div>' +
        '<p>Prefix /31 dan /32 tidak memiliki broadcast tradisional (RFC 3021).</p>' +
        '<div class="callout"><strong>Kesimpulan:</strong> Host usable berada di antara NA + 1 dan broadcast − 1.</div>'
    },
    {
      id: 'host-address',
      num: '09',
      icon: 'bi-pc-display',
      category: 'Subnetting',
      title: 'Host Address & Rentang Host',
      summary: 'Alamat yang boleh dipakai perangkat dan cara menghitung jumlahnya.',
      html:
        '<h4><i class="bi bi-info-circle"></i> Penjelasan</h4>' +
        '<p><strong>Host address</strong> adalah alamat yang dapat diberikan kepada perangkat. Rentangnya dimulai dari network + 1 sampai broadcast − 1.</p>' +
        '<h4><i class="bi bi-table"></i> Contoh /26</h4>' +
        '<table class="calc-table"><thead><tr><th>Bagian</th><th>Alamat</th></tr></thead><tbody>' +
        '<tr><td>Network</td><td class="mono">192.168.1.128</td></tr>' +
        '<tr><td>First host</td><td class="mono">192.168.1.129</td></tr>' +
        '<tr><td>Last host</td><td class="mono">192.168.1.190</td></tr>' +
        '<tr><td>Broadcast</td><td class="mono">192.168.1.191</td></tr>' +
        '</tbody></table>' +
        '<h4><i class="bi bi-calculator"></i> Rumus</h4>' +
        '<div class="formula"><span class="eq">First Host =</span> Network + 1</div>' +
        '<div class="formula"><span class="eq">Last Host =</span> Broadcast − 1</div>' +
        '<div class="formula"><span class="eq">Usable =</span> Total IP − 2</div>' +
        '<p>Untuk /31 berlaku 2 host usable, dan /32 hanya 1 alamat.</p>' +
        '<div class="callout"><strong>Kesimpulan:</strong> Jumlah host usable selalu dua lebih sedikit dari total alamat, kecuali prefix khusus.</div>'
    },
    {
      id: 'binary-conversion',
      num: '10',
      icon: 'bi-123',
      category: 'Dasar',
      title: 'Binary Conversion',
      summary: 'Mengubah desimal oktet ke biner dan sebaliknya.',
      html:
        '<h4><i class="bi bi-info-circle"></i> Penjelasan</h4>' +
        '<p>Setiap oktet IPv4 adalah 8 bit. Nilai posisi bit dari kiri ke kanan adalah 128, 64, 32, 16, 8, 4, 2, 1. Jumlahkan posisi yang bernilai 1 untuk mendapat nilai desimal.</p>' +
        '<h4><i class="bi bi-table"></i> Tabel Posisi Bit</h4>' +
        '<table class="calc-table"><thead><tr><th>128</th><th>64</th><th>32</th><th>16</th><th>8</th><th>4</th><th>2</th><th>1</th></tr></thead><tbody>' +
        '<tr><td class="mono">1</td><td class="mono">1</td><td class="mono">0</td><td class="mono">0</td><td class="mono">0</td><td class="mono">0</td><td class="mono">0</td><td class="mono">0</td></tr>' +
        '</tbody></table>' +
        '<p>Baris di atas bernilai <span class="mono">128 + 64 = 192</span>.</p>' +
        '<h4><i class="bi bi-calculator"></i> Contoh</h4>' +
        '<p>Konversi <span class="mono">224</span>:</p>' +
        '<div class="formula">224 = 128 + 64 + 32 → 11100000</div>' +
        '<p>Konversi <span class="mono">10</span>:</p>' +
        '<div class="formula">10 = 8 + 2 → 00001010</div>' +
        '<div class="callout"><strong>Kesimpulan:</strong> Penguasaan biner memudahkan penentuan network, broadcast, dan blok subnet tanpa kalkulator.</div>'
    },
    {
      id: 'flsm',
      num: '11',
      icon: 'bi-grid-3x3-gap',
      category: 'Subnetting',
      title: 'FLSM (Fixed Length Subnet Mask)',
      summary: 'Membagi jaringan menjadi subnet berukuran sama.',
      html:
        '<h4><i class="bi bi-info-circle"></i> Penjelasan</h4>' +
        '<p><strong>FLSM</strong> membagi jaringan induk menjadi subnet dengan panjang mask yang sama. Cocok jika kebutuhan host tiap bagian relatif seimbang.</p>' +
        '<h4><i class="bi bi-calculator"></i> Rumus</h4>' +
        '<div class="formula"><span class="eq">Bit pinjam =</span> ⌈log2(jumlah subnet)⌉</div>' +
        '<div class="formula"><span class="eq">Prefix baru =</span> prefix lama + bit pinjam</div>' +
        '<div class="formula"><span class="eq">Host usable =</span> 2^(32 − prefix baru) − 2</div>' +
        '<h4><i class="bi bi-table"></i> Contoh 192.168.1.0/24 → 4 Subnet</h4>' +
        '<p>log2(4) = 2 bit dipinjam → prefix baru /26 → 62 host usable.</p>' +
        '<table class="calc-table"><thead><tr><th>#</th><th>Network</th><th>Range Host</th><th>Broadcast</th></tr></thead><tbody>' +
        '<tr><td>1</td><td class="mono">192.168.1.0/26</td><td class="mono">.1 – .62</td><td class="mono">.63</td></tr>' +
        '<tr><td>2</td><td class="mono">192.168.1.64/26</td><td class="mono">.65 – .126</td><td class="mono">.127</td></tr>' +
        '<tr><td>3</td><td class="mono">192.168.1.128/26</td><td class="mono">.129 – .190</td><td class="mono">.191</td></tr>' +
        '<tr><td>4</td><td class="mono">192.168.1.192/26</td><td class="mono">.193 – .254</td><td class="mono">.255</td></tr>' +
        '</tbody></table>' +
        '<div class="callout"><strong>Kesimpulan:</strong> FLSM sederhana tetapi boros jika kebutuhan host antar-subnet sangat berbeda.</div>'
    },
    {
      id: 'vlsm',
      num: '12',
      icon: 'bi-node-plus',
      category: 'Subnetting',
      title: 'VLSM (Variable Length Subnet Mask)',
      summary: 'Subnet fleksibel sesuai kebutuhan host, diurutkan dari terbesar.',
      html:
        '<h4><i class="bi bi-info-circle"></i> Penjelasan</h4>' +
        '<p><strong>VLSM</strong> memungkinkan setiap subnet memiliki panjang prefix berbeda. Tujuannya memakai alamat secara efisien. Kunci utamanya: alokasikan kebutuhan terbesar lebih dulu.</p>' +
        '<h4><i class="bi bi-list-ol"></i> Langkah</h4>' +
        '<ol>' +
        '<li>Urutkan kebutuhan host dari terbesar ke terkecil.</li>' +
        '<li>Hitung blok: <span class="mono">2^⌈log2(host + 2)⌉</span>.</li>' +
        '<li>Tentukan prefix: <span class="mono">32 − log2(blok)</span>.</li>' +
        '<li>Alokasikan network berurutan pada batas blok, tanpa overlap.</li>' +
        '<li>Pastikan semuanya masih di dalam jaringan induk.</li>' +
        '</ol>' +
        '<h4><i class="bi bi-table"></i> Contoh 192.168.1.0/24</h4>' +
        '<table class="calc-table"><thead><tr><th>Subnet</th><th>Host</th><th>Prefix</th><th>Network</th><th>Broadcast</th></tr></thead><tbody>' +
        '<tr><td>Administrasi</td><td class="mono">100</td><td class="mono">/25</td><td class="mono">192.168.1.0</td><td class="mono">192.168.1.127</td></tr>' +
        '<tr><td>Keuangan</td><td class="mono">50</td><td class="mono">/26</td><td class="mono">192.168.1.128</td><td class="mono">192.168.1.191</td></tr>' +
        '<tr><td>Akademik</td><td class="mono">25</td><td class="mono">/27</td><td class="mono">192.168.1.192</td><td class="mono">192.168.1.223</td></tr>' +
        '<tr><td>Server</td><td class="mono">10</td><td class="mono">/28</td><td class="mono">192.168.1.224</td><td class="mono">192.168.1.239</td></tr>' +
        '</tbody></table>' +
        '<div class="callout"><strong>Kesimpulan:</strong> VLSM menghemat alamat, tetapi alokasi harus direncanakan agar tidak overlap dan tidak melebihi jaringan induk.</div>'
    },
    {
      id: 'ipv6-prefix',
      num: '13',
      icon: 'bi-signpost-split',
      category: 'IPv6',
      title: 'IPv6 Prefix & Perencanaan Subnet',
      summary: 'Membagi prefix IPv6 menjadi subnet dengan BigInt 128-bit.',
      html:
        '<h4><i class="bi bi-info-circle"></i> Penjelasan</h4>' +
        '<p><strong>Prefix IPv6</strong> menunjukkan jumlah bit network dari kiri. Contoh <span class="mono">2001:db8:abcd::/48</span> berarti 48 bit pertama adalah network, 80 bit sisanya untuk subnet dan host.</p>' +
        '<p>Rekomendasi umum: /48 untuk satu site, /64 untuk satu LAN, /128 untuk satu host.</p>' +
        '<h4><i class="bi bi-table"></i> Kapasitas Prefix</h4>' +
        '<table class="calc-table"><thead><tr><th>Prefix</th><th>Host Bit</th><th>Kapasitas Alamat</th></tr></thead><tbody>' +
        '<tr><td class="mono">/48</td><td class="mono">80</td><td class="mono">1,21 × 10^24</td></tr>' +
        '<tr><td class="mono">/56</td><td class="mono">72</td><td class="mono">4,72 × 10^21</td></tr>' +
        '<tr><td class="mono">/64</td><td class="mono">64</td><td class="mono">1,84 × 10^19</td></tr>' +
        '<tr><td class="mono">/72</td><td class="mono">56</td><td class="mono">7,21 × 10^16</td></tr>' +
        '</tbody></table>' +
        '<h4><i class="bi bi-calculator"></i> Rumus Perencanaan</h4>' +
        '<div class="formula"><span class="eq">Subnet bit =</span> new prefix − parent prefix</div>' +
        '<div class="formula"><span class="eq">Jumlah subnet =</span> 2^subnet bit</div>' +
        '<div class="formula"><span class="eq">Kapasitas =</span> 2^(128 − new prefix)</div>' +
        '<p>Contoh: /48 dibagi menjadi /64 → 16 bit subnet → 65.536 subnet, masing-masing berkapasitas 2^64 alamat.</p>' +
        '<div class="callout"><strong>Kesimpulan:</strong> IPv6 tidak kekurangan alamat. Perencanaan prefix dilakukan untuk kerapian routing dan operasional, bukan karena scarcity.</div>'
    }
  ];

  var state = { active: 0, filtered: TOPICS.slice(), query: '' };

  function init() {
    var indexEl = document.getElementById('learningIndex');
    if (!indexEl) return;

    var container = document.getElementById('lessonContainer');
    var countEl = document.getElementById('learningCount');
    var searchEl = document.getElementById('learningSearch');
    var emptyEl = document.getElementById('learningEmpty');

    function cardHtml(topic, index) {
      return '<article class="panel lesson-card" data-lesson="' + topic.id + '" data-index="' + index + '">' +
        '<div class="lesson-meta">' +
          '<span class="eyebrow mb-0"><i class="bi ' + topic.icon + '"></i> ' + topic.category + '</span>' +
          '<span class="badge-soft">Materi ' + topic.num + ' / 13</span>' +
        '</div>' +
        '<div class="lesson-content">' +
          '<h3>' + topic.title + '</h3>' +
          '<p class="panel-sub mb-3">' + topic.summary + '</p>' +
          topic.html +
          '<div class="lesson-nav">' +
            '<button type="button" class="btn-ghost btn-sm" data-goto="' + (index - 1) + '"' + (index === 0 ? ' disabled' : '') + '><i class="bi bi-arrow-left"></i> Sebelumnya</button>' +
            '<button type="button" class="btn-gradient btn-sm" data-goto="' + (index + 1) + '"' + (index === TOPICS.length - 1 ? ' disabled' : '') + '>Materi Berikutnya <i class="bi bi-arrow-right"></i></button>' +
          '</div>' +
        '</div>' +
      '</article>';
    }

    function indexHtml() {
      return state.filtered.map(function (topic) {
        var idx = TOPICS.indexOf(topic);
        return '<button type="button" class="learning-index-btn" data-open="' + idx + '">' +
          '<span class="li-num">' + topic.num + '</span>' +
          '<span>' + topic.title + '</span>' +
        '</button>';
      }).join('');
    }

    container.innerHTML = TOPICS.map(cardHtml).join('');
    renderIndex();

    function renderIndex() {
      indexEl.innerHTML = indexHtml();
      if (!state.filtered.length) {
        indexEl.innerHTML = '<div class="table-empty"><i class="bi bi-search"></i><span>Tidak ada materi yang cocok.</span></div>';
      }
      if (countEl) countEl.textContent = state.filtered.length + ' materi';
      if (emptyEl) emptyEl.classList.toggle('d-none', state.filtered.length > 0);
    }

    function showTopic(index, scroll) {
      var topic = TOPICS[index];
      if (!topic) return;
      state.active = index;
      document.querySelectorAll('.lesson-card').forEach(function (card) {
        card.classList.toggle('active', card.getAttribute('data-lesson') === topic.id);
      });
      document.querySelectorAll('.learning-index-btn').forEach(function (btn) {
        btn.classList.toggle('active', btn.getAttribute('data-open') === String(index));
      });
      if (history.replaceState) {
        history.replaceState(null, '', '#' + topic.id);
      }
      if (scroll) {
        var target = document.querySelector('.lesson-card.active');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    indexEl.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-open]');
      if (!btn) return;
      showTopic(parseInt(btn.getAttribute('data-open'), 10), true);
    });

    container.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-goto]');
      if (!btn || btn.disabled) return;
      var idx = parseInt(btn.getAttribute('data-goto'), 10);
      if (idx >= 0 && idx < TOPICS.length) {
        showTopic(idx, true);
        if (window.innerWidth < 992) {
          document.querySelector('.lesson-card.active').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });

    if (searchEl) {
      searchEl.addEventListener('input', function () {
        var q = searchEl.value.trim().toLowerCase();
        state.query = q;
        if (!q) {
          state.filtered = TOPICS.slice();
        } else {
          state.filtered = TOPICS.filter(function (t) {
            var haystack = (t.title + ' ' + t.summary + ' ' + t.category + ' ' + t.html).replace(/<[^>]+>/g, ' ').toLowerCase();
            return haystack.indexOf(q) !== -1;
          });
        }
        renderIndex();
        if (state.filtered.length) {
          showTopic(TOPICS.indexOf(state.filtered[0]), false);
        } else {
          document.querySelectorAll('.lesson-card').forEach(function (c) { c.classList.remove('active'); });
        }
      });
    }

    // Tentukan materi awal dari hash
    var hash = (window.location.hash || '').replace('#', '');
    var start = 0;
    if (hash) {
      var found = TOPICS.map(function (t) { return t.id; }).indexOf(hash);
      if (found !== -1) start = found;
    }
    state.filtered = TOPICS.slice();
    showTopic(start, false);
  }

  global.BenoxLearning = { topics: TOPICS, init: init };
  document.addEventListener('DOMContentLoaded', init);
})(window);
