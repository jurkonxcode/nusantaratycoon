/*
 * Panel antarmuka: wilayah, pasar, info. Render penuh dilakukan setelah aksi pemain;
 * tiap detik hanya angka bertanda data-live yang diperbarui (supaya tombol tidak "berkedip").
 */
(function (NT) {
  NT.ui = NT.ui || {};
  const D = NT.data;
  const E = NT.economy;
  const F = NT.fmt;

  const view = { tab: 'map', emptyOpen: false, sub: 'stats', bannerSeen: '', region: 'jawa', market: 'jawa', resetArmed: false, sheet: false, guideOpen: false, goodsOpen: {}, exportOpen: false };

  function $(id) { return document.getElementById(id); }

  // Istilah yang bisa diketuk untuk melihat penjelasannya (aksi "term").
  const GLOSSARY = {
    ongkir: 'Ongkir: biaya kirim per satuan barang bila dijual di wilayah lain. Makin jauh dan makin berat barangnya, makin mahal. Pelabuhan menurunkannya.',
    paceklik: 'Paceklik: masa panen sedikit. Produksi turun, tetapi harga biasanya naik.',
    raya: 'Panen raya: masa hasil berlimpah. Produksi naik, tetapi harga cenderung tertekan.',
    peradaban: 'Skor peradaban: dihitung dari level bangunan, infrastruktur, wilayah yang terbuka, dan total pendapatan. Makin tinggi, makin besar gelarmu.',
    tekanan: 'Tekanan pasar: menjual banyak barang sekaligus menurunkan harga di pasar itu, lalu pulih pelan-pelan. Sebar penjualan ke beberapa pasar.',
    tol: 'Jalan tol: menaikkan produksi semua bangunan di wilayah itu 20% per level.',
    kesejahteraan: 'Kesejahteraan (0-100): separuh dari pangan, seperempat sandang, seperempat energi yang tercukupi, ditambah bonus tol dan pelabuhan. Di atas 50 penduduk bertambah, di bawah 50 berkurang. Pangan: padi (juga gula dan garam). Sandang: batik. Energi: minyak dan batubara.',
    pekerja: 'Pekerja: tiap 1 indeks penduduk menyediakan 20 pekerja; tiap level bangunan butuh 0,5. Bila kurang, produksi wilayah itu turun (paling banyak sampai separuhnya). Naikkan Perumahan agar penduduk bisa bertambah.',
    pelabuhan: 'Pelabuhan: memotong ongkir kirim antar wilayah. Pelabuhan di asal dan tujuan sama-sama berpengaruh.'
  };

  function term(label, key) {
    return '<button type="button" class="term" data-action="term" data-term="' + key + '">' + label + '</button>';
  }

  /* ---------- Panel wilayah ---------- */

  function jobBox(job, note) {
    return '<div class="bar job"><i data-live="jobbar" data-key="' + job.key + '"></i></div>' +
      '<small>' + NT.ui.ic('hammer') + ' <b data-live="jobtime" data-key="' + job.key + '"></b> · ' + note + '</small>';
  }

  function speedBtn(job, now) {
    const cost = E.speedupCost(job, now);
    return '<button class="btn primary" data-action="speedup" data-key="' + job.key + '" data-cost="' + cost + '">' + NT.ui.ic('bolt') + ' Percepat · ' +
      '<span data-live="speedcost" data-key="' + job.key + '">' + F.money(cost) + '</span></button>';
  }

  function buildingRow(state, id, now) {
    const b = D.buildings[id];
    const c = D.commodities[b.produces];
    const lvl = E.buildingLevel(state, id);
    const cost = E.buildingCost(id, lvl);
    const rate = E.productionRate(state, id, now);
    const job = E.jobFor(state, 'b:' + id);
    const dur = E.buildDuration(id, lvl);
    const time = dur ? ' <span class="btn-sub">' + NT.ui.ic('clock') + F.short(dur) + '</span>' : '';

    if (!lvl) {
      if (job) {
        return '' +
        '<div class="row building">' +
          '<div class="row-icon working">' + (NT.ui.art.sprite(b.id) || b.icon) + '</div>' +
          '<div class="row-main"><b>Membangun ' + b.name + '…</b>' + jobBox(job, 'lalu ' + F.num(b.baseRate, 1) + '/menit') + '</div>' +
          '<div class="row-actions">' + speedBtn(job, now) + '</div>' +
        '</div>';
      }
      return '' +
      '<div class="row">' +
        '<div class="row-icon">' + (NT.ui.art.sprite(b.id) || b.icon) + '</div>' +
        '<div class="row-main"><b>' + b.name + '</b>' +
          '<small>' + c.name + ' · ' + F.num(b.baseRate, 1) + '/menit</small></div>' +
        '<div class="row-actions">' +
          '<button class="btn primary" data-action="upgrade-building" data-id="' + id + '" data-cost="' + cost + '">Bangun ' + F.money(cost) + time + '</button>' +
        '</div>' +
      '</div>';
    }

    const cap = E.capacity(state, id, now);
    return '' +
    '<div class="row' + (job ? ' building' : '') + '">' +
      '<div class="row-icon working">' + (NT.ui.art.sprite(b.id) || b.icon) + '</div>' +
      '<div class="row-main">' +
        '<b>' + b.name + ' <span class="lvl">Lv ' + lvl + '</span>' + (job ? ' <span class="lvl next">→ Lv ' + job.to + '</span>' : '') + '</b>' +
        '<div class="bar"><i data-live="bar" data-id="' + id + '"></i></div>' +
        '<small class="meta"><span data-live="pending" data-id="' + id + '">0</span> / ' + F.num(cap) + ' · ' + F.num(rate, 2) + ' ' + c.name.toLowerCase() + '/mnt <span data-live="bmult" data-id="' + id + '"></span></small>' +
        (job ? jobBox(job, 'naik ke Lv ' + job.to) : '') +
      '</div>' +
      '<div class="row-actions">' +
        '<button class="btn" data-action="collect" data-id="' + id + '">' + NT.ui.ic('box') + ' Kumpulkan</button>' +
        (job ? speedBtn(job, now)
             : '<button class="btn primary" data-action="upgrade-building" data-id="' + id + '" data-cost="' + cost + '">' + NT.ui.ic('up') + ' ' + F.money(cost) + time + '</button>') +
      '</div>' +
    '</div>';
  }

  function infraRow(state, regionId, infraId, now) {
    const inf = D.infra[infraId];
    const lvl = E.infraLevel(state, regionId, infraId);
    const maxed = lvl >= inf.maxLevel;
    const cost = maxed ? 0 : E.infraCost(regionId, infraId, lvl);
    const job = E.jobFor(state, 'i:' + regionId + ':' + infraId);
    const dur = maxed ? 0 : E.infraDuration(regionId, lvl);
    return '' +
    '<div class="row' + (job ? ' building' : '') + '">' +
      '<div class="row-icon' + (job ? ' working' : '') + '">' + (NT.ui.art.sprite(inf.id) || inf.icon) + '</div>' +
      '<div class="row-main"><b>' + inf.name + ' <span class="lvl">Lv ' + lvl + '/' + inf.maxLevel + '</span>' +
        (job ? ' <span class="lvl next">→ Lv ' + job.to + '</span>' : '') + '</b>' +
        '<small>' + inf.desc + '</small>' + (job ? jobBox(job, 'naik ke Lv ' + job.to) : '') + '</div>' +
      '<div class="row-actions">' +
        (maxed
          ? '<span class="maxed">MAKS</span>'
          : (job ? speedBtn(job, now)
                 : '<button class="btn primary" data-action="upgrade-infra" data-region="' + regionId + '" data-id="' + infraId + '" data-cost="' + cost + '">' + NT.ui.ic('up') + ' ' + F.money(cost) +
                   (dur ? ' <span class="btn-sub">' + NT.ui.ic('clock') + F.short(dur) + '</span>' : '') + '</button>')) +
      '</div>' +
    '</div>';
  }

  /* ---------- Penduduk (Fase 3) ---------- */

  const NEED_LABEL = { pangan: '🍚 Pangan', sandang: '👘 Sandang', energi: '⚡ Energi' };
  // Petunjuk "apa yang kurang": bangunan penghasil di wilayah ini bila ada; bila tidak, pelabuhan agar barang dari wilayah lain menjangkau.
  function needHint(regionId, cat) {
    const needs = (D.regions[regionId].needs || D.popNeeds)[cat] || {};
    const local = D.regions[regionId].buildings.filter(function (bid) { return needs[D.buildings[bid].produces]; });
    if (local.length) return 'Bangun atau naikkan ' + local.map(function (bid) { return D.buildings[bid].name; }).join(', ') + '.';
    const far = Object.keys(D.buildings).filter(function (bid) { return needs[D.buildings[bid].produces]; })
      .map(function (bid) { return D.buildings[bid].name + ' (' + D.regions[D.buildings[bid].region].name + ')'; });
    return 'Barangnya datang dari wilayah lain: bangun ' + far.join(' atau ') + ', dan naikkan Pelabuhan di sini dan di asalnya.';
  }

  function popHtml(state, regionId) {
    const i = NT.population.info(state, regionId);
    if (!i) return '';
    const bar = function (v, cls) { return '<span class="bar mini ' + (cls || '') + '"><i style="width:' + Math.round(Math.max(0, Math.min(1, v)) * 100) + '%"></i></span>'; };
    const needs = NT.population.CATS.map(function (c) {
      return '<div class="pop-need"><span>' + NEED_LABEL[c] + '</span>' + bar(i.sat[c], i.sat[c] < 0.5 ? 'low' : '') + '<b>' + Math.round(i.sat[c] * 100) + '%</b></div>';
    }).join('');
    const trend = i.pop >= i.cap - 1e-6 && i.trend > 0 ? 'penuh, naikkan Perumahan'
      : (i.trend > 0.0005 ? 'bertambah' : (i.trend < -0.0005 ? 'berkurang' : 'stabil'));
    const labor = i.labor < 0.999
      ? '<p class="pop-warn">👷 Kekurangan pekerja: produksi wilayah ' + Math.round(i.labor * 100) + '% (butuh ' + F.num(i.workersNeed, 1) + ', ada ' + F.num(i.workersHave, 1) + '). Naikkan Perumahan.</p>' : '';
    const hint = i.worst ? '<p class="muted small">Yang kurang: ' + needHint(regionId, i.worst) + '</p>' : '';
    return '<h3>Penduduk</h3><div class="pop-box">' +
      '<div class="pop-top"><b>👥 ≈ ' + F.num(i.millions, i.millions < 20 ? 1 : 0) + ' juta jiwa</b>' +
        '<small class="muted"> indeks ' + F.num(i.pop, 2) + ' · ' + trend + '</small></div>' +
      '<div class="pop-need"><span data-action="term" data-term="kesejahteraan" role="button" tabindex="0">😊 Kesejahteraan ⓘ</span>' + bar(i.welfare / 100, i.welfare < 40 ? 'low' : '') + '<b>' + Math.round(i.welfare) + '</b></div>' +
      needs + labor + hint +
      '<p class="muted small">Pajak ≈ +' + F.money(i.taxPerMin) + '/mnt · harga jual ×' + F.num(i.priceMult, 2) + ' · daya tampung ' + F.num(i.cap, 2) + '</p>' +
      '<p class="muted small">Jumlah jiwa nyata hanya perkiraan kasar untuk game (perlu verifikasi BPS).</p></div>';
  }

  function renderRegion(state, now) {
    const r = D.regions[view.region];
    const host = $('region-panel');
    let html = '';

    if (r.comingSoon) {
      html = '<div class="card"><h2>' + regionArt(r) + ' ' + r.name + '</h2><p class="muted">' + r.tagline +
        '. Wilayah ini disiapkan sebagai kerangka untuk pengembangan berikutnya.</p></div>';
    } else if (!state.regions[r.id].unlocked) {
      const list = r.buildings.map(function (bid) {
        const b = D.buildings[bid];
        return '<li>' + (NT.ui.art.sprite(b.id, 'sm') || b.icon) + ' ' + b.name + ' <span class="muted">→ ' + D.commodities[b.produces].name + '</span></li>';
      }).join('');
      html = '<div class="card"><h2>🔒 ' + r.name + '</h2><p class="muted">' + r.tagline + '</p>' +
        '<ul class="plain">' + list + '</ul>' +
        '<p class="muted small">Membuka wilayah juga membuka pasar baru untuk menjual hasil bumi.</p>' +
        '<button class="btn primary wide" data-action="unlock" data-id="' + r.id + '" data-cost="' + r.unlockCost + '">Buka wilayah · ' + F.money(r.unlockCost) + '</button></div>';
    } else {
      html = '<div class="card"><h2>' + regionArt(r) + ' ' + r.name + '</h2><p class="muted">' + r.tagline + '</p>' +
        '<h3>Produksi</h3>' + r.buildings.map(function (bid) { return buildingRow(state, bid, now); }).join('') +
        '<h3>Infrastruktur</h3>' + Object.keys(D.infra).map(function (iid) { return infraRow(state, r.id, iid, now); }).join('') +
        '<div data-live="popbox" data-region="' + r.id + '">' + popHtml(state, r.id) + '</div>' +
        '</div>';
    }
    host.innerHTML = html;
  }

  /* ---------- Tab pasar ---------- */


  // Daftar pengiriman yang sedang berjalan (penjualan antar pulau dan ekspor).
  function shipmentsHtml(state) {
    const list = state.shipments || [];
    if (!list.length) return '';
    const rows = list.slice().sort(function (a, b) { return a.endsAt - b.endsAt; }).map(function (x) {
      const c = D.commodities[x.commodity];
      const dest = x.kind === 'export' ? D.exportMarkets[x.market].icon + ' ' + D.exportMarkets[x.market].name : D.regions[x.market].name;
      return '<div class="row"><div class="row-main"><b>' + (x.kind === 'export' ? '🚢' : (x.local ? '🚚' : '⛴️')) + ' ' + F.num(x.qty) + ' ' + c.name + ' → ' + dest + '</b>' +
        '<div class="bar job"><i data-live="shipbar" data-id="' + x.id + '"></i></div>' +
        '<small>Tiba dalam <b data-live="shiptime" data-id="' + x.id + '"></b> · bayaran <b>' + F.money(x.net) + '</b></small></div></div>';
    }).join('');
    return '<div class="card"><h2>Pengiriman <small class="muted">kapal ' + E.slotsUsed(state) + '/' + E.shipSlots(state) + '</small></h2>' + rows + '</div>';
  }

  // Lencana kelas ekspor: 🌍 bebas, 🔒 terbatas, 🏠 domestik.
  function exportBadge(cid) {
    const cls = E.exportClassOf(cid);
    const t = { bebas: ['🌍 Ekspor', 'Boleh diekspor'], terbatas: ['🔒 Terbatas', 'Ekspor dengan syarat'], domestik: ['🏠 Domestik', 'Tidak bisa diekspor'] }[cls];
    return '<span class="tag xc-' + cls + '" title="' + t[1] + '">' + t[0] + '</span>';
  }

  // Penjelasan singkat aturan 'terbatas' untuk satu komoditas.
  function exportRuleText(cid) {
    const c = D.commodities[cid], rule = c.exportRule || {};
    const parts = [];
    if (rule.quotaPct) parts.push(Math.round(rule.quotaPct * 100) + '% tiap kiriman wajib dijual di dalam negeri (DMO)');
    if (rule.needBuilding) parts.push('butuh ' + ((D.buildings[rule.needBuilding] || {}).name || rule.needBuilding));
    return parts.join(' · ');
  }

  // Ekspor ke luar negeri: makin jauh makin lama, tetapi harga lebih tinggi.
  function exportHtml(state, now) {
    const markets = Object.keys(D.exportMarkets || {}).map(function (mid) {
      const m = D.exportMarkets[mid];
      const rows = Object.keys(D.commodities).filter(function (cid) {
        return Math.floor(state.inventory[cid] || 0) >= 1 && E.exportClassOf(cid) !== 'domestik';
      }).map(function (cid) {
        const c = D.commodities[cid];
        const have = Math.floor(state.inventory[cid]);
        const port = state.regions[c.region] ? state.regions[c.region].infra.pelabuhan : 0;
        const st = E.exportStatus(state, cid);
        const portOk = port >= m.minPort;
        const ok = st.ok && portOk;
        const qty = Math.min(have, Math.max(1, E.exportMaxQty(state, cid)));
        const plan = E.exportPlan(cid, qty);
        const q = ok && plan.exportQty >= 1 ? E.quoteExport(state, cid, mid, plan.exportQty, now) : null;
        let info;
        if (!st.ok) info = '🔒 ' + st.reason;
        else if (!portOk) info = '🔒 butuh Pelabuhan ' + D.regions[c.region].name + ' level ' + m.minPort;
        else if (!q) info = 'jumlah terlalu sedikit setelah kuota dalam negeri';
        else info = 'kirim ' + F.num(plan.exportQty) + (plan.dmoQty ? ' (+' + F.num(plan.dmoQty) + ' wajib dalam negeri)' : '') +
          ' · bersih ' + F.money(q.net) + ' · tiba ' + F.short(q.durationMs);
        return '<div class="row"><div class="row-main"><b>' + c.name + exportBadge(cid) + '</b>' +
          '<small>' + info + '</small></div>' +
          '<button class="btn' + (ok && q ? ' primary' : '') + '" data-action="ship-export" data-c="' + cid + '" data-x="' + mid + '"' + (ok && q ? '' : ' disabled') + '>🚢 Ekspor</button></div>';
      }).join('');
      return '<div class="goods"><div class="goods-head"><div class="row-icon">' + m.icon + '</div>' +
        '<div class="row-main"><b>' + m.name + '</b><small>±' + F.short(m.baseHours * 3600000) + ' di laut · butuh Pelabuhan level ' + m.minPort + '</small></div></div>' +
        (rows || '<small class="muted">Gudang kosong.</small>') + '</div>';
    }).join('');
    const notes = Object.keys(D.commodities).filter(function (cid) { return E.exportClassOf(cid) !== 'bebas'; }).map(function (cid) {
      const c = D.commodities[cid];
      const txt = E.exportClassOf(cid) === 'domestik' ? 'tidak bisa diekspor; jual ke pasar pulau lain.' : exportRuleText(cid) + '.';
      return '<li><b>' + c.name + '</b>' + exportBadge(cid) + ' ' + txt + '</li>';
    }).join('');
    const nExp = Object.keys(D.commodities).filter(function (cid) {
      return Math.floor(state.inventory[cid] || 0) >= 1 && E.exportClassOf(cid) !== 'domestik';
    }).length;
    const eo = view.exportOpen;
    const head = '<button class="fold-head" data-action="export-toggle" aria-expanded="' + eo + '"><h2>Ekspor luar negeri</h2>' +
      '<span class="fold-sum muted small">' + (nExp ? nExp + ' barang siap diekspor' : 'gudang belum ada barang ekspor') + '</span>' +
      '<span class="fold-caret" aria-hidden="true">' + (eo ? '▴' : '▾') + '</span></button>';
    if (!eo) return '<div class="card fold">' + head + '</div>';
    return '<div class="card fold open">' + head +
      '<p class="muted small">Harga jual lebih tinggi daripada di dalam negeri, tetapi barang butuh waktu di laut dan hanya bisa dikirim sebanyak muatan kapal (naik bersama level pelabuhan). Uang masuk saat barang tiba.</p>' +
      '<p class="muted small">🌍 Ekspor = bebas · 🔒 Terbatas = ada syarat · 🏠 Domestik = kebutuhan dalam negeri. Aturan ini penyederhanaan untuk game.</p>' +
      (notes ? '<ul class="xc-notes small muted">' + notes + '</ul>' : '') + markets + '</div>';
  }

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
      const have = Math.floor(state.inventory[cid] || 0);
      const open = !!view.goodsOpen[cid];
      // Barang yang gudangnya kosong tidak bisa dijual: tampil sebagai baris tipis agar daftar tidak panjang.
      const slim = have < 1 && !open;
      const toggle = '<button class="goods-toggle" data-action="goods-toggle" data-c="' + cid + '" aria-expanded="' + open + '" aria-label="' + (open ? 'Ringkas' : 'Rincian') + ' ' + c.name + '">' + (open ? '▴' : '▾') + '</button>';
      const head = '<div class="goods-head">' +
          '<div class="row-icon">' + (NT.ui.art.comm(c.id) || c.icon) + '</div>' +
          '<div class="row-main"><b>' + c.name + exportBadge(cid) + '<span data-live="season" data-c="' + cid + '"></span></b><small>dari ' + D.regions[c.region].name + ' · ' + c.unitKg + ' kg/satuan</small></div>' +
          (slim
            ? '<div class="goods-mini"><b data-live="unit" data-c="' + cid + '"></b><span class="trend" data-live="trend" data-c="' + cid + '"></span></div>'
            : '<div class="goods-stock"><b data-live="stock" data-c="' + cid + '">0</b><small>di gudang</small></div>') +
          toggle +
        '</div>';
      if (slim) return { slim: true, html: '<div class="goods slim">' + head + '</div>' };
      return { slim: false, html: '' +
      '<div class="goods">' + head +
        '<div class="goods-price">' +
          '<span>Harga <b data-live="unit" data-c="' + cid + '"></b></span>' +
          '<span class="muted">' + term('ongkir', 'ongkir') + ' <span data-live="ship" data-c="' + cid + '"></span> <span data-live="km" data-c="' + cid + '"></span></span>' +
          '<span class="trend" data-live="trend" data-c="' + cid + '"></span>' +
          '<span data-live="signal" data-c="' + cid + '"></span>' +
        '</div>' +
        (open ? '<div class="spark" data-live="spark" data-c="' + cid + '"></div>' +
          '<div class="spark-axis"><span>30 mnt lalu</span><span>sekarang</span><span>30 mnt lagi</span></div>' +
          '<div class="goods-hint" data-live="hint" data-c="' + cid + '"></div>' +
          '<div class="goods-best" data-live="best" data-c="' + cid + '"></div>' : '') +
        '<div class="goods-actions">' +
          '<button class="btn" data-action="sell" data-c="' + cid + '" data-qty="10">Jual 10</button>' +
          '<button class="btn primary" data-action="sell" data-c="' + cid + '" data-qty="all">Jual semua</button>' +
        '</div>' +
        '<small class="goods-quote muted" data-live="quote" data-c="' + cid + '"></small>' +
      '</div>' };
    });

    // Dua kelompok: yang ada di gudang (kartu penuh) dan yang kosong (dilipat jadi satu baris)
    const haveHtml = goods.filter(function (g) { return !g.slim; }).map(function (g) { return g.html; }).join('');
    const emptyItems = goods.filter(function (g) { return g.slim; });
    const eOpen = !!view.emptyOpen;
    const emptyHtml = emptyItems.length
      ? '<button class="fold-head empty-head" data-action="empty-toggle" aria-expanded="' + eOpen + '"><b>Stok kosong</b><span class="cnt">' + emptyItems.length + '</span><span class="caret" aria-hidden="true">' + (eOpen ? '▴' : '▾') + '</span></button>' +
        (eOpen ? '<div class="empty-list">' + emptyItems.map(function (g) { return g.html; }).join('') + '</div>' : '')
      : '';
    const goodsHtml = (haveHtml
      ? '<div class="grp-title">Di gudang</div>' + haveHtml
      : '<div class="card empty-note"><b>Gudangmu kosong</b><p class="muted">Kumpulkan hasil panen di tab Peta, lalu kembali ke sini untuk menjualnya.</p>' +
        '<button class="btn primary" data-action="tab" data-id="map">' + NT.ui.ic('map') + ' Ke Peta</button></div>') + emptyHtml;

    $('tab-market').innerHTML = shipmentsHtml(state) +
      '<div class="card"><h2>Pasar tujuan</h2>' +
      '<div class="segs">' + seg + '</div>' +
      '<button class="btn primary wide sell-good" data-action="sell-good">' + NT.ui.ic('coin') + ' Jual yang menguntungkan <span data-live="sellgood-est"></span></button>' +
      '<button class="btn ghost wide sell-everything" data-action="sell-everything">Jual semua isi gudang <span data-live="sellall-est"></span></button>' +
      '<details class="how"><summary>Cara kerja harga dan ongkir</summary><p class="muted small">Harga mengikuti musim panen dan peristiwa dunia, naik turun sendiri, dan jatuh bila kamu menjual terlalu banyak di satu pasar. ' +
      'Ongkir dihitung dari berat dan jarak laut sebenarnya: barang curah murah (padi) paling terasa ongkirnya; pelabuhan menurunkannya. ' +
      'Penjualan butuh waktu kirim: harga dikunci saat berangkat dan uang masuk saat barang tiba.</p></details></div>' + goodsHtml + exportHtml(state, now);
  }

  // Grafik mini harga: 30 menit lalu sampai 30 menit ke depan (garis putus-putus = perkiraan).
  function sparkSvg(state, cid, now) {
    const W = 240, H = 46, PAD = 4;
    const ser = E.priceSeries(state, view.market, cid, now, 30, 30, 40);
    const base = E.normalPrice(view.market, cid, state);
    let lo = base, hi = base;
    ser.forEach(function (p) { lo = Math.min(lo, p.price); hi = Math.max(hi, p.price); });
    const span = (hi - lo) || 1;
    function x(i) { return (i / (ser.length - 1) * W).toFixed(1); }
    function y(v) { return (PAD + (1 - (v - lo) / span) * (H - 2 * PAD)).toFixed(1); }
    const mid = ser.length >> 1;
    const past = ser.slice(0, mid + 1).map(function (p, i) { return x(i) + ',' + y(p.price); }).join(' ');
    const fut = ser.slice(mid).map(function (p, i) { return x(i + mid) + ',' + y(p.price); }).join(' ');
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" role="img" aria-label="Grafik harga">' +
      '<line class="sp-base" x1="0" x2="' + W + '" y1="' + y(base) + '" y2="' + y(base) + '"/>' +
      '<line class="sp-now" x1="' + x(mid) + '" x2="' + x(mid) + '" y1="0" y2="' + H + '"/>' +
      '<polyline class="sp-past" points="' + past + '"/>' +
      '<polyline class="sp-fut" points="' + fut + '"/>' +
      '<circle class="sp-dot" cx="' + x(mid) + '" cy="' + y(ser[mid].price) + '" r="3.2"/></svg>';
  }

  /* ---------- Panduan awal ---------- */

  function renderGuide(state) {
    const host = $('guide');
    if (!host) return;
    const g = NT.achievements.guide(state);
    const active = !(state.guideHidden || g.complete);
    document.body.classList.toggle('guide-on', active);
    if (!active) { host.innerHTML = ''; return; }
    const open = view.guideOpen;
    const list = g.steps.map(function (x) {
      const cur = g.current && g.current.id === x.id;
      return '<li class="' + (x.done ? 'done' : (cur ? 'cur' : '')) + '"><span class="gk">' + (x.done ? '✅' : (cur ? '👉' : '⬜')) + '</span>' +
        '<span><b>' + x.icon + ' ' + x.title + '</b>' + (cur ? '<small>' + x.hint + '</small>' : '') + '</span></li>';
    }).join('');
    host.innerHTML =
      '<div class="guide' + (open ? ' open' : '') + '">' +
        '<button class="guide-head" data-action="guide-toggle" aria-expanded="' + open + '">' +
          '<span class="guide-ico">🎓</span>' +
          '<span class="guide-text"><small>Panduan awal · ' + g.done + '/' + g.total + '</small><b>' + g.current.title + '</b></span>' +
          '<span class="guide-caret" aria-hidden="true">' + (open ? '▴' : '▾') + '</span>' +
        '</button>' +
        '<div class="bar guidebar"><i style="width:' + (g.done / g.total * 100) + '%"></i></div>' +
        (open ? '<ol class="guide-list">' + list + '</ol>' +
          '<div class="guide-foot"><button class="btn" data-action="guide-hide">Sembunyikan panduan</button></div>' : '') +
      '</div>';
  }

  /* ---------- Misi harian dan hadiah login ---------- */

  function renderDaily(state, now) {
    const host = $('daily');
    if (!host) return;
    const v = NT.daily && NT.config.daily.enabled ? NT.daily.view(state, now) : null;
    if (!v) { host.innerHTML = ''; return; }
    const open = !!view.dailyOpen;
    const total = v.missions.length;
    const claimedN = v.missions.filter(function (x) { return x.claimed; }).length;
    const sub = v.ready > 0 ? '<b class="dy-ready">' + v.ready + ' hadiah siap diambil</b>'
      : (claimedN === total && v.bonus.claimed && v.login.claimedToday ? 'Semua hadiah hari ini sudah diambil' : v.doneCount + '/' + total + ' misi selesai');
    const rows = v.missions.map(function (x) {
      return '<li class="dy-row' + (x.claimed ? ' got' : (x.done ? ' done' : '')) + '">' +
        '<span class="dy-ico">' + x.icon + '</span>' +
        '<span class="dy-txt"><b>' + x.text + '</b><span class="bar"><i style="width:' + x.pct + '%"></i></span>' +
        '<small>' + F.num(x.have) + ' / ' + F.num(x.target) + '</small></span>' +
        (x.claimed ? '<span class="dy-ok" aria-label="Sudah diambil">' + NT.ui.ic('star') + '</span>'
          : '<button class="btn' + (x.done ? ' primary' : '') + '" data-action="daily-claim" data-id="' + x.id + '"' + (x.done ? '' : ' disabled') + '>' +
            (x.done ? 'Ambil ' : '') + F.money(x.reward) + '</button>') +
        '</li>';
    }).join('');
    const dots = [1, 2, 3, 4, 5, 6, 7].map(function (d) {
      const cur = d === v.login.dayInCycle;
      const past = v.login.claimedToday ? d <= v.login.dayInCycle : d < v.login.dayInCycle;
      return '<i class="' + (past ? 'on' : '') + (cur ? ' cur' : '') + (d === 7 ? ' big' : '') + '">' + d + '</i>';
    }).join('');
    const login = '<li class="dy-row login' + (v.login.claimedToday ? ' got' : ' done') + '">' +
      '<span class="dy-ico">🎁</span>' +
      '<span class="dy-txt"><b>Hadiah login · rangkaian ' + v.login.streak + ' hari</b><span class="dy-days">' + dots + '</span>' +
      '<small>Hari ke-7 hadiahnya terbesar. Bolos sehari, rangkaian mulai dari awal.</small></span>' +
      (v.login.claimedToday ? '<span class="dy-ok" aria-label="Sudah diambil">' + NT.ui.ic('star') + '</span>'
        : '<button class="btn primary" data-action="daily-claim" data-id="login">Ambil ' + F.money(v.login.reward) + '</button>') + '</li>';
    const bonus = '<li class="dy-row bonus' + (v.bonus.claimed ? ' got' : (v.bonus.ready ? ' done' : '')) + '">' +
      '<span class="dy-ico">🎉</span><span class="dy-txt"><b>Bonus semua misi</b><small>Ambil hadiah ketiga misi dulu.</small></span>' +
      (v.bonus.claimed ? '<span class="dy-ok" aria-label="Sudah diambil">' + NT.ui.ic('star') + '</span>'
        : '<button class="btn' + (v.bonus.ready ? ' primary' : '') + '" data-action="daily-claim" data-id="bonus"' + (v.bonus.ready ? '' : ' disabled') + '>' +
          (v.bonus.ready ? 'Ambil ' : '') + F.money(v.bonus.reward) + '</button>') + '</li>';
    host.innerHTML =
      '<div class="daily' + (open ? ' open' : '') + (v.ready > 0 ? ' has-ready' : '') + '">' +
        '<button class="daily-head" data-action="daily-toggle" aria-expanded="' + open + '">' +
          '<span class="daily-ico">' + NT.ui.ic('calendar') + '</span>' +
          '<span class="daily-text"><small>Misi harian</small><span>' + sub + '</span></span>' +
          '<span class="guide-caret" aria-hidden="true">' + (open ? '▴' : '▾') + '</span>' +
        '</button>' +
        (open ? '<ul class="dy-list">' + login + rows + bonus + '</ul><p class="dy-foot">Misi dan hadiah berganti tiap pukul 00.00 WIB.</p>' : '') +
      '</div>';
  }

  /* ---------- Tab capaian: statistik, pencapaian, log ---------- */

  function ago(ms) {
    if (ms < 45000) return 'baru saja';
    return F.duration(ms) + ' lalu';
  }

  function renderStats(state, now) {
    const st = state.stats || {};
    const A = NT.achievements;
    const opened = Object.keys(state.regions).filter(function (id) { return state.regions[id].unlocked; }).length;
    const total = Object.keys(state.regions).length;
    const tiles = [
      ['coin', 'Total pendapatan', F.money(state.totalEarned)],
      ['box', 'Hasil dikumpulkan', F.num(st.produced || 0)],
      ['handshake', 'Barang terjual', F.num(st.sold || 0)],
      ['gem', 'Penjualan terbesar', F.money(st.bestSale || 0)],
      ['hammer', 'Pembangunan', F.num((st.builds || 0) + (st.upgrades || 0))],
      ['map', 'Wilayah terbuka', opened + ' dari ' + total],
      ['clock', 'Waktu bermain', '<span data-live="playtime"></span>'],
      ['calendar', 'Mulai bermain', new Date(state.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })]
    ].map(function (t) {
      return '<div class="tile"><span class="tile-ico">' + NT.ui.ic(t[0]) + '</span><small>' + t[1] + '</small><b>' + t[2] + '</b></div>';
    }).join('');

    const got = A.list.filter(function (a) { return state.achievements[a.id]; });
    const badges = A.list.map(function (a) {
      const t = state.achievements[a.id];
      return '<div class="badge' + (t ? ' got' : '') + '" title="' + a.desc + '">' +
        '<span class="badge-ico">' + (t ? a.icon : '🔒') + '</span><b>' + a.name + '</b><small>' + a.desc + '</small></div>';
    }).join('');

    const log = (state.log || []).slice().reverse().map(function (e) {
      return '<li><span class="log-ico">' + e.i + '</span><span class="log-x">' + e.x + '</span><small>' + ago(now - e.t) + '</small></li>';
    }).join('');

    $('tab-stats').innerHTML =
      '<div class="card"><h2>Statistik</h2><div class="tiles">' + tiles + '</div></div>' +
      '<div class="card"><h2>Pencapaian <span class="count">' + got.length + '/' + A.list.length + '</span></h2>' +
        '<div class="bar"><i style="width:' + got.length / A.list.length * 100 + '%"></i></div>' +
        '<div class="badges">' + badges + '</div></div>' +
      '<div class="card"><h2>Aktivitas terbaru</h2>' +
        (log ? '<ul class="log">' + log + '</ul>' : '<p class="muted">Belum ada aktivitas. Mulailah berdagang!</p>') + '</div>';
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
      return '<div><b>' + (NT.ui.art.comm(c.id, 'sm') || c.icon) + ' ' + c.name + '</b>' + calendar(cid, now) +
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
      '<div class="card"><h2>Rencana pengembangan</h2><ul class="plain">' + roadmap + '</ul></div>';
  }

  /* ---------- Tab pengaturan ---------- */

  function setRow(title, desc, control) {
    return '<div class="set-row"><div class="set-text"><b>' + title + '</b><small>' + desc + '</small></div>' +
      '<div class="set-ctl">' + control + '</div></div>';
  }

  function toggle(key, on, label) {
    return '<button class="switch' + (on ? ' on' : '') + '" role="switch" aria-checked="' + on + '" aria-label="' + label + '" ' +
      'data-action="setting" data-key="' + key + '" data-value="' + (!on) + '"><i></i></button>';
  }

  function choice(key, current) {
    return '<div class="segs mini" role="group">' + NT.ui.settings.options[key].map(function (o) {
      return '<button class="seg' + (o[0] === current ? ' on' : '') + '" aria-pressed="' + (o[0] === current) + '" ' +
        'data-action="setting" data-key="' + key + '" data-value="' + o[0] + '">' + o[1] + '</button>';
    }).join('') + '</div>';
  }

  function renderSettings() {
    const S = NT.ui.settings;
    const driver = NT.getStorage();
    const focused = document.activeElement && document.activeElement.closest && document.activeElement.closest('#tab-settings');
    const keep = focused ? [document.activeElement.getAttribute('data-key'), document.activeElement.getAttribute('data-value')] : null;

    const reset = view.resetArmed
      ? '<div class="reset-confirm"><p><b>Hapus semua kemajuan?</b> Ini tidak bisa dibatalkan. Ekspor dulu bila ingin menyimpan cadangan.</p>' +
        '<div class="set-buttons"><button class="btn danger" data-action="reset">Ya, hapus semuanya</button>' +
        '<button class="btn" data-action="reset-cancel">Batal</button></div></div>'
      : '<button class="btn danger" data-action="reset-ask">Mulai ulang game</button>';

    $('tab-settings').innerHTML =
      '<div class="card set-card"><h2>Suara</h2>' +
        setRow('Efek suara', 'Bunyi saat mengumpulkan, menjual, dan membangun.', toggle('sfx', S.get('sfx'), 'Efek suara')) +
        setRow('Volume', 'Seberapa keras efek suara terdengar.', choice('volume', S.get('volume'))) +
      '</div>' +
      '<div class="card set-card"><h2>Tampilan</h2>' +
        setRow('Ukuran teks', 'Perbesar tulisan dan tombol agar lebih mudah dibaca.', choice('textSize', S.get('textSize'))) +
        setRow('Hemat animasi', 'Matikan gerakan, konfeti, dan kapal di peta. Cocok untuk HP yang berat.', toggle('calm', S.get('calm'), 'Hemat animasi')) +
      '</div>' +
      '<div class="card set-card"><h2>Permainan</h2>' +
        setRow('Konfirmasi pembelian mahal', 'Tanya dulu sebelum membangun atau membuka wilayah yang menghabiskan sebagian besar kas.', choice('confirm', S.get('confirm'))) +
        setRow('Angka ringkas', 'Tampilkan 1,2 jt, bukan 1.200.000.', toggle('compact', S.get('compact'), 'Angka ringkas')) +
      '</div>' +
      '<div class="card set-card"><h2>Data</h2>' +
        setRow('Penyimpanan', driver.label + '.', '') +
        setRow('Cadangan', 'Simpan kemajuanmu ke file, atau pulihkan dari file cadangan.',
          '<div class="set-buttons"><button class="btn" data-action="export">Ekspor</button>' +
          '<label class="btn" for="import-file">Impor</label>' +
          '<input type="file" id="import-file" accept=".json,application/json" hidden></div>') +
        '<div class="set-row set-danger">' + reset + '</div>' +
      '</div>' +
      '<div class="card set-card"><h2>Bantuan</h2>' +
        setRow('Cara bermain', 'Panduan singkat, kalender panen, dan rencana pengembangan ada di Kerajaan › Info.',
          '<button class="btn" data-action="tab" data-id="about">Buka Info</button>') +
        setRow('Panduan awal', 'Tampilkan lagi daftar langkah pertama di tab Peta (bila belum selesai).',
          '<button class="btn" data-action="guide-show">Tampilkan</button>') +
      '</div>';

    if (keep) {
      const sel = '#tab-settings [data-key="' + keep[0] + '"][data-value="' + keep[1] + '"]';
      const next = document.querySelector(sel) || document.querySelector('#tab-settings [data-key="' + keep[0] + '"]');
      if (next) next.focus();
    }
  }

  /* ---------- Chip wilayah ---------- */

  // Ikon wilayah: ilustrasi komoditas utama bila tersedia, kalau tidak emoji.
  function regionArt(r) { return (r.artIcon && NT.ui.art.comm(r.artIcon, 'sm')) || r.icon; }
  function regionIco(r, unlocked) {
    if (r.comingSoon) return '…';
    if (!unlocked) return '🔒';
    return (r.artIcon && NT.ui.art.comm(r.artIcon, 'sm')) || r.icon;
  }

  function renderChips(state) {
    const host = $('region-chips');
    if (!host) return;
    host.innerHTML = Object.keys(D.regions).map(function (id) {
      const r = D.regions[id];
      const unlocked = state.regions[id] && state.regions[id].unlocked;
      return '<button class="chip' + (id === view.region ? ' on' : '') + (r.comingSoon ? ' soon' : '') + '" data-action="pick-region" data-id="' + id + '">' +
        regionIco(r, unlocked) + ' ' + (r.short || r.name) + '</button>';
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
    const shown = view.tab === 'kingdom' ? view.sub : view.tab;
    document.querySelectorAll('.tab-panel').forEach(function (p) {
      p.classList.toggle('on', p.id === 'tab-' + shown);
    });
    $('kingdom-seg').classList.toggle('on', view.tab === 'kingdom');
    document.querySelectorAll('#kingdom-seg .seg').forEach(function (b) {
      const on = b.getAttribute('data-id') === view.sub;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    NT.ui.map.update(state, view.region);
    renderChips(state);
    renderRegion(state, now);
    $('sheet-title').innerHTML = regionArt(D.regions[view.region]) + ' ' + D.regions[view.region].name;
    $('sheet').classList.toggle('open', !!view.sheet);
    document.body.classList.toggle('sheet-open', !!view.sheet && view.tab === 'map');
    renderMarket(state, now);
    renderGuide(state);
    renderDaily(state, now);
    renderStats(state, now);
    renderAbout(state);
    renderSettings();
    tick(state, now);
  }

  function each(selector, fn) {
    document.querySelectorAll(selector).forEach(fn);
  }

  function tick(state, now) {
    const sc = E.score(state);
    const rk = E.rank(sc);
    NT.ui.fx.setCash($('stat-cash'), state.cash);
    $('stat-score').textContent = F.num(sc);
    $('rank-name').textContent = rk.current.name;
    const inc0 = E.incomePerMin(state, now) + NT.population.taxPerMin(state);
    if ($('stat-pop')) {
      let tm = 0, tw = 0, ti = 0;
      Object.keys(D.regions).forEach(function (rid) {
        if (!state.regions[rid] || !state.regions[rid].unlocked) return;
        const pi = NT.population.info(state, rid);
        if (!pi) return;
        tm += pi.millions; tw += pi.welfare * pi.pop; ti += pi.pop;
      });
      $('stat-pop').textContent = F.num(tm, tm < 20 ? 1 : 0) + ' jt';
      $('stat-popsub').textContent = ti > 0 ? '😊 ' + Math.round(tw / ti) + ' kesejahteraan' : '\u00a0';
    }
    $('stat-income').textContent = inc0 > 0 ? '≈ +' + F.money(inc0) + '/mnt' : '\u00a0';
    $('stat-rankpct').textContent = rk.next ? Math.round(Math.max(0, Math.min(1, (sc - rk.current.min) / (rk.next.min - rk.current.min))) * 100) + '% ke ' + rk.next.name : 'Gelar tertinggi';

    const wh = worldHtml(now);
    if (wh !== bannerCache) {
      bannerCache = wh;
      $('world-banner').innerHTML = wh;
      $('world-bell').classList.toggle('new', wh !== view.bannerSeen);
      each('[data-live="world-now"]', function (el) { el.innerHTML = '<p>' + wh + '</p>'; });
    }

    // Timer pembangunan
    each('[data-live="jobbar"]', function (el) {
      const j = E.jobFor(state, el.getAttribute('data-key'));
      if (j) el.style.width = Math.max(0, Math.min(100, (now - j.startedAt) / (j.endsAt - j.startedAt) * 100)) + '%';
    });
    each('[data-live="jobtime"]', function (el) {
      const j = E.jobFor(state, el.getAttribute('data-key'));
      if (j) el.textContent = F.clock(j.endsAt - now);
    });
    each('[data-live="speedcost"]', function (el) {
      const j = E.jobFor(state, el.getAttribute('data-key'));
      if (!j) return;
      const c = E.speedupCost(j, now);
      el.textContent = F.money(c);
      el.parentNode.setAttribute('data-cost', c);
    });

    // Timer pengiriman
    each('[data-live="shipbar"]', function (el) {
      const x = (state.shipments || []).filter(function (y) { return y.id === el.getAttribute('data-id'); })[0];
      if (x) el.style.width = Math.max(0, Math.min(100, (now - x.startedAt) / (x.endsAt - x.startedAt) * 100)) + '%';
    });
    each('[data-live="shiptime"]', function (el) {
      const x = (state.shipments || []).filter(function (y) { return y.id === el.getAttribute('data-id'); })[0];
      if (x) el.textContent = F.clock(x.endsAt - now);
    });

    // Kartu target berikutnya dan jumlah tukang
    const goal = E.nextGoal(state);
    if (goal) {
      $('goal-ico').innerHTML = (goal.kind === 'building' || goal.kind === 'infra') ? (NT.ui.art.sprite(goal.id, 'sm') || goal.icon) : NT.ui.ic('star');
      $('goal-title').textContent = goal.label + ' · ' + F.money(goal.cost);
      $('goal-bar').style.width = Math.min(100, state.cash / goal.cost * 100) + '%';
      const inc = E.incomePerMin(state, now) + NT.population.taxPerMin(state);
      $('goal-eta').textContent = state.cash >= goal.cost ? '✅ Kas cukup, ayo bangun!'
        : (inc > 0 ? '≈ ' + F.duration((goal.cost - state.cash) / inc * 60000) + ' lagi jika semua hasil dijual' : '');
    } else {
      $('goal-title').textContent = 'Semua target tercapai';
    }
    const busy = (state.jobs || []).length;
    $('builders').innerHTML = NT.ui.ic('hammer') + ' ' + busy + '/' + NT.config.maxBuilders;
    $('builders').classList.toggle('busy', busy >= NT.config.maxBuilders);

    // Tombol Kumpulkan berdenyut bila gudang sudah separuh penuh
    let anyReady = false;
    each('[data-action="collect"]', function (el) {
      const id = el.getAttribute('data-id');
      const ready = E.pending(state, id, now) >= Math.max(1, E.capacity(state, id, now) * 0.5);
      el.classList.toggle('ready', ready);
      anyReady = anyReady || ready;
    });
    let nReady = 0;   // jumlah bangunan yang punya hasil siap diambil (untuk lencana di tombol)
    Object.keys(state.buildings).forEach(function (id) {
      const pend = E.pending(state, id, now);
      if (pend >= Math.max(1, E.capacity(state, id, now) * 0.5)) anyReady = true;
      if (state.buildings[id].level > 0 && pend >= 1) nReady++;
    });
    const all = document.querySelector('.collect-all');
    if (all) {
      all.classList.toggle('ready', anyReady);
      all.disabled = nReady === 0;   // tidak ada hasil: tombol redup, tanpa toast "belum ada hasil"
      const cl = all.querySelector('[data-live="collect-label"]');
      if (cl && cl.getAttribute('data-n') !== String(nReady)) {
        cl.setAttribute('data-n', String(nReady));
        cl.innerHTML = nReady ? NT.ui.ic('box') + ' Kumpulkan<span class="lg"> semua hasil</span> <b class="cnt">' + nReady + '</b>' : NT.ui.ic('box') + ' Belum ada hasil';
      }
    }
    NT.ui.map.tickJobs(state, now);

    // Tombol berbiaya: nonaktif bila kas kurang
    each('[data-cost]', function (el) {
      const cost = Number(el.getAttribute('data-cost'));
      el.disabled = state.cash < cost;
      // Tombol yang belum terjangkau terisi sebanyak kas yang sudah ada: kelihatan seberapa dekat.
      el.style.setProperty('--fill', (cost > 0 ? Math.min(100, state.cash / cost * 100) : 100).toFixed(0) + '%');
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
      const html = tag ? '<button type="button" class="tag term-tag ' + tag.id + '" data-action="term" data-term="' + tag.id + '">' + tag.text + '</button>' : '';
      if (el.__h !== html) { el.__h = html; el.innerHTML = html; }
    });
    each('[data-live="km"]', function (el) {
      const km = E.distanceKm(D.commodities[el.getAttribute('data-c')].region, view.market);
      el.textContent = km ? '(' + F.num(Math.round(km / 10) * 10) + ' km)' : '';
    });
    each('[data-live="trend"]', function (el) {
      const cid = el.getAttribute('data-c');
      const ratio = E.currentPrice(state, view.market, cid, now) / E.normalPrice(view.market, cid, state) - 1;
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
    if (view.tab === 'market') {
      each('[data-live="spark"]', function (el) { el.innerHTML = sparkSvg(state, el.getAttribute('data-c'), now); });
    }
    each('[data-live="signal"]', function (el) {
      const sg = E.priceSignal(state, view.market, el.getAttribute('data-c'), now);
      el.innerHTML = sg.id === 'bagus' ? '<span class="sig good">Jual sekarang</span>'
        : (sg.id === 'rendah' ? '<span class="sig low">Tahan dulu</span>' : '');
      const card = el.closest('.goods');
      if (card) card.setAttribute('data-sig', sg.id);
    });
    each('[data-live="hint"]', function (el) {
      const sg = E.priceSignal(state, view.market, el.getAttribute('data-c'), now);
      el.textContent = sg.peakInMin !== null ? '📈 Puncak sekitar ' + sg.peakInMin + ' menit lagi (' + F.price(sg.peakPrice) + ')'
        : (sg.id === 'bagus' ? '✅ Sekarang dekat puncak, waktu bagus untuk menjual' : '');
    });
    each('[data-live="quote"]', function (el) {
      const cid = el.getAttribute('data-c');
      const have = Math.floor(state.inventory[cid] || 0);
      if (have < 1) { el.textContent = ''; return; }
      const q = E.quoteSale(state, cid, view.market, have, now);
      el.textContent = 'Jual semua ' + F.num(have) + ' ≈ ' + F.money(Math.max(0, q.net)) + ' bersih';
    });
    each('[data-live="sellgood-est"]', function (el) {
      const q = E.quoteSellAll(state, view.market, now, true);
      el.textContent = q.qty > 0 ? '· ≈ ' + F.money(q.net) : '';
      el.parentNode.disabled = q.qty < 1;
    });
    each('[data-live="sellall-est"]', function (el) {
      const q = E.quoteSellAll(state, view.market, now);
      el.textContent = q.qty > 0 ? '· ≈ ' + F.money(q.net) : '';
      el.parentNode.disabled = q.qty < 1;
    });
    each('[data-action="sell"]', function (el) {
      const have = state.inventory[el.getAttribute('data-c')] || 0;
      const qty = el.getAttribute('data-qty');
      el.disabled = qty === 'all' ? have < 1 : have < Number(qty);
    });

    // Kotak penduduk: hanya teks, diganti bila isinya berubah
    each('[data-live="popbox"]', function (el) {
      const h = popHtml(state, el.getAttribute('data-region'));
      if (el.getAttribute('data-sig') !== h) { el.setAttribute('data-sig', h); el.innerHTML = h; }
    });

    // Capaian dan upgrade termurah
    each('[data-live="playtime"]', function (el) { el.textContent = F.duration((state.stats && state.stats.playMs) || 0); });
    const cu = E.cheapestUpgrade(state);
    const cbtn = document.querySelector('.cheapest');
    if (cbtn) {
      cbtn.setAttribute('data-cost', cu ? cu.cost : 0);
      cbtn.setAttribute('data-none', cu ? '0' : '1');
      const lab = cbtn.querySelector('[data-live="cheapest-label"]');
      const txt = cu ? cu.label + ' · ' + F.money(cu.cost) : '';
      if (lab && lab.getAttribute('data-t') !== txt) {
        lab.setAttribute('data-t', txt);
        lab.textContent = '';
        if (cu) {
          const cap = document.createElement('span'), val = document.createElement('span');
          cap.className = 'cap'; cap.innerHTML = NT.ui.ic('up') + ' Upgrade termurah';
          val.className = 'val'; val.textContent = txt;
          lab.appendChild(cap); lab.appendChild(val);
        } else lab.textContent = 'Semua upgrade sudah maksimal';
      }
      if (!cu) cbtn.disabled = true;
    }

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

  NT.ui.panels = { view: view, renderAll: renderAll, tick: tick, glossary: GLOSSARY, needHint: needHint };
})((window.NT = window.NT || {}));
