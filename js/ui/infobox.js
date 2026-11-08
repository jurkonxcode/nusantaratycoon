/*
 * Jendela info yang muncul saat panel Kas atau Penduduk di header diketuk.
 * Isinya dihitung dari logika game yang sama (produksi, pajak, kesejahteraan, kebutuhan), bukan teks tetap.
 * Hanya baca state; tidak mengubah apa pun.
 */
(function (NT) {
  NT.ui = NT.ui || {};
  const D = NT.data;
  const E = NT.economy;
  const F = NT.fmt;
  let open = null;   // { el, prevFocus, onKey }

  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function unlockedRegions(state) {
    return Object.keys(D.regions).filter(function (rid) {
      return !D.regions[rid].comingSoon && state.regions[rid] && state.regions[rid].unlocked;
    });
  }

  function bar(v, cls) {
    return '<span class="bar mini ' + (cls || '') + '"><i style="width:' + Math.round(Math.max(0, Math.min(1, v)) * 100) + '%"></i></span>';
  }

  function row(label, value, sub) {
    return '<li><span class="wb-name">' + label + (sub ? '<small class="muted ib-sub">' + sub + '</small>' : '') + '</span><b>' + value + '</b></li>';
  }

  /* ---------- Data turunan dari logika game ---------- */

  function production(state, now) {
    const rows = [];
    let total = 0;
    Object.keys(state.buildings).forEach(function (bid) {
      const sb = state.buildings[bid];
      if (!sb || !sb.level) return;
      const b = D.buildings[bid], c = D.commodities[b.produces];
      const rate = E.productionRate(state, bid, now);
      const value = rate * c.basePrice;
      total += value;
      rows.push({ b: b, c: c, level: sb.level, rate: rate, value: value, labor: NT.population ? NT.population.laborFactor(state, b.region) : 1 });
    });
    rows.sort(function (a, b) { return b.value - a.value; });
    return { rows: rows, total: total };
  }

  function taxRows(state) {
    const rows = [];
    let total = 0;
    unlockedRegions(state).forEach(function (rid) {
      const i = NT.population.info(state, rid);
      if (!i) return;
      rows.push({ rid: rid, tax: i.taxPerMin, info: i });
      total += i.taxPerMin;
    });
    rows.sort(function (a, b) { return b.tax - a.tax; });
    return { rows: rows, total: total };
  }

  // Hasil yang sudah diproduksi tetapi belum dikumpulkan, dan nilai dasarnya.
  function pendingValue(state, now) {
    let v = 0, full = 0;
    Object.keys(state.buildings).forEach(function (bid) {
      const sb = state.buildings[bid];
      if (!sb || !sb.level) return;
      const p = E.pending(state, bid, now);
      v += p * D.commodities[D.buildings[bid].produces].basePrice;
      if (p >= E.capacity(state, bid, now) - 0.001) full++;
    });
    return { value: v, full: full };
  }

  // Isi gudang bila dijual di pasar terbaik (per pasar, ambil yang terbesar).
  function stockValue(state, now) {
    let best = null;
    unlockedRegions(state).forEach(function (rid) {
      const q = E.quoteSellAll(state, rid, now);
      if (q.qty > 0 && (!best || q.net > best.net)) best = { rid: rid, net: q.net, qty: q.qty };
    });
    return best;
  }

  function shippingValue(state) {
    let v = 0;
    (state.shipments || []).forEach(function (x) { v += x.net || 0; });
    return { value: v, count: (state.shipments || []).length };
  }

  /* ---------- Isi jendela Kas ---------- */

  function cashBody(state, now) {
    const pr = production(state, now);
    const tx = taxRows(state);
    const income = pr.total + tx.total;
    const pend = pendingValue(state, now);
    const stock = stockValue(state, now);
    const ship = shippingValue(state);
    const goal = E.nextGoal(state);
    const st = state.stats || {};
    let html = '';

    html += '<div class="ib-hero"><small>Kas sekarang</small><b>' + F.money(state.cash) + '</b>' +
      '<span class="ib-hero-sub">≈ +' + F.money(income) + ' per menit · ≈ +' + F.money(income * 60) + ' per jam</span></div>';

    // Dari mana pemasukan berasal
    html += '<h3>Sumber pemasukan per menit</h3><ul class="wb-list ib-list">';
    if (pr.rows.length) {
      pr.rows.forEach(function (r) {
        const lab = r.labor < 0.999 ? ' · pekerja ' + Math.round(r.labor * 100) + '%' : '';
        html += row((NT.ui.art.sprite(r.b.id, 'sm') || r.b.icon) + ' ' + esc(r.b.name) + ' Lv ' + r.level,
          '+' + F.money(r.value), F.num(r.rate, 1) + ' ' + esc(r.c.name) + '/mnt × ' + F.price(r.c.basePrice) + lab);
      });
    } else {
      html += '<li><span class="wb-name muted">Belum ada bangunan penghasil.</span></li>';
    }
    html += '</ul>';
    html += '<p class="muted small">Nilai produksi memakai harga dasar. Uangnya baru masuk saat hasil dikumpulkan lalu dijual; harga asli bisa lebih tinggi atau rendah, dikurangi ongkir, dan turun bila menjual terlalu banyak sekaligus.</p>';

    html += '<h3>Pajak penduduk per menit</h3><ul class="wb-list ib-list">';
    if (tx.rows.length) {
      tx.rows.forEach(function (r) {
        html += row('👥 ' + esc(D.regions[r.rid].name), '+' + F.money(r.tax),
          F.num(r.info.millions, r.info.millions < 20 ? 1 : 0) + ' jt jiwa × kesejahteraan ' + Math.round(r.info.welfare) + '%');
      });
    } else {
      html += '<li><span class="wb-name muted">Belum ada wilayah berpenduduk.</span></li>';
    }
    html += '</ul>';
    html += '<p class="muted small">Pajak masuk otomatis ke kas, tanpa perlu menjual. Makin banyak penduduk dan makin sejahtera, makin besar.</p>';

    // Uang yang sedang "menggantung"
    html += '<h3>Uang yang belum masuk kas</h3><ul class="wb-list ib-list">' +
      row('📦 Hasil belum dikumpulkan', '≈ ' + F.money(pend.value), pend.full ? pend.full + ' gudang sudah penuh, produksinya berhenti' : 'nilai dasar') +
      row('🏪 Isi gudang siap jual', stock ? '≈ ' + F.money(stock.net) : 'Rp 0', stock ? 'bersih, jika dijual di ' + esc(D.regions[stock.rid].name) : 'gudang kosong') +
      row('⛴️ Kiriman di perjalanan', ship.count ? F.money(ship.value) : 'Rp 0', ship.count ? ship.count + ' kiriman, cair saat tiba' : 'tidak ada kiriman') +
      '</ul>';

    // Tujuan berikutnya
    if (goal) {
      const wait = state.cash >= goal.cost ? 'Kas sudah cukup, ayo bangun!'
        : (income > 0 ? '≈ ' + F.duration((goal.cost - state.cash) / income * 60000) + ' lagi dari pemasukan saja' : 'Belum ada pemasukan');
      html += '<h3>Target berikutnya</h3><ul class="wb-list ib-list">' +
        row(goal.icon + ' ' + esc(goal.label), F.money(goal.cost), wait) + '</ul>';
    }

    // Catatan sepanjang permainan
    html += '<h3>Catatan sepanjang permainan</h3><ul class="wb-list ib-list">' +
      row('💰 Total pendapatan dagang', F.money(state.totalEarned || 0)) +
      row('🏛️ Total pajak terkumpul', F.money(st.tax || 0)) +
      row('💎 Penjualan terbesar', F.money(st.bestSale || 0)) + '</ul>';

    // Saran dari kondisi nyata
    const tips = [];
    if (pend.full) tips.push('Ada gudang yang penuh. Kumpulkan hasilnya supaya produksi jalan lagi.');
    if (stock && stock.net > Math.max(1, state.cash) * 0.5) tips.push('Isi gudangmu bernilai besar dibanding kas. Jual dulu, lalu belanja upgrade.');
    if (tx.total > 0 && pr.total > 0 && tx.total < pr.total * 0.1) tips.push('Pajak masih kecil. Penuhi pangan, sandang, dan energi supaya penduduk makin sejahtera.');
    if (!tips.length) tips.push('Kondisi kas sehat. Sebar penjualan ke beberapa pasar agar harga tidak jatuh.');
    html += '<h3>Saran</h3><ul class="plain ib-tips">' + tips.map(function (t) { return '<li>💡 ' + t + '</li>'; }).join('') + '</ul>';
    return html;
  }

  /* ---------- Isi jendela Penduduk ---------- */

  function popBody(state, now) {
    const P = NT.population;
    const regs = unlockedRegions(state);
    let totalM = 0, totalIdx = 0, wSum = 0, tax = 0, n = 0;
    const infos = regs.map(function (rid) {
      const i = P.info(state, rid);
      if (!i) return null;
      totalM += i.millions; totalIdx += i.pop; wSum += i.welfare * i.pop; tax += i.taxPerMin; n++;
      return { rid: rid, i: i };
    }).filter(Boolean);
    const avgW = totalIdx > 0 ? wSum / totalIdx : 0;
    let html = '';

    html += '<div class="ib-hero"><small>Total penduduk</small><b>≈ ' + F.num(totalM, totalM < 20 ? 1 : 0) + ' juta jiwa</b>' +
      '<span class="ib-hero-sub">kesejahteraan rata-rata ' + Math.round(avgW) + ' · pajak ≈ +' + F.money(tax) + '/mnt</span></div>';

    html += '<p class="muted small">Penduduk tumbuh bila kesejahteraan di atas 50 dan menyusut bila di bawahnya. Kesejahteraan datang dari pangan (50%), sandang (25%), dan energi (25%) yang tercukupi, ditambah bonus tol dan pelabuhan. Pertumbuhan dibatasi daya tampung (Perumahan).</p>';

    infos.forEach(function (x) {
      const i = x.i, r = D.regions[x.rid];
      const perHour = (i.trend * 100);
      const full = i.pop >= i.cap - 1e-6 && i.trend > 0;
      let trend;
      if (full) trend = 'penuh, naikkan Perumahan';
      else if (i.trend > 0.0005) {
        const eta = Math.log(i.cap / i.pop) / Math.log(1 + i.trend);
        trend = '▲ +' + F.num(perHour, 1) + '%/jam · penuh dalam ≈ ' + F.duration(eta * 3600000);
      } else if (i.trend < -0.0005) trend = '▼ ' + F.num(perHour, 1) + '%/jam' + (i.pop <= i.floor + 1e-6 ? ' (sudah di batas bawah)' : '');
      else trend = 'stabil';

      const needs = P.CATS.map(function (c) {
        const lbl = { pangan: '🍚 Pangan', sandang: '👘 Sandang', energi: '⚡ Energi' }[c];
        return '<div class="pop-need"><span>' + lbl + '</span>' + bar(i.sat[c], i.sat[c] < 0.5 ? 'low' : '') + '<b>' + Math.round(i.sat[c] * 100) + '%</b></div>';
      }).join('');

      const hint = i.worst && NT.ui.panels && NT.ui.panels.needHint
        ? '<p class="muted small">Yang paling kurang: ' + { pangan: 'pangan', sandang: 'sandang', energi: 'energi' }[i.worst] + '. ' + NT.ui.panels.needHint(x.rid, i.worst) + '</p>' : '';
      const labor = i.labor < 0.999
        ? '<p class="pop-warn">👷 Kekurangan pekerja: produksi ' + Math.round(i.labor * 100) + '% (butuh ' + F.num(i.workersNeed, 1) + ', ada ' + F.num(i.workersHave, 1) + ').</p>'
        : '<p class="muted small">👷 Pekerja cukup (' + F.num(i.workersHave, 1) + ' tersedia, ' + F.num(i.workersNeed, 1) + ' dipakai).</p>';

      html += '<div class="ib-region">' +
        '<div class="pop-top"><b>' + ((r.artIcon && NT.ui.art.comm(r.artIcon, 'sm')) || r.icon) + ' ' + esc(r.name) + ' · ' + F.num(i.millions, i.millions < 20 ? 1 : 0) + ' jt jiwa</b></div>' +
        '<small class="muted">indeks ' + F.num(i.pop, 2) + ' dari daya tampung ' + F.num(i.cap, 2) + ' · ' + trend + '</small>' +
        '<div class="pop-need"><span>😊 Kesejahteraan</span>' + bar(i.welfare / 100, i.welfare < 40 ? 'low' : '') + '<b>' + Math.round(i.welfare) + '</b></div>' +
        needs + labor + hint +
        '<p class="muted small">Pajak ≈ +' + F.money(i.taxPerMin) + '/mnt · harga jual di pasar ×' + F.num(i.priceMult, 2) + ' · kedalaman pasar ×' + F.num(i.depthMult, 2) + '</p>' +
        '</div>';
    });

    if (!infos.length) html += '<p class="muted">Belum ada wilayah berpenduduk.</p>';
    html += '<p class="muted small">Jumlah jiwa nyata hanya perkiraan kasar untuk game.</p>';
    return html;
  }

  /* ---------- Buka dan tutup ---------- */

  function close() {
    if (!open) return;
    document.removeEventListener('keydown', open.onKey);
    if (open.el.parentNode) open.el.parentNode.removeChild(open.el);
    if (open.prevFocus && open.prevFocus.focus) open.prevFocus.focus();
    open = null;
  }

  function show(kind, state, now) {
    close();
    const cash = kind === 'cash';
    const el = document.createElement('div');
    el.className = 'modal-backdrop';
    el.innerHTML = '<div class="modal ib-modal" role="dialog" aria-modal="true" aria-labelledby="ib-title">' +
      '<button class="ib-x" data-close aria-label="Tutup">✕</button>' +
      '<h2 id="ib-title">' + (cash ? '💰 Keuangan' : '👥 Penduduk') + '</h2>' +
      (cash ? cashBody(state, now) : popBody(state, now)) +
      '<div class="modal-actions"><button class="btn wide" data-close>Tutup</button></div></div>';
    document.body.appendChild(el);
    const onKey = function (e) { if (e.key === 'Escape') close(); };
    open = { el: el, prevFocus: document.activeElement, onKey: onKey };
    document.addEventListener('keydown', onKey);
    el.addEventListener('click', function (e) {
      if (e.target === el || e.target.closest('[data-close]')) close();
    });
    const btn = el.querySelector('.modal-actions .btn');
    if (btn) btn.focus();
    return true;
  }

  NT.ui.infobox = { show: show, close: close };
})((window.NT = window.NT || {}));
