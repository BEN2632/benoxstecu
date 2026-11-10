/* ==========================================================================
   BenoxJK — Export (CSV, PDF, Print)
   ========================================================================== */
(function (global) {
  'use strict';

  var Export = {};

  function ascii(text) {
    return String(text)
      .replace(/×/g, 'x')
      .replace(/[–—]/g, '-')
      .replace(/≈/g, '~')
      .replace(/•/g, '-')
      .replace(/…/g, '...')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/²/g, '2')
      .replace(/³/g, '3')
      .replace(/[^\x20-\x7E]/g, '?');
  }

  function pdfEscape(text) {
    return ascii(text)
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');
  }

  /**
   * Membuat berkas PDF 1.4 valid minimal (teks, multi halaman).
   * @param {string[]} lines
   */
  function buildPdf(title, lines, meta) {
    var MAX_CHARS = 88;
    var wrapped = [];
    lines.forEach(function (line) {
      var s = ascii(line);
      if (!s) { wrapped.push(''); return; }
      while (s.length > MAX_CHARS) {
        var cut = s.lastIndexOf(' ', MAX_CHARS);
        if (cut < 40) cut = MAX_CHARS;
        wrapped.push(s.slice(0, cut).replace(/\s+$/, ''));
        s = '   ' + s.slice(cut).trim();
      }
      wrapped.push(s);
    });

    var PAGE_CAPACITY = 48;
    var pages = [];
    for (var i = 0; i < wrapped.length; i += PAGE_CAPACITY) {
      pages.push(wrapped.slice(i, i + PAGE_CAPACITY));
    }
    if (!pages.length) pages.push(['(tidak ada data)']);

    var objects = [];
    function push(obj) { objects.push(obj); return objects.length; }

    push('<< /Type /Catalog /Pages 2 0 R >>');
    var pagesId = push('PAGES_PLACEHOLDER');
    push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');

    var pagesKids = [];
    pages.forEach(function (pageLines, index) {
      var content = 'BT\n/F2 15 Tf\n50 800 Td\n(' + pdfEscape(title) + ') Tj\n' +
        '/F1 8.5 Tf\n0 -18 Td\n(' + pdfEscape('BenoxJK - Network Toolkit  |  ' + (meta || '')) + ') Tj\n' +
        '/F1 8.5 Tf\n0 -14 Td\n(' + pdfEscape('Halaman ' + (index + 1) + ' dari ' + pages.length) + ') Tj\n' +
        '/F1 10 Tf\n0 -22 Td\n14 TL\n';
      pageLines.forEach(function (line, li) {
        content += '(' + pdfEscape(line) + ') Tj\n';
        if (li < pageLines.length - 1) content += 'T*\n';
      });
      content += 'ET';

      var contentId = push('<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream');
      var pageId = push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents ' + contentId +
        ' 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>');
      pagesKids.push(pageId + ' 0 R');
    });

    objects[pagesId - 1] = '<< /Type /Pages /Kids [' + pagesKids.join(' ') + '] /Count ' + pagesKids.length + ' >>';

    var out = '%PDF-1.4\n';
    var offsets = [];
    objects.forEach(function (obj, idx) {
      offsets.push(out.length);
      out += (idx + 1) + ' 0 obj\n' + obj + '\nendobj\n';
    });
    var xrefOffset = out.length;
    out += 'xref\n0 ' + (objects.length + 1) + '\n';
    out += '0000000000 65535 f \n';
    offsets.forEach(function (off) {
      out += String(off).padStart(10, '0') + ' 00000 n \n';
    });
    out += 'trailer\n<< /Size ' + (objects.length + 1) + ' /Root 1 0 R >>\n';
    out += 'startxref\n' + xrefOffset + '\n%%EOF';
    return out;
  }

  Export.csv = function (filename, rows) {
    var csv = rows.map(function (row) {
      return row.map(function (cell) {
        var s = String(cell === null || cell === undefined ? '' : cell);
        if (/[",\n;]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
        return s;
      }).join(',');
    }).join('\r\n');
    // BOM agar Excel membaca UTF-8 dengan benar
    global.BenoxApp.download(filename.replace(/\.csv$/i, '') + '.csv', '\uFEFF' + csv, 'text/csv;charset=utf-8');
  };

  Export.pdf = function (filename, title, lines, meta) {
    var pdf = buildPdf(title, lines, meta);
    global.BenoxApp.download(filename.replace(/\.pdf$/i, '') + '.pdf', pdf, 'application/pdf');
  };

  Export.print = function (title, lines) {
    var win = window.open('', '_blank', 'width=900,height=1000');
    if (!win) {
      global.BenoxApp.toast('Popup diblokir browser. Izinkan popup untuk mencetak.', 'warning');
      return false;
    }
    var body = lines.map(function (line) {
      var isHeading = /^=+/.test(line);
      var text = isHeading ? line.replace(/^=+\s*/, '') : line;
      return isHeading
        ? '<h2>' + escapeHtml(text) + '</h2>'
        : '<div class="line">' + escapeHtml(text || '&nbsp;') + '</div>';
    }).join('');
    win.document.write('<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>' + escapeHtml(title) + '</title>' +
      '<style>' +
      'body{font-family:Segoe UI,Arial,sans-serif;color:#111;margin:40px;font-size:12px;line-height:1.65}' +
      'h1{font-size:20px;margin:0 0 4px}header{border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:18px}' +
      'h2{font-size:13px;margin:18px 0 6px;text-transform:uppercase;letter-spacing:.06em}' +
      '.line{white-space:pre-wrap;font-family:Consolas,monospace;font-size:11.5px}' +
      'footer{margin-top:24px;border-top:1px solid #ccc;padding-top:8px;font-size:10px;color:#555}' +
      '</style></head><body><header><h1>' + escapeHtml(title) + '</h1>' +
      '<div>BenoxJK — Network Toolkit</div></header>' + body +
      '<footer>Dicetak ' + new Date().toLocaleString('id-ID') + ' • BenoxJK</footer>' +
      '</body></html>');
    win.document.close();
    win.focus();
    setTimeout(function () { win.print(); }, 350);
    return true;
  };

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  global.BenoxExport = Export;
})(window);
