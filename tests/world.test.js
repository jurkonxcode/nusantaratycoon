/* Tes dunia nyata: musim, peristiwa, ongkir berbasis km, dan geografi peta. Jalankan: node tests/world.test.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

global.window = global;
const root = path.join(__dirname, '..', 'js');
[
  'config.js', 'data/commodities.js', 'data/events.js', 'data/buildings.js', 'data/regions.js', 'data/geo.js',
  'core/format.js', 'core/world.js', 'core/raster.js', 'core/state.js', 'core/economy.js'
].forEach(function (f) {
  vm.runInThisContext(fs.readFileSync(path.join(root, f), 'utf8'), { filename: f });
});

const NT = global.NT, E = NT.economy, W = NT.world, D = NT.data, C = NT.config;
const HOUR = 3600000, MIN = 60000;
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('ok  ' + name); }

// Tanggal tetap di zona WIB (UTC+7): tengah hari tanggal 15 bulan m (1-12) tahun 2026.
function at(m) { return Date.UTC(2026, m - 1, 15, 5, 0, 0); }

/* ---------- Musim ---------- */

test('bulan dihitung menurut WIB, bukan UTC', function () {
  assert.strictEqual(W.monthOf(Date.UTC(2026, 0, 31, 18, 0)), 1); // 01 Feb 01:00 WIB
  assert.strictEqual(W.monthOf(Date.UTC(2026, 0, 31, 16, 0)), 0); // 31 Jan 23:00 WIB
});

test('tabel musim dinormalkan: rata-rata setahun = 1', function () {
  Object.keys(D.commodities).forEach(function (cid) {
    ['prod', 'price'].forEach(function (kind) {
      let sum = 0;
      for (let m = 1; m <= 12; m++) sum += (kind === 'prod' ? W.seasonProd : W.seasonPrice)(cid, at(m));
      assert.ok(Math.abs(sum / 12 - 1) < 1e-9, cid + ' ' + kind);
    });
  });
});

test('padi: panen raya Maret lebih banyak dan lebih murah daripada paceklik November', function () {
  assert.ok(W.seasonProd('padi', at(3)) > W.seasonProd('padi', at(11)) * 1.5);
  assert.ok(W.seasonPrice('padi', at(3)) < W.seasonPrice('padi', at(11)));
});

test('cengkeh panen Juli-Agustus, kopi panen Juni-Juli', function () {
  assert.ok(W.seasonProd('cengkeh', at(8)) > 1.4 && W.seasonProd('cengkeh', at(2)) < 0.6);
  assert.ok(W.seasonProd('kopi', at(6)) > 1.2 && W.seasonProd('kopi', at(1)) < 0.7);
});

test('musim iklim: hujan Nov-Mar, kemarau Jun-Sep', function () {
  assert.strictEqual(W.climate(at(1)).id, 'hujan');
  assert.strictEqual(W.climate(at(12)).id, 'hujan');
  assert.strictEqual(W.climate(at(7)).id, 'kemarau');
});

test('produksi mengikuti musim; saklar seasonsEnabled=false mematikannya', function () {
  C.eventsEnabled = false; C.seasonsEnabled = true;
  const s = NT.state.createInitialState(at(3));
  const hi = E.productionRate(s, 'sawah', at(3));
  const lo = E.productionRate(s, 'sawah', at(11));
  assert.ok(hi > lo * 1.5);
  assert.strictEqual(E.productionRate(s, 'sawah'), 6);       // tanpa `now` = laju dasar
  C.seasonsEnabled = false;
  assert.strictEqual(E.productionRate(s, 'sawah', at(3)), 6);
  C.seasonsEnabled = true;
});

test('harga mengikuti musim', function () {
  C.eventsEnabled = false; C.seasonsEnabled = true;
  const s = NT.state.createInitialState(at(3));
  const a = E.currentPrice(s, 'jawa', 'kopi', at(6));
  const b = E.currentPrice(s, 'jawa', 'kopi', at(1));
  // gelombang ±10% tidak boleh menutupi selisih musim (0,88 vs 1,1 setelah normalisasi)
  assert.ok(a < b * 1.05);
});

/* ---------- Peristiwa ---------- */

function findSlot(pred, from) {
  const base = Math.floor(from / (C.eventSlotHours * HOUR));
  for (let i = 0; i < 20000; i++) {
    const e = W.eventAtSlot(base + i);
    if (e && pred(e)) return (base + i) * C.eventSlotHours * HOUR + HOUR;
  }
  throw new Error('peristiwa tidak ditemukan');
}

test('peristiwa deterministik: waktu sama, hasil sama', function () {
  C.eventsEnabled = true;
  const t = at(5);
  const a = W.activeEvent(t), b = W.activeEvent(t);
  assert.strictEqual(a && a.event.id, b && b.event.id);
  for (let i = 0; i < 100; i++) assert.strictEqual(W.eventAtSlot(5000 + i), W.eventAtSlot(5000 + i));
});

test('frekuensi peristiwa mendekati eventChance', function () {
  C.eventsEnabled = true;
  let n = 0; const N = 6000;
  for (let i = 0; i < N; i++) if (W.eventAtSlot(60000 + i)) n++;
  assert.ok(Math.abs(n / N - C.eventChance) < 0.04, 'frekuensi ' + n / N);
});

