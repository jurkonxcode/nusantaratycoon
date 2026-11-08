/*
 * Peta pixel art Nusantara. Daratan digambar dari grid sel hasil rasterisasi poligon geografi
 * (data/geo.js), jadi posisi pulau mengikuti bujur/lintang nyata. Dibuat sekali; setelah itu hanya
 * kelas pulau dan lapisan dinamis (bangunan, jalan tol, pelabuhan) yang diperbarui.
 */
(function (NT) {
  NT.ui = NT.ui || {};
  const D = NT.data;
  const G = D.geo;
  const S = G.cellPx;

  // Derau deterministik 0..1 per sel, supaya hutan dan pantai tampak berbintik tapi tidak berubah-ubah.
  function noise(x, y, salt) {
    let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(salt || 0, 2147483647);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  // Derau mulus (interpolasi antar titik kisi) supaya hutan dan dataran tinggi membentuk gugusan, bukan bintik acak.
  function smooth(x, y, salt, scale) {
    const fx = x / scale, fy = y / scale;
    const x0 = Math.floor(fx), y0 = Math.floor(fy);
    const tx = fx - x0, ty = fy - y0;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const a = noise(x0, y0, salt), b = noise(x0 + 1, y0, salt), c = noise(x0, y0 + 1, salt), d = noise(x0 + 1, y0 + 1, salt);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  }

  // Ketinggian semu 0..1 untuk satu sel daratan.
  function height(x, y) { return 0.82 * smooth(x, y, 1, 5) + 0.18 * noise(x, y, 2); }

  // Gabungkan sel berurutan dalam satu baris menjadi satu persegi panjang (path ringkas).
  function runsPath(grid, test) {
    const d = [];
    for (let cy = 0; cy < grid.H; cy++) {
      let start = -1;
      for (let cx = 0; cx <= grid.W; cx++) {
        const on = cx < grid.W && test(cx, cy, cy * grid.W + cx);
        if (on && start < 0) start = cx;
        if (!on && start >= 0) {
          d.push('M' + start * S + ' ' + cy * S + 'h' + (cx - start) * S + 'v' + S + 'h-' + (cx - start) * S + 'z');
          start = -1;
        }
      }
    }
    return d.join('');
  }

  function isSea(grid, x, y) {
    return x < 0 || y < 0 || x >= grid.W || y >= grid.H || grid.owner[y * grid.W + x] === null;
  }

  function coastal(grid, x, y) {
    return isSea(grid, x - 1, y) || isSea(grid, x + 1, y) || isSea(grid, x, y - 1) || isSea(grid, x, y + 1);
  }

  // Pantai berpasir: sel tepi, dengan sedikit selang-seling supaya garis pantai tidak tampak seperti bingkai.
  function sandy(grid, x, y) { return coastal(grid, x, y) && noise(x, y, 3) < 0.78; }

  function landPaths(grid, id) {
    const own = function (i) { return grid.owner[i] === id; };
    const inland = function (x, y, i) { return own(i) && !sandy(grid, x, y); };
    return '' +
      '<path class="px-sand" d="' + runsPath(grid, function (x, y, i) { return own(i) && sandy(grid, x, y); }) + '"/>' +
      '<path class="px-grass" d="' + runsPath(grid, function (x, y, i) { return inland(x, y, i) && height(x, y) < 0.56; }) + '"/>' +
      '<path class="px-forest" d="' + runsPath(grid, function (x, y, i) { const h = height(x, y); return inland(x, y, i) && h >= 0.56 && h < 0.72; }) + '"/>' +
      '<path class="px-dark" d="' + runsPath(grid, function (x, y, i) { return inland(x, y, i) && height(x, y) >= 0.72; }) + '"/>';
  }

  function pt(lonlat) { return NT.raster.toPx(lonlat[0], lonlat[1]); }

  // Kedalaman pulau: bayangan jatuh di laut, buih pantai, dan sisi tebing (pulau tampak terangkat dari laut).
  function depthMarkup(id) {
    const d = NT.ui.terrain.pathOf(id);
    return '<g class="island-depth">' +
      '<path class="id-shadow" d="' + d + '" transform="translate(2.5,6)"/>' +
      '<path class="id-foam" d="' + d + '"/>' +
      '<path class="id-side2" d="' + d + '" transform="translate(0,3.6)"/>' +
      '<path class="id-side" d="' + d + '" transform="translate(0,1.8)"/>' +
    '</g>';
  }

  function islandMarkup(grid, r) {
    const pin = pt(r.map.pin), label = pt(r.map.label);
    const text = r.short || r.name;
    const lw = Math.round(text.length * 9.6 + 20);
    return '' +
      '<g class="island" data-region="' + r.id + '" tabindex="0" role="button" aria-label="' + r.name + '">' +
        depthMarkup(r.id) +
        '<g class="island-land">' + NT.ui.terrain.landMarkup(r.id) + '</g>' +
        '<g class="dyn" data-dyn="' + r.id + '"></g>' +
        '<g class="island-tag"><rect class="label-bg" x="' + (label.x - lw / 2) + '" y="' + (label.y - 17) + '" width="' + lw + '" height="25" rx="7"/>' +
        '<text class="island-label" x="' + label.x + '" y="' + label.y + '" text-anchor="middle">' + text + '</text></g>' +
        '<g class="pin" transform="translate(' + pin.x + ',' + pin.y + ')">' +
          '<g class="ui-s">' +
          '<circle class="pin-pulse" r="17"/>' +
          '<circle class="pin-dot" r="17"/>' +
          '<text class="pin-icon" text-anchor="middle" dy="7">' + r.icon + '</text>' +
          '<image class="pin-img" x="-14" y="-15" width="28" height="28" visibility="hidden"/>' +
          '</g></g>' +
      '</g>';
  }

  function shipsMarkup() {
    return G.lanes.map(function (lane, i) {
      const pts = lane.map(pt);
      const there = pts.map(function (p, k) { return (k ? 'L' : 'M') + p.x.toFixed(1) + ',' + p.y.toFixed(1); }).join('');
      const back = pts.slice(0, -1).reverse().map(function (p) { return 'L' + p.x.toFixed(1) + ',' + p.y.toFixed(1); }).join('');
      return '<g class="ship"><animateMotion dur="' + (70 + i * 14) + 's" repeatCount="indefinite" path="' + there + back + '"/>' +
        NT.ui.art.map('kapal', 0, 4, 32) + '</g>';
    }).join('');
  }

  // Nama perairan, hanya digambar bila titiknya jatuh di laut dalam (tidak menimpa pulau atau label).
  const SEAS = [
    ['Samudra Hindia', 99.5, -8.6], ['Laut Cina Selatan', 108.5, 5.6], ['Laut Jawa', 111.5, -4.9],
    ['Laut Banda', 128.6, -6.5], ['Samudra Pasifik', 132.5, 5.6], ['Laut Arafura', 136.2, -9.6], ['Selat Makassar', 117.6, -1.6]
  ];

  function seaLabels(grid) {
    return SEAS.map(function (s) {
      const c = NT.raster.toCell(s[1], s[2]);
      const x = Math.floor(c.cx), y = Math.floor(c.cy);
      const span = Math.ceil(s[0].length * 0.9 / 2);   // sel yang ditempati teks, kira-kira
      for (let dx = -span; dx <= span; dx += 2) {
        if (x + dx < 0 || x + dx >= grid.W || y < 0 || y >= grid.H || grid.dist[y * grid.W + x + dx] < 3) return '';
      }
      const p = NT.raster.toPx(s[1], s[2]);
      return '<text class="sea-label" x="' + p.x.toFixed(0) + '" y="' + p.y.toFixed(0) + '" text-anchor="middle">' + s[0] + '</text>';
    }).join('');
  }

  // Garis bujur/lintang tipis tiap 5 derajat (hiasan kartografi).
  function graticule(W, H) {
    let d = '';
    for (let lon = 100; lon < G.lon1; lon += 5) { const x = NT.raster.toPx(lon, 0).x; d += 'M' + x + ' 0V' + H; }
    for (let lat = 5; lat > G.lat1; lat -= 5) { const y = NT.raster.toPx(95, lat).y; d += 'M0 ' + y + 'H' + W; }
    return '<path class="graticule" d="' + d + '"/>';
  }

  function compass(x, y) {
    return '<g class="compass" transform="translate(' + x + ',' + y + ')">' +
      '<circle r="26" class="cp-ring"/><path class="cp-n" d="M0-22L6 0H-6Z"/><path class="cp-s" d="M0 22L6 0H-6Z"/>' +
      '<text class="cp-t" y="-30" text-anchor="middle">U</text></g>';
  }

  function build() {
    const grid = NT.raster.grid();
    const W = grid.W * S, H = grid.H * S;
    const cp = NT.raster.toPx(135.2, 2.4);
    const T = NT.ui.terrain;
    const seaImg = '<image data-tex="sea" x="0" y="0" width="' + W + '" height="' + H + '" preserveAspectRatio="none"/>';
    const neighbor = '<g class="neighbor-land">' + T.landMarkup('neighbor') + '</g>';
    const islands = Object.keys(D.regions).map(function (id) { return islandMarkup(grid, D.regions[id]); }).join('');

    return '' +
    '<svg class="map-svg" viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Peta Nusantara">' +
      T.defs() + '<defs><filter id="soft" x="-4%" y="-4%" width="108%" height="108%"><feGaussianBlur stdDeviation="2.4"/></filter></defs>' +
      '<rect class="px-deep" width="' + W + '" height="' + H + '"/>' + seaImg +
      graticule(W, H) + neighbor + seaLabels(grid) + '<g class="ships">' + shipsMarkup() + '</g>' + islands + compass(cp.x, cp.y) +
    '</svg>';
  }

  /* ---------- Lapisan dinamis: jalan tol, bangunan, pelabuhan ---------- */

  // Garis sel antar dua titik (Bresenham), dikembalikan sebagai path persegi.
  function linePath(a, b, width) {
    const x0 = Math.floor(a.cx), y0 = Math.floor(a.cy), x1 = Math.floor(b.cx), y1 = Math.floor(b.cy);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, x = x0, y = y0, d = '', guard = 0;
    for (;;) {
      d += 'M' + x * S + ' ' + y * S + 'h' + S + 'v' + S * width + 'h-' + S + 'z';
      if ((x === x1 && y === y1) || ++guard > 400) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
    return d;
  }

  // Lencana pembangunan: palu bergoyang dan bar progres (lebar diisi tiap detik oleh tickJobs).
  function jobBadge(x, y, key) {
    return '<g class="jobbadge" transform="translate(' + x + ',' + y + ')"><g class="ui-b"><text class="hammer" text-anchor="middle" dy="-4">🔨</text>' +
      '<rect class="jb-bg" x="-14" y="2" width="28" height="5" rx="2"/>' +
      '<rect class="jb-fill" data-job="' + key + '" x="-14" y="2" width="0" height="5" rx="2"/></g></g>';
  }

  function dynMarkup(r, rs, state) {
    if (r.comingSoon || !rs.unlocked) return '';
    const m = r.map;
    const tol = (rs.infra && rs.infra.tol) || 0;
    const port = (rs.infra && rs.infra.pelabuhan) || 0;
    let out = '';

    if (tol > 0) {
      const c0 = NT.raster.toCell(m.pin[0], m.pin[1]);
      const ends = Object.keys(m.slots || {}).map(function (bid) { return NT.raster.toCell(m.slots[bid][0], m.slots[bid][1]); });
      if (m.port) ends.push(NT.raster.toCell(m.port[0], m.port[1]));
      const width = tol >= 3 ? 2 : 1;
      out += '<path class="road" d="' + ends.map(function (e) { return linePath(c0, e, width); }).join('') + '"/>';
    }

    // Semua objek diurutkan menurut posisi y (yang di utara digambar dulu), lencana dan gelembung selalu di atas.
    const items = [], top = [];
    // Sprite berdiri dengan titik tanahnya (sekitar 84% tinggi gambar) tepat di koordinat slot.
    // Sedikit perspektif: makin ke selatan sedikit lebih besar.
    const gy = NT.raster.grid().H * S;
    // Varian tingkat sprite ('<id>_t2', '<id>_t3') bila ada; kalau tidak, sprite dasar.
    function tierName(id, tier) { return tier >= 2 ? [id, tier] : id; }
    function put(name, p, size, opacity) {
      const k = 0.92 + 0.16 * Math.min(1, Math.max(0, p.y / gy));
      const sz = Math.round(size * k);
      const cy = p.y + 4 - sz * 0.22;
      // name bisa 'id' atau [id, tingkat]: tingkat 2/3 digambar sebagai lapisan hiasan kecil di atas sprite dasar.
      const id = Array.isArray(name) ? name[0] : name, tier = Array.isArray(name) ? name[1] : 1;
      let svg = NT.ui.art.map(id, p.x, cy, sz, opacity);
      if (tier >= 2 && NT.assets && NT.assets.sprite[id + '_t' + tier]) svg += NT.ui.art.map(id + '_t' + tier, p.x, cy, sz, opacity);
      items.push({ y: p.y, svg: svg });
    }

    Object.keys(m.slots || {}).forEach(function (bid) {
      const lvl = (state.buildings[bid] && state.buildings[bid].level) || 0;
      const p = pt(m.slots[bid]);
      const job = NT.economy.jobFor(state, 'b:' + bid);
      put(tierName(bid, lvl >= 6 ? 3 : (lvl >= 3 ? 2 : 1)), p, lvl >= 3 ? 46 : 40, lvl ? (job ? 0.7 : null) : (job ? 0.55 : 0.28));
      if (lvl) {
        top.push('<g class=\"bubble\" data-id=\"' + bid + '\" transform=\"translate(' + p.x + ',' + (p.y - 38) + ')\"><g class=\"ui-b\"><g class=\"bob\">' +
          '<circle r=\"11\" class=\"bubble-bg\"/><text class=\"bubble-ico\" text-anchor=\"middle\" dy=\"5\">📦</text></g></g></g>');
      }
      if (job) top.push(jobBadge(p.x, p.y + 12, job.key));
    });
    const tolJob = NT.economy.jobFor(state, 'i:' + r.id + ':tol');
    if (tolJob) { const pp = pt(m.pin); top.push(jobBadge(pp.x, pp.y + 32, tolJob.key)); }

    if (m.port) {
      const p = pt(m.port);
      put(tierName('pelabuhan', port >= 5 ? 3 : (port >= 3 ? 2 : 1)), p, port >= 3 ? 50 : 44, port ? null : 0.28);
      if (port > 0) put('kapal', { x: p.x - 28 - port * 2, y: p.y + 12 }, 28);
      const portJob = NT.economy.jobFor(state, 'i:' + r.id + ':pelabuhan');
      if (portJob) top.push(jobBadge(p.x, p.y + 16, portJob.key));
    }
    items.sort(function (a, b) { return a.y - b.y; });
    out += items.map(function (it) { return it.svg; }).join('') + top.join('');
    return out;
  }

  const signatures = {};

  // Perbarui kelas (terkunci / dipilih / segera), ikon pin, dan lapisan dinamis sesuai state.
  function update(state, selectedId) {
    const host = document.getElementById('map');
    if (!host) return;
    Object.keys(D.regions).forEach(function (id) {
      const r = D.regions[id];
      const el = host.querySelector('.island[data-region="' + id + '"]');
      if (!el) return;
      const rs = state.regions[id];
      const unlocked = rs && rs.unlocked;
      el.classList.toggle('soon', !!r.comingSoon);
      el.classList.toggle('locked', !r.comingSoon && !unlocked);
      el.classList.toggle('selected', id === selectedId);
      const pinArt = unlocked && !r.comingSoon && r.artIcon && NT.assets && NT.assets.comm[r.artIcon];
      const pinImg = el.querySelector('.pin-img'), pinTxt = el.querySelector('.pin-icon');
      if (pinArt) { pinImg.setAttribute('href', pinArt); pinImg.setAttribute('visibility', 'visible'); pinTxt.textContent = ''; }
      else { pinImg.setAttribute('visibility', 'hidden'); pinTxt.textContent = r.comingSoon ? '…' : (unlocked ? r.icon : '🔒'); }

      const sig = !rs ? '' : JSON.stringify([unlocked, rs.infra, (r.buildings || []).map(function (b) {
        return state.buildings[b] ? state.buildings[b].level : 0;
      }), (state.jobs || []).filter(function (j) { return j.region === id; }).map(function (j) { return j.key; })]);
      if (signatures[id] !== sig) {
        signatures[id] = sig;
        el.querySelector('.dyn').innerHTML = rs ? dynMarkup(r, rs, state) : '';
      }
    });
  }

  // Tiap detik: isi bar progres pembangunan dan tampilkan gelembung 📦 di bangunan yang hasilnya siap.
  function tickJobs(state, now) {
    document.querySelectorAll('#map [data-job]').forEach(function (el) {
      const j = NT.economy.jobFor(state, el.getAttribute('data-job'));
      if (!j) return;
      const k = Math.max(0, Math.min(1, (now - j.startedAt) / (j.endsAt - j.startedAt)));
      el.setAttribute('width', (28 * k).toFixed(1));
    });
    document.querySelectorAll('#map .bubble').forEach(function (el) {
      const id = el.getAttribute('data-id');
      const cap = NT.economy.capacity(state, id, now) || 1;
      const p = NT.economy.pending(state, id, now);
      el.classList.toggle('on', p >= 1 && p / cap >= 0.2);
    });
  }

  /* ---------- Zoom dan geser ----------
   * Logika hitungan ada di core/viewport.js (murni, dites). Di sini hanya urusan DOM: mengubah viewBox SVG
   * (bukan CSS scale, supaya garis dan sprite tetap tajam), membaca Pointer Events, dan menyimpan posisi.
   * Mengubah viewBox tidak menyentuh isi peta, jadi update() yang mengganti lapisan .dyn tidak mereset zoom. */
  const VP = NT.viewport;
  const view = { stage: null, svg: null, ctx: null, cur: null, raf: 0, anim: 0, saveTimer: 0, btn: {} };

  function mapCfg() { return NT.config.map || {}; }

  function reducedMotion() {
    return document.body.classList.contains('calm') ||
      (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function relPoint(e) {
    const r = view.stage.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  // Tampilan awal: seluruh peta bila kotak cukup lebar; bila "pas layar" membuat peta terlalu kecil (HP),
  // zoom nyaman di sekitar wilayah awal. Patokannya skala, bukan lebar layar: kolom peta desktop bisa hanya ~700 px.
  function defaultView() {
    const c = view.ctx, fit = VP.fitView(c);
    if (VP.fitScale(c) >= (mapCfg().fitMinPx || 0.5)) return fit;
    const start = Object.keys(D.regions).map(function (id) { return D.regions[id]; }).filter(function (r) { return r.start; })[0];
    const p = start ? pt(start.map.pin) : { x: c.world.w / 2, y: c.world.h / 2 };
    return VP.centerOn(fit, p.x, p.y, c, mapCfg().startPx || 0.81);
  }

  function paint() {
    view.raf = 0;
    if (!view.cur) return;
    view.svg.setAttribute('viewBox', VP.viewBoxOf(view.cur, view.ctx));
    updateScaleUi();
    queueRefine();
    const lim = VP.limits(view.ctx);
    if (view.btn.in) { view.btn.in.disabled = view.cur.scale >= lim.max * 0.999; view.btn.out.disabled = view.cur.scale <= lim.min * 1.001; }
  }

  /* ---------- Z2: ukuran elemen UI mengikuti zoom, penggaris km, tekstur tajam ---------- */

  // Kilometer per satuan peta (di khatulistiwa; lintang peta hanya +-10 derajat, selisihnya < 2%).
  function kmPerUnit() { return G.cellDeg / G.cellPx * 111.32; }

  // Label, pin, dan nama laut dikecilkan (dalam satuan peta) saat zoom, supaya ukuran di layar tetap wajar;
  // gelembung dan lencana hanya sedikit, agar tetap enak diketuk. Sprite bangunan sengaja ikut membesar (benda di peta).
  function updateScaleUi() {
    const s = view.cur.scale, c = mapCfg();
    view.svg.style.setProperty('--ui-k', VP.uiScale(s, c.uiFromPx || 1, 1, c.uiMin || 0.3).toFixed(3));
    view.svg.style.setProperty('--ui-kb', VP.uiScale(s, c.uiFromPx || 1, c.uiBubblePower || 0.45, 0.6).toFixed(3));
    if (view.ruler) {
      const bar = VP.scaleBar(s, kmPerUnit(), c.rulerMaxPx || 110);
      view.ruler.bar.style.width = Math.round(bar.px) + 'px';
      view.ruler.txt.textContent = bar.km >= 1 ? (bar.km + ' km') : '';
    }
  }

  // Tekstur tajam: setelah zoom/geser berhenti sebentar, render ulang area yang terlihat dengan k lebih besar.
  function queueRefine() {
    clearTimeout(view.refT);
    view.refT = setTimeout(doRefine, mapCfg().refineDelay || 350);
  }

  function doRefine() {
    view.refT = 0;
    const T = NT.ui.terrain;
    if (!view.cur || !T || !T.refine) return;
    if (view.anim || view.stage.classList.contains('dragging')) { queueRefine(); return; }
    const c = view.ctx, dpr = Math.min(window.devicePixelRatio || 1, mapCfg().maxDpr || 2);
    const need = view.cur.scale * dpr;
    if (need <= T.K) { T.clearRefine(view.svg); return; }     // peta penuh sudah cukup tajam
    const tl = VP.toWorld(view.cur, 0, 0), br = VP.toWorld(view.cur, c.box.w, c.box.h);
    T.refine(view.svg, { x: tl.x, y: tl.y, w: br.x - tl.x, h: br.y - tl.y }, need, mapCfg().texMaxPx);
  }

  // Satu rAF per bingkai: gerakan jari boleh datang berkali-kali, viewBox hanya ditulis sekali.
  function schedule() { if (!view.raf) view.raf = requestAnimationFrame(paint); }

  function saveNow() {
    clearTimeout(view.saveTimer); view.saveTimer = 0;
    if (!view.cur) return;
    try { localStorage.setItem(mapCfg().storeKey || 'nusantara-tycoon-mapview-v1', JSON.stringify(VP.serialize(view.cur, view.ctx))); } catch (e) { /* mode privat: abaikan */ }
  }

  function setView(v, persist) {
    view.cur = v;
    schedule();
    if (persist) { clearTimeout(view.saveTimer); view.saveTimer = setTimeout(saveNow, 400); }
  }

  function cancelAnim() { if (view.anim) { cancelAnimationFrame(view.anim); view.anim = 0; } }

  // Pindah halus ke view target (pusat dan skala diinterpolasi); tanpa animasi bila "Hemat animasi" menyala.
  function animateTo(target) {
    cancelAnim();
    if (!view.cur) return;
    if (reducedMotion()) { setView(target, true); return; }
    const c = view.ctx, from = view.cur;
    const c0 = VP.toWorld(from, c.box.w / 2, c.box.h / 2), c1 = VP.toWorld(target, c.box.w / 2, c.box.h / 2);
    const t0 = performance.now(), dur = 300;
    function step(now) {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      const scale = from.scale * Math.pow(target.scale / from.scale, e);
      setView(VP.centerOn(from, c0.x + (c1.x - c0.x) * e, c0.y + (c1.y - c0.y) * e, c, scale), false);
      if (k < 1) view.anim = requestAnimationFrame(step); else { view.anim = 0; setView(target, true); }
    }
    view.anim = requestAnimationFrame(step);
  }

  function zoomButton(factor) {
    if (!view.cur) return;
    animateTo(VP.zoomAt(view.cur, factor, view.ctx.box.w / 2, view.ctx.box.h / 2, view.ctx));
  }

  function measure() {
    const r = view.stage.getBoundingClientRect();
    return { w: r.width, h: r.height };
  }

  // Ukuran kotak berubah (layar diputar, jendela diubah, tab peta baru terlihat): jaga pusat dan zoom relatif.
  function onResize() {
    const box = measure();
    if (box.w < 1 || box.h < 1) return;        // tab peta sedang tersembunyi
    const old = view.ctx;
    view.ctx = { world: old.world, box: box, maxZoom: old.maxZoom, maxPx: old.maxPx };
    if (!view.cur) {
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem(mapCfg().storeKey || 'nusantara-tycoon-mapview-v1')); } catch (e) { saved = null; }
      setView(VP.restore(saved, view.ctx) || defaultView(), false);
    } else if (old.box.w >= 1 && old.box.h >= 1) {
      // Pusat dan zoom relatif disimpan lewat serialize terhadap ukuran lama, lalu dipulihkan terhadap yang baru.
      const keep = VP.serialize(view.cur, old);
      setView(VP.restore(keep, view.ctx) || defaultView(), false);
    } else {
      setView(defaultView(), false);
    }
  }

  function bindGestures() {
    const stage = view.stage, slop = mapCfg().tapSlop || 6;
    const pts = new Map();          // pointerId -> posisi terakhir (relatif terhadap kotak peta)
    let down = null;                // ketukan yang sedang dipantau: { x, y, moved }
    let lastTap = null, suppressClick = false;

    stage.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      cancelAnim();
      pts.set(e.pointerId, relPoint(e));
      if (pts.size === 1) { down = { x: e.clientX, y: e.clientY, moved: false, id: e.pointerId }; suppressClick = false; }
      else { if (down) down.moved = true; suppressClick = true; }   // jari kedua = pinch, bukan ketukan
    });

    stage.addEventListener('pointermove', function (e) {
      if (!pts.has(e.pointerId)) return;
      const prev = pts.get(e.pointerId), cur = relPoint(e);
      if (pts.size >= 2) {
        const before = Array.from(pts.values());
        pts.set(e.pointerId, cur);
        const after = Array.from(pts.values());
        setView(VP.pinch(view.cur, before[0], before[1], after[0], after[1], view.ctx), true);
        return;
      }
      if (down && !down.moved) {
        if (Math.hypot(e.clientX - down.x, e.clientY - down.y) < slop) return;   // masih ketukan
        down.moved = true; suppressClick = true;
        try { stage.setPointerCapture(e.pointerId); } catch (err) { /* abaikan */ }
        stage.classList.add('dragging');
        // Selisih dihitung dari titik sentuh awal supaya tidak ada lompatan sebesar ambang.
        prev.x = down.x - stage.getBoundingClientRect().left; prev.y = down.y - stage.getBoundingClientRect().top;
      }
      pts.set(e.pointerId, cur);
      if (down && down.moved) setView(VP.panBy(view.cur, cur.x - prev.x, cur.y - prev.y, view.ctx), true);
    });

    function release(e) {
      if (!pts.has(e.pointerId)) return;
      pts.delete(e.pointerId);
      if (pts.size >= 1) { if (down) down.moved = true; return; }   // satu jari lepas: sisa jari lanjut menggeser
      try { stage.releasePointerCapture(e.pointerId); } catch (err) { /* abaikan */ }
      stage.classList.remove('dragging');
      const wasTap = down && !down.moved && e.type === 'pointerup';
      down = null;
      if (!wasTap) { lastTap = null; return; }
      // Ketuk dua kali di laut atau daratan kosong: zoom 2x (atau kembali ke tampilan awal bila sudah mentok).
      if (e.target.closest && e.target.closest('.island, .bubble')) { lastTap = null; return; }
      const now = performance.now(), p = relPoint(e);
      if (lastTap && now - lastTap.t < 320 && Math.hypot(p.x - lastTap.x, p.y - lastTap.y) < 30) {
        lastTap = null;
        const lim = VP.limits(view.ctx);
        animateTo(view.cur.scale >= lim.max * 0.95 ? defaultView() : VP.zoomAt(view.cur, 2, p.x, p.y, view.ctx));
      } else lastTap = { t: now, x: p.x, y: p.y };
    }
    stage.addEventListener('pointerup', release);
    stage.addEventListener('pointercancel', release);
    stage.addEventListener('lostpointercapture', function (e) { if (pts.has(e.pointerId)) release({ pointerId: e.pointerId, type: 'pointercancel', target: stage }); });

    // Klik yang datang setelah geseran atau pinch ditelan di fase capture, sebelum sampai ke penangan klik pulau di main.js.
    stage.addEventListener('click', function (e) {
      if (suppressClick) { suppressClick = false; e.stopPropagation(); e.preventDefault(); }
    }, true);

    // Roda mouse atau trackpad: zoom ke arah kursor. Bila sudah paling jauh dan pemain menggulung ke bawah,
    // biarkan halaman yang menggulung (jangan menjebak roda mouse).
    stage.addEventListener('wheel', function (e) {
      if (!view.cur) return;
      const lim = VP.limits(view.ctx);
      if (e.deltaY > 0 && !e.ctrlKey && view.cur.scale <= lim.min * 1.001) return;
      e.preventDefault();
      cancelAnim();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : (e.deltaMode === 2 ? 300 : 1));
      const p = relPoint(e);
      setView(VP.zoomAt(view.cur, Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0016)), p.x, p.y, view.ctx), true);
    }, { passive: false });

    // Pemain keyboard: pulau yang menerima fokus lewat Tab digeser ke tengah. Fokus karena klik mouse diabaikan
    // (peta tidak boleh bergerak di bawah jari sebelum klik selesai).
    stage.addEventListener('focusin', function (e) {
      const isl = e.target.closest && e.target.closest('.island');
      if (isl && e.target.matches && e.target.matches(':focus-visible')) focus(isl.getAttribute('data-region'));
    });
    // Browser kadang menggulung kotak overflow saat elemen di dalamnya difokus; peta tidak boleh bergeser dengan cara itu.
    stage.addEventListener('scroll', function () { stage.scrollLeft = 0; stage.scrollTop = 0; });
  }

  function buildControls(card) {
    const box = document.createElement('div');
    box.className = 'map-zoom';
    box.innerHTML =
      '<button type="button" class="mz-btn" data-mz="in" aria-label="Perbesar peta">+</button>' +
      '<button type="button" class="mz-btn" data-mz="out" aria-label="Perkecil peta">\u2212</button>' +
      '<button type="button" class="mz-btn" data-mz="reset" aria-label="Kembalikan tampilan peta">\u2316</button>';
    card.appendChild(box);
    const rl = document.createElement('div');
    rl.className = 'map-ruler'; rl.setAttribute('aria-hidden', 'true');
    rl.innerHTML = '<span class="mr-txt"></span><span class="mr-bar"></span>';
    view.stage.appendChild(rl);
    view.ruler = { bar: rl.querySelector('.mr-bar'), txt: rl.querySelector('.mr-txt') };
    view.btn.in = box.querySelector('[data-mz="in"]');
    view.btn.out = box.querySelector('[data-mz="out"]');
    box.addEventListener('click', function (e) {
      const b = e.target.closest('[data-mz]');
      if (!b || b.disabled) return;
      const k = b.getAttribute('data-mz');
      if (k === 'in') zoomButton(1.6); else if (k === 'out') zoomButton(1 / 1.6); else animateTo(defaultView());
    });
  }

  function mountView(host) {
    view.stage = host.closest('.map-scroll');
    view.svg = host.querySelector('.map-svg');
    if (!view.stage || !view.svg || !VP) return;
    const grid = NT.raster.grid();
    const world = { w: grid.W * S, h: grid.H * S };
    view.stage.style.setProperty('--map-ar', world.w + ' / ' + world.h);
    const c = mapCfg();
    view.ctx = { world: world, box: { w: 0, h: 0 }, maxZoom: c.maxZoom || 4, maxPx: c.maxPx || 0 };
    buildControls(view.stage.parentNode);
    bindGestures();
    if (window.ResizeObserver) new ResizeObserver(onResize).observe(view.stage);
    else window.addEventListener('resize', onResize);
    onResize();
    window.addEventListener('pagehide', function () { if (view.saveTimer) saveNow(); });
  }

  // Geser (dan bila perlu perbesar sedikit) peta supaya wilayah terpilih berada di tengah kotak.
  function focus(regionId) {
    const r = D.regions[regionId];
    if (!r || !view.cur) return;
    const p = pt(r.map.pin), lim = VP.limits(view.ctx);
    // Di HP (peta "pas layar" terlalu kecil) jangan biarkan pulau terpilih terlihat sekecil itu; di desktop zoom tidak diubah.
    const phone = VP.fitScale(view.ctx) < (mapCfg().fitMinPx || 0.5);
    const comfy = phone ? Math.min(lim.max, mapCfg().startPx || 0.81) : 0;
    animateTo(VP.centerOn(view.cur, p.x, p.y, view.ctx, Math.max(view.cur.scale, comfy)));
  }

  NT.ui.map = {
    mount: function () {
      const host = document.getElementById('map');
      if (host) { host.innerHTML = build(); NT.ui.terrain.attach(host); mountView(host); }
    },
    update: update,
    tickJobs: tickJobs,
    focus: focus
  };
})((window.NT = window.NT || {}));
