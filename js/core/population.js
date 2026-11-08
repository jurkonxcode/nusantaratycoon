/*
 * Populasi (Fase 3). Fungsi murni terhadap `state` dan `now`, tanpa DOM; dites di Node.
 *
 * Model sederhana (sesuai HANDOFF-LANJUTAN bagian 3.5, "alternatif sederhana"):
 *  - Kebutuhan (pangan, sandang, energi) TIDAK menguras gudang pemain. Pasokan sebuah wilayah dihitung dari laju produksi
 *    bangunan penghasil komoditas kebutuhan itu: di wilayah sendiri penuh, dari wilayah lain dikali daya jangkau pelabuhan.
 *  - Kepuasan tiap kategori = min(1, pasokan / kebutuhan), kebutuhan = penduduk x konstanta per kategori.
 *  - Kesejahteraan = 100 x jumlah(bobot x kepuasan) x bonus fasilitas (tol + pelabuhan), maksimum 100.
 *  - Penduduk tumbuh/turun menurut kesejahteraan, dibatasi daya tampung (Perumahan) dan lantai.
 *  - Pekerja membatasi produksi (lantai 50%); penduduk menaikkan harga dan kedalaman pasar; penduduk membayar pajak per menit.
 *  Semua dihitung dari timestamp seperti produksi, jadi tetap jalan saat offline.
 *
 * Bergantung pada NT.economy hanya lewat NT.economy.productionRate (dipanggil saat runtime, bukan saat dimuat).
 */
