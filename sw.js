/* ==========================================================================
   BenoxJK — Service Worker
   Menyimpan seluruh halaman, stylesheet, script, ikon, dan aset CDN agar
   aplikasi tetap berjalan penuh tanpa koneksi setelah dibuka sekali.
   ========================================================================== */
'use strict';

var VERSION = '1.0.0';
var CORE_CACHE = 'benoxjk-core-v' + VERSION;
var RUNTIME_CACHE = 'benoxjk-runtime-v' + VERSION;

var CORE_ASSETS = [
  './index.html',
  './pages/ipv4.html',
  './pages/ipv6.html',
  './pages/subnetting.html',
  './pages/vlsm.html',
  './pages/ipv6-planner.html',
  './pages/learning.html',
  './pages/quiz.html',
  './pages/history.html',
  './pages/about.html',
  './assets/css/style.css',
  './assets/css/dashboard.css',
  './assets/css/calculator.css',
  './assets/css/animations.css',
  './assets/css/responsive.css',
  './assets/js/navigation.js',
  './assets/js/app.js',
  './assets/js/binary-converter.js',
  './assets/js/ipv4-engine.js',
  './assets/js/ipv6-engine.js',
  './assets/js/subnetting-engine.js',
  './assets/js/vlsm-engine.js',
  './assets/js/ipv6-planner.js',
  './assets/js/learning.js',
  './assets/js/quiz.js',
  './assets/js/history.js',
  './assets/js/export.js',
  './assets/js/dashboard.js',
  './assets/js/animations.js',
  './assets/js/pwa.js',
  './assets/images/favicon.svg',
  './assets/images/icon-192.png',
  './assets/images/icon-512.png',
  './assets/images/icon-maskable-512.png',
  './assets/images/apple-touch-icon.png',
  './manifest.webmanifest'
];

var CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/fonts/bootstrap-icons.woff2?dd67030699838ea613ee6dbda90effa6',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/fonts/bootstrap-icons.woff?dd67030699838ea613ee6dbda90effa6',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap'
];

/* --------------------------- Cache utilities --------------------------- */

function putInCache(cacheName, request, response) {
  if (!response || (!response.ok && response.type !== 'opaque')) return response;
  caches.open(cacheName).then(function (cache) { cache.put(request, response); });
  return response;
}

function fetchAndCache(cache, url) {
  return fetch(url, { credentials: 'omit', cache: 'reload' })
    .then(function (response) {
      if (response && (response.ok || response.type === 'opaque')) {
        return cache.put(url, response.clone()).then(function () { return response; });
      }
      return response;
    })
    .catch(function () {
      // CDN bisa memblokir CORS; coba mode no-cors sebagai cadangan.
      return fetch(url, { mode: 'no-cors', credentials: 'omit' }).then(function (response) {
        return cache.put(url, response.clone()).then(function () { return response; });
      });
    })
    .catch(function () { return null; });
}

/**
 * Google Fonts mengirim CSS yang berbeda per browser. CSS tersebut diambil,
 * disimpan, lalu seluruh URL font di dalamnya ikut diunduh agar teks tetap
 * memakai Poppins saat offline.
 */
function cacheFontStylesheet(cache, url) {
  return fetch(url, { credentials: 'omit', cache: 'reload' })
    .then(function (response) {
      if (!response || !response.ok) return null;
      return response.clone().text().then(function (css) {
        var saves = [cache.put(url, response)];
        var pattern = /url\((https:\/\/[^)]+)\)/g;
        var match;
        while ((match = pattern.exec(css)) !== null) {
          var fontUrl = match[1].replace(/["']/g, '').trim();
          if (fontUrl.indexOf('https://fonts.gstatic.com/') === 0) {
            saves.push(fetchAndCache(cache, fontUrl));
          }
        }
        return Promise.all(saves);
      });
    })
    .catch(function () { return null; });
}

/* ------------------------------- Install ------------------------------- */

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CORE_CACHE)
      .then(function (cache) {
        return cache.addAll(CORE_ASSETS);
      })
      .then(function () {
        return caches.open(RUNTIME_CACHE);
      })
      .then(function (cache) {
        var jobs = CDN_ASSETS.map(function (url) {
          if (url.indexOf('fonts.googleapis.com') !== -1) {
            return cacheFontStylesheet(cache, url);
          }
          return fetchAndCache(cache, url);
        });
        // Satu CDN gagal tidak boleh membatalkan instalasi aplikasi.
        return Promise.allSettled ? Promise.allSettled(jobs) : Promise.all(jobs);
      })
      .then(function () { return self.skipWaiting(); })
  );
});

/* ------------------------------- Activate ------------------------------ */

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (key) {
          if (key.indexOf('benoxjk-') === 0 && key !== CORE_CACHE && key !== RUNTIME_CACHE) {
            return caches.delete(key);
          }
          return null;
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

/* -------------------------------- Fetch -------------------------------- */

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;

  var url;
  try { url = new URL(request.url); } catch (e) { return; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Navigasi: utamakan jaringan, lalu cache halaman yang sama (abaikan query).
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(function (response) {
          if (response && response.ok) putInCache(RUNTIME_CACHE, request, response.clone());
          return response;
        })
        .catch(function () {
          return caches.match(request, { ignoreSearch: true }).then(function (cached) {
            if (cached) return cached;
            var indexUrl = new URL('./index.html', self.registration.scope).href;
            return caches.match(indexUrl).then(function (home) {
              return home || new Response(
                '<!DOCTYPE html><meta charset="utf-8"><title>BenoxJK Offline</title>' +
                '<body style="font-family:system-ui;background:#080D18;color:#e2e8f0;padding:40px">' +
                '<h1>BenoxJK belum tersedia offline</h1>' +
                '<p>Buka aplikasi sekali saat online, lalu tombol Download App akan menyiapkan seluruh halaman.</p></body>',
                { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
              );
            });
          });
        })
    );
    return;
  }

  // Aset lokal: cache-first agar cepat dan selalu tersedia offline.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(function (cached) {
        if (cached) return cached;
        return fetch(request).then(function (response) {
          return putInCache(RUNTIME_CACHE, request, response.clone());
        });
      })
    );
    return;
  }

  // Aset CDN: cache-first, perbarui di latar belakang bila online.
  event.respondWith(
    caches.match(request).then(function (cached) {
      var network = fetch(request).then(function (response) {
        return putInCache(RUNTIME_CACHE, request, response.clone());
      }).catch(function () { return null; });
      return cached || network.then(function (response) {
        return response || Response.error();
      });
    })
  );
});

/* ------------------------------- Messages ------------------------------ */

self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
