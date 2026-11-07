/* Sprite pixel art 8x8 untuk bangunan, pelabuhan, dan kapal. Setiap huruf = satu warna, titik = kosong. */
(function (NT) {
  NT.ui = NT.ui || {};

  const COLORS = {
    g: '#2e7343', G: '#6fbf5a', d: '#4a8f3e', y: '#e8c34a', r: '#c8472f', R: '#b8452c', b: '#7a4a24',
    w: '#f4ead2', k: '#2b2f33', p: '#e98aa8', B: '#2d8fd0', o: '#d9822b', m: '#9aa3a8', n: '#c9a24a'
  };

  const SPRITES = {
    sawah: ['...RR...', '..RRRR..', '..bwwb..', '..bwwb..', 'GdGdGdGd', 'dGdGdGdG', 'GdGdGdGd', 'dGdGdGdG'],
    sentra_batik: ['...bb...', '..bbbb..', '.bbbbbb.', 'bbbbbbbb', '.wwwwww.', '.wnwwnw.', '.wwwwww.', '.kkkkkk.'],
    kebun_kopi: ['..GGG...', '.GGrGG..', 'GGGGGrG.', '.GrGGG..', '..GGrG..', '...bb...', '...bb...', '..kbbk..'],
    kebun_karet: ['..GGG...', '.GGGGG..', 'GGGGGGG.', '.GGGGG..', '...bb...', '...bb...', '..mbb...', '..kk....'],
    kebun_kakao: ['..GGG...', '.GGoGG..', 'GGGGGoG.', '.GoGGG..', '..GGoG..', '...bb...', '...bb...', '..kbbk..'],
    kebun_cengkeh: ['..GGG...', '.GpGGp..', 'GGGpGGG.', 'pGGGGpG.', '.GGpGG..', '...bb...', '...bb...', '..kbbk..'],
    pelabuhan: ['....k...', '....k...', '..kkkkk.', '..k..k..', 'ooRRoomm', 'mmmmmmmm', 'BBBBBBBB', 'bBbBbBbB'],
    kapal: ['.....w..', '....ww..', 'kkkkkkk.', '.rrrrr..', '..rrr...', '........', '........', '........']
  };

  // Path SVG untuk sprite, berpusat di (cx, cy), tiap piksel berukuran px satuan.
  function path(name, cx, cy, px, opacity) {
    const rows = SPRITES[name];
    if (!rows) return '';
    const ox = cx - 4 * px, oy = cy - 4 * px;
    const byColor = {};
    rows.forEach(function (row, y) {
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === '.') continue;
        (byColor[ch] = byColor[ch] || []).push('M' + (ox + x * px) + ' ' + (oy + y * px) + 'h' + px + 'v' + px + 'h-' + px + 'z');
      }
    });
    const parts = Object.keys(byColor).map(function (ch) {
      return '<path fill="' + COLORS[ch] + '" d="' + byColor[ch].join('') + '"/>';
    }).join('');
    return '<g class="sprite"' + (opacity != null ? ' opacity="' + opacity + '"' : '') + '>' + parts + '</g>';
  }

  NT.ui.sprites = { path: path, names: Object.keys(SPRITES) };
})((window.NT = window.NT || {}));
