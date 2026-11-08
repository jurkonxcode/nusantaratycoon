/* Set ikon garis seragam (SVG inline, warna mengikuti teks). Pengganti emoji untuk elemen antarmuka,
   supaya tampilannya sama di semua perangkat. Pakai: NT.ui.ic('coin') di JS, atau <i class="ic" data-icon="coin"></i> di HTML. */
(function (NT) {
  NT.ui = NT.ui || {};

  const P = {
    map: 'M9 4 3 6.5v13L9 17l6 3 6-2.5v-13L15 7 9 4z M9 4v13 M15 7v13',
    scale: 'M12 4v16 M7 20h10 M5 7h14 M5 7l-3 7a3 3 0 0 0 6 0L5 7z M19 7l-3 7a3 3 0 0 0 6 0l-3-7z',
    kingdom: 'M3 10l9-6 9 6H3z M5 10v8 M9.5 10v8 M14.5 10v8 M19 10v8 M3 20.5h18',
    bell: 'M6 9a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7z M10 20a2 2 0 0 0 4 0',
    coin: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7.5v9 M9.5 10c0-1.1 1.1-1.7 2.5-1.7s2.5.6 2.5 1.7-1.1 1.6-2.5 2-2.5.9-2.5 2 1.1 1.7 2.5 1.7 2.5-.6 2.5-1.7',
    people: 'M16 20v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1 M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M20 20v-1a4 4 0 0 0-3-3.9 M15 4.2a3.5 3.5 0 0 1 0 6.6',
    star: 'M12 3l2.8 5.9 6.2.8-4.5 4.4 1.1 6.2L12 17.3 6.4 20.3l1.1-6.2L3 9.7l6.2-.8L12 3z',
    trophy: 'M8 4h8v6a4 4 0 0 1-8 0V4z M8 6H4v1a4 4 0 0 0 4 4 M16 6h4v1a4 4 0 0 1-4 4 M12 14v4 M8 20h8',
    info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 11v6 M12 7.5v.01',
    sliders: 'M4 7h10 M18 7h2 M4 17h2 M10 17h10 M16 5v4 M8 15v4',
    box: 'M3 7.5l9-4.5 9 4.5v9l-9 4.5-9-4.5v-9z M3 7.5l9 4.5 9-4.5 M12 12v9',
    up: 'M12 19V5 M5 12l7-7 7 7',
    clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3 2',
    hammer: 'M4 20l9-9 M12 5l3-3 7 7-3 3-7-7z',
    bolt: 'M13 2L4 14h7l-1 8 9-12h-7l1-8z',
    close: 'M6 6l12 12 M18 6L6 18',
    handshake: 'M3 12l4-4 4 2 4-2 6 5-3 3-3-1-3 3-3-1-4-4z',
    gem: 'M6 4h12l3 5-9 11L3 9l3-5z M3 9h18',
    calendar: 'M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4'
  };

  function svg(name) {
    const d = P[name];
    if (!d) return '';
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="' + d + '"/></svg>';
  }

  // Ikon sebagai potongan HTML
  NT.ui.ic = function (name) { return '<i class="ic" aria-hidden="true">' + svg(name) + '</i>'; };

  // Isi semua <i class="ic" data-icon="..."> yang ada di halaman
  NT.ui.hydrateIcons = function (root) {
    (root || document).querySelectorAll('i.ic[data-icon]').forEach(function (el) {
      if (!el.firstChild) el.innerHTML = svg(el.getAttribute('data-icon'));
    });
  };
  NT.ui.hydrateIcons();
})((window.NT = window.NT || {}));
