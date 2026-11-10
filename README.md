# BenoxJK

**Your Smart Network Address & Subnetting Calculator.**

BenoxJK adalah aplikasi web kalkulator jaringan komputer sekaligus media pembelajaran
IPv4, IPv6, subnetting, FLSM, VLSM, dan perencanaan prefix IPv6. Seluruh perhitungan
berjalan di browser menggunakan JavaScript murni; tidak ada backend, PHP, MySQL,
Laravel, React, atau Vue.

Tampilan memakai satu tema **dark mode** dengan font Poppins, Bootstrap 5,
Bootstrap Icons, animasi jaringan, dan penyimpanan riwayat di LocalStorage.

---

## Fitur

| Modul | Kemampuan |
|---|---|
| Dashboard | Hero animasi, statistik, quick calculator, riwayat terakhir |
| IPv4 Calculator | Network, host ID, subnet mask, host range, broadcast, wildcard, kelas/tipe IP, tabel subnet, langkah perhitungan, biner |
| IPv6 Calculator | Validasi, kompresi/ekspansi, network prefix, host identifier, tipe alamat, representasi biner, kapasitas 128-bit |
| Subnetting | FLSM (jumlah subnet) dan subnetting berdasarkan jumlah host |
| VLSM | Alokasi otomatis dari kebutuhan host terbesar, urut, tanpa overlap, dengan validasi kapasitas |
| IPv6 Prefix Planner | Pembagian prefix induk menjadi subnet /N baru berbasis BigInt |
| Learning Center | 13 materi dengan penjelasan, tabel, rumus, contoh, dan kesimpulan |
| Practice & Quiz | 8 kategori, 10 soal dinamis per sesi, pilihan ganda dan isian, timer opsional, pembahasan, skor |
| Calculation History | Simpan, lihat, hitung ulang, hapus satu, dan hapus semua |
| Utilitas | Copy per nilai, copy seluruh hasil, export PDF/CSV, print, reset, pencarian dan pagination tabel |
| Download App / Offline | Tombol instal PWA, service worker, dan cache seluruh halaman + aset CDN agar aplikasi tetap berjalan tanpa internet |

Semua tombol pada aplikasi memiliki fungsi nyata. Tidak ada hasil yang di-hardcode.

---

## Struktur Proyek

```
benoxjk/
├── index.html
├── manifest.webmanifest
├── sw.js
├── pages/
│   ├── ipv4.html
│   ├── ipv6.html
│   ├── subnetting.html
│   ├── vlsm.html
│   ├── ipv6-planner.html
│   ├── learning.html
│   ├── quiz.html
│   ├── history.html
│   └── about.html
├── assets/
│   ├── css/
│   │   ├── style.css
│   │   ├── dashboard.css
│   │   ├── calculator.css
│   │   ├── animations.css
│   │   └── responsive.css
│   ├── js/
│   │   ├── app.js
│   │   ├── navigation.js
│   │   ├── binary-converter.js
│   │   ├── ipv4-engine.js
│   │   ├── ipv6-engine.js
│   │   ├── subnetting-engine.js
│   │   ├── vlsm-engine.js
│   │   ├── ipv6-planner.js
│   │   ├── learning.js
│   │   ├── quiz.js
│   │   ├── history.js
│   │   ├── export.js
│   │   ├── dashboard.js
│   │   ├── animations.js
│   │   └── pwa.js
│   └── images/
│       ├── favicon.svg
│       ├── icon-192.png
│       ├── icon-512.png
│       ├── icon-maskable-512.png
│       └── apple-touch-icon.png
└── README.md
```

Setiap halaman memuat `navigation.js` untuk sidebar/topbar yang konsisten dan
`app.js` untuk toast, copy, unduh, tabel, jam, serta kontrol sidebar. Mesin
perhitungan dipisahkan per topik agar tidak menjadi satu berkas JavaScript besar.

---

## Cara Menjalankan

Tidak diperlukan instalasi, build, atau database.

### Opsi 1 — Python HTTP server

```bash
cd benoxjk
python -m http.server 8000
```

Buka `http://localhost:8000`.

### Opsi 2 — Live Server (VS Code)

Klik kanan `index.html` lalu pilih **Open with Live Server**.

