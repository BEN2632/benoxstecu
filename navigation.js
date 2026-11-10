/* ==========================================================================
   BenoxJK — Navigation Shell
   Merender sidebar + topbar secara konsisten di seluruh halaman.
   ========================================================================== */
(function () {
  'use strict';

  var path = (window.location.pathname || '').replace(/\\/g, '/');
  var inPages = /\/pages\//.test(path);
  var root = inPages ? '../' : './';

  var NAV = [
    { id: 'dashboard', label: 'Dashboard', icon: 'bi-grid-1x2', file: 'index.html', group: 'Overview' },
    { id: 'ipv4', label: 'IPv4 Calculator', icon: 'bi-globe', file: 'pages/ipv4.html', group: 'Calculators' },
    { id: 'ipv6', label: 'IPv6 Calculator', icon: 'bi-globe2', file: 'pages/ipv6.html', group: 'Calculators' },
    { id: 'subnetting', label: 'Subnetting Calculator', icon: 'bi-diagram-3', file: 'pages/subnetting.html', group: 'Calculators' },
    { id: 'vlsm', label: 'VLSM Calculator', icon: 'bi-node-plus', file: 'pages/vlsm.html', group: 'Calculators' },
    { id: 'planner', label: 'IPv6 Prefix Planner', icon: 'bi-signpost-split', file: 'pages/ipv6-planner.html', group: 'Calculators' },
    { id: 'learning', label: 'Learning Center', icon: 'bi-journal-code', file: 'pages/learning.html', group: 'Academy' },
    { id: 'quiz', label: 'Practice & Quiz', icon: 'bi-patch-question', file: 'pages/quiz.html', group: 'Academy' },
    { id: 'history', label: 'Calculation History', icon: 'bi-clock-history', file: 'pages/history.html', group: 'Workspace' },
    { id: 'about', label: 'About BenoxJK', icon: 'bi-info-circle', file: 'pages/about.html', group: 'Workspace' }
  ];

  var page = document.body.getAttribute('data-page') || 'dashboard';
  var current = NAV.filter(function (n) { return n.id === page; })[0] || NAV[0];

  /* ------------------------------ Sidebar ------------------------------- */
  var sidebar = document.getElementById('sidebar');
  if (sidebar) {
    var groups = [];
    NAV.forEach(function (item) {
      if (groups.indexOf(item.group) === -1) groups.push(item.group);
    });

    var navHtml = groups.map(function (group) {
      var links = NAV.filter(function (n) { return n.group === group; }).map(function (n) {
        var active = n.id === page;
        return '<a class="nav-item' + (active ? ' active' : '') + '" href="' + root + n.file + '" data-nav="' + n.id + '">' +
          '<span class="nav-icon"><i class="bi ' + n.icon + '"></i></span>' +
          '<span class="nav-label">' + n.label + '</span>' +
          (active ? '<span class="nav-active-dot"></span>' : '') +
        '</a>';
      }).join('');
      return '<div class="nav-group"><span class="nav-group-label">' + group + '</span>' + links + '</div>';
    }).join('');

    sidebar.innerHTML =
      '<div class="sidebar-brand">' +
        '<a class="brand-link" href="' + root + 'index.html">' +
          '<span class="brand-logo"><i class="bi bi-hexagon-fill"></i><span>B</span></span>' +
          '<span class="brand-text"><strong>Benox<span>JK</span></strong><small>Network Toolkit</small></span>' +
        '</a>' +
        '<button class="icon-btn mobile-only" id="sidebarClose" aria-label="Tutup menu"><i class="bi bi-x-lg"></i></button>' +
      '</div>' +
      '<div class="sidebar-scroll"><nav class="sidebar-nav" aria-label="Navigasi utama">' + navHtml + '</nav></div>' +
      '<div class="sidebar-footer">' +
        '<div class="sidebar-status">' +
          '<span class="status-dot"></span>' +
          '<div><strong>Engine Online</strong><small>100% client-side</small></div>' +
        '</div>' +
        '<span class="sidebar-version">v1.0.0</span>' +
      '</div>';
  }

  /* ------------------------------- Topbar ------------------------------- */
  var topbar = document.getElementById('topbar');
  if (topbar) {
    topbar.innerHTML =
      '<button class="icon-btn" id="sidebarToggle" aria-label="Buka atau tutup menu" aria-expanded="true">' +
        '<i class="bi bi-list"></i>' +
      '</button>' +
      '<div class="topbar-heading">' +
        '<div class="breadcrumb-line">' +
          '<a href="' + root + 'index.html">BenoxJK</a>' +
          '<i class="bi bi-chevron-right"></i>' +
          '<span>' + current.label + '</span>' +
        '</div>' +
        '<h1 class="topbar-title">' + current.label + '</h1>' +
      '</div>' +
      '<div class="topbar-tools">' +
        '<div class="topbar-chip d-none d-xl-flex"><i class="bi bi-shield-check"></i> Client-side • Data tidak diunggah</div>' +
        '<div class="clock-chip" title="Waktu lokal perangkat"><i class="bi bi-clock"></i><span id="liveClock">--.--.--</span></div>' +
        '<button class="btn-install" id="installAppBtn" type="button" aria-label="Download aplikasi BenoxJK untuk dipakai offline">' +
          '<i class="bi bi-download"></i><span class="install-label">Download App</span>' +
        '</button>' +
        '<a class="icon-btn d-none d-sm-inline-flex" href="' + root + 'pages/about.html" title="Tentang BenoxJK" data-bs-toggle="tooltip"><i class="bi bi-info-circle"></i></a>' +
      '</div>';
  }

  window.BenoxNav = { root: root, items: NAV, page: page, current: current };
})();
