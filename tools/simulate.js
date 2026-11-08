/* Simulator pemain otomatis untuk menyetel keseimbangan ekonomi.
 * Jalankan: node tools/simulate.js [jam=48] [musim=0|1]
 * Bot serakah: tiap kunjungan ia memanen, menjual ke pasar terbaik, lalu membeli pembelian dengan balik modal tercepat.
 * Tiga gaya main: aktif (cek tiap 5 menit), santai (tiap 60 menit), harian (tiap 8 jam). */
const fs = require('fs'), path = require('path'), vm = require('vm');
global.window = global;
const root = path.join(__dirname, '..', 'js');
['config.js', 'data/commodities.js', 'data/events.js', 'data/buildings.js', 'data/regions.js', 'data/geo.js',
 'core/format.js', 'core/world.js', 'core/raster.js', 'core/state.js', 'core/economy.js'
].forEach(function (f) { vm.runInThisContext(fs.readFileSync(path.join(root, f), 'utf8'), { filename: f }); });
const NT = global.NT, E = NT.economy, D = NT.data, C = NT.config;
if (process.env.OVR) Object.assign(C, JSON.parse(process.env.OVR)); // contoh: OVR='{"storageHours":6}' node tools/simulate.js
const HOURS = +(process.argv[2] || 48);
C.seasonsEnabled = process.argv[3] === '1'; C.eventsEnabled = process.argv[3] === '1';
const MIN = 60000, T0 = Date.UTC(2026, 8, 15, 5, 0, 0);

function clone(s) { return JSON.parse(JSON.stringify(s)); }
// Perkiraan pemasukan bersih per menit: tiap bangunan dijual ke pasar terbaik (harga dasar x permintaan - ongkir).
function netFlow(s, now) {
  let v = 0;
  Object.keys(s.buildings).forEach(function (id) {
    const cid = D.buildings[id].produces, bm = E.bestMarket(s, cid, now);
    const unit = Math.max(0, E.normalPrice(bm.regionId, cid) - E.shippingPerUnit(s, cid, bm.regionId));
    v += E.productionRate(s, id, now) * unit;
  });
  return v;
}
function options(s, now) {
  const out = [], base = netFlow(s, now);
  function trial(label, cost, apply, kind, id) {
    const c = clone(s); const was = C.buildTimeEnabled; C.buildTimeEnabled = false;
    c.cash = 1e12; const r = apply(c); C.buildTimeEnabled = was;
    if (!r.ok) return;
    const gain = netFlow(c, now) - base;
    out.push({ label: label, cost: cost, gain: gain, payback: gain > 0 ? cost / gain : Infinity, kind: kind, id: id });
  }
  Object.keys(D.regions).forEach(function (rid) {
    const r = D.regions[rid], rs = s.regions[rid];
    if (!rs || r.comingSoon) return;
    if (!rs.unlocked) {
      const first = r.buildings[0], bc = E.buildingCost(first, 0);
      // nilai membuka wilayah = pemasukan bangunan pertamanya (harga rata-rata dua pasar terbaik)
      const c = clone(s); c.regions[rid].unlocked = true; const w = C.buildTimeEnabled; C.buildTimeEnabled = false; c.cash = 1e12;
      const res = E.upgradeBuilding(c, first, now); C.buildTimeEnabled = w;
      const gain = res.ok ? netFlow(c, now) - base : 0;
      out.push({ label: 'Buka ' + r.name, cost: r.unlockCost + bc, gain: gain, payback: gain > 0 ? (r.unlockCost + bc) / gain : Infinity, kind: 'unlock', id: rid, region: rid });
      return;
    }
    r.buildings.forEach(function (bid) {
      const lvl = E.buildingLevel(s, bid);
      if (E.jobFor(s, 'b:' + bid)) return;
      trial((lvl ? 'Naikkan ' : 'Bangun ') + bid + ' Lv' + (lvl + 1), E.buildingCost(bid, lvl), function (c) { return E.upgradeBuilding(c, bid, now); }, 'building', bid);
    });
    ['tol', 'pelabuhan'].forEach(function (iid) {
      if (E.jobFor(s, 'i:' + rid + ':' + iid)) return;
      const lvl = E.infraLevel(s, rid, iid);
      if (lvl >= D.infra[iid].maxLevel) return;
      trial(iid + ' ' + rid + ' Lv' + (lvl + 1), E.infraCost(rid, iid, lvl), function (c) { return E.upgradeInfra(c, rid, iid, now); }, 'infra', iid + ':' + rid);
    });
  });
  return out;
}