### Opsi 3 — server lokal lain

Letakkan folder ini pada root web server apa pun (Apache/Nginx) dan akses
`index.html`.

> Membuka `index.html` langsung melalui `file://` umumnya juga berfungsi, tetapi
> server HTTP lebih disarankan agar perilaku navigasi dan unduhan konsisten.
> Service worker dan pemasangan aplikasi tidak berjalan pada `file://`.

Koneksi internet diperlukan pada pemuatan pertama karena Bootstrap, Bootstrap
Icons, dan Google Fonts dimuat dari CDN. Setelah tombol **Download App** dipakai,
seluruh aset tersebut ikut disimpan dan aplikasi dapat dibuka tanpa internet.

---

## Download App — Mode Offline

Setiap halaman memiliki satu tombol **Download App** di topbar. Tombol ini
membuka dialog instalasi resmi browser (PWA). Setelah dipasang, BenoxJK muncul
sebagai ikon aplikasi dan berjalan di jendela sendiri.

1. Buka BenoxJK sekali saat online, minimal melalui `http://localhost` atau HTTPS.
2. Tunggu beberapa detik sampai service worker selesai menyimpan aset.
3. Klik **Download App** di kanan atas, lalu setujui instalasi.
4. Buka aplikasi dari ikonnya; seluruh modul, materi, quiz, dan riwayat tetap
   berfungsi tanpa koneksi.

Jika browser tidak menampilkan dialog instalasi, tombol menampilkan panduan
manual untuk Chrome/Edge desktop, Android, dan Safari iOS.

**Yang disimpan untuk offline**

- 10 halaman HTML, seluruh CSS dan JavaScript aplikasi.
- Ikon, manifest, Bootstrap CSS/JS, Bootstrap Icons beserta font-nya.
- Google Fonts CSS dan file font Poppins yang dipakai browser.
- Akses halaman dengan query string (misalnya hitung ulang dari riwayat) tetap
  diarahkan ke halaman yang tersimpan.

**Catatan pemasangan**

- PWA memerlukan HTTPS atau `localhost`; protokol `file://` tidak didukung.
- Pemasangan tidak memerlukan akun, backend, atau toko aplikasi.
- Saat situs diperbarui, ubah `VERSION` di `sw.js` agar cache lama dibersihkan
  dan aset baru diunduh pada kunjungan berikutnya.
- Untuk hosting produksi, pastikan `.webmanifest` disajikan sebagai
  `application/manifest+json` dan `sw.js` sebagai `application/javascript`.
- Data perhitungan dan riwayat tetap berada di LocalStorage perangkat.

---

## Aturan Perhitungan

### IPv4

- Alamat diproses sebagai bilangan bulat 32-bit (`>>> 0`) agar bebas galat
  floating point.
- `SUB1` adalah subnet mask default kelas A/B/C; `SUB2` adalah subnet mask aktual
  sesuai prefix.
- `HA` (Host ID) adalah bagian alamat di luar network address berdasarkan subnet
  mask aktual. Contoh `10.10.10.10/11` menghasilkan `HA = 0.10.10.10`.
- Jumlah subnet kelasful memakai `2^(prefix baru - prefix default)` untuk kelas
  A, B, dan C. Kelas D/E ditampilkan sebagai `N/A`.
- Usable host memakai `2^(32-prefix) - 2`, kecuali:
  - `/31` mengikuti RFC 3021: 2 alamat usable, tanpa broadcast.
  - `/32`: 1 alamat usable.
- Block size dihitung `256 - oktet subnet mask yang berubah`.
- Daftar subnet dibangun dari network kelasful, lalu subnet yang memuat IP
  ditandai. Ini mengikuti cara pengajaran subnetting kelasful.
- Prefix `/0` ditangani sebagai seluruh ruang alamat IPv4.

### IPv6

- Alamat disimpan sebagai `BigInt` 128-bit, bukan `Number`.
- Dilakukan validasi, ekspansi, kompresi, dan perhitungan network prefix.
- IPv6 tidak memiliki broadcast address.
- Tipe alamat yang dikenali: Global Unicast, Link-Local, Unique Local, Multicast,
  Loopback, Unspecified, serta IPv4-mapped.
