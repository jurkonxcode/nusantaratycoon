/*
 * Panel antarmuka: wilayah, pasar, info. Render penuh dilakukan setelah aksi pemain;
 * tiap detik hanya angka bertanda data-live yang diperbarui (supaya tombol tidak "berkedip").
 */
(function (NT) {
  NT.ui = NT.ui || {};
  const D = NT.data;
  const E = NT.economy;
  const F = NT.fmt;

  const view = { tab: 'map', region: 'jawa', market: 'jawa', resetArmed: false, sheet: false };

  function $(id) { return document.getElementById(id); }

  /* ---------- Panel wilayah ---------- */

  function jobBox(job, note) {
    return '<div class="bar job"><i data-live="jobbar" data-key="' + job.key + '"></i></div>' +
      '<small>🔨 <b data-live="jobtime" data-key="' + job.key + '"></b> · ' + note + '</small>';
  }

  function speedBtn(job, now) {
    const cost = E.speedupCost(job, now);
    return '<button class="btn primary" data-action="speedup" data-key="' + job.key + '" data-cost="' + cost + '">⚡ Percepat · ' +
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
    const time = dur ? ' · ⏱ ' + F.short(dur) : '';

    if (!lvl) {
      if (job) {
        return '' +
        '<div class="row building">' +
          '<div class="row-icon working">' + b.icon + '</div>' +
          '<div class="row-main"><b>Membangun ' + b.name + '…</b>' + jobBox(job, 'lalu ' + F.num(b.baseRate, 1) + '/menit') + '</div>' +
          '<div class="row-actions">' + speedBtn(job, now) + '</div>' +
        '</div>';
      }
      return '' +
      '<div class="row">' +
        '<div class="row-icon">' + b.icon + '</div>' +
        '<div class="row-main"><b>' + b.name + '</b>' +
          '<small>Menghasilkan ' + c.name + ' (' + F.num(b.baseRate, 1) + '/menit pada Lv 1)</small></div>' +
        '<div class="row-actions">' +
          '<button class="btn primary" data-action="upgrade-building" data-id="' + id + '" data-cost="' + cost + '">Bangun · ' + F.money(cost) + time + '</button>' +
        '</div>' +
      '</div>';
    }

    const cap = E.capacity(state, id, now);
    return '' +
    '<div class="row' + (job ? ' building' : '') + '">' +
      '<div class="row-icon working">' + b.icon + '</div>' +
      '<div class="row-main">' +
        '<b>' + b.name + ' <span class="lvl">Lv ' + lvl + '</span>' + (job ? ' <span class="lvl next">→ Lv ' + job.to + '</span>' : '') + '</b>' +
        '<small>' + F.num(rate, 2) + ' ' + c.name.toLowerCase() + '/menit <span data-live="bmult" data-id="' + id + '"></span></small>' +
        '<div class="bar"><i data-live="bar" data-id="' + id + '"></i></div>' +
        '<small><span data-live="pending" data-id="' + id + '">0</span> / ' + F.num(cap) + ' siap dikumpulkan</small>' +
        (job ? jobBox(job, 'naik ke Lv ' + job.to) : '') +
      '</div>' +
      '<div class="row-actions">' +
        '<button class="btn" data-action="collect" data-id="' + id + '">Kumpulkan</button>' +
        (job ? speedBtn(job, now)
             : '<button class="btn primary" data-action="upgrade-building" data-id="' + id + '" data-cost="' + cost + '">⬆ ' + F.money(cost) + time + '</button>') +
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
      '<div class="row-icon' + (job ? ' working' : '') + '">' + inf.icon + '</div>' +
      '<div class="row-main"><b>' + inf.name + ' <span class="lvl">Lv ' + lvl + '/' + inf.maxLevel + '</span>' +
        (job ? ' <span class="lvl next">→ Lv ' + job.to + '</span>' : '') + '</b>' +
        '<small>' + inf.desc + '</small>' + (job ? jobBox(job, 'naik ke Lv ' + job.to) : '') + '</div>' +
      '<div class="row-actions">' +
        (maxed
          ? '<span class="maxed">MAKS</span>'
          : (job ? speedBtn(job, now)
                 : '<button class="btn primary" data-action="upgrade-infra" data-region="' + regionId + '" data-id="' + infraId + '" data-cost="' + cost + '">⬆ ' + F.money(cost) +
                   (dur ? ' · ⏱ ' + F.short(dur) : '') + '</button>')) +
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
        '<h3>Infrastruktur</h3>' + Object.keys(D.infra).map(function (iid) { return infraRow(state, r.id, iid, now); }).join('') +
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
          '<span data-live="signal" data-c="' + cid + '"></span>' +
        '</div>' +
        '<div class="spark" data-live="spark" data-c="' + cid + '"></div>' +
        '<div class="spark-axis"><span>30 mnt lalu</span><span>sekarang</span><span>30 mnt lagi</span></div>' +
        '<div class="goods-hint" data-live="hint" data-c="' + cid + '"></div>' +
        '<div class="goods-best" data-live="best" data-c="' + cid + '"></div>' +
        '<div class="goods-actions">' +
          '<button class="btn" data-action="sell" data-c="' + cid + '" data-qty="10">Jual 10</button>' +
          '<button class="btn primary" data-action="sell" data-c="' + cid + '" data-qty="all">Jual semua</button>' +
        '</div>' +
        '<small class="goods-quote muted" data-live="quote" data-c="' + cid + '"></small>' +
      '</div>';
    }).join('');

    $('tab-market').innerHTML =
      '<div class="card"><h2>Pasar tujuan</h2>' +
      '<div class="segs">' + seg + '</div>' +
      '<button class="btn primary wide sell-everything" data-action="sell-everything">💰 Jual semua isi gudang <span data-live="sellall-est"></span></button>' +
      '<p class="muted small">Harga mengikuti musim panen dan peristiwa dunia, naik turun sendiri, dan jatuh bila kamu menjual terlalu banyak di satu pasar. ' +
      'Ongkir dihitung dari berat dan jarak laut sebenarnya: barang curah murah (padi) paling terasa ongkirnya; pelabuhan menurunkannya.</p></div>' + goods;
  }

  // Grafik mini harga: 30 menit lalu sampai 30 menit ke depan (garis putus-putus = perkiraan).
  function sparkSvg(state, cid, now) {
    const W = 240, H = 46, PAD = 4;
    const ser = E.priceSeries(state, view.market, cid, now, 30, 30, 40);
    const base = E.normalPrice(view.market, cid);
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
        setRow('Cara bermain', 'Panduan singkat, kalender panen, dan rencana pengembangan ada di tab Info.',
          '<button class="btn" data-action="tab" data-id="about">Buka Info</button>') +
      '</div>';

    if (keep) {
      const sel = '#tab-settings [data-key="' + keep[0] + '"][data-value="' + keep[1] + '"]';
      const next = document.querySelector(sel) || document.querySelector('#tab-settings [data-key="' + keep[0] + '"]');
      if (next) next.focus();
    }
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
    $('sheet-title').textContent = D.regions[view.region].icon + ' ' + D.regions[view.region].name;
    $('sheet').classList.toggle('open', !!view.sheet);
    document.body.classList.toggle('sheet-open', !!view.sheet && view.tab === 'map');
    renderMarket(state, now);
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

    const wh = worldHtml(now);
    if (wh !== bannerCache) {
      bannerCache = wh;
      $('world-banner').innerHTML = wh;
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

    // Kartu target berikutnya dan jumlah tukang
    const goal = E.nextGoal(state);
    if (goal) {
      $('goal-ico').textContent = goal.icon;
      $('goal-title').textContent = goal.label + ' · ' + F.money(goal.cost);
      $('goal-bar').style.width = Math.min(100, state.cash / goal.cost * 100) + '%';
      const inc = E.incomePerMin(state, now);
      $('goal-eta').textContent = state.cash >= goal.cost ? '✅ Kas cukup, ayo bangun!'
        : (inc > 0 ? '≈ ' + F.duration((goal.cost - state.cash) / inc * 60000) + ' lagi jika semua hasil dijual' : '');
    } else {
      $('goal-title').textContent = 'Semua target tercapai';
    }
    const busy = (state.jobs || []).length;
    $('builders').textContent = '🔨 ' + busy + '/' + NT.config.maxBuilders;
    $('builders').classList.toggle('busy', busy >= NT.config.maxBuilders);

    // Tombol Kumpulkan berdenyut bila gudang sudah separuh penuh
    let anyReady = false;
    each('[data-action="collect"]', function (el) {
      const id = el.getAttribute('data-id');
      const ready = E.pending(state, id, now) >= Math.max(1, E.capacity(state, id, now) * 0.5);
      el.classList.toggle('ready', ready);
      anyReady = anyReady || ready;
    });
    Object.keys(state.buildings).forEach(function (id) {
      if (E.pending(state, id, now) >= Math.max(1, E.capacity(state, id, now) * 0.5)) anyReady = true;
    });
    const all = document.querySelector('.collect-all');
    if (all) all.classList.toggle('ready', anyReady);
    NT.ui.map.tickJobs(state, now);

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
    if (view.tab === 'market') {
      each('[data-live="spark"]', function (el) { el.innerHTML = sparkSvg(state, el.getAttribute('data-c'), now); });
    }
    each('[data-live="signal"]', function (el) {
      const sg = E.priceSignal(state, view.market, el.getAttribute('data-c'), now);
      el.innerHTML = sg.id === 'bagus' ? '<span class="sig good">🔥 Harga bagus</span>'
        : (sg.id === 'rendah' ? '<span class="sig low">🕳️ Harga rendah</span>' : '');
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
