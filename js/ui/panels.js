/*
 * Panel antarmuka: wilayah, pasar, info. Render penuh dilakukan setelah aksi pemain;
 * tiap detik hanya angka bertanda data-live yang diperbarui (supaya tombol tidak "berkedip").
 */
(function (NT) {
  NT.ui = NT.ui || {};
  const D = NT.data;
  const E = NT.economy;
  const F = NT.fmt;

  const view = { tab: 'map', region: 'jawa', market: 'jawa' };

  function $(id) { return document.getElementById(id); }

  /* ---------- Panel wilayah ---------- */

  function buildingRow(state, id, now) {
    const b = D.buildings[id];
    const c = D.commodities[b.produces];
    const lvl = E.buildingLevel(state, id);
    const cost = E.buildingCost(id, lvl);
    const rate = E.productionRate(state, id, now);

    if (!lvl) {
      return '' +
      '<div class="row">' +
        '<div class="row-icon">' + b.icon + '</div>' +
        '<div class="row-main"><b>' + b.name + '</b>' +
          '<small>Menghasilkan ' + c.name + ' (' + F.num(b.baseRate, 1) + '/menit pada Lv 1)</small></div>' +
        '<div class="row-actions">' +
          '<button class="btn primary" data-action="upgrade-building" data-id="' + id + '" data-cost="' + cost + '">Bangun · ' + F.money(cost) + '</button>' +
        '</div>' +
      '</div>';
    }

    const cap = E.capacity(state, id, now);
    return '' +
    '<div class="row">' +
      '<div class="row-icon">' + b.icon + '</div>' +
      '<div class="row-main">' +
        '<b>' + b.name + ' <span class="lvl">Lv ' + lvl + '</span></b>' +
        '<small>' + F.num(rate, 2) + ' ' + c.name.toLowerCase() + '/menit <span data-live="bmult" data-id="' + id + '"></span></small>' +
        '<div class="bar"><i data-live="bar" data-id="' + id + '"></i></div>' +
        '<small><span data-live="pending" data-id="' + id + '">0</span> / ' + F.num(cap) + ' siap dikumpulkan</small>' +
      '</div>' +
      '<div class="row-actions">' +
        '<button class="btn" data-action="collect" data-id="' + id + '">Kumpulkan</button>' +
        '<button class="btn primary" data-action="upgrade-building" data-id="' + id + '" data-cost="' + cost + '">⬆ ' + F.money(cost) + '</button>' +
      '</div>' +
    '</div>';
  }

  function infraRow(state, regionId, infraId) {
    const inf = D.infra[infraId];
    const lvl = E.infraLevel(state, regionId, infraId);
    const maxed = lvl >= inf.maxLevel;
    const cost = maxed ? 0 : E.infraCost(regionId, infraId, lvl);
    return '' +
    '<div class="row">' +
      '<div class="row-icon">' + inf.icon + '</div>' +
      '<div class="row-main"><b>' + inf.name + ' <span class="lvl">Lv ' + lvl + '/' + inf.maxLevel + '</span></b>' +
        '<small>' + inf.desc + '</small></div>' +
      '<div class="row-actions">' +
        (maxed
          ? '<span class="maxed">MAKS</span>'
          : '<button class="btn primary" data-action="upgrade-infra" data-region="' + regionId + '" data-id="' + infraId + '" data-cost="' + cost + '">⬆ ' + F.money(cost) + '</button>') +
      '</div>' +
    '</div>';
  }

  function renderRegion(state, now) {
    const r = D.regions[view.region];
    const host = $('region-panel');
    let html = '';

    if (r.comingSoon) {
      html = '<div class="card"><h2>' + r.icon + ' ' + r.name + '</h2><p class="muted">' + r.tagline +
        '. Wilayah ini disiapkan sebagai kerangka untuk pengembangan berikutnya.</p></div>';
    } else if (!state.regions[r.id].unlocked) {
      const list = r.buildings.map(function (bid) {
        const b = D.buildings[bid];
        return '<li>' + b.icon + ' ' + b.name + ' <span class="muted">→ ' + D.commodities[b.produces].name + '</span></li>';
      }).join('');
      html = '<div class="card"><h2>🔒 ' + r.name + '</h2><p class="muted">' + r.tagline + '</p>' +
        '<ul class="plain">' + list + '</ul>' +
        '<p class="muted small">Membuka wilayah juga membuka pasar baru untuk menjual hasil bumi.</p>' +
        '<button class="btn primary wide" data-action="unlock" data-id="' + r.id + '" data-cost="' + r.unlockCost + '">Buka wilayah · ' + F.money(r.unlockCost) + '</button></div>';
    } else {
      html = '<div class="card"><h2>' + r.icon + ' ' + r.name + '</h2><p class="muted">' + r.tagline + '</p>' +
        '<h3>Produksi</h3>' + r.buildings.map(function (bid) { return buildingRow(state, bid, now); }).join('') +
        '<h3>Infrastruktur</h3>' + Object.keys(D.infra).map(function (iid) { return infraRow(state, r.id, iid); }).join('') +
        '</div>';
    }
    host.innerHTML = html;
  }

  /* ---------- Tab pasar ---------- */

  function renderMarket(state, now) {
    if (!state.regions[view.market] || !state.regions[view.market].unlocked) view.market = 'jawa';

    const regions = Object.keys(state.regions).filter(function (id) { return state.regions[id].unlocked; });
    const seg = regions.map(function (id) {
      return '<button class="seg' + (id === view.market ? ' on' : '') + '" data-action="market-region" data-id="' + id + '">' + D.regions[id].name + '</button>';
    }).join('');

    const goods = Object.keys(D.commodities).filter(function (cid) {
      return state.regions[D.commodities[cid].region].unlocked || state.inventory[cid] > 0;
    }).map(function (cid) {
      const c = D.commodities[cid];
      return '' +
      '<div class="goods">' +
        '<div class="goods-head">' +
          '<div class="row-icon">' + c.icon + '</div>' +
          '<div class="row-main"><b>' + c.name + '<span data-live="season" data-c="' + cid + '"></span></b><small>dari ' + D.regions[c.region].name + ' · 1 satuan = ' + c.unitKg + ' kg</small></div>' +
          '<div class="goods-stock"><b data-live="stock" data-c="' + cid + '">0</b><small>di gudang</small></div>' +
        '</div>' +
        '<div class="goods-price">' +
          '<span>Harga <b data-live="unit" data-c="' + cid + '"></b></span>' +
          '<span class="muted">ongkir <span data-live="ship" data-c="' + cid + '"></span> <span data-live="km" data-c="' + cid + '"></span></span>' +
          '<span class="trend" data-live="trend" data-c="' + cid + '"></span>' +
        '</div>' +
        '<div class="goods-best" data-live="best" data-c="' + cid + '"></div>' +
        '<div class="goods-actions">' +
          '<button class="btn" data-action="sell" data-c="' + cid + '" data-qty="10">Jual 10</button>' +
          '<button class="btn primary" data-action="sell" data-c="' + cid + '" data-qty="all">Jual semua</button>' +
        '</div>' +
      '</div>';
    }).join('');

    $('tab-market').innerHTML =
      '<div class="card"><h2>Pasar tujuan</h2>' +
      '<div class="segs">' + seg + '</div>' +
      '<p class="muted small">Harga mengikuti musim panen dan peristiwa dunia, naik turun sendiri, dan jatuh bila kamu menjual terlalu banyak di satu pasar. ' +
      'Ongkir dihitung dari berat dan jarak laut sebenarnya: barang curah murah (padi) paling terasa ongkirnya; pelabuhan menurunkannya.</p></div>' + goods;
  }

  /* ---------- Tab info ---------- */

  // Kalender panen 12 bulan untuk satu komoditas (hijau = panen raya, merah = paceklik).
  function calendar(cid, now) {
    const cur = NT.world.monthOf(now);
    const t = D.commodities[cid].season.prod;
    const mean = t.reduce(function (a, b) { return a + b; }, 0) / t.length;
    const boxes = t.map(function (v, i) {
      const r = v / mean;
      return '<i class="' + (r >= 1.2 ? 'hi' : (r <= 0.8 ? 'lo' : '')) + (i === cur ? ' now' : '') + '" title="' + NT.world.MONTHS[i] + '"></i>';
    }).join('');
    return '<div class="cal">' + boxes + '</div>';
  }

  function worldCard() {
    const now = Date.now();
    const labels = 'JFMAMJJASOND'.split('').map(function (c) { return '<span>' + c + '</span>'; }).join('');
    const rows = Object.keys(D.commodities).map(function (cid) {
      const c = D.commodities[cid];
      return '<div><b>' + c.icon + ' ' + c.name + '</b>' + calendar(cid, now) +
        '<div class="cal-labels">' + labels + '</div><small class="muted">' + c.seasonNote + '</small></div>';
    }).join('');
    return '<div class="card"><h2>Dunia nyata</h2>' +
      '<p class="muted small">Musim mengikuti kalender sungguhan (WIB). Saat panen raya hasil berlimpah tapi harga tertekan; saat paceklik sebaliknya. ' +
      'Peristiwa seperti banjir atau El Niño bergantian tiap ' + NT.config.eventSlotHours + ' jam dan sama untuk semua pemain. ' +
      'Harga dasar mengikuti rasio harga nyata (perkiraan kasar), dan ongkir mengikuti jarak laut antar kota pelabuhan.</p>' +
      '<div data-live="world-now"></div>' + rows + '</div>';
  }

  function renderAbout(state) {
    const driver = NT.getStorage();
    const roadmap = [
      [true, 'Produksi berbasis waktu (jalan walau offline)'],
      [true, 'Pasar dengan harga dinamis; ongkir dari berat dan jarak laut nyata'],
      [true, 'Musim panen dan peristiwa dunia nyata (banjir, El Niño, lonjakan ekspor)'],
      [true, 'Peta pixel art dengan bentuk pulau mengikuti bujur/lintang nyata'],
      [true, 'Infrastruktur: tol dan pelabuhan'],
      [false, 'Login dan simpan di Supabase'],
      [false, 'Pasar bersama antar-pemain'],
      [false, 'Proyek nasional dan aliansi'],
      [false, 'Wilayah lain: Kalimantan, Bali & Nusa Tenggara, Maluku, Papua']
    ].map(function (x) { return '<li>' + (x[0] ? '✅' : '⬜') + ' ' + x[1] + '</li>'; }).join('');

    $('tab-about').innerHTML =
      '<div class="card"><h2>Cara bermain</h2><ol class="plain">' +
        '<li>Kumpulkan hasil dari sawah dan kebunmu di tab <b>Peta</b>.</li>' +
        '<li>Jual di tab <b>Pasar</b>. Cari pasar dengan harga bersih terbaik.</li>' +
        '<li>Naikkan level bangunan, bangun tol dan pelabuhan.</li>' +
        '<li>Buka wilayah baru untuk komoditas dan pasar baru.</li></ol></div>' +
      worldCard() +
      '<div class="card"><h2>Gelar peradaban</h2><p><b data-live="rank-big"></b></p>' +
        '<div class="bar"><i data-live="rank-bar"></i></div><small class="muted" data-live="rank-next"></small></div>' +
      '<div class="card"><h2>Rencana pengembangan</h2><ul class="plain">' + roadmap + '</ul></div>' +
      '<div class="card"><h2>Penyimpanan</h2><p class="muted">' + driver.label + '</p>' +
        '<button class="btn danger" data-action="reset">Mulai ulang game</button></div>';
  }

  /* ---------- Chip wilayah ---------- */

  function renderChips(state) {
    const host = $('region-chips');
    if (!host) return;
    host.innerHTML = Object.keys(D.regions).map(function (id) {
      const r = D.regions[id];
      const unlocked = state.regions[id] && state.regions[id].unlocked;
      return '<button class="chip' + (id === view.region ? ' on' : '') + (r.comingSoon ? ' soon' : '') + '" data-action="pick-region" data-id="' + id + '">' +
        (r.comingSoon ? '…' : (unlocked ? r.icon : '🔒')) + ' ' + (r.short || r.name) + '</button>';
    }).join('');
  }

  /* ---------- Banner dunia nyata ---------- */

  let bannerCache = '';
  function worldHtml(now) {
    const W = NT.world;
    const cl = W.climate(now);
    const ev = W.activeEvent(now);
    let html = '<span>' + cl.icon + ' ' + cl.name + ' · ' + W.MONTHS[W.monthOf(now)] + '</span>';
    if (ev) {
      const good = Object.keys(ev.event.price || {}).some(function (k) { return ev.event.price[k] > 1; }) &&
        !Object.keys(ev.event.prod || {}).some(function (k) {
          return Object.keys(ev.event.prod[k]).some(function (x) { return ev.event.prod[k][x] < 1; });
        });
      html += '<span class="evt' + (good ? ' good' : '') + '">' + ev.event.icon + ' ' + ev.event.name + ': ' + ev.event.desc +
        ' <span class="muted-light">(sisa ' + F.duration(ev.endsAt - now) + ')</span></span>';
    }
    return html;
  }

  function multText(m) {
    if (Math.abs(m - 1) < 0.03) return '';
    return '<span class="mult ' + (m > 1 ? 'up' : 'down') + '">' + (m > 1 ? '▲ ' : '▼ ') + 'x' + F.num(m, 2) + '</span>';
  }

  /* ---------- Render dan tick ---------- */

  function renderAll(state, now) {
    document.querySelectorAll('.tab').forEach(function (t) {
      t.classList.toggle('on', t.getAttribute('data-id') === view.tab);
    });
    document.querySelectorAll('.tab-panel').forEach(function (p) {
      p.classList.toggle('on', p.id === 'tab-' + view.tab);
    });
    NT.ui.map.update(state, view.region);
    renderChips(state);
    renderRegion(state, now);
    renderMarket(state, now);
    renderAbout(state);
    tick(state, now);
  }

  function each(selector, fn) {
    document.querySelectorAll(selector).forEach(fn);
  }

  function tick(state, now) {
    const sc = E.score(state);
    const rk = E.rank(sc);
    $('stat-cash').textContent = F.money(state.cash);
    $('stat-score').textContent = F.num(sc);
    $('rank-name').textContent = rk.current.name;

    const wh = worldHtml(now);
    if (wh !== bannerCache) {
      bannerCache = wh;
      $('world-banner').innerHTML = wh;
      each('[data-live="world-now"]', function (el) { el.innerHTML = '<p>' + wh + '</p>'; });
    }

    // Tombol berbiaya: nonaktif bila kas kurang
    each('[data-cost]', function (el) {
      el.disabled = state.cash < Number(el.getAttribute('data-cost'));
    });

    each('[data-live="pending"]', function (el) {
      el.textContent = F.num(Math.floor(E.pending(state, el.getAttribute('data-id'), now)));
    });
    each('[data-live="bmult"]', function (el) {
      el.innerHTML = multText(E.worldProdMult(el.getAttribute('data-id'), now));
    });
    each('[data-live="bar"]', function (el) {
      const id = el.getAttribute('data-id');
      const cap = E.capacity(state, id, now) || 1;
      el.style.width = Math.min(100, E.pending(state, id, now) / cap * 100) + '%';
      el.parentNode.classList.toggle('full', E.pending(state, id, now) >= cap);
    });

    // Pasar
    each('[data-live="stock"]', function (el) {
      el.textContent = F.num(state.inventory[el.getAttribute('data-c')] || 0);
    });
    each('[data-live="unit"]', function (el) {
      el.textContent = F.price(E.currentPrice(state, view.market, el.getAttribute('data-c'), now));
    });
    each('[data-live="ship"]', function (el) {
      const s = E.shippingPerUnit(state, el.getAttribute('data-c'), view.market);
      el.textContent = s ? F.price(s) : 'Rp 0';
    });
    each('[data-live="season"]', function (el) {
      const tag = NT.world.harvestTag(el.getAttribute('data-c'), now);
      el.innerHTML = tag ? '<span class="tag ' + tag.id + '">' + tag.text + '</span>' : '';
    });
    each('[data-live="km"]', function (el) {
      const km = E.distanceKm(D.commodities[el.getAttribute('data-c')].region, view.market);
      el.textContent = km ? '(' + F.num(Math.round(km / 10) * 10) + ' km)' : '';
    });
    each('[data-live="trend"]', function (el) {
      const cid = el.getAttribute('data-c');
      const ratio = E.currentPrice(state, view.market, cid, now) / E.normalPrice(view.market, cid) - 1;
      const pct = Math.round(ratio * 100);
      el.textContent = (pct >= 0 ? '▲ ' : '▼ ') + Math.abs(pct) + '%';
      el.className = 'trend ' + (pct >= 0 ? 'up' : 'down');
    });
    each('[data-live="best"]', function (el) {
      const cid = el.getAttribute('data-c');
      const best = E.bestMarket(state, cid, now);
      if (!best) { el.textContent = ''; return; }
      if (best.regionId === view.market) {
        el.textContent = '⭐ Ini pasar dengan harga bersih terbaik sekarang';
      } else {
        el.textContent = '💡 Lebih untung di ' + D.regions[best.regionId].name + ': ' + F.price(best.price) + ' bersih per unit';
      }
    });
    each('[data-action="sell"]', function (el) {
      const have = state.inventory[el.getAttribute('data-c')] || 0;
      const qty = el.getAttribute('data-qty');
      el.disabled = qty === 'all' ? have < 1 : have < Number(qty);
    });

    // Info
    each('[data-live="rank-big"]', function (el) { el.textContent = rk.current.name + ' · skor ' + F.num(sc); });
    each('[data-live="rank-bar"]', function (el) {
      const pct = rk.next ? (sc - rk.current.min) / (rk.next.min - rk.current.min) * 100 : 100;
      el.style.width = Math.max(0, Math.min(100, pct)) + '%';
    });
    each('[data-live="rank-next"]', function (el) {
      el.textContent = rk.next ? 'Berikutnya: ' + rk.next.name + ' (skor ' + F.num(rk.next.min) + ')' : 'Gelar tertinggi tercapai';
    });
  }

  NT.ui.panels = { view: view, renderAll: renderAll, tick: tick };
})((window.NT = window.NT || {}));