- Total alamat dihitung `2^(128-prefix)` dan diformat tanpa kehilangan presisi.

### FLSM dan Host-based

- FLSM membulatkan jumlah subnet ke pangkat dua berikutnya, lalu meminjam bit
  yang diperlukan. Seluruh ruang network induk dibagi rata.
- Metode host-based memilih prefix terkecil yang masih memenuhi kebutuhan host
  per subnet, kemudian menghitung jumlah subnet yang terbentuk.
- Jika kebutuhan melebihi kapasitas network induk, proses ditolak dengan pesan
  yang menjelaskan batas kapasitas.

### VLSM

1. Kebutuhan host diurutkan menurun.
2. Prefix tiap subnet dihitung dari host usable yang dibutuhkan.
3. Setiap subnet disejajarkan pada batas bloknya.
4. Network, first host, last host, dan broadcast dihitung.
5. Sistem memeriksa agar tidak ada overlap dan tidak melewati network induk.

### IPv6 Prefix Planner

- Parent prefix dan prefix baru divalidasi (`newPrefix > parentPrefix`).
- Subnet ke-`i` dihitung dengan menambahkan `i << (128 - newPrefix)`.
- Kapasitas per subnet ditampilkan sebagai `2^(128 - newPrefix)`.
- Tidak ada broadcast address.

---

## Pengujian yang Dilakukan

Pengujian dijalankan pada 10 November 2026 menggunakan Node.js v24 untuk mesin
perhitungan dan Chrome headless melalui Chrome DevTools Protocol untuk pengujian
antarmuka. Skrip uji bersifat sementara dan tidak disertakan dalam proyek.

### Mesin perhitungan

| Kasus | Hasil yang diverifikasi |
|---|---|
| `10.10.10.10/11` | NA `10.0.0.0`, HA `0.10.10.10`, SUB1 `255.0.0.0`, SUB2 `255.224.0.0`, IP awal `10.0.0.1`, IP akhir `10.31.255.254`, broadcast `10.31.255.255`, total 2.097.152, usable 2.097.150, 8 subnet, block size 32 |
| `/0`, `/8`, `/16`, `/24`, `/26` | Network, mask, range, broadcast, dan jumlah host sesuai standar |
| `/31`, `/32` | Aturan RFC 3021 dan host tunggal benar |
| Oktet `256`, prefix `33`, mask tidak contiguous | Ditolak dengan pesan validasi |
| IPv6 `2001:db8:abcd:0012::1/64` | Kompresi `2001:db8:abcd:12::1`, network `2001:db8:abcd:12::/64`, host `::1`, total 18.446.744.073.709.551.616 |
| IPv6 `/0`, `/64`, `/128` | Prefix, network, dan kapasitas benar |
| Tipe IPv6 | Loopback, unspecified, link-local, unique local, multicast, global unicast teridentifikasi |
| FLSM `/24` menjadi 4 subnet | Prefix `/26`, 4 subnet, 62 host usable per subnet |
| FLSM `10.0.0.0/8` menjadi 8 subnet | Prefix `/11`, 8 subnet |
| VLSM `192.168.1.0/24` untuk 100/50/25/10 host | `/25 .0`, `/26 .128`, `/27 .192`, `/28 .224`; total 240 alamat, sisa 16 |
| VLSM kapasitas tidak cukup | Ditolak dengan pesan kapasitas |
| IPv6 Planner `2001:db8:abcd::/48` ke `/64` sebanyak 8 | `2001:db8:abcd::/64` sampai `2001:db8:abcd:7::/64` |
| Generator quiz | 8 kategori × 30 percobaan × 10 soal = 2.400 soal; tidak ada opsi ganda, jawaban hilang, `NaN`, atau `undefined` |

### Antarmuka browser

- **Set 1: 95/95 pemeriksaan lulus.** Mencakup sidebar/topbar di seluruh halaman,
  kalkulasi IPv4/IPv6/FLSM/VLSM/planner melalui UI, quiz, riwayat, copy, export
  PDF/CSV nyata, navigasi mobile, dan pemeriksaan overflow pada lebar 390 px.
