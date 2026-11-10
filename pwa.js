/* ==========================================================================
   BenoxJK — PWA / Offline App
   Mendaftarkan service worker, menyiapkan tombol Download App, dan
   menangani proses instalasi di desktop maupun mobile.
   ========================================================================== */
(function (global) {
  'use strict';

  var root = (global.BenoxNav && global.BenoxNav.root) || './';
  var state = {
    installed: false,
    prompt: null,
    ready: false,
    registration: null
  };

  function standaloneNow() {
    return (global.matchMedia && global.matchMedia('(display-mode: standalone)').matches) ||
      global.navigator.standalone === true;
  }

  state.installed = standaloneNow();

  function button() { return document.getElementById('installAppBtn'); }

  function render() {
    var btn = button();
    if (!btn) return;
    var icon = btn.querySelector('i');
    var label = btn.querySelector('.install-label');

    btn.classList.toggle('is-installed', state.installed);
    btn.setAttribute('data-state', state.installed ? 'installed' : (state.ready ? 'ready' : 'idle'));
    btn.setAttribute('aria-label', state.installed ? 'BenoxJK sudah terpasang' : 'Download aplikasi BenoxJK untuk dipakai offline');

    if (icon) icon.className = 'bi ' + (state.installed ? 'bi-check2-circle' : 'bi-download');
    if (label) label.textContent = state.installed ? 'App Terpasang' : 'Download App';

    btn.title = state.installed
      ? 'BenoxJK sudah terpasang di perangkat ini'
      : (state.ready ? 'Pasang aplikasi — seluruh halaman siap dipakai offline' : 'Siapkan aplikasi untuk dipakai offline');
  }

  function toast(message, type) {
    if (global.BenoxApp && global.BenoxApp.toast) global.BenoxApp.toast(message, type || 'info');
  }

  /* --------------------------- Install prompt --------------------------- */

  global.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    state.prompt = event;
    render();
  });

  global.addEventListener('appinstalled', function () {
    state.prompt = null;
    state.installed = true;
    render();
    toast('BenoxJK berhasil dipasang. Buka dari ikon aplikasi — semua fitur tetap berjalan offline.', 'success');
  });

  if (global.matchMedia) {
    var mq = global.matchMedia('(display-mode: standalone)');
    var onDisplayChange = function () {
      state.installed = standaloneNow();
      render();
    };
    if (mq.addEventListener) mq.addEventListener('change', onDisplayChange);
    else if (mq.addListener) mq.addListener(onDisplayChange);
  }

  /* ------------------------------ Help modal ---------------------------- */

  function showHelp() {
    var isFile = global.location.protocol === 'file:';
    var ios = /iphone|ipad|ipod/i.test(global.navigator.userAgent);

    var modal = document.getElementById('installHelpModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'modal fade';
      modal.id = 'installHelpModal';
      modal.tabIndex = -1;
      modal.setAttribute('aria-labelledby', 'installHelpTitle');
      modal.setAttribute('aria-hidden', 'true');
      modal.innerHTML =
        '<div class="modal-dialog modal-dialog-centered">' +
          '<div class="modal-content">' +
            '<div class="modal-header">' +
              '<h5 class="modal-title" id="installHelpTitle"><i class="bi bi-download"></i> Pasang BenoxJK</h5>' +
              '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Tutup"></button>' +
            '</div>' +
            '<div class="modal-body">' +
              '<p class="install-help-lead">Setelah dipasang, seluruh kalkulator, learning center, dan quiz tersedia tanpa koneksi internet.</p>' +
              (isFile ? '<div class="install-help-warn"><i class="bi bi-exclamation-triangle"></i> Halaman ini dibuka lewat <span class="mono">file://</span>. Jalankan dulu server lokal (misalnya <span class="mono">python -m http.server 8000</span>) agar aplikasi bisa dipasang.</div>' : '') +
              '<ol class="install-help-list">' +
                '<li><strong>Chrome / Edge di komputer:</strong> klik ikon install di kanan address bar, atau menu <span class="mono">⋮</span> → <em>Apps</em> → <em>Install this site as an app</em>.</li>' +
                '<li><strong>Android:</strong> buka menu <span class="mono">⋮</span> lalu pilih <em>Install app</em> atau <em>Add to Home screen</em>.</li>' +
                '<li><strong>iPhone / iPad (Safari):</strong> tekan tombol Share, lalu pilih <em>Add to Home Screen</em>.</li>' +
              '</ol>' +
              '<p class="install-help-note"><i class="bi bi-info-circle"></i> Tombol Download App memakai dialog instalasi resmi browser. Jika browser belum menampilkannya, gunakan langkah manual di atas setelah halaman dibuka sekali saat online.</p>' +
              (ios ? '<p class="install-help-note mb-0"><i class="bi bi-phone"></i> Di iOS, aplikasi hanya bisa dipasang melalui Safari.</p>' : '') +
            '</div>' +
            '<div class="modal-footer">' +
              '<button type="button" class="btn-ghost btn-sm" data-bs-dismiss="modal">Tutup</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      document.body.appendChild(modal);
    }

    if (global.bootstrap && global.bootstrap.Modal) {
      global.bootstrap.Modal.getOrCreateInstance(modal).show();
    } else {
      modal.classList.add('show');
      modal.style.display = 'block';
    }
  }

  /* ------------------------------- Install ------------------------------ */

  function install() {
    if (state.installed) {
      toast('BenoxJK sudah terpasang. Buka lewat ikon aplikasi untuk mode layar penuh.', 'info');
      return;
    }

    if (state.prompt) {
      var promptEvent = state.prompt;
      state.prompt = null;
      promptEvent.prompt();
      promptEvent.userChoice.then(function (choice) {
        if (choice && choice.outcome === 'accepted') {
          toast('Instalasi dimulai. BenoxJK akan tersedia offline setelah selesai.', 'success');
        } else {
          toast('Instalasi dibatalkan. Anda bisa mencoba lagi lewat tombol Download App.', 'info');
        }
        render();
      }).catch(function () {
        showHelp();
      });
      return;
    }

    showHelp();
  }

  /* --------------------------- Service worker --------------------------- */

  function registerWorker() {
    if (!('serviceWorker' in global.navigator)) return;
    if (global.location.protocol !== 'https:' && global.location.hostname !== 'localhost' &&
        global.location.hostname !== '127.0.0.1') {
      return;
    }

    global.navigator.serviceWorker.register(root + 'sw.js').then(function (registration) {
      state.registration = registration;
      return global.navigator.serviceWorker.ready;
    }).then(function () {
      state.ready = true;
      render();
    }).catch(function (error) {
      // Registrasi gagal (misalnya file:// atau browser lama); UI tetap aman.
      if (global.console && console.warn) console.warn('BenoxJK: service worker gagal didaftarkan.', error);
    });
  }

  /* -------------------------------- Init -------------------------------- */

  function init() {
    document.addEventListener('click', function (event) {
      if (event.target.closest('#installAppBtn')) {
        event.preventDefault();
        install();
      }
    });

    render();
    registerWorker();

    if ('serviceWorker' in global.navigator) {
      global.navigator.serviceWorker.addEventListener('controllerchange', function () {
        state.ready = true;
        render();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  global.BenoxPWA = {
    install: install,
    state: state,
    render: render
  };
})(window);
