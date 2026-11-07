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

  function islandMarkup(grid, r) {
    const pin = pt(r.map.pin), label = pt(r.map.label);
    const text = r.short || r.name;
    const lw = Math.round(text.length * 9.6 + 20);
    return '' +
      '<g class="island" data-region="' + r.id + '" tabindex="0" role="button" aria-label="' + r.name + '">' +
        '<g class="island-land">' + NT.ui.terrain.landMarkup(r.id) + '</g>' +
        '<g class="dyn" data-dyn="' + r.id + '"></g>' +
        '<g class="island-tag"><rect class="label-bg" x="' + (label.x - lw / 2) + '" y="' + (label.y - 17) + '" width="' + lw + '" height="25" rx="7"/>' +
        '<text class="island-label" x="' + label.x + '" y="' + label.y + '" text-anchor="middle">' + text + '</text></g>' +
        '<g class="pin" transform="translate(' + pin.x + ',' + pin.y + ')">' +
          '<circle class="pin-pulse" r="17"/>' +
          '<circle class="pin-dot" r="17"/>' +
          '<text class="pin-icon" text-anchor="middle" dy="7">' + r.icon + '</text>' +
        '</g>' +
      '</g>';
  }

  function shipsMarkup() {
    return G.lanes.map(function (lane, i) {
      const pts = lane.map(pt);
      const there = pts.map(function (p, k) { return (k ? 'L' : 'M') + p.x.toFixed(1) + ',' + p.y.toFixed(1); }).join('');
      const back = pts.slice(0, -1).reverse().map(function (p) { return 'L' + p.x.toFixed(1) + ',' + p.y.toFixed(1); }).join('');
      return '<g class="ship"><animateMotion dur="' + (70 + i * 14) + 's" repeatCount="indefinite" path="' + there + back + '"/>' +
        NT.ui.art.map('kapal', 0, 4, 40) + '</g>';
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
    const cp = NT.raster.toPx(139.4, 5.0);
    const T = NT.ui.terrain;
    const seaImg = '<image data-tex="sea" x="0" y="0" width="' + W + '" height="' + H + '" preserveAspectRatio="none"/>';
    const neighbor = '<g class="neighbor-land">' + T.landMarkup('neighbor') + '</g>';
    const islands = Object.keys(D.regions).map(function (id) { return islandMarkup(grid, D.regions[id]); }).join('');

    return '' +
    '<svg class="map-svg" viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Peta Nusantara">' +
      T.defs() +
      '<rect class="px-deep" width="' + W + '" height="' + H + '"/>' + seaImg +
      graticule(W, H) + neighbor + seaLabels(grid) + islands +
      '<g class="ships">' + shipsMarkup() + '</g>' + compass(cp.x, cp.y) +
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
    return '<g class="jobbadge" transform="translate(' + x + ',' + y + ')"><text class="hammer" text-anchor="middle" dy="-4">🔨</text>' +
      '<rect class="jb-bg" x="-14" y="2" width="28" height="5" rx="2"/>' +
      '<rect class="jb-fill" data-job="' + key + '" x="-14" y="2" width="0" height="5" rx="2"/></g>';
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

    Object.keys(m.slots || {}).forEach(function (bid) {
      const lvl = (state.buildings[bid] && state.buildings[bid].level) || 0;
      const p = pt(m.slots[bid]);
      const job = NT.economy.jobFor(state, 'b:' + bid);
      out += NT.ui.art.map(bid, p.x, p.y + 8, lvl >= 3 ? 62 : 52, lvl ? (job ? 0.7 : null) : (job ? 0.55 : 0.28));
      if (lvl) {
        out += '<g class="bubble" data-id="' + bid + '" transform="translate(' + p.x + ',' + (p.y - 34) + ')"><g class="bob">' +
          '<circle r="12" class="bubble-bg"/><text class="bubble-ico" text-anchor="middle" dy="5">📦</text></g></g>';
      }
      if (job) out += jobBadge(p.x, p.y + 30, job.key);
    });
    const tolJob = NT.economy.jobFor(state, 'i:' + r.id + ':tol');
    if (tolJob) { const pp = pt(m.pin); out += jobBadge(pp.x, pp.y + 32, tolJob.key); }

    if (m.port) {
      const p = pt(m.port);
      out += NT.ui.art.map('pelabuhan', p.x, p.y + 8, port >= 3 ? 68 : 58, port ? null : 0.28);
      if (port > 0) out += NT.ui.art.map('kapal', p.x + 34 + port * 2, p.y + 16, 34);
      const portJob = NT.economy.jobFor(state, 'i:' + r.id + ':pelabuhan');
      if (portJob) out += jobBadge(p.x, p.y + 34, portJob.key);
    }
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
      el.querySelector('.pin-icon').textContent = r.comingSoon ? '…' : (unlocked ? r.icon : '🔒');

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

  // Geser peta (di layar sempit) supaya wilayah terpilih berada di tengah.
  function focus(regionId) {
    const scroller = document.querySelector('.map-scroll');
    const r = D.regions[regionId];
    if (!scroller || !r) return;
    const svg = scroller.querySelector('.map-svg');
    const scale = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width;
    const x = pt(r.map.pin).x * scale;
    scroller.scrollTo({ left: Math.max(0, x - scroller.clientWidth / 2), behavior: 'smooth' });
  }

  NT.ui.map = {
    mount: function () {
      const host = document.getElementById('map');
      if (host) { host.innerHTML = build(); NT.ui.terrain.attach(host); }
    },
    update: update,
    tickJobs: tickJobs,
    focus: focus
  };
})((window.NT = window.NT || {}));
