/*
 * Aturan ekonomi game. Semua fungsi murni terhadap `state` dan `now` (milidetik),
 * tanpa DOM. Nanti fungsi-fungsi yang mengubah data (collect, sell, upgrade, unlock)
 * bisa dipindah ke Postgres function / Edge Function di Supabase agar tidak bisa dicurangi.
 *
 * Fungsi yang mengubah data mengembalikan { ok: true, ... } atau { ok: false, reason }.
 */
(function (NT) {
  const C = NT.config;
  const D = NT.data;
  const fmt = NT.fmt;

  const fail = function (reason) { return { ok: false, reason: reason }; };

  /* ---------- Util ---------- */

  // Jarak rute laut antar hub pelabuhan (km): garis lurus (haversine) x faktor kelokan rute.
  function distanceKm(a, b) {
    if (a === b) return 0;
    const ha = D.regions[a].hub, hb = D.regions[b].hub;
    const rad = Math.PI / 180;
    const dLat = (hb.lat - ha.lat) * rad, dLon = (hb.lon - ha.lon) * rad;
    const h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(ha.lat * rad) * Math.cos(hb.lat * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 6371 * 2 * Math.asin(Math.sqrt(h)) * C.routeDetour;
  }

  function hashString(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 100000;
    return h / 100000 * Math.PI * 2;
  }

  function buildingLevel(state, id) {
    return (state.buildings[id] && state.buildings[id].level) || 0;
  }

  function infraLevel(state, regionId, infraId) {
    const r = state.regions[regionId];
    return (r && r.infra && r.infra[infraId]) || 0;
  }

  /* ---------- Produksi (dihitung dari timestamp, tetap jalan saat offline) ---------- */

  // Pengali dunia nyata (musim dan peristiwa) untuk sebuah bangunan pada waktu `now`.
  function worldProdMult(buildingId, now) {
    if (now == null) return 1;
    const b = D.buildings[buildingId];
    return NT.world.seasonProd(b.produces, now) * NT.world.eventProd(b, now);
  }

  // Unit per menit. `now` opsional: tanpa `now`, musim dan peristiwa tidak dihitung.
  function productionRate(state, buildingId, now) {
    const b = D.buildings[buildingId];
    const lvl = buildingLevel(state, buildingId);
    if (!lvl) return 0;
    const tol = infraLevel(state, b.region, 'tol');
    return b.baseRate * lvl * (1 + C.tolBonusPerLevel * tol) * worldProdMult(buildingId, now);
  }

  function capacity(state, buildingId, now) {
    return Math.floor(productionRate(state, buildingId, now) * 60 * C.storageHours);
  }

  // Hasil tertunda memakai laju saat ini untuk seluruh jendela (gudang hanya 2 jam, jadi selisihnya kecil).
  function pending(state, buildingId, now) {
    const sb = state.buildings[buildingId];
    if (!sb || !sb.level) return 0;
    const minutes = Math.max(0, (now - sb.lastCollected) / 60000);
    return Math.min(capacity(state, buildingId, now), productionRate(state, buildingId, now) * minutes);
  }

  function collect(state, buildingId, now) {
    const b = D.buildings[buildingId];
    const sb = state.buildings[buildingId];
    if (!b || !sb) return fail('Bangunan belum dibangun.');
    const p = pending(state, buildingId, now);
    const whole = Math.floor(p);
    if (whole < 1) return fail('Belum ada hasil yang bisa dikumpulkan.');

    const rate = productionRate(state, buildingId, now);
    const isFull = p >= capacity(state, buildingId, now);
    state.inventory[b.produces] = (state.inventory[b.produces] || 0) + whole;
    // Sisa pecahan tetap dihitung, kecuali gudang sudah penuh.
    sb.lastCollected = isFull ? now : now - ((p - whole) / rate) * 60000;
    return { ok: true, commodity: b.produces, amount: whole };
  }

  function collectAll(state, now) {
    const items = {};
    let total = 0;
    Object.keys(state.buildings).forEach(function (id) {
      const res = collect(state, id, now);
      if (res.ok) {
        items[res.commodity] = (items[res.commodity] || 0) + res.amount;
        total += res.amount;
      }
    });
    if (!total) return fail('Belum ada hasil yang bisa dikumpulkan.');
    return { ok: true, items: items, total: total };
  }

  function totalPendingValue(state, now) {
    let v = 0;
    Object.keys(state.buildings).forEach(function (id) {
      v += pending(state, id, now) * D.commodities[D.buildings[id].produces].basePrice;
    });
    return v;
  }

  /* ---------- Biaya dan upgrade ---------- */

  function buildingCost(buildingId, currentLevel) {
    return Math.round(D.buildings[buildingId].baseCost * Math.pow(C.upgradeGrowth, currentLevel));
  }

  function infraCost(regionId, infraId, currentLevel) {
    const f = D.regions[regionId].infraCostFactor || 1;
    return Math.round(D.infra[infraId].baseCost * f * Math.pow(C.upgradeGrowth, currentLevel));
  }

  /* ---------- Waktu pembangunan (timer) ---------- */

  function jobsOf(state) { return state.jobs || (state.jobs = []); }

  function jobFor(state, key) {
    return jobsOf(state).filter(function (j) { return j.key === key; })[0] || null;
  }

  // Makin tinggi level makin lama. Bangunan mahal dan wilayah mahal ikut lebih lama. Hasil dalam milidetik.
  function buildDuration(buildingId, level) {
    if (!C.buildTimeEnabled) return 0;
    const tier = Math.pow(D.buildings[buildingId].baseCost / 60, C.buildTierExp);
    return Math.round(C.buildBaseSec * tier * Math.pow(C.buildGrowth, level)) * 1000;
  }

  function infraDuration(regionId, level) {
    if (!C.buildTimeEnabled) return 0;
    const f = Math.pow(D.regions[regionId].infraCostFactor || 1, C.infraRegionExp);
    return Math.round(C.infraBaseSec * f * Math.pow(C.infraGrowth, level)) * 1000;
  }

  // Pindahkan hasil tertunda bangunan `ids` ke gudang pada waktu `at`, jalankan `change` (mengubah laju
  // produksi), lalu pertahankan sisa pecahan agar tidak ikut dikali laju baru secara surut.
  function rebase(state, ids, at, change) {
    const snap = ids.filter(function (id) { return state.buildings[id]; }).map(function (id) {
      const p = pending(state, id, at);
      const whole = Math.floor(p);
      const cid = D.buildings[id].produces;
      state.inventory[cid] = (state.inventory[cid] || 0) + whole;
      return { id: id, frac: p >= capacity(state, id, at) ? 0 : p - whole };
    });
    change();
    snap.forEach(function (x) {
      const rate = productionRate(state, x.id, at);
      state.buildings[x.id].lastCollected = at - (rate ? x.frac / rate * 60000 : 0);
    });
  }

  // Terapkan hasil pembangunan yang selesai pada waktu job.endsAt (aman dipanggil belakangan, mis. setelah offline).
  function applyJob(state, j) {
    if (j.kind === 'building') {
      if (!state.buildings[j.id]) {
        state.buildings[j.id] = { level: 1, lastCollected: j.endsAt };
      } else {
        rebase(state, [j.id], j.endsAt, function () { state.buildings[j.id].level = j.to; });
      }
    } else if (j.id === 'tol') {
      rebase(state, D.regions[j.region].buildings, j.endsAt, function () { state.regions[j.region].infra.tol = j.to; });
    } else {
      state.regions[j.region].infra[j.id] = j.to;
    }
  }

  // Selesaikan semua pembangunan yang waktunya habis. Mengembalikan daftar job yang selesai.
  function settle(state, now) {
    const list = jobsOf(state);
    const done = list.filter(function (j) { return j.endsAt <= now; })
      .sort(function (a, b) { return a.endsAt - b.endsAt; });
    if (!done.length) return [];
    state.jobs = list.filter(function (j) { return j.endsAt > now; });
    done.forEach(function (j) { applyJob(state, j); });
    return done;
  }

  function speedupCost(job, now) {
    const total = Math.max(1, job.endsAt - job.startedAt);
    const left = Math.max(0, job.endsAt - now);
    return Math.max(1, Math.ceil(job.cost * C.speedupCostShare * left / total));
  }

  function speedup(state, key, now) {
    const job = jobFor(state, key);
    if (!job) return fail('Pembangunan sudah selesai.');
    const cost = speedupCost(job, now);
    if (state.cash < cost) return fail('Kas belum cukup untuk mempercepat.');
    state.cash -= cost;
    job.endsAt = now;
    settle(state, now);
    return { ok: true, cost: cost, finished: job };
  }

  function builderCheck(state) {
    if (jobsOf(state).length >= C.maxBuilders) {
      return fail('Semua tukang sedang sibuk (' + C.maxBuilders + '). Tunggu salah satu selesai atau percepat.');
    }
    return null;
  }

  function upgradeBuilding(state, buildingId, now) {
    const b = D.buildings[buildingId];
    if (!b) return fail('Bangunan tidak dikenal.');
    if (!state.regions[b.region] || !state.regions[b.region].unlocked) return fail('Wilayah belum dibuka.');

    const key = 'b:' + buildingId;
    if (jobFor(state, key)) return fail('Sedang dalam pembangunan.');
    const lvl = buildingLevel(state, buildingId);
    const cost = buildingCost(buildingId, lvl);
    if (state.cash < cost) return fail('Kas belum cukup.');

    const dur = buildDuration(buildingId, lvl);
    if (dur > 0) {
      const busy = builderCheck(state);
      if (busy) return busy;
      state.cash -= cost;
      jobsOf(state).push({ key: key, kind: 'building', id: buildingId, region: b.region, from: lvl, to: lvl + 1, startedAt: now, endsAt: now + dur, cost: cost });
      return { ok: true, cost: cost, level: lvl + 1, built: lvl === 0, queued: true, durationMs: dur };
    }

    collect(state, buildingId, now); // amankan hasil sebelum laju produksi berubah
    state.cash -= cost;
    if (lvl === 0) {
      state.buildings[buildingId] = { level: 1, lastCollected: now };
    } else {
      state.buildings[buildingId].level = lvl + 1;
    }
    return { ok: true, cost: cost, level: lvl + 1, built: lvl === 0 };
  }

  function upgradeInfra(state, regionId, infraId, now) {
    const infra = D.infra[infraId];
    const rs = state.regions[regionId];
    if (!infra || !rs) return fail('Infrastruktur tidak dikenal.');
    if (!rs.unlocked) return fail('Wilayah belum dibuka.');

    const key = 'i:' + regionId + ':' + infraId;
    if (jobFor(state, key)) return fail('Sedang dalam pembangunan.');
    const lvl = infraLevel(state, regionId, infraId);
    if (lvl >= infra.maxLevel) return fail('Sudah level maksimum.');
    const cost = infraCost(regionId, infraId, lvl);
    if (state.cash < cost) return fail('Kas belum cukup.');

    const dur = infraDuration(regionId, lvl);
    if (dur > 0) {
      const busy = builderCheck(state);
      if (busy) return busy;
      state.cash -= cost;
      jobsOf(state).push({ key: key, kind: 'infra', id: infraId, region: regionId, from: lvl, to: lvl + 1, startedAt: now, endsAt: now + dur, cost: cost });
      return { ok: true, cost: cost, level: lvl + 1, queued: true, durationMs: dur };
    }

    // Tol mengubah laju produksi, jadi amankan hasil semua bangunan di wilayah ini dulu.
    if (infraId === 'tol') {
      D.regions[regionId].buildings.forEach(function (bid) { collect(state, bid, now); });
    }
    state.cash -= cost;
    rs.infra[infraId] = lvl + 1;
    return { ok: true, cost: cost, level: lvl + 1 };
  }

  // Perkiraan pemasukan per menit (nilai dasar semua hasil produksi, belum dikurangi ongkir).
  function incomePerMin(state, now) {
    let v = 0;
    Object.keys(state.buildings).forEach(function (id) {
      v += productionRate(state, id, now) * D.commodities[D.buildings[id].produces].basePrice;
    });
    return v;
  }

  // Target termurah berikutnya, supaya pemain selalu punya tujuan dekat.
  function nextGoal(state) {
    let best = null;
    function consider(cost, label, icon) { if (!best || cost < best.cost) best = { cost: cost, label: label, icon: icon }; }
    Object.keys(D.regions).forEach(function (rid) {
      const r = D.regions[rid], rs = state.regions[rid];
      if (!rs || r.comingSoon) return;
      if (!rs.unlocked) { consider(r.unlockCost, 'Buka ' + r.name, '🔓'); return; }
      r.buildings.forEach(function (bid) {
        if (jobFor(state, 'b:' + bid)) return;
        const lvl = buildingLevel(state, bid);
        consider(buildingCost(bid, lvl), (lvl ? 'Naikkan ' : 'Bangun ') + D.buildings[bid].name + (lvl ? ' ke Lv ' + (lvl + 1) : ''), D.buildings[bid].icon);
      });
      Object.keys(D.infra).forEach(function (iid) {
        if (jobFor(state, 'i:' + rid + ':' + iid)) return;
        const lvl = infraLevel(state, rid, iid);
        if (lvl >= D.infra[iid].maxLevel) return;
        consider(infraCost(rid, iid, lvl), D.infra[iid].name + ' ' + r.name + ' Lv ' + (lvl + 1), D.infra[iid].icon);
      });
    });
    return best;
  }

  function unlockRegion(state, regionId) {
    const r = D.regions[regionId];
    const rs = state.regions[regionId];
    if (!r || !rs || r.comingSoon) return fail('Wilayah ini belum tersedia.');
    if (rs.unlocked) return fail('Wilayah sudah terbuka.');
    if (state.cash < r.unlockCost) return fail('Kas belum cukup.');
    state.cash -= r.unlockCost;
    rs.unlocked = true;
    return { ok: true, cost: r.unlockCost };
  }

  /* ---------- Pasar ---------- */

  // Tekanan pasokan: naik saat pemain menjual, meluruh seiring waktu.
  function marketStock(state, regionId, commodityId, now) {
    const m = state.market[regionId] && state.market[regionId][commodityId];
    if (!m) return 0;
    const minutes = Math.max(0, (now - m.updatedAt) / 60000);
    return m.stock * Math.exp(-C.marketDecayPerMin * minutes);
  }

  function wave(regionId, commodityId, now) {
    return 1 + C.priceWaveAmplitude * Math.sin(now / (7 * 60000) + hashString(regionId + commodityId));
  }

  // Pengali musim dan peristiwa terhadap harga komoditas (sama di semua pasar).
  function worldPriceMult(commodityId, now) {
    return NT.world.seasonPrice(commodityId, now) * NT.world.eventPrice(commodityId, now);
  }

  // Harga normal (tanpa fluktuasi dan tanpa tekanan pasokan).
  function normalPrice(regionId, commodityId) {
    const demand = (D.regions[regionId].demand && D.regions[regionId].demand[commodityId]) || 1;
    return D.commodities[commodityId].basePrice * demand;
  }

  function unitPrice(regionId, commodityId, stock, now) {
    const depth = D.commodities[commodityId].marketDepth;
    const pressure = stock / (stock + depth);
    return normalPrice(regionId, commodityId) * wave(regionId, commodityId, now) *
      worldPriceMult(commodityId, now) * (1 - C.maxMarketDrop * pressure);
  }

  function currentPrice(state, regionId, commodityId, now) {
    return unitPrice(regionId, commodityId, marketStock(state, regionId, commodityId, now), now);
  }

  // Ongkir per unit dari wilayah asal komoditas ke pasar tujuan:
  // bobot (kg) x jarak (km) x tarif kapal, lalu dikecilkan oleh pelabuhan. Barang curah murah (padi)
  // jadi paling terasa ongkirnya; barang bernilai tinggi (cengkeh, batik) hampir tidak.
  function shippingPerUnit(state, commodityId, marketId) {
    const c = D.commodities[commodityId];
    const km = distanceKm(c.region, marketId);
    if (!km) return 0;
    const ports = infraLevel(state, c.region, 'pelabuhan') + infraLevel(state, marketId, 'pelabuhan');
    const discount = Math.min(C.maxShippingDiscount, ports * C.portDiscountPerLevel);
    const realRp = c.unitKg * km * C.seaFreightRpPerKgKm;
    return realRp / C.priceScale * (1 - discount);
  }

  // Harga bersih per unit saat ini (harga pasar dikurangi ongkir).
  function netUnitPrice(state, commodityId, marketId, now) {
    return currentPrice(state, marketId, commodityId, now) - shippingPerUnit(state, commodityId, marketId);
  }

  function quoteSale(state, commodityId, marketId, qty, now) {
    let stock = marketStock(state, marketId, commodityId, now);
    let revenue = 0;
    for (let i = 0; i < qty; i++) {
      revenue += unitPrice(marketId, commodityId, stock, now);
      stock += 1;
    }
    const shipping = shippingPerUnit(state, commodityId, marketId) * qty;
    return { qty: qty, revenue: revenue, shipping: shipping, net: revenue - shipping };
  }

  function sell(state, commodityId, marketId, qty, now) {
    qty = Math.floor(qty);
    const ms = state.regions[marketId];
    if (!D.commodities[commodityId] || !ms) return fail('Pasar tidak dikenal.');
    if (!ms.unlocked) return fail('Buka wilayah ini dulu untuk berdagang di sana.');
    if (qty < 1) return fail('Tidak ada barang untuk dijual.');
    if ((state.inventory[commodityId] || 0) < qty) return fail('Stok di gudang tidak cukup.');

    const q = quoteSale(state, commodityId, marketId, qty, now);
    if (q.net <= 0) return fail('Harga terlalu rendah, penjualan akan rugi. Coba pasar lain.');

    const stock = marketStock(state, marketId, commodityId, now);
    state.market[marketId][commodityId] = { stock: stock + qty, updatedAt: now };
    state.inventory[commodityId] -= qty;
    state.cash += q.net;
    state.totalEarned += q.net;
    return { ok: true, qty: qty, revenue: q.revenue, shipping: q.shipping, net: q.net };
  }

  // Jual SEMUA isi gudang
  // ke satu pasar sekaligus. Komoditas yang akan rugi dilewati (dicatat di skipped).
  function sellAll(state, marketId, now) {
    const ms = state.regions[marketId];
    if (!ms) return fail('Pasar tidak dikenal.');
    if (!ms.unlocked) return fail('Buka wilayah ini dulu untuk berdagang di sana.');
    const items = [], skipped = [];
    let net = 0, qty = 0;
    Object.keys(D.commodities).forEach(function (cid) {
      const have = Math.floor(state.inventory[cid] || 0);
      if (have < 1) return;
      const r = sell(state, cid, marketId, have, now);
      if (r.ok) { items.push({ commodity: cid, qty: r.qty, net: r.net }); net += r.net; qty += r.qty; }
      else skipped.push(cid);
    });
    if (!items.length) {
      return fail(skipped.length ? 'Harga di pasar ini terlalu rendah, semua penjualan akan rugi. Coba pasar lain.'
        : 'Gudang kosong, tidak ada yang bisa dijual.');
    }
    return { ok: true, items: items, skipped: skipped, net: net, qty: qty };
  }

  // Perkiraan hasil bersih bila seluruh gudang dijual ke satu pasar (tanpa mengubah state).
  function quoteSellAll(state, marketId, now) {
    let net = 0, qty = 0;
    Object.keys(D.commodities).forEach(function (cid) {
      const have = Math.floor(state.inventory[cid] || 0);
      if (have < 1) return;
      const q = quoteSale(state, cid, marketId, have, now);
      if (q.net > 0) { net += q.net; qty += have; }
    });
    return { net: net, qty: qty };
  }

  // Deret harga untuk grafik mini: dari backMin menit lalu sampai fwdMin menit ke depan.
  // Memakai rumus harga yang sama dengan pasar (gelombang, musim, peristiwa, tekanan jual yang meluruh).
  function priceSeries(state, marketId, commodityId, now, backMin, fwdMin, steps) {
    const out = [];
    const span = (backMin + fwdMin) * 60000;
    for (let i = 0; i <= steps; i++) {
      const t = now - backMin * 60000 + span * i / steps;
      out.push({ t: t, price: unitPrice(marketId, commodityId, marketStock(state, marketId, commodityId, t), t) });
    }
    return out;
  }

  // Isyarat harga: bagus (>= 8% di atas normal), rendah (<= 8% di bawah), atau normal.
  // peakInMin = menit sampai puncak dalam 30 menit ke depan bila lebih tinggi >= 5% dari sekarang.
  function priceSignal(state, marketId, commodityId, now) {
    const cur = currentPrice(state, marketId, commodityId, now);
    const ratio = cur / normalPrice(marketId, commodityId);
    const id = ratio >= 1.08 ? 'bagus' : (ratio <= 0.92 ? 'rendah' : 'normal');
    let peakInMin = null, peak = cur;
    priceSeries(state, marketId, commodityId, now, 0, 30, 30).forEach(function (p) {
      if (p.price > peak) { peak = p.price; peakInMin = Math.round((p.t - now) / 60000); }
    });
    if (peakInMin !== null && peak < cur * 1.05) peakInMin = null;
    return { id: id, ratio: ratio, price: cur, peakInMin: peakInMin, peakPrice: peak };
  }

  // Pasar terbuka dengan harga bersih per unit tertinggi untuk komoditas ini.
  function bestMarket(state, commodityId, now) {
    let best = null;
    Object.keys(state.regions).forEach(function (rid) {
      if (!state.regions[rid].unlocked) return;
      const p = netUnitPrice(state, commodityId, rid, now);
      if (!best || p > best.price) best = { regionId: rid, price: p };
    });
    return best;
  }

  /* ---------- Skor peradaban ---------- */

  function score(state) {
    let s = 0;
    Object.keys(state.buildings).forEach(function (id) { s += state.buildings[id].level * 10; });
    Object.keys(state.regions).forEach(function (rid) {
      const r = state.regions[rid];
      if (r.unlocked && !D.regions[rid].start) s += 100;
      s += ((r.infra.tol || 0) + (r.infra.pelabuhan || 0)) * 25;
    });
    s += Math.floor(state.totalEarned / 1000);
    return s;
  }

  function rank(scoreValue) {
    let current = D.ranks[0];
    let next = null;
    for (let i = 0; i < D.ranks.length; i++) {
      if (scoreValue >= D.ranks[i].min) { current = D.ranks[i]; next = D.ranks[i + 1] || null; }
    }
    return { current: current, next: next };
  }

  NT.economy = {
    distanceKm: distanceKm,
    worldProdMult: worldProdMult,
    worldPriceMult: worldPriceMult,
    buildingLevel: buildingLevel,
    infraLevel: infraLevel,
    productionRate: productionRate,
    capacity: capacity,
    pending: pending,
    collect: collect,
    collectAll: collectAll,
    totalPendingValue: totalPendingValue,
    buildingCost: buildingCost,
    infraCost: infraCost,
    jobFor: jobFor,
    buildDuration: buildDuration,
    infraDuration: infraDuration,
    settle: settle,
    speedup: speedup,
    speedupCost: speedupCost,
    incomePerMin: incomePerMin,
    nextGoal: nextGoal,
    upgradeBuilding: upgradeBuilding,
    upgradeInfra: upgradeInfra,
    unlockRegion: unlockRegion,
    marketStock: marketStock,
    normalPrice: normalPrice,
    currentPrice: currentPrice,
    shippingPerUnit: shippingPerUnit,
    netUnitPrice: netUnitPrice,
    quoteSale: quoteSale,
    sell: sell,
    sellAll: sellAll,
    quoteSellAll: quoteSellAll,
    priceSeries: priceSeries,
    priceSignal: priceSignal,
    bestMarket: bestMarket,
    score: score,
    rank: rank,
    _fmt: fmt
  };
})((window.NT = window.NT || {}));
