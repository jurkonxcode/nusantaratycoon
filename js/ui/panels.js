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
    const rate = E.productionRate(state, id);

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

    const cap = E.capacity(state, id);
    return '' +
    '<div class="row">' +
      '<div class="row-icon">' + b.icon + '</div>' +
      '<div class="row-main">' +
        '<b>' + b.name + ' <span class="lvl">Lv ' + lvl + '</span></b>' +
        '<small>' + F.num(rate, 1) + ' ' + c.name.toLowerCase() + '/menit</small>' +
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
          '<div class="row-main"><b>' + c.name + '</b><small>dari ' + D.regions[c.region].name + '</small></div>' +
          '<div class="goods-stock"><b data-live="stock" data-c="' + cid + '">0</b><small>di gudang</small></div>' +
        '</div>' +
        '<div class="goods-price">' +
          '<span>Harga <b data-live="unit" data-c="' + cid + '"></b></span>' +
          '<span class="muted">ongkir <span data-live="ship" data-c="' + cid + '"></span></span>' +
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
      '<p class="muted small">Harga naik turun dengan sendirinya, dan jatuh bila kamu menjual terlalu banyak di satu pasar. ' +
      'Barang dari wilayah lain kena ongkir; pelabuhan menurunkannya.</p></div>' + goods;
  }

  /* ---------- Tab info ---------- */

  function renderAbout(state) {
    const driver = NT.getStorage();
    const roadmap = [
      [true, 'Produksi berbasis waktu (jalan walau offline)'],
      [true, 'Pasar dengan harga dinamis dan ongkir antar wilayah'],
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
      '<div class="card"><h2>Gelar peradaban</h2><p><b data-live="rank-big"></b></p>' +
        '<div class="bar"><i data-live="rank-bar"></i></div><small class="muted" data-live="rank-next"></small></div>' +
      '<div class="card"><h2>Rencana pengembangan</h2><ul class="plain">' + roadmap + '</ul></div>' +
      '<div class="card"><h2>Penyimpanan</h2><p class="muted">' + driver.label + '</p>' +
        '<button class="btn danger" data-action="reset">Mulai ulang game</button></div>';
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

    // Tombol berbiaya: nonaktif bila kas kurang
    each('[data-cost]', function (el) {
      el.disabled = state.cash < Number(el.getAttribute('data-cost'));
    });

    each('[data-live="pending"]', function (el) {
      el.textContent = F.num(Math.floor(E.pending(state, el.getAttribute('data-id'), now)));
    });
    each('[data-live="bar"]', function (el) {
      const id = el.getAttribute('data-id');
      const cap = E.capacity(state, id) || 1;
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
