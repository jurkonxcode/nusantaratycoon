/*
 * Bentuk data pemain. Semua yang perlu disimpan ada di sini, dan murni data JSON
 * supaya mudah dipindah ke tabel Supabase nanti.
 */
(function (NT) {
  const D = NT.data;
  const VERSION = 1;

  const STAT_KEYS = ['collects', 'produced', 'sales', 'sold', 'upgrades', 'builds', 'unlocks', 'bestSale', 'playMs', 'exports'];
  const LOG_MAX = 40;

  function freshStats() {
    const o = {};
    STAT_KEYS.forEach(function (k) { o[k] = 0; });
    return o;
  }

  function createInitialState(now) {
    const s = {
      version: VERSION,
      createdAt: now,
      cash: 50,
      totalEarned: 0,
      regions: {},     // id -> { unlocked, infra: { tol, pelabuhan } }
      buildings: {},   // id -> { level, lastCollected }
      inventory: {},   // komoditas -> jumlah
      market: {},      // wilayah -> komoditas -> { stock, updatedAt }
      shipments: [],   // pengiriman berjalan: { id, kind ('sale'|'export'), commodity, qty, market, revenue, shipping, net, startedAt, endsAt }
      jobs: [],        // pembangunan berjalan: { key, kind, id, region, from, to, startedAt, endsAt, cost }
      stats: freshStats(),  // penghitung untuk statistik, panduan, dan pencapaian
      achievements: {},     // id pencapaian -> waktu terbuka (ms)
      log: [],              // aktivitas terbaru: { t, i (ikon), x (teks) }, paling lama di depan
      guideHidden: false    // panduan awal disembunyikan pemain
    };

    Object.keys(D.regions).forEach(function (id) {
      const r = D.regions[id];
      if (r.comingSoon) return;
      s.regions[id] = { unlocked: !!r.start, infra: { tol: 0, pelabuhan: 0 } };
      s.market[id] = {};
    });
    Object.keys(D.exportMarkets || {}).forEach(function (id) { s.market['export:' + id] = {}; });
    Object.keys(D.commodities).forEach(function (id) { s.inventory[id] = 0; });

    // Pemain mulai dengan satu sawah di Jawa.
    s.buildings.sawah = { level: 1, lastCollected: now };
    return s;
  }

  // Gabungkan data tersimpan dengan struktur terbaru (aman bila ada wilayah/komoditas baru).
  function normalize(saved, now) {
    const base = createInitialState(now);
    if (!saved || typeof saved !== 'object') return base;

    base.cash = Number(saved.cash) || 0;
    base.totalEarned = Number(saved.totalEarned) || 0;
    base.createdAt = saved.createdAt || now;

    Object.keys(base.regions).forEach(function (id) {
      const sr = saved.regions && saved.regions[id];
      if (!sr) return;
      base.regions[id].unlocked = !!sr.unlocked || !!D.regions[id].start;
      base.regions[id].infra.tol = (sr.infra && sr.infra.tol) || 0;
      base.regions[id].infra.pelabuhan = (sr.infra && sr.infra.pelabuhan) || 0;
    });

    base.buildings = {};
    Object.keys(D.buildings).forEach(function (id) {
      const sb = saved.buildings && saved.buildings[id];
      if (sb && sb.level > 0) {
        base.buildings[id] = { level: sb.level, lastCollected: sb.lastCollected || now };
      }
    });

    Object.keys(base.inventory).forEach(function (id) {
      base.inventory[id] = Math.max(0, Math.floor((saved.inventory && saved.inventory[id]) || 0));
    });

    Object.keys(base.market).forEach(function (rid) {
      const sm = saved.market && saved.market[rid];
      if (sm) base.market[rid] = sm;
    });
    base.jobs = (Array.isArray(saved.jobs) ? saved.jobs : []).filter(function (j) {
      if (!j || !(j.endsAt > 0) || !(j.startedAt > 0) || !j.region || !base.regions[j.region]) return false;
      return j.kind === 'building' ? !!D.buildings[j.id] : (j.kind === 'infra' && !!D.infra[j.id]);
    });

    base.shipments = (Array.isArray(saved.shipments) ? saved.shipments : []).filter(function (x) {
      if (!x || !(x.endsAt > 0) || !(x.startedAt > 0) || !(x.net >= 0) || !(x.qty > 0) || !D.commodities[x.commodity]) return false;
      return x.kind === 'export' ? !!(D.exportMarkets && D.exportMarkets[x.market]) : !!base.regions[x.market];
    });

    STAT_KEYS.forEach(function (k) {
      const v = Number(saved.stats && saved.stats[k]);
      base.stats[k] = v > 0 && isFinite(v) ? v : 0;
    });
    Object.keys(saved.achievements || {}).forEach(function (id) {
      const t = Number(saved.achievements[id]);
      if (t > 0) base.achievements[id] = t;
    });
    base.log = (Array.isArray(saved.log) ? saved.log : []).filter(function (e) {
      return e && Number(e.t) > 0 && typeof e.x === 'string';
    }).slice(-LOG_MAX).map(function (e) { return { t: Number(e.t), i: String(e.i || '•').slice(0, 4), x: e.x.slice(0, 160) }; });
    base.guideHidden = !!saved.guideHidden;
    return base;
  }

  NT.state = { createInitialState: createInitialState, normalize: normalize, LOG_MAX: LOG_MAX };
})((window.NT = window.NT || {}));