function play(interval, label) {
  const s = NT.state.createInitialState(T0);
  const log = [], unlockAt = {}, income = {};
  let now = T0, nextReport = [1, 2, 4, 8, 12, 24, 48, 72, 168].filter(function (h) { return h <= HOURS; });
  const reports = [];
  while (now - T0 <= HOURS * 3600000) {
    E.settle(s, now);
    E.settleShipments(s, now);   // kas baru masuk saat kiriman tiba (penjualan berwaktu sejak sesi 14)
    E.collectAll(s, now);
    // jual semua ke pasar terbaik per komoditas
    Object.keys(D.commodities).forEach(function (cid) {
      const have = Math.floor(s.inventory[cid] || 0);
      if (have < 1) return;
      const bm = E.bestMarket(s, cid, now);
      let r = bm && E.sell(s, cid, bm.regionId, have, now);
      // slot kapal penuh atau pasar tak terjangkau: jual lewat truk ke wilayah asal
      if ((!r || !r.ok) && s.regions[D.commodities[cid].region] && s.regions[D.commodities[cid].region].unlocked) r = E.sell(s, cid, D.commodities[cid].region, have, now);
      if (r && r.ok) income[cid] = (income[cid] || 0) + r.net;
    });
    // beli selagi ada yang terjangkau dan pembangun kosong
    for (let guard = 0; guard < 20; guard++) {
      const opts = options(s, now).filter(function (o) { return isFinite(o.payback) && o.cost <= s.cash; }).sort(function (a, b) { return a.payback - b.payback; });
      if (!opts.length) break;
      const o = opts[0];
      // jangan buka wilayah bila pembelian lain jauh lebih menguntungkan (balik modal 2x lebih cepat)
      let res;
      if (o.kind === 'unlock') {
        res = E.unlockRegion(s, o.id, now);
        if (res.ok) { unlockAt[o.id] = (now - T0) / 3600000; E.upgradeBuilding(s, D.regions[o.id].buildings[0], now); }
      } else if (o.kind === 'building') res = E.upgradeBuilding(s, o.id, now);
      else { const p = o.id.split(':'); res = E.upgradeInfra(s, p[1], p[0], now); }
      if (!res || !res.ok) break;
    }
    // kas berlebih dipakai mempercepat pembangunan (seperti pemain sungguhan), dari yang paling murah dulu
    (s.jobs || []).slice().sort(function (a, b) { return E.speedupCost(a, now) - E.speedupCost(b, now); }).forEach(function (j) {
      const c = E.speedupCost(j, now);
      if (c <= s.cash * 0.3) E.speedup(s, j.key, now);
    });
    const hrs = (now - T0) / 3600000;
    while (nextReport.length && hrs >= nextReport[0]) {
      reports.push({ h: nextReport.shift(), cash: s.cash, flow: netFlow(s, now), score: E.score(s), rank: E.rank(E.score(s)).current.name, earned: s.totalEarned });
    }
    now += interval * MIN;
  }
  return { label: label, reports: reports, unlockAt: unlockAt, income: income, s: s };
}
function f(n) { return n >= 1e6 ? (n / 1e6).toFixed(1) + ' jt' : n >= 1e3 ? (n / 1e3).toFixed(1) + ' rb' : n.toFixed(0); }
[[5, 'AKTIF (cek tiap 5 mnt)'], [60, 'SANTAI (tiap 60 mnt)'], [480, 'HARIAN (tiap 8 jam)']].forEach(function (p) {
  const r = play(p[0], p[1]);
  console.log('\n=== ' + r.label + (C.seasonsEnabled ? ' [musim+peristiwa]' : '') + ' ===');
  console.log('Wilayah dibuka (jam): ' + (Object.keys(r.unlockAt).map(function (k) { return k + ' ' + r.unlockAt[k].toFixed(1); }).join(', ') || '-'));
  r.reports.forEach(function (x) { console.log('  jam ' + String(x.h).padStart(3) + '  kas ' + f(x.cash).padStart(8) + '  pemasukan ' + f(x.flow).padStart(7) + '/mnt  skor ' + String(x.score).padStart(5) + '  ' + x.rank); });
  const tot = Object.keys(r.income).reduce(function (a, k) { return a + r.income[k]; }, 0);
  console.log('  porsi pendapatan: ' + Object.keys(r.income).sort(function (a, b) { return r.income[b] - r.income[a]; }).map(function (k) { return k + ' ' + Math.round(100 * r.income[k] / tot) + '%'; }).join(', '));
  const lv = Object.keys(r.s.buildings).map(function (b) { return b.replace('kebun_', '').replace('tambang_', '') + ' ' + r.s.buildings[b].level; }).join(', ');
  console.log('  level akhir: ' + lv);
});
