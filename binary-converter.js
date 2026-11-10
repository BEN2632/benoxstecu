/* ==========================================================================
   BenoxJK — Binary & Address Utilities
   Helper konversi bersama untuk IPv4, IPv6, dan modul subnetting.
   ========================================================================== */
(function (global) {
  'use strict';

  var U = {};

  /* ------------------------------ IPv4 ---------------------------------- */

  /**
   * Validasi dan parsing alamat IPv4.
   * @returns {{ok:boolean, octets?:number[], value?:number, normal?:string, error?:string}}
   */
  U.parseIPv4 = function (input) {
    if (input === null || input === undefined || typeof input !== 'string') {
      return { ok: false, error: 'Alamat IPv4 harus berupa teks.' };
    }
    var s = input.trim();
    if (!s) return { ok: false, error: 'Alamat IPv4 tidak boleh kosong.' };
    var parts = s.split('.');
    if (parts.length !== 4) {
      return { ok: false, error: 'IPv4 harus terdiri dari 4 oktet, contoh: 192.168.1.1' };
    }
    var octets = [];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (!/^\d{1,3}$/.test(p)) {
        return { ok: false, error: 'Oktet "' + p + '" bukan angka yang valid (0-255).' };
      }
      var n = parseInt(p, 10);
      if (n < 0 || n > 255) {
        return { ok: false, error: 'Oktet ' + n + ' di luar rentang 0-255.' };
      }
      octets.push(n);
    }
    var value = octets[0] * 16777216 + octets[1] * 65536 + octets[2] * 256 + octets[3];
    return { ok: true, octets: octets, value: value, normal: octets.join('.') };
  };

  /** Konversi integer 32-bit menjadi dotted decimal. */
  U.intToIPv4 = function (value) {
    var n = value >>> 0;
    return [ (n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255 ].join('.');
  };

  /** Prefix 0-32 menjadi integer subnet mask. */
  U.prefixToMaskInt = function (prefix) {
    if (prefix === 0) return 0;
    return (0xFFFFFFFF << (32 - prefix)) >>> 0;
  };

  /** Validasi sekaligus konversi subnet mask ke prefix. */
  U.maskToPrefix = function (input) {
    var parsed = U.parseIPv4(input);
    if (!parsed.ok) return { ok: false, error: 'Subnet mask tidak valid: ' + parsed.error };
    var bits = parsed.octets.map(function (o) { return o.toString(2).padStart(8, '0'); }).join('');
    if (!/^1*0*$/.test(bits)) {
      return { ok: false, error: 'Subnet mask harus contiguous (contoh: 255.255.255.0).' };
    }
    var ones = bits.indexOf('0');
    return { ok: true, prefix: ones === -1 ? 32 : ones, mask: parsed.normal };
  };

  /** Biner 32-bit dengan pemisah per oktet. */
  U.ipv4ToBinary = function (value) {
    var n = value >>> 0;
    return [ (n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255 ]
      .map(function (o) { return o.toString(2).padStart(8, '0'); })
      .join('.');
  };

  /** Biner 32-bit tanpa pemisah. */
  U.intToBinary32 = function (value) {
    return (value >>> 0).toString(2).padStart(32, '0');
  };

  /** Wildcard mask. */
  U.wildcard = function (prefix) {
    return U.intToIPv4((~U.prefixToMaskInt(prefix)) >>> 0);
  };

  /** Range kelas IP berdasarkan oktet pertama. */
  U.ipv4Class = function (firstOctet) {
    if (firstOctet === 0) return { name: 'Reserved', defaultPrefix: null, note: '0.0.0.0/8 — this network' };
    if (firstOctet < 127) return { name: 'A', defaultPrefix: 8, note: '1.0.0.0 – 126.255.255.255' };
    if (firstOctet === 127) return { name: 'A (Loopback)', defaultPrefix: 8, note: '127.0.0.0/8 — loopback' };
    if (firstOctet < 192) return { name: 'B', defaultPrefix: 16, note: '128.0.0.0 – 191.255.255.255' };
    if (firstOctet < 224) return { name: 'C', defaultPrefix: 24, note: '192.0.0.0 – 223.255.255.255' };
    if (firstOctet < 240) return { name: 'D', defaultPrefix: null, note: '224.0.0.0 – 239.255.255.255 — multicast' };
    return { name: 'E', defaultPrefix: null, note: '240.0.0.0 – 255.255.255.255 — reserved' };
  };

  /** Tipe alamat IPv4 (private, public, loopback, dsb). */
  U.ipv4Type = function (value) {
    function inRange(base, prefix) {
      var mask = U.prefixToMaskInt(prefix);
      return (value & mask) >>> 0 === (base & mask) >>> 0;
    }
    if (value === 0) return { label: 'Unspecified / This Network', tone: 'muted' };
    if (value === 0xFFFFFFFF) return { label: 'Limited Broadcast', tone: 'warning' };
    if (inRange(0x0A000000, 8)) return { label: 'Private (RFC 1918)', tone: 'accent' };
    if (inRange(0xAC100000, 12)) return { label: 'Private (RFC 1918)', tone: 'accent' };
    if (inRange(0xC0A80000, 16)) return { label: 'Private (RFC 1918)', tone: 'accent' };
    if (inRange(0x64400000, 10)) return { label: 'CGNAT (RFC 6598)', tone: 'warning' };
    if (inRange(0x7F000000, 8)) return { label: 'Loopback', tone: 'info' };
    if (inRange(0xA9FE0000, 16)) return { label: 'Link-Local (APIPA)', tone: 'info' };
    if (inRange(0xC0000200, 24)) return { label: 'Documentation (TEST-NET-1)', tone: 'muted' };
    if (inRange(0xC6336400, 24)) return { label: 'Documentation (TEST-NET-2)', tone: 'muted' };
    if (inRange(0xCB007100, 24)) return { label: 'Documentation (TEST-NET-3)', tone: 'muted' };
    if (inRange(0xC6120000, 15)) return { label: 'Benchmark (RFC 2544)', tone: 'muted' };
    if (inRange(0xE0000000, 4)) return { label: 'Multicast', tone: 'warning' };
    if (inRange(0xF0000000, 4)) return { label: 'Reserved (Class E)', tone: 'muted' };
    return { label: 'Public', tone: 'success' };
  };

  /* ------------------------------ IPv6 ---------------------------------- */

  /**
   * Parsing IPv6 (mendukung "::", huruf besar, dan IPv4 tersemat).
   * Representasi internal memakai BigInt 128-bit.
   */
  U.parseIPv6 = function (input) {
    if (input === null || input === undefined || typeof input !== 'string') {
      return { ok: false, error: 'Alamat IPv6 harus berupa teks.' };
    }
    var s = input.trim();
    if (!s) return { ok: false, error: 'Alamat IPv6 tidak boleh kosong.' };
    if (s.charAt(0) === '[' && s.charAt(s.length - 1) === ']') s = s.slice(1, -1);
    if (s.indexOf('/') !== -1) s = s.split('/')[0];
    s = s.toLowerCase();

    // IPv4 tersemat, contoh: ::ffff:192.168.1.1
    if (s.indexOf('.') !== -1) {
      var lastColon = s.lastIndexOf(':');
      var v4part = s.slice(lastColon + 1);
      var v4 = U.parseIPv4(v4part);
      if (!v4.ok) return { ok: false, error: 'Bagian IPv4 tersemat tidak valid.' };
      var hi = Math.floor(v4.value / 65536).toString(16);
      var lo = (v4.value % 65536).toString(16);
      s = s.slice(0, lastColon + 1) + hi + ':' + lo;
    }

    var dbl = (s.match(/::/g) || []).length;
    if (dbl > 1) return { ok: false, error: 'Alamat IPv6 hanya boleh memiliki satu "::".' };

    var groups;
    if (dbl === 1) {
      var halves = s.split('::');
      var left = halves[0] ? halves[0].split(':') : [];
      var right = halves[1] ? halves[1].split(':') : [];
      if (left.length + right.length > 7) {
        return { ok: false, error: 'Terlalu banyak grup hextet untuk penggunaan "::".' };
      }
      if (left.length + right.length === 8) {
        return { ok: false, error: '"::" tidak boleh digunakan untuk menggantikan nol grup.' };
      }
      var fill = 8 - left.length - right.length;
      groups = left.concat(new Array(fill).fill('0'), right);
    } else {
      groups = s.split(':');
      if (groups.length !== 8) {
        return { ok: false, error: 'Alamat IPv6 harus memiliki 8 grup hextet (atau gunakan "::").' };
      }
    }

    var value = 0n;
    var hextets = [];
    for (var i = 0; i < groups.length; i++) {
      var g = groups[i];
      if (!/^[0-9a-f]{1,4}$/.test(g)) {
        return { ok: false, error: 'Hextet "' + g + '" tidak valid (harus 1-4 digit heksadesimal).' };
      }
      var n = parseInt(g, 16);
      hextets.push(n);
      value = (value << 16n) + BigInt(n);
    }
    return { ok: true, value: value, hextets: hextets };
  };

  U.bigToHextets = function (value) {
    var out = [];
    for (var i = 0; i < 8; i++) {
      out.push(Number((value >> BigInt((7 - i) * 16)) & 0xFFFFn));
    }
    return out;
  };

  /** Ekspansi penuh 8 grup × 4 digit. */
  U.expandIPv6 = function (input) {
    var parsed = typeof input === 'bigint' ? { ok: true, value: input } : U.parseIPv6(input);
    if (!parsed.ok) return parsed;
    var hextets = U.bigToHextets(parsed.value);
    return { ok: true, value: parsed.value, text: hextets.map(function (h) { return h.toString(16).padStart(4, '0'); }).join(':') };
  };

  /** Kompresi sesuai RFC 5952. */
  U.compressIPv6 = function (input) {
    var parsed = typeof input === 'bigint' ? { ok: true, value: input } : U.parseIPv6(input);
    if (!parsed.ok) return parsed;
    var hex = U.bigToHextets(parsed.value).map(function (h) { return h.toString(16); });
    var bestStart = -1, bestLen = 0, curStart = -1, curLen = 0;
    for (var i = 0; i < hex.length; i++) {
      if (hex[i] === '0') {
        if (curStart === -1) curStart = i;
        curLen++;
        if (curLen > bestLen) { bestLen = curLen; bestStart = curStart; }
      } else {
        curStart = -1;
        curLen = 0;
      }
    }
    if (bestLen >= 2) {
      return {
        ok: true,
        value: parsed.value,
        text: hex.slice(0, bestStart).join(':') + '::' + hex.slice(bestStart + bestLen).join(':')
      };
    }
    return { ok: true, value: parsed.value, text: hex.join(':') };
  };

  U.ipv6Mask = function (prefix) {
    if (prefix === 0) return 0n;
    var all = (1n << 128n) - 1n;
    return all ^ ((1n << BigInt(128 - prefix)) - 1n);
  };

  U.ipv6HostMask = function (prefix) {
    if (prefix >= 128) return 0n;
    return (1n << BigInt(128 - prefix)) - 1n;
  };

  /** Klasifikasi tipe alamat IPv6. */
  U.ipv6Type = function (value) {
    function inPrefix(baseText, prefix) {
      var base = U.parseIPv6(baseText);
      if (!base.ok) return false;
      var mask = U.ipv6Mask(prefix);
      return (value & mask) === (base.value & mask);
    }
    if (value === 0n) return { label: 'Unspecified (::)', tone: 'muted' };
    if (value === 1n) return { label: 'Loopback (::1)', tone: 'info' };
    if (inPrefix('::ffff:0:0', 96)) return { label: 'IPv4-Mapped', tone: 'muted' };
    if (inPrefix('64:ff9b::', 96)) return { label: 'IPv4-Embedded (NAT64)', tone: 'muted' };
    if (inPrefix('2001:db8::', 32)) return { label: 'Documentation (2001:db8::/32)', tone: 'warning' };
    if (inPrefix('2002::', 16)) return { label: '6to4', tone: 'muted' };
    if (inPrefix('fe80::', 10)) return { label: 'Link-Local Unicast', tone: 'info' };
    if (inPrefix('fec0::', 10)) return { label: 'Site-Local (deprecated)', tone: 'warning' };
    if (inPrefix('fc00::', 7)) return { label: 'Unique Local (ULA)', tone: 'accent' };
    if (inPrefix('ff00::', 8)) {
      var sc = Number((value >> 112n) & 0xFFn) & 0x0F;
      var scopes = { 1: 'Interface-Local', 2: 'Link-Local', 5: 'Site-Local', 8: 'Organization-Local', 14: 'Global' };
      return { label: 'Multicast — ' + (scopes[sc] || 'Scope ' + sc), tone: 'warning' };
    }
    if (inPrefix('2000::', 3)) return { label: 'Global Unicast', tone: 'success' };
    if (inPrefix('::', 0)) return { label: 'Reserved / Special', tone: 'muted' };
    return { label: 'Reserved', tone: 'muted' };
  };

  /* --------------------------- Format helpers --------------------------- */

  /** Format angka dengan pemisah ribuan gaya Indonesia. */
  U.formatNumber = function (num) {
    var s = String(num);
    var neg = s.charAt(0) === '-';
    if (neg) s = s.slice(1);
    s = s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (neg ? '-' : '') + s;
  };

  U.formatBig = function (big) {
    return U.formatNumber(big.toString());
  };

  /** Notasi ilmiah sederhana untuk BigInt, contoh: 1,84 × 10^19 */
  U.bigToScientific = function (big) {
    if (big === 0n) return '0';
    var s = big.toString();
    var exp = s.length - 1;
    var mantissa = (Number(s.slice(0, 4)) / 1000).toFixed(2).replace('.', ',');
    return mantissa + ' × 10^' + U.formatNumber(exp);
  };

  /** Total kapasitas IPv6 (2^n) sebagai BigInt. */
  U.powerOfTwo = function (exp) {
    return 1n << BigInt(exp);
  };

  global.BenoxUtils = U;
})(typeof window !== 'undefined' ? window : globalThis);
