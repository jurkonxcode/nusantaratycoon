/*
 * Dunia nyata: musim (bulan kalender WIB) dan peristiwa acak deterministik.
 * Semua fungsi murni terhadap `now` (ms) dan config, tanpa DOM, supaya bisa dites dan
 * nanti dipindah ke server (semua pemain melihat peristiwa yang sama).
 */
(function (NT) {
  const C = NT.config;
  const D = NT.data;
  const WIB_MS = 7 * 3600 * 1000;
  const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  /* ---------- Musim ---------- */

  // Bulan 0-11 menurut WIB (dengan geseran untuk uji).
  function monthOf(now) {
    const m = new Date(now + WIB_MS).getUTCMonth() + (C.seasonMonthShift || 0);
    return ((m % 12) + 12) % 12;
  }

  // Tabel musim dinormalkan: rata-rata setahun = 1.
  const normCache = {};
  function table(commodityId, kind) {
    const key = commodityId + ':' + kind;
    if (!normCache[key]) {
      const t = D.commodities[commodityId].season[kind];
      const mean = t.reduce(function (a, b) { return a + b; }, 0) / t.length;
      normCache[key] = t.map(function (v) { return v / mean; });
    }
    return normCache[key];
  }

  function seasonProd(commodityId, now) {
    if (!C.seasonsEnabled) return 1;
    return table(commodityId, 'prod')[monthOf(now)];
  }

  function seasonPrice(commodityId, now) {
    if (!C.seasonsEnabled) return 1;
    return table(commodityId, 'price')[monthOf(now)];
  }

  // Musim iklim Indonesia (perkiraan umum).
  function climate(now) {
    const m = monthOf(now) + 1;
    if (m === 11 || m === 12 || m <= 3) return { id: 'hujan', icon: '🌧️', name: 'Musim hujan' };
    if (m === 4 || m === 5 || m === 10) return { id: 'pancaroba', icon: '⛅', name: 'Pancaroba' };
    return { id: 'kemarau', icon: '☀️', name: 'Musim kemarau' };
  }

  // Kata singkat untuk kondisi panen komoditas bulan ini.
  function harvestTag(commodityId, now) {
    const p = seasonProd(commodityId, now);
    if (p >= 1.2) return { id: 'raya', text: 'panen raya' };
    if (p <= 0.8) return { id: 'paceklik', text: 'paceklik' };
    return null;
  }

  /* ---------- Peristiwa acak ---------- */

  // Hash bilangan bulat 32-bit -> [0,1). Deterministik.
  function rand(n, salt) {
    let h = (Math.imul(n | 0, 374761393) + Math.imul(salt | 0, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  function slotMs() { return C.eventSlotHours * 3600 * 1000; }

  function eventAtSlot(slot) {
    if (!C.eventsEnabled) return null;
    if (rand(slot, 1) >= C.eventChance) return null;
    const month = new Date(slot * slotMs() + WIB_MS).getUTCMonth() + 1;
    const eligible = D.events.filter(function (e) { return !e.months || e.months.indexOf(month) !== -1; });
    if (!eligible.length) return null;
    const total = eligible.reduce(function (a, e) { return a + e.weight; }, 0);
    let pick = rand(slot, 2) * total;
    for (let i = 0; i < eligible.length; i++) {
      pick -= eligible[i].weight;
      if (pick < 0) return eligible[i];
    }
    return eligible[eligible.length - 1];
  }

  // Peristiwa aktif saat ini (atau null), beserta jam mulai dan selesai.
  function activeEvent(now) {
    const slot = Math.floor(now / slotMs());
    const e = eventAtSlot(slot);
    if (!e) return null;
    return { event: e, startsAt: slot * slotMs(), endsAt: (slot + 1) * slotMs() };
  }

  // Pengali produksi bangunan akibat peristiwa.
  function eventProd(building, now) {
    const a = activeEvent(now);
    if (!a || !a.event.prod) return 1;
    const p = a.event.prod;
    let m = 1;
    if (p.commodity && p.commodity[building.produces] != null) m *= p.commodity[building.produces];
    if (p.region && p.region[building.region] != null) m *= p.region[building.region];
    return m;
  }

  function eventPrice(commodityId, now) {
    const a = activeEvent(now);
    if (!a || !a.event.price || a.event.price[commodityId] == null) return 1;
    return a.event.price[commodityId];
  }

  NT.world = {
    MONTHS: MONTHS,
    monthOf: monthOf,
    seasonProd: seasonProd,
    seasonPrice: seasonPrice,
    climate: climate,
    harvestTag: harvestTag,
    activeEvent: activeEvent,
    eventAtSlot: eventAtSlot,
    eventProd: eventProd,
    eventPrice: eventPrice
  };
})((window.NT = window.NT || {}));
