/*
 * Peta realistis: garis pantai fraktal (poligon di data/geo.js dikasarkan lalu dihaluskan), peta ketinggian
 * dari punggung gunung + derau, bayangan relief (hillshade), bioma (hutan, sawah Jawa, sabana NTT),
 * laut dengan paparan dangkal (Sunda/Sahul), buih pantai, dan bayangan daratan.
 * Geometri (path) murni dan sinkron; tekstur (canvas) dihitung sekali setelah peta tampil (attach).
 */
(function (NT) {
  NT.ui = NT.ui || {};
  const G = NT.data.geo;
  const K = 2;   // piksel kanvas per satuan viewBox
  const SLICE_MS = 8;   // jatah kerja per irisan saat menghitung tekstur; sisanya untuk menggambar bingkai dan menerima sentuhan
  const W = Math.ceil((G.lon1 - G.lon0) / G.cellDeg) * G.cellPx;
  const H = Math.ceil((G.lat0 - G.lat1) / G.cellDeg) * G.cellPx;

  /* ---------- Geometri: pantai fraktal ---------- */

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function roughen(ring, seed) {
    const rnd = rng(seed);
    let pts = ring;
    for (let lvl = 0; lvl < 4; lvl++) {
      const out = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        out.push(a);
        const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
        if (len < 0.14) continue;
        const o = Math.max(-0.1, Math.min(0.1, (rnd() * 2 - 1) * len * 0.17));
        out.push([(a[0] + b[0]) / 2 - dy / len * o, (a[1] + b[1]) / 2 + dx / len * o]);
      }
      pts = out;
    }
    return pts;
  }

  function chaikin(p) {
    const out = [];
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      out.push({ x: 0.75 * a.x + 0.25 * b.x, y: 0.75 * a.y + 0.25 * b.y }, { x: 0.25 * a.x + 0.75 * b.x, y: 0.25 * a.y + 0.75 * b.y });
    }
    return out;
  }

  function toPxRing(ring) { return ring.map(function (q) { return NT.raster.toPx(q[0], q[1]); }); }

  const shapeCache = {};
  // Cincin piksel (halus) untuk satu wilayah.
  function shape(id) {
    if (!shapeCache[id]) {
      const idx = Object.keys(G.polygons).indexOf(id);
      shapeCache[id] = G.polygons[id].map(function (ring, k) {
        return chaikin(toPxRing(roughen(ring, 1000 + idx * 97 + k * 13)));
      });
    }
    return shapeCache[id];
  }

  function pathOf(id) {
    return shape(id).map(function (r) {
      return 'M' + r.map(function (p) { return p.x.toFixed(1) + ' ' + p.y.toFixed(1); }).join('L') + 'Z';
    }).join('');
  }

  function boxOf(id) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    shape(id).forEach(function (r) {
      r.forEach(function (p) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); });
    });
    x0 = Math.max(0, Math.floor(x0) - 6); y0 = Math.max(0, Math.floor(y0) - 6);
    x1 = Math.min(W, Math.ceil(x1) + 6); y1 = Math.min(H, Math.ceil(y1) + 6);
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  function landMarkup(id) {
    const b = boxOf(id);
    return '<path class="ph px-grass" d="' + pathOf(id) + '"/>' +
      '<image data-tex="' + id + '" x="' + b.x + '" y="' + b.y + '" width="' + b.w + '" height="' + b.h + '" preserveAspectRatio="none" clip-path="url(#clip-' + id + ')"/>' +
      '<path d="' + pathOf(id) + '" fill="#000" fill-opacity="0"/>';
  }

  function defs() {
    return '<defs>' + Object.keys(G.polygons).map(function (id) {
      return '<clipPath id="clip-' + id + '"><path d="' + pathOf(id) + '"/></clipPath>';
    }).join('') + '</defs>';
  }

  /* ---------- Data pendukung relief dan laut ---------- */

  // Punggung gunung [bujur, lintang]; HIGH = pegunungan tinggi, MID = sedang.
  const RIDGE_HIGH = [
    [[95.5, 5.2], [96.8, 4.3], [98.0, 3.0], [99.2, 1.6], [100.2, 0.2], [101.3, -1.5], [102.4, -3.0], [103.6, -4.2], [104.6, -5.2]],
    [[106.0, -6.7], [107.0, -7.1], [108.2, -7.3], [109.3, -7.3], [110.4, -7.4], [111.5, -7.6], [112.6, -7.9], [113.8, -8.0]],
    [[134.0, -3.0], [135.5, -3.8], [137.0, -4.1], [138.5, -4.2], [139.8, -4.3], [140.9, -4.4]]
  ];
  const RIDGE_MID = [
    [[123.6, 0.8], [122.0, 0.5], [120.3, -1.5], [120.3, -3.0], [120.2, -3.6]], [[121.2, -2.8], [121.6, -3.8], [122.0, -4.5]], [[124.8, 1.2], [123.8, 0.7]],
    [[110.8, -1.0], [111.8, 0.6], [113.5, 1.6], [115.2, 2.8], [116.4, 4.5], [116.5, 6.0]],
    [[129.0, -3.1], [130.2, -3.2]], [[128.0, 1.0], [128.4, 0.3]],
    [[116.45, -8.5], [117.8, -8.6]], [[115.2, -8.3], [115.4, -8.4]], [[120.0, -8.6], [122.8, -8.5]], [[124.5, -9.6], [126.0, -8.8]], [[119.6, -9.6], [120.4, -9.8]],
    [[132.2, -1.2], [133.0, -1.4]], [[98.2, 1.4], [97.4, 1.2]]
  ];
  // Paparan benua dangkal (Sunda di barat, Sahul di tenggara).
  const SHELVES = [
    [[97.5, 6], [100, 8], [106, 8], [111, 7.5], [115, 7.8], [118.8, 6.5], [118.6, 4], [118.2, 1], [117.6, -1.5], [117.2, -3.8], [116, -5.3], [115, -7.2], [114.8, -8.4],
     [112, -8.9], [108, -8.4], [105.5, -6.9], [104.3, -6.4], [102.5, -4.5], [100.5, -1.5], [98.5, 1.5], [97, 4]],
    [[132.5, -2.8], [134.2, -4.2], [135, -8], [136, -9.6], [139, -9.9], [141.6, -10.2], [141.6, -7], [140, -8.2], [138, -7.6], [136.5, -5], [134.5, -3.4]]
  ];

  // Gunung api [bujur, lintang, tinggi relatif]; kerucut ditambahkan ke peta ketinggian.
  const VOLCANOES = [
    [110.44, -7.54, 1], [112.92, -8.11, 1.15], [112.95, -7.94, .8], [109.21, -7.24, .95], [106.98, -6.78, .8], [108.07, -7.25, .8],
    [113.34, -7.97, .7], [114.24, -8.06, .7], [115.51, -8.34, 1], [116.46, -8.41, 1.1], [117.99, -8.25, 1.05], [101.26, -1.7, 1.2],
    [100.47, -0.38, .8], [98.52, 3.23, .8], [124.7, 1.35, .7], [127.6, 0.8, .7], [106.1, -6.1, .6]
  ];
  // Danau [bujur, lintang, jari-jari bujur, jari-jari lintang, sudut derajat].
  const LAKES = [[98.85, 2.65, .3, .095, -38], [120.5, -1.85, .12, .05, 0], [121.5, -2.78, .1, .05, 0], [100.55, -0.38, .05, .03, 0], [103.9, -2.2, .05, .03, 0]];
  // Sungai besar, dari hulu ke muara [bujur, lintang].
  const RIVERS = [
    [[112.6, 0.9], [111.9, 0.6], [111.0, 0.3], [110.4, 0.15], [109.8, 0.05], [109.3, -0.05]],
    [[114.1, -0.6], [114.5, -1.8], [114.6, -2.7], [114.55, -3.45]],
    [[114.6, 0.9], [115.2, 0.5], [116.3, -0.3], [117.1, -0.5], [117.35, -0.55]],
    [[116.0, 2.3], [116.8, 2.9], [117.5, 2.95]],
    [[113.5, 1.5], [112.5, 2.0], [111.4, 2.2], [111.1, 2.25]],
    [[111.5, -1.7], [111.9, -2.5], [112.2, -3.3]],
    [[101.3, -1.6], [102.4, -1.8], [103.4, -1.9], [104.15, -1.3]],
    [[103.2, -3.3], [104.0, -3.0], [104.8, -2.9]],
    [[101.5, -0.8], [102.5, -0.5], [103.4, -0.5]],
    [[100.7, 0.4], [101.5, 0.8], [102.1, 1.15]],
    [[138.2, -3.9], [138.2, -3.0], [137.9, -2.3], [137.85, -1.55]],
    [[140.0, -6.3], [139.9, -7.0], [139.2, -7.7]],
    [[136.9, -4.3], [137.2, -4.8], [137.1, -5.3]],
    [[110.8, -7.7], [111.4, -7.45], [112.1, -7.15], [112.55, -6.9]],
    [[107.4, -7.1], [107.5, -6.5], [107.35, -5.98]],
    [[121.2, -1.3], [120.9, -1.0], [120.7, -0.8]]
  ];

  /* ---------- Derau dan jarak ---------- */

  function lat(ix, iy, s) {
    let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(s, 2147483647);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function vn(x, y, s) {
    const x0 = Math.floor(x), y0 = Math.floor(y), tx = x - x0, ty = y - y0;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const a = lat(x0, y0, s), b = lat(x0 + 1, y0, s), c = lat(x0, y0 + 1, s), d = lat(x0 + 1, y0 + 1, s);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  }
  function fbm(x, y, scale, oct, s) {
    let v = 0, a = 0.5, f = 1 / scale, t = 0;
    for (let o = 0; o < oct; o++) { v += a * vn(x * f, y * f, s + o); t += a; a *= 0.5; f *= 2.03; }
    return v / t;
  }
  function smooth(a, b, x) { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

  // Jarak (piksel) ke sel bertanda 1 terdekat, pendekatan chamfer dua sapuan.
  function* dtGen(seed, w, h) {
    const d = new Float32Array(w * h), R2 = 1.414;
    for (let i = 0; i < d.length; i++) { d[i] = seed[i] ? 0 : 1e9; if (!(i & 0x3FFFF)) yield; }
    for (let y = 0; y < h; y++) {
      if (!(y & 7)) yield;
      for (let x = 0; x < w; x++) {
        const i = y * w + x; let v = d[i];
        if (v === 0) continue;
        if (x > 0) v = Math.min(v, d[i - 1] + 1);
        if (y > 0) {
          v = Math.min(v, d[i - w] + 1);
          if (x > 0) v = Math.min(v, d[i - w - 1] + R2);
          if (x < w - 1) v = Math.min(v, d[i - w + 1] + R2);
        }
        d[i] = v;
      }
    }
    for (let y = h - 1; y >= 0; y--) {
      if (!(y & 7)) yield;
      for (let x = w - 1; x >= 0; x--) {
        const i = y * w + x; let v = d[i];
        if (v === 0) continue;
        if (x < w - 1) v = Math.min(v, d[i + 1] + 1);
        if (y < h - 1) {
          v = Math.min(v, d[i + w] + 1);
          if (x < w - 1) v = Math.min(v, d[i + w + 1] + R2);
          if (x > 0) v = Math.min(v, d[i + w - 1] + R2);
        }
        d[i] = v;
      }
    }
    return d;
  }

  function lut(stops) {
    const out = new Uint8Array(256 * 3);
    for (let i = 0; i < 256; i++) {
      const t = i / 255; let k = 0;
      while (k < stops.length - 2 && t > stops[k + 1][0]) k++;
      const a = stops[k], b = stops[k + 1], f = Math.max(0, Math.min(1, (t - a[0]) / (b[0] - a[0])));
      for (let c = 0; c < 3; c++) out[i * 3 + c] = a[c + 1] + (b[c + 1] - a[c + 1]) * f;
    }
    return out;
  }
  const L_JUNGLE = lut([[0, 70, 140, 72], [.2, 52, 122, 62], [.4, 40, 104, 56], [.55, 70, 116, 62], [.68, 122, 124, 80], [.8, 148, 126, 96], [.92, 184, 174, 158], [1, 242, 242, 238]]);
  const L_PADDY = lut([[0, 164, 192, 100], [.15, 140, 176, 90], [.3, 104, 150, 76], [.45, 70, 122, 62], [.6, 86, 122, 66], [.72, 126, 124, 80], [.85, 150, 128, 98], [1, 242, 242, 238]]);
  const L_SAVANA = lut([[0, 190, 176, 98], [.2, 168, 158, 90], [.4, 132, 138, 78], [.55, 100, 124, 70], [.7, 134, 124, 88], [.85, 156, 134, 104], [1, 236, 236, 230]]);
  const L_SEA = lut([[0, 11, 66, 104], [.35, 20, 104, 140], [.7, 58, 168, 184], [1, 140, 218, 204]]);

  /* ---------- Render tekstur ---------- */

  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  // o = jendela render { x, y, w, h, k } dalam satuan viewBox; k = piksel kanvas per satuan.
  function fillRings(ctx, rings, o) {
    ctx.beginPath();
    rings.forEach(function (r) {
      r.forEach(function (p, i) { const px = (p.x - o.x) * o.k, py = (p.y - o.y) * o.k; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); });
      ctx.closePath();
    });
    ctx.fill();
  }

  /* ---------- Pembagi waktu ----------
   * Perhitungan tekstur berat ditulis sebagai generator yang memberi kendali tiap beberapa baris. Pemanggil sinkron
   * (drain) menghabiskan semuanya; pemanggil async (runSliced) menjalankannya per irisan ~8 ms supaya browser sempat
   * menggambar dan menerima sentuhan, dan bisa membatalkannya kapan saja (pemain mulai menggeser lagi). */
  function drain(gen) {
    let r;
    do { r = gen.next(); } while (!r.done);
    return r.value;
  }

  function runSliced(gen, budgetMs, isStale, done) {
    const mc = typeof MessageChannel === 'function' ? new MessageChannel() : null;
    function next() { if (mc) mc.port2.postMessage(0); else setTimeout(step, 0); }
    function end() { if (mc) { mc.port1.onmessage = null; mc.port1.close(); } }
    function step() {
      if (isStale()) { try { gen.return(); } catch (e) { /* abaikan */ } end(); return; }
      const t0 = performance.now();
      let r;
      do { r = gen.next(); } while (!r.done && performance.now() - t0 < budgetMs);
      if (r.done) { end(); done(r.value); } else next();
    }
    if (mc) mc.port1.onmessage = step;
    next();
  }

  // Baca kanal alfa kanvas per pita baris (getImageData sekaligus untuk kanvas besar memblokir puluhan milidetik).
  function* alphaGen(c) {
    const w = c.width, h = c.height, ctx = c.getContext('2d'), a = new Uint8Array(w * h), band = Math.max(16, Math.floor(262144 / w));
    for (let y0 = 0; y0 < h; y0 += band) {
      const bh = Math.min(band, h - y0), d = ctx.getImageData(0, y0, w, bh).data, off = y0 * w;
      for (let i = 0, n = w * bh; i < n; i++) a[off + i] = d[i * 4 + 3];
      yield;
    }
    return a;
  }

  // Hitung tekstur laut dan darat untuk satu jendela (default: seluruh peta pada K). Derau memakai koordinat dunia,
  // jadi jendela mana pun menghasilkan gambar yang sama dengan potongan peta penuh, hanya lebih tajam bila k lebih besar.
  // Jarak ke pantai (dt) dihitung di dalam jendela: pemanggil harus memberi tepi >= EDGE satuan di luar area yang dipakai.
  function* computeGen(o) {
    o = o || { x: 0, y: 0, w: W, h: H, k: K };
    const k = o.k, ox = o.x, oy = o.y;
    const w = Math.ceil(o.w * k), h = Math.ceil(o.h * k), N = w * h;
    const play = canvas(w, h), nbc = canvas(w, h);
    let ctx = play.getContext('2d'); ctx.fillStyle = '#fff';
    Object.keys(G.polygons).forEach(function (id) { if (id !== 'neighbor') fillRings(ctx, shape(id), o); });
    ctx = nbc.getContext('2d'); ctx.fillStyle = '#fff'; fillRings(ctx, shape('neighbor'), o);
    const aP = yield* alphaGen(play), aN = yield* alphaGen(nbc), land = new Uint8Array(N);
    for (let i = 0; i < N; i++) { land[i] = Math.max(aP[i], aN[i]); if (!(i & 0x3FFFF)) yield; }

    const shelfC = canvas(w, h); ctx = shelfC.getContext('2d'); ctx.fillStyle = '#fff';
    fillRings(ctx, SHELVES.map(function (r) { return chaikin(chaikin(toPxRing(r))); }), o);
    const aS = yield* alphaGen(shelfC);
    // Wilayah "segera hadir" dan sekitarnya (tepi 12 satuan): bayangan dan buihnya dibuat lebih pudar, sama seperti pulaunya.
    const soonC = canvas(w, h); ctx = soonC.getContext('2d'); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff'; ctx.lineJoin = 'round'; ctx.lineWidth = 24 * k;
    let anySoon = false;
    Object.keys(G.polygons).forEach(function (id) {
      const rg = NT.data.regions && NT.data.regions[id];
      if (!rg || !rg.comingSoon) return;
      anySoon = true; fillRings(ctx, shape(id), o);
      shape(id).forEach(function (ring) {
        ctx.beginPath();
        ring.forEach(function (p, i) { const px = (p.x - ox) * k, py = (p.y - oy) * k; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); });
        ctx.closePath(); ctx.stroke();
      });
    });
    const aSoon = anySoon ? yield* alphaGen(soonC) : null;
    function* ridgeSeed(list) {
      const c = canvas(w, h), x = c.getContext('2d');
      x.strokeStyle = '#fff'; x.lineWidth = 3 * k; x.lineCap = 'round'; x.lineJoin = 'round';
      list.forEach(function (l) {
        x.beginPath();
        l.forEach(function (q, i) { const p = NT.raster.toPx(q[0], q[1]), px = (p.x - ox) * k, py = (p.y - oy) * k; if (i) x.lineTo(px, py); else x.moveTo(px, py); });
        x.stroke();
      });
      return yield* alphaGen(c);
    }

    const sLand = new Uint8Array(N), sSea = new Uint8Array(N), sOut = new Uint8Array(N);
    for (let i = 0; i < N; i++) { sLand[i] = land[i] > 127 ? 1 : 0; sSea[i] = sLand[i] ? 0 : 1; sOut[i] = aS[i] < 128 ? 1 : 0; if (!(i & 0x3FFFF)) yield; }
    const dSea = yield* dtGen(sLand, w, h), dIn = yield* dtGen(sSea, w, h), dShelf = yield* dtGen(sOut, w, h);
    const rh = yield* ridgeSeed(RIDGE_HIGH), rm = yield* ridgeSeed(RIDGE_MID);
    for (let i = 0; i < N; i++) { sLand[i] = rh[i] > 40 ? 1 : 0; sSea[i] = rm[i] > 40 ? 1 : 0; if (!(i & 0x3FFFF)) yield; }
    const dH = yield* dtGen(sLand, w, h), dM = yield* dtGen(sSea, w, h);

    // Ketinggian 0..1 (hanya daratan).
    const hgt = new Float32Array(N);
    for (let y = 0; y < h; y++) {
      if (!(y & 3)) yield;
      for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (land[i] < 128) continue;
      const vx = ox + x / k, vy = oy + y / k;
      const inl = Math.min(1, dIn[i] / (24 * k));
      const rH = Math.exp(-Math.pow(dH[i] / (9 * k), 2)), rM = Math.exp(-Math.pow(dM[i] / (7 * k), 2));
      const n1 = fbm(vx, vy, 14, 4, 11), n2 = fbm(vx, vy, 5, 3, 21), n3 = fbm(vx, vy, 2.2, 2, 31);
      const v = (0.07 + 0.30 * n1) * (0.3 + 0.7 * inl) + rH * (0.55 + 0.45 * n2) + rM * (0.30 + 0.32 * n2) + 0.05 * (n3 - 0.5);
      hgt[i] = Math.max(0, Math.min(1, v));
      }
    }
    // Kerucut gunung api: kenaikan mulus dengan kawah kecil di puncak.
    VOLCANOES.forEach(function (vc) {
      const c = NT.raster.toPx(vc[0], vc[1]), r0 = 5.2 * k, px = (c.x - ox) * k, py = (c.y - oy) * k;
      const y0 = Math.max(0, Math.floor(py - r0 * 2.2)), y1 = Math.min(h - 1, Math.ceil(py + r0 * 2.2));
      const x0 = Math.max(0, Math.floor(px - r0 * 2.2)), x1 = Math.min(w - 1, Math.ceil(px + r0 * 2.2));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const i = y * w + x;
        if (land[i] < 128) continue;
        const d = Math.hypot(x - px, y - py) / r0;
        let add = 0.34 * vc[2] * Math.exp(-Math.pow(d / 0.95, 1.5));
        if (d < 0.16) add -= 0.05 * vc[2] * (1 - d / 0.16);
        hgt[i] = Math.min(1, hgt[i] + add);
      }
    });

    const seaImg = new ImageData(w, h), landImg = new ImageData(w, h), sd = seaImg.data, ld = landImg.data;
    const sh = Math.max(1, Math.round(1.5 * k)), hw = W / 2, hh2 = H / 2;
    // Bayangan jatuh dan buih pantai pulau (dulu dua lapisan vektor ber-filter blur yang digambar ulang tiap bingkai geser):
    // dipanggang ke tekstur laut. Siluet bayangan digeser (2,5; 6) satuan lalu dikaburkan sigma 2,4; buih = garis tebal 4 satuan
    // di pantai, juga dikaburkan. Jarak bertanda d (satuan; positif di laut) dari transformasi jarak yang sudah ada.
    const SDX = Math.round(2.5 * k), SDY = Math.round(6 * k), SIG = 2 * 2.4;
    function inside(d) { return 1 - smooth(-SIG, SIG, d); }
    for (let y = 0; y < h; y++) {
      if (!(y & 3)) yield;
      for (let x = 0; x < w; x++) {
      const i = y * w + x, oo = i * 4, vx = ox + x / k, vy = oy + y / k;
      if (land[i] >= 128 || (aP[i] > 0 || aN[i] > 0)) {
        // ----- Darat -----
        const hh = hgt[i];
        const gx = (x < w - 1 ? hgt[i + 1] : hh) - (x > 0 ? hgt[i - 1] : hh);
        const gy = (y < h - 1 ? hgt[i + w] : hh) - (y > 0 ? hgt[i - w] : hh);
        const shade = Math.max(-0.5, Math.min(0.5, -(gx + gy) * 7));
        const lon = G.lon0 + (vx / G.cellPx) * G.cellDeg, la = G.lat0 - (vy / G.cellPx) * G.cellDeg;
        const paddy = (lon > 105.6 && lon < 116.8 && la < -5.7 && la > -9) ? 1 : 0;
        const sav = la < -8.0 ? smooth(116.5, 121, lon) : 0;
        const pat = (vn(vx / 3, vy / 3, 51) - 0.5) * 0.1;
        const li = Math.max(0, Math.min(255, ((hh + pat) * 255) | 0)) * 3;
        let r = L_JUNGLE[li], g = L_JUNGLE[li + 1], b = L_JUNGLE[li + 2];
        if (paddy) { const f = (1 - smooth(0.15, 0.42, hh)) * 0.8; r += (L_PADDY[li] - r) * f; g += (L_PADDY[li + 1] - g) * f; b += (L_PADDY[li + 2] - b) * f; }
        if (sav > 0) { const f = sav * (1 - smooth(0.3, 0.6, hh)) * 0.85; r += (L_SAVANA[li] - r) * f; g += (L_SAVANA[li + 1] - g) * f; b += (L_SAVANA[li + 2] - b) * f; }
        const ws = 0.35 + 0.9 * Math.pow(vn(vx / 8, vy / 8, 77), 2);
        const sf = 1 - smooth(ws * 0.45, ws, dIn[i] / k);
        r += (230 - r) * sf; g += (216 - g) * sf; b += (170 - b) * sf;
        // Tekstur kanopi: bintik halus frekuensi tinggi di dataran rendah (hutan), memudar di puncak.
        const can = (vn(vx * 1.7, vy * 1.7, 61) - 0.5) * 0.2 * (1 - smooth(0.55, 0.85, hh)) * (1 - sf);
        const m = 1 + shade * 0.95 + can;
        r *= m; g *= m; b *= m;
        // Danau: air biru dengan tepi pasir tipis.
        for (let k = 0; k < LAKES.length; k++) {
          const lk = LAKES[k], an = lk[4] * Math.PI / 180, ca = Math.cos(an), sa = Math.sin(an);
          const dx0 = lon - lk[0], dy0 = la - lk[1];
          const ex = (dx0 * ca + dy0 * sa) / lk[2], ey = (-dx0 * sa + dy0 * ca) / lk[3], q = Math.sqrt(ex * ex + ey * ey);
          if (q < 1.18) {
            const wf = 1 - smooth(0.88, 1.0, q), edge = smooth(0.78, 0.98, q);
            const wr = 38 + 26 * edge, wg = 112 + 30 * edge, wb = 150 + 20 * edge;
            r += (wr - r) * wf; g += (wg - g) * wf; b += (wb - b) * wf;
            if (q > 1.0) { const sd = 1 - smooth(1.0, 1.18, q); r += (214 - r) * sd * 0.35; g += (204 - g) * sd * 0.35; b += (160 - b) * sd * 0.35; }
          }
        }
        let a = land[i];
        if (aN[i] > 0 && aP[i] === 0) { r += (118 - r) * 0.78; g += (134 - g) * 0.78; b += (120 - b) * 0.78; a *= 0.92; }
        ld[oo] = r; ld[oo + 1] = g; ld[oo + 2] = b; ld[oo + 3] = a;
      }
      // ----- Laut (selalu digambar di bawah daratan) -----
      const ds = dSea[i] / k;
      const coastS = land[i] >= 128 ? 1 : 1 - smooth(0, 13, ds);
      const shelfS = smooth(0, 26, dShelf[i] / k) * 0.6;
      const s = Math.max(coastS * 0.95, shelfS);
      const si = Math.max(0, Math.min(255, (s * 255) | 0)) * 3;
      // Riak: derau lebar + guratan memanjang searah angin (anisotropik), lebih jelas di laut dalam.
      const streak = fbm(vx * 0.55, vy * 2.4, 3.2, 3, 300) - 0.5;
      const wn = 0.95 + 0.1 * fbm(vx, vy, 6, 3, 200) + streak * 0.07 * (1 - s * 0.6);
      let r = L_SEA[si] * wn, g = L_SEA[si + 1] * wn, b = L_SEA[si + 2] * wn;
      // Garis kontur tipis di tepi paparan benua.
      const brk = Math.exp(-Math.pow(dShelf[i] / k / 1.4, 2)) * 0.1;
      r *= 1 - brk; g *= 1 - brk * 0.8; b *= 1 - brk * 0.5;
      if (ds < 0.8) { const f = 0.5 * (1 - ds / 0.8); r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
      const j = (y - sh) * w + (x - sh);
      if (y >= sh && x >= sh && land[j] > 127 && land[i] < 128) { r *= 0.72; g *= 0.74; b *= 0.78; }
      if (y >= SDY && x >= SDX && ds < 22) {
        const js = (y - SDY) * w + (x - SDX);
        const dsh = land[js] >= 128 ? -dIn[js] / k : dSea[js] / k;
        const fade = aSoon && aSoon[i] > 127 ? 0.6 : 1;
        if (dsh < SIG) {                                   // bayangan: warna #021822, kepekatan 0,42
          const a = 0.42 * inside(dsh) * fade;
          r += (2 - r) * a; g += (24 - g) * a; b += (34 - b) * a;
        }
        const d0 = land[i] >= 128 ? -dIn[i] / k : ds;
        const fm = (inside(d0 - 2) - inside(d0 + 2)) * 0.3 * fade;   // buih: warna #eafcff, kepekatan 0,3
        if (fm > 0.002) { r += (234 - r) * fm; g += (252 - g) * fm; b += (255 - b) * fm; }
      }
      const dx = (vx - hw) / hw, dy = (vy - hh2) / hh2, vg = 1 - 0.2 * smooth(0.55, 1.15, Math.sqrt(dx * dx + dy * dy));
      // Tepi laut memudar ke warna latar kotak peta (#062c3b): tanpa garis tegas saat peta lebih pendek dari kotaknya.
      const ef = 1 - smooth(0, 1, Math.min(vx, 2 * hw - vx, vy, 2 * hh2 - vy) / 18);
      sd[oo] = r * vg + (6 - r * vg) * ef; sd[oo + 1] = g * vg + (44 - g * vg) * ef; sd[oo + 2] = b * vg + (59 - b * vg) * ef; sd[oo + 3] = 255;
      }
    }
    const sea = canvas(w, h), lnd = canvas(w, h);
    sea.getContext('2d').putImageData(seaImg, 0, 0);
    const lc = lnd.getContext('2d');
    lc.putImageData(landImg, 0, 0);
    drawRivers(lc, o);
    return { sea: sea, land: lnd };
  }

  // Versi sinkron (dipakai tes dan pemanggil lama): hasil identik dengan versi beririsan.
  function compute(o) { return drain(computeGen(o)); }

  // Sungai: garis berliku (derau tegak lurus arah aliran), melebar ke muara; hanya tampil di atas daratan.
  function drawRivers(ctx, o) {
    const kk = o.k;
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    RIVERS.forEach(function (rv, ri) {
      const pts = rv.map(function (q) { const p = NT.raster.toPx(q[0], q[1]); return { x: (p.x - o.x) * kk, y: (p.y - o.y) * kk }; });
      const path = [];
      for (let k = 0; k < pts.length - 1; k++) {
        const a = pts[k], b = pts[k + 1], len = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(2, Math.round(len / (3 * kk)));
        const nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len;
        for (let t = 0; t < n; t++) {
          const f = t / n, o = (vn(ri * 7.3 + k * 3.1 + f * 4, k * 1.7, 91) - 0.5) * 3.2 * kk * Math.sin(Math.PI * Math.min(1, f + 0.15));
          path.push({ x: a.x + (b.x - a.x) * f + nx * o, y: a.y + (b.y - a.y) * f + ny * o });
        }
      }
      path.push(pts[pts.length - 1]);
      const N = path.length;
      for (let k = 0; k < N - 1; k++) {
        const wdt = (0.55 + 1.15 * (k / N)) * kk;
        ctx.strokeStyle = 'rgba(70,138,170,0.88)'; ctx.lineWidth = wdt;
        ctx.beginPath(); ctx.moveTo(path[k].x, path[k].y); ctx.lineTo(path[k + 1].x, path[k + 1].y); ctx.stroke();
      }
    });
    ctx.restore();
  }

  function toURL(c, type, cb) {
    if (c.toBlob) c.toBlob(function (b) { cb(b ? URL.createObjectURL(b) : c.toDataURL(type)); }, type, 0.9);
    else cb(c.toDataURL(type));
  }

  // Hitung tekstur setelah peta tampil, lalu pasang ke elemen <image data-tex>.
  function attach(host, done) {
    setTimeout(function () {
      runSliced(computeGen(), SLICE_MS, function () { return false; }, function (r) {
        const imgs = host.querySelectorAll('image[data-tex]');
        let left = imgs.length;
        imgs.forEach(function (img) {
          const id = img.getAttribute('data-tex');
          let src = r.sea, type = 'image/jpeg';
          if (id !== 'sea') {
            const b = boxOf(id), c = canvas(b.w * K, b.h * K);
            c.getContext('2d').drawImage(r.land, b.x * K, b.y * K, b.w * K, b.h * K, 0, 0, b.w * K, b.h * K);
            src = c; type = 'image/png';
          }
          toURL(src, type, function (url) {
            img.setAttribute('href', url);
            const ph = img.parentNode && img.parentNode.querySelector('.ph');
            if (ph) ph.remove();
            if (!--left && done) done();
          });
        });
      });
    }, 30);
  }

  /* ---------- Tekstur tajam untuk jendela yang terlihat (Z2) ---------- */

  const EDGE = 30;         // satuan viewBox di luar area pakai; cukup untuk semua jarak di compute (paling jauh 26)
  const NS = 'http://www.w3.org/2000/svg';
  let hi = null;           // { x, y, w, h, k, urls: [] } area yang sedang tampil tajam
  let gen = 0;             // naik tiap permintaan baru; hasil async yang basi dibuang

  function clearRefine(svg) {
    gen++;
    if (hi) hi.urls.forEach(function (u) { try { URL.revokeObjectURL(u); } catch (e) { /* abaikan */ } });
    hi = null;
    if (svg) svg.querySelectorAll('image.hi').forEach(function (n) { n.remove(); });
  }

  // Rencana render: area pakai (terlihat + cadangan geser 20%) dibulatkan ke satuan utuh dan dijepit ke peta; k bulat
  // supaya piksel kanvas jatuh tepat di kisi satuan. Kembalikan null bila kemajuannya tidak berarti.
  function plan(rect, need, maxPx) {
    const sx = rect.w * 0.2, sy = rect.h * 0.2;
    const x0 = Math.max(0, Math.floor(rect.x - sx)), y0 = Math.max(0, Math.floor(rect.y - sy));
    const x1 = Math.min(W, Math.ceil(rect.x + rect.w + sx)), y1 = Math.min(H, Math.ceil(rect.y + rect.h + sy));
    const inner = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    if (inner.w < 1 || inner.h < 1) return null;
    const ex = Math.max(0, inner.x - EDGE), ey = Math.max(0, inner.y - EDGE);
    const ext = { x: ex, y: ey, w: Math.min(W, inner.x + inner.w + EDGE) - ex, h: Math.min(H, inner.y + inner.h + EDGE) - ey };
    const kmax = Math.floor(Math.sqrt(maxPx / (ext.w * ext.h)));
    const k = Math.min(8, need, kmax);
    if (k <= K) return null;
    ext.k = k;
    return { inner: inner, ext: ext, k: k };
  }

  function crop(src, ext, inner, k, type) {
    const c = canvas(Math.round(inner.w * k), Math.round(inner.h * k));
    c.getContext('2d').drawImage(src, Math.round((inner.x - ext.x) * k), Math.round((inner.y - ext.y) * k), c.width, c.height, 0, 0, c.width, c.height);
    return c;
  }

  function covers(a, r) { return a.x <= r.x + 0.5 && a.y <= r.y + 0.5 && a.x + a.w >= r.x + r.w - 0.5 && a.y + a.h >= r.y + r.h - 0.5; }

  // rect = bagian peta yang terlihat; need = piksel kanvas per satuan yang dibutuhkan layar (skala x rasio piksel).
  // Mengembalikan true bila render dimulai. Sinkron saat menghitung (dibatasi maxPx piksel), async saat mengunggah gambar.
  function refine(svg, rect, need, maxPx, done) {
    const pl = plan(rect, Math.ceil(need), maxPx || 2400000);
    if (!pl) { if (hi) clearRefine(svg); return false; }
    // Sudah cukup: area terlihat tercakup dan ketajamannya tidak kalah dari yang dibutuhkan.
    if (hi && covers(hi, rect) && hi.k >= pl.k) return false;
    const my = ++gen;
    const urls = [];
    let left = 2, seaUrl = null, landUrl = null;
    function finish() {
      if (my !== gen) { urls.forEach(function (u) { URL.revokeObjectURL(u); }); return; }
      if (hi) hi.urls.forEach(function (u) { try { URL.revokeObjectURL(u); } catch (e) { /* abaikan */ } });
      svg.querySelectorAll('image.hi').forEach(function (n) { n.remove(); });
      function mk(base, url) {
        const im = document.createElementNS(NS, 'image');
        im.setAttribute('class', 'hi');
        im.setAttribute('x', pl.inner.x); im.setAttribute('y', pl.inner.y);
        im.setAttribute('width', pl.inner.w); im.setAttribute('height', pl.inner.h);
        im.setAttribute('preserveAspectRatio', 'none');
        const cp = base.getAttribute('clip-path'); if (cp) im.setAttribute('clip-path', cp);
        im.setAttribute('href', url);
        base.parentNode.insertBefore(im, base.nextSibling);
      }
      svg.querySelectorAll('image[data-tex]').forEach(function (base) { mk(base, base.getAttribute('data-tex') === 'sea' ? seaUrl : landUrl); });
      hi = { x: pl.inner.x, y: pl.inner.y, w: pl.inner.w, h: pl.inner.h, k: pl.k, urls: urls };
      if (done) done(hi);
    }
    // Hitung beririsan (UI tetap lancar); bila pemain mulai menyentuh peta lagi, cancel() menaikkan gen dan hitungan dibuang.
    runSliced(computeGen(pl.ext), SLICE_MS, function () { return my !== gen; }, function (r) {
      const seaC = crop(r.sea, pl.ext, pl.inner, pl.k), landC = crop(r.land, pl.ext, pl.inner, pl.k);
      toURL(seaC, 'image/jpeg', function (u) { seaUrl = u; urls.push(u); if (!--left) finish(); });
      toURL(landC, 'image/png', function (u) { landUrl = u; urls.push(u); if (!--left) finish(); });
    });
    return true;
  }

  // Batalkan render tajam yang sedang berjalan (gambar tajam yang sudah terpasang tetap dipakai).
  function cancel() { gen++; }

  NT.ui.terrain = {
    W: W, H: H, K: K, EDGE: EDGE, defs: defs, landMarkup: landMarkup, pathOf: pathOf, boxOf: boxOf, attach: attach, shape: shape,
    render: compute, renderGen: computeGen, drain: drain, plan: plan, refine: refine, clearRefine: clearRefine, cancel: cancel,
    state: function () { return hi ? { x: hi.x, y: hi.y, w: hi.w, h: hi.h, k: hi.k } : null; }
  };
})((window.NT = window.NT || {}));