test('peristiwa hanya muncul di bulan yang masuk akal', function () {
  C.eventsEnabled = true;
  for (let i = 0; i < 4000; i++) {
    const slot = 60000 + i;
    const e = W.eventAtSlot(slot);
    if (!e || !e.months) continue;
    const m = new Date(slot * C.eventSlotHours * HOUR + 7 * HOUR).getUTCMonth() + 1;
    assert.ok(e.months.indexOf(m) !== -1, e.id + ' muncul di bulan ' + m);
  }
});

test('banjir Jawa memangkas produksi sawah dan batik tapi tidak kebun Sumatra', function () {
  C.eventsEnabled = true; C.seasonsEnabled = false;
  const t = findSlot(function (e) { return e.id === 'banjir_jawa'; }, at(12));
  const s = NT.state.createInitialState(t);
  s.regions.sumatra.unlocked = true;
  s.buildings.kebun_kopi = { level: 1, lastCollected: t };
  assert.strictEqual(E.productionRate(s, 'sawah', t), 3);                      // 6 x 0,5
  assert.strictEqual(E.productionRate(s, 'kebun_kopi', t), D.buildings.kebun_kopi.baseRate);
  C.seasonsEnabled = true;
});

test('lonjakan permintaan kopi menaikkan harga kopi, bukan padi', function () {
  C.eventsEnabled = true; C.seasonsEnabled = false;
  const t = findSlot(function (e) { return e.id === 'ekspor_kopi'; }, at(6));
  assert.strictEqual(E.worldPriceMult('kopi', t), 1.4);
  assert.strictEqual(E.worldPriceMult('padi', t), 1);
  C.seasonsEnabled = true;
});

/* ---------- Ongkir dan jarak ---------- */

test('jarak rute laut antar hub masuk akal dan simetris', function () {
  const jm = E.distanceKm('jawa', 'sumatra');
  assert.ok(jm > 1400 && jm < 2200, 'Jakarta-Medan ' + jm);
  const js = E.distanceKm('jawa', 'sulawesi');
  assert.ok(js > 1400 && js < 2100, 'Jakarta-Makassar ' + js);
  assert.ok(E.distanceKm('sumatra', 'sulawesi') > js);
  assert.strictEqual(E.distanceKm('jawa', 'sumatra'), E.distanceKm('sumatra', 'jawa'));
  assert.strictEqual(E.distanceKm('jawa', 'jawa'), 0);
});

test('ongkir barang curah (padi) jauh lebih berat daripada barang mahal (cengkeh, batik)', function () {
  const s = NT.state.createInitialState(0);
  const share = function (cid, market) {
    return E.shippingPerUnit(s, cid, market) / (D.commodities[cid].basePrice * (D.regions[market].demand[cid] || 1));
  };
  assert.ok(share('padi', 'sumatra') > 0.12, 'padi ' + share('padi', 'sumatra'));
  assert.ok(share('cengkeh', 'jawa') < 0.02, 'cengkeh ' + share('cengkeh', 'jawa'));
  assert.ok(share('batik', 'sumatra') < 0.01, 'batik ' + share('batik', 'sumatra'));
});

test('harga game mengikuti rasio harga nyata (padi 6.500/kg per 50 kg)', function () {
  assert.ok(Math.abs(D.commodities.padi.basePrice - 8.1) < 0.1);
  assert.ok(D.commodities.cengkeh.basePrice > D.commodities.kopi.basePrice);
  assert.ok(D.commodities.padi.basePrice < D.commodities.karet.basePrice);
});

/* ---------- Geografi peta ---------- */

function nearOwner(lon, lat, id) {
  const g = NT.raster.grid(), c = NT.raster.toCell(lon, lat);
  const x0 = Math.floor(c.cx), y0 = Math.floor(c.cy);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const x = x0 + dx, y = y0 + dy;
    if (x >= 0 && y >= 0 && x < g.W && y < g.H && g.owner[y * g.W + x] === id) return true;
  }
  return false;
}

test('pin, bangunan, dan hub jatuh di daratan wilayahnya sendiri', function () {
  const bad = [];
  Object.keys(D.regions).forEach(function (id) {
    const r = D.regions[id];
    if (NT.raster.ownerAt(r.map.pin[0], r.map.pin[1]) !== id) bad.push('pin ' + id);
    if (!nearOwner(r.hub.lon, r.hub.lat, id)) bad.push('hub ' + id + ' (tidak dekat daratan wilayahnya)');
    Object.keys(r.map.slots || {}).forEach(function (bid) {
      const p = r.map.slots[bid];
      if (NT.raster.ownerAt(p[0], p[1]) !== id) bad.push('slot ' + bid + ' @' + p);
    });
    if (r.map.port && NT.raster.ownerAt(r.map.port[0], r.map.port[1]) !== null) bad.push('pelabuhan ' + id + ' harus di laut');
  });
  assert.deepStrictEqual(bad, []);
});

test('setiap bangunan punya posisi di peta', function () {
  Object.keys(D.buildings).forEach(function (bid) {
    const b = D.buildings[bid];
    assert.ok(D.regions[b.region].map.slots[bid], 'slot ' + bid);
  });
});

test('semua pulau punya sel daratan', function () {
  const g = NT.raster.grid();
  Object.keys(D.regions).forEach(function (id) {
    assert.ok(g.owner.filter(function (o) { return o === id; }).length > 8, id);
  });
});

console.log('\n' + passed + ' tes lolos');
