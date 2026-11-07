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

  function distance(a, b) {
    if (a === b) return 0;
    const key = [a, b].sort().join('|');
    return D.distance[key] != null ? D.distance[key] : 5;
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

  function productionRate(state, buildingId) {
    const b = D.buildings[buildingId];
    const lvl = buildingLevel(state, buildingId);
    if (!lvl) return 0;
    const tol = infraLevel(state, b.region, 'tol');
    return b.baseRate * lvl * (1 + C.tolBonusPerLevel * tol); // unit per menit
  }

  function capacity(state, buildingId) {
    return Math.floor(productionRate(state, buildingId) * 60 * C.storageHours);
  }

  function pending(state, buildingId, now) {
    const sb = state.buildings[buildingId];
    if (!sb || !sb.level) return 0;
    const minutes = Math.max(0, (now - sb.lastCollected) / 60000);
    return Math.min(capacity(state, buildingId), productionRate(state, buildingId) * minutes);
  }

  function collect(state, buildingId, now) {
    const b = D.buildings[buildingId];
    const sb = state.buildings[buildingId];
    if (!b || !sb) return fail('Bangunan belum dibangun.');
    const p = pending(state, buildingId, now);
    const whole = Math.floor(p);
    if (whole < 1) return fail('Belum ada hasil yang bisa dikumpulkan.');

    const rate = productionRate(state, buildingId);
    const isFull = p >= capacity(state, buildingId);
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

  function upgradeBuilding(state, buildingId, now) {
    const b = D.buildings[buildingId];
    if (!b) return fail('Bangunan tidak dikenal.');
    if (!state.regions[b.region] || !state.regions[b.region].unlocked) return fail('Wilayah belum dibuka.');

    const lvl = buildingLevel(state, buildingId);
    const cost = buildingCost(buildingId, lvl);
    if (state.cash < cost) return fail('Kas belum cukup.');

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

    const lvl = infraLevel(state, regionId, infraId);
    if (lvl >= infra.maxLevel) return fail('Sudah level maksimum.');
    const cost = infraCost(regionId, infraId, lvl);
    if (state.cash < cost) return fail('Kas belum cukup.');

    // Tol mengubah laju produksi, jadi amankan hasil semua bangunan di wilayah ini dulu.
    if (infraId === 'tol') {
      D.regions[regionId].buildings.forEach(function (bid) { collect(state, bid, now); });
    }
    state.cash -= cost;
    rs.infra[infraId] = lvl + 1;
    return { ok: true, cost: cost, level: lvl + 1 };
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

  // Harga normal (tanpa fluktuasi dan tanpa tekanan pasokan).
  function normalPrice(regionId, commodityId) {
    const demand = (D.regions[regionId].demand && D.regions[regionId].demand[commodityId]) || 1;
    return D.commodities[commodityId].basePrice * demand;
  }

  function unitPrice(regionId, commodityId, stock, now) {
    const depth = D.commodities[commodityId].marketDepth;
    const pressure = stock / (stock + depth);
    return normalPrice(regionId, commodityId) * wave(regionId, commodityId, now) * (1 - C.maxMarketDrop * pressure);
  }

  function currentPrice(state, regionId, commodityId, now) {
    return unitPrice(regionId, commodityId, marketStock(state, regionId, commodityId, now), now);
  }

  // Ongkir per unit dari wilayah asal komoditas ke pasar tujuan.
  function shippingPerUnit(state, commodityId, marketId) {
    const from = D.commodities[commodityId].region;
    const d = distance(from, marketId);
    if (!d) return 0;
    const ports = infraLevel(state, from, 'pelabuhan') + infraLevel(state, marketId, 'pelabuhan');
    const discount = Math.min(C.maxShippingDiscount, ports * C.portDiscountPerLevel);
    return D.commodities[commodityId].basePrice * C.shippingRate * d * (1 - discount);
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
    distance: distance,
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
    bestMarket: bestMarket,
    score: score,
    rank: rank,
    _fmt: fmt
  };
})((window.NT = window.NT || {}));