- **Set 2: 22/22 pemeriksaan lulus.** Mencakup payload copy, print, `/31` dan
  `/32`, input tidak valid, reset, IPv6 `/0` dan `/128`, pencarian/pagination
  tabel subnet, tambah/hapus baris VLSM, penyelesaian quiz 10 soal beserta retry
  dan timer, hitung ulang/hapus riwayat, collapse sidebar desktop, dan quiz mobile.
- **Verifikasi reset subnetting/VLSM: 6/6 lulus.** FLSM menghasilkan empat
  subnet `/26`, reset mengosongkan form dan menyembunyikan hasil, serta form
  dapat digunakan kembali; reset VLSM menyisakan satu baris kosong dan
  menghasilkan subnet baru setelah diisi ulang.
- Berkas PDF diverifikasi memiliki header `%PDF-` dan akhir `%%EOF`; CSV
  diverifikasi berisi data dan BOM UTF-8.
- Clipboard diuji dengan stub `navigator.clipboard.writeText` untuk memastikan
  teks yang disalin benar.

### PWA dan mode offline

Pengujian memakai profil Chrome baru, service worker dari instalasi bersih, dan
emulasi jaringan offline melalui CDP.

- **47/47 pemeriksaan lulus.** Manifest terbaca tanpa error, tiga ikon PNG dan
  apple-touch-icon tersedia, service worker aktif pada scope root, serta halaman
  baru langsung dikendalikan service worker.
- Seluruh 10 halaman, Bootstrap CSS/JS, Bootstrap Icons + font, Google Fonts CSS,
  dan file font Poppins terverifikasi berada di cache.
- Saat jaringan dimatikan, seluruh halaman tetap terbuka dengan tema dan font
  yang benar; alamat root `/` tetap membuka dashboard; IPv4 `10.10.10.10/11`
  tetap menghasilkan `10.0.0.0`, `255.224.0.0`, `10.31.255.255`, dan
  `10.31.255.254`; FLSM `/24` menjadi 4 subnet `/26`; 8 kategori quiz tetap
  tampil.
- URL dengan query string tetap memuat halaman yang tersimpan saat offline.
- Tombol Download App menampilkan dialog instalasi native saat tersedia dan
  panduan manual tiga langkah saat dialog tidak tersedia.
- Pada lebar 390 px, tombol tetap 40×40 px dan tidak menimbulkan overflow.
- Tidak ada error JavaScript maupun error log non-jaringan selama pengujian.

Tidak ada kegagalan pengujian yang tersisa pada versi ini.

---

## Batasan yang Diketahui

- **CDN:** Bootstrap, Bootstrap Icons, dan Google Fonts memerlukan internet pada
  pemuatan pertama. Setelah aplikasi dipasang atau halaman dibuka sekali dengan
  service worker aktif, aset tersebut tersedia dari cache offline.
- **PWA:** instalasi dan service worker hanya berjalan pada HTTPS atau
  `localhost`, bukan saat file dibuka langsung lewat `file://`.
- **Batas tampilan subnet:** daftar subnet IPv4 dibatasi 2.048 baris dan planner
  IPv6 512 subnet. Tabel tetap memakai pagination 12 baris; batas ini mencegah
  browser membeku pada prefix sangat besar. Perhitungan ringkasan tetap akurat.
- **Riwayat:** menyimpan parameter perhitungan (jenis, IP, prefix, ringkasan,
  waktu), bukan seluruh hasil, dan dibatasi 60 entri terbaru. Hitung ulang
  dilakukan dari parameter tersebut.
- **PDF:** dibuat dengan generator PDF minimal (Helvetica, teks multi-halaman).
  Karakter di luar ASCII dasar diganti atau ditransliterasikan; tata letak tabel
  tidak dirender sebagai tabel grafis.
- **Print:** membuka jendela cetak browser. Jika pop-up diblokir, pengguna perlu
  mengizinkannya.
- **Tanpa backend:** tidak ada akun, sinkronisasi antarperangkat, atau penyimpanan
  server. Semua data berada di LocalStorage browser.

---

## Teknologi

HTML5, CSS3, JavaScript ES6+, Bootstrap 5, Bootstrap Icons, Google Fonts
(Poppins), LocalStorage, Canvas API, dan `BigInt`.

Dibuat untuk pembelajaran jaringan komputer. Gunakan dan sesuaikan dengan bebas.