(function (NT) {
  const D = NT.data;
  const C = NT.config;
  const CATS = ['pangan', 'sandang', 'energi'];

  function P() { return C.population; }
  function enabled() { return !!(P() && P().enabled); }
  function entry(state, rid) { return (state.population && state.population[rid]) || null; }
  function startOf(rid) { return D.regions[rid].population.start; }

  function level(state, rid, infraId) {
    const r = state.regions[rid];
    return (r && r.infra && r.infra[infraId]) || 0;
  }

  function needsOf(rid) { return D.regions[rid].needs || D.popNeeds; }

  /* ---------- Batas dan angka tampilan ---------- */

  function housingCap(state, rid) {
    return startOf(rid) * (P().housingBase + P().housingPerLevel * level(state, rid, 'perumahan'));
  }

  function floorPop(rid) { return startOf(rid) * P().floorShare; }

  // Perkiraan jumlah jiwa nyata (juta) untuk tampilan. Angka kasar untuk keperluan game.
  function millions(pop) { return pop * P().realMillionPerIndex; }

  /* ---------- Pekerja ---------- */

  function workersNeeded(state, rid) {
    let n = 0;
    D.regions[rid].buildings.forEach(function (bid) {
      n += ((state.buildings[bid] && state.buildings[bid].level) || 0) * P().workersPerLevel;
    });
    return n;
  }

  function workersAvailable(state, rid, pop) {
    const e = entry(state, rid);
    return (pop != null ? pop : (e ? e.pop : 0)) * P().workersPerPop;
  }

  // Pengali produksi 0,5..1 untuk bangunan di wilayah ini. 1 bila fitur mati atau data populasi tidak ada.
  function laborFactor(state, rid) {
    if (!enabled() || !D.regions[rid] || !D.regions[rid].population) return 1;
    const e = entry(state, rid);
    if (!e) return 1;
    const need = workersNeeded(state, rid);
    if (need <= 0) return 1;
    return Math.max(P().laborFloor, Math.min(1, workersAvailable(state, rid, e.pop) / need));
  }

  /* ---------- Kebutuhan dan kesejahteraan ---------- */

  // Seberapa jauh barang dari wilayah `src` menjangkau wilayah `dst` (0..1).
  function reach(state, src, dst) {
    if (src === dst) return 1;
    const ports = level(state, src, 'pelabuhan') + level(state, dst, 'pelabuhan');
    return Math.min(1, P().portLinkBase + P().portLinkPerLevel * ports);
  }

  // Pasokan kategori `cat` untuk wilayah `rid` (satuan per menit): laju produksi (tanpa musim) x bobot x jangkauan.
  function supply(state, rid, cat) {
    const needs = needsOf(rid)[cat] || {};
    const E = NT.economy;
    let total = 0;
    Object.keys(D.buildings).forEach(function (bid) {
      const b = D.buildings[bid];
      const w = needs[b.produces];
      if (!w || !state.buildings[bid] || !state.regions[b.region] || !state.regions[b.region].unlocked) return;
      total += E.productionRate(state, bid) * w * reach(state, b.region, rid);
    });
    return total;
  }

  function demand(rid, cat, pop) { return pop * P().demandPerPop[cat]; }

  // Kepuasan 0..1 tiap kategori pada penduduk `pop` (bawaan: penduduk sekarang).
  function satisfaction(state, rid, pop) {
    const e = entry(state, rid);
    const n = pop != null ? pop : (e ? e.pop : 0);
    const out = {};
    CATS.forEach(function (cat) {
      const d = demand(rid, cat, n);
      const sup = supply(state, rid, cat);
      const raw = d > 0 ? sup / d : 1;
      out[cat] = Math.max(0, Math.min(1, raw + (P().subsistence[cat] || 0)));
    });
    return out;
  }

  function facilityBonus(state, rid) {
    const lv = level(state, rid, 'tol') + level(state, rid, 'pelabuhan');
    return 1 + Math.min(P().facilityBonusMax, P().facilityBonus * lv);
  }

  function welfareFrom(sat, state, rid) {
    let w = 0;
    CATS.forEach(function (cat) { w += P().catWeight[cat] * sat[cat]; });
    return Math.max(0, Math.min(100, 100 * w * facilityBonus(state, rid)));
  }

  /* ---------- Pengaruh ke pasar ---------- */

  function active(state, rid) { return enabled() && !!entry(state, rid) && !!(state.regions[rid] && state.regions[rid].unlocked); }

  // Pengali harga jual di pasar wilayah: (penduduk / penduduk awal)^0,35. Awal = 1, jadi tidak mengubah keseimbangan awal.
  function priceMult(state, rid) {
    if (!state || !entry(state, rid) || !enabled()) return 1;
    return Math.pow(entry(state, rid).pop / startOf(rid), P().priceExp);
  }

  // Pengali kedalaman pasar: penduduk^0,6 (Jawa awal = 1), dibatasi.
  function depthMult(state, rid) {
    if (!state || !entry(state, rid) || !enabled()) return 1;
    return Math.max(P().depthMin, Math.min(P().depthMax, Math.pow(entry(state, rid).pop, P().depthExp)));
  }

  /* ---------- Waktu: pertumbuhan dan pajak ---------- */

  function taxRatePerMin(pop, welfare) { return pop * welfare / 100 * P().taxPerMin; }

  // Pajak per menit saat ini seluruh wilayah terbuka (untuk tampilan pemasukan).
  function taxPerMin(state) {
    if (!enabled()) return 0;
    let v = 0;
    Object.keys(state.population || {}).forEach(function (rid) {
      if (!active(state, rid)) return;
      const e = entry(state, rid);
      v += taxRatePerMin(e.pop, welfareFrom(satisfaction(state, rid, e.pop), state, rid));
    });
    return v;
  }

  // Maju satu langkah `h` jam untuk satu wilayah. Mengembalikan pajak (kas) yang dihasilkan.
  function step(state, rid, h) {
    const e = entry(state, rid);
    const w = welfareFrom(satisfaction(state, rid, e.pop), state, rid);
    const before = e.pop;
    let pop = before * Math.pow(Math.max(0.01, 1 + P().growthPerHour * (w - 50) / 50), h);
    const cap = housingCap(state, rid), lo = floorPop(rid);
    // Penduduk yang sudah di atas daya tampung (mis. save diimpor) tidak dipaksa turun mendadak, hanya tidak tumbuh lagi.
    pop = w >= 50 ? Math.min(pop, Math.max(cap, before)) : Math.max(pop, Math.min(lo, before));
    e.pop = pop;
    e.welfare = w;
    return taxRatePerMin((before + pop) / 2, w) * h * 60;
  }

  // Terapkan pertumbuhan dan pajak sampai `now`. Aman dipanggil belakangan (setelah offline). Mengembalikan pajak yang masuk kas.
  function settle(state, now) {
    if (!enabled() || !state.population) return 0;
    let taxTotal = 0;
    Object.keys(state.population).forEach(function (rid) {
      const e = state.population[rid];
      if (!state.regions[rid] || !state.regions[rid].unlocked) { e.at = now; return; }
      const ms = now - e.at;
      if (!(ms > 0)) { e.at = Math.min(e.at, now); return; }
      if (ms < P().minStepSec * 1000) return;
      let hours = Math.min(ms / 3600000, P().maxOfflineHours);
      e.at = now;
      while (hours > 1e-9) {
        const h = Math.min(hours, P().stepHours);
        taxTotal += step(state, rid, h);
        hours -= h;
      }
    });
    if (taxTotal > 0) {
      // Sengaja TIDAK masuk totalEarned: panduan awal dan pencapaian dagang memakai totalEarned sebagai tanda "sudah berdagang".
      // Pajak dicatat di stats.tax dan tetap dihitung di skor peradaban.
      state.cash += taxTotal;
      state.stats.tax = (state.stats.tax || 0) + taxTotal;
    }
    return taxTotal;
  }

  /* ---------- Ringkasan untuk antarmuka ---------- */

  // Kategori dengan kepuasan terendah (< 0,95), atau null. Dipakai untuk petunjuk "apa yang kurang".
  function worstNeed(sat) {
    let worst = null;
    CATS.forEach(function (cat) { if (sat[cat] < 0.95 && (!worst || sat[cat] < sat[worst])) worst = cat; });
    return worst;
  }

  function info(state, rid) {
    if (!enabled() || !entry(state, rid) || !D.regions[rid].population) return null;
    const e = entry(state, rid);
    const sat = satisfaction(state, rid, e.pop);
    const welfare = welfareFrom(sat, state, rid);
    const need = workersNeeded(state, rid), have = workersAvailable(state, rid, e.pop);
    return {
      pop: e.pop, millions: millions(e.pop), welfare: welfare, sat: sat, worst: worstNeed(sat),
      cap: housingCap(state, rid), floor: floorPop(rid),
      trend: Math.pow(Math.max(0.01, 1 + P().growthPerHour * (welfare - 50) / 50), 1) - 1,   // perubahan per jam
      workersNeed: need, workersHave: have, labor: laborFactor(state, rid),
      taxPerMin: taxRatePerMin(e.pop, welfare), priceMult: priceMult(state, rid), depthMult: depthMult(state, rid)
    };
  }

  NT.population = {
    CATS: CATS,
    enabled: enabled,
    laborFactor: laborFactor,
    priceMult: priceMult,
    depthMult: depthMult,
    housingCap: housingCap,
    supply: supply,
    demand: demand,
    reach: reach,
    satisfaction: satisfaction,
    welfareFrom: welfareFrom,
    workersNeeded: workersNeeded,
    taxPerMin: taxPerMin,
    settle: settle,
    info: info,
    millions: millions
  };
})((window.NT = window.NT || {}));
