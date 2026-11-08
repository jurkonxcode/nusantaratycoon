/* Tes Fase 2a: komoditas dan bangunan baru di Jawa (teh, gula, tembakau, garam). Jalankan: node tests/jawa.test.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

global.window = global;
const root = path.join(__dirname, '..', 'js');
[
  'config.js',
  'data/commodities.js', 'data/events.js', 'data/buildings.js', 'data/regions.js', 'data/exports.js', 'data/geo.js',
  'core/format.js', 'core/world.js', 'core/raster.js', 'core/state.js', 'core/economy.js', 'ui/assets.js'
].forEach(function (f) {
  vm.runInThisContext(fs.readFileSync(path.join(root, f), 'utf8'), { filename: f });
});

const NT = global.NT, E = NT.economy, W = NT.world, D = NT.data;
NT.config.eventsEnabled = false;
NT.config.buildTimeEnabled = false;
NT.config.saleTimeEnabled = false;
const MIN = 60000, t0 = 1_700_000_000_000;
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('ok  ' + name); }
function at(m) { return Date.UTC(2026, m - 1, 15, 5, 0, 0); }
function rich() {
  const s = NT.state.createInitialState(t0); s.cash = 1e9;
  Object.keys(s.regions).forEach(function (r) { s.regions[r].unlocked = true; s.regions[r].infra.pelabuhan = 4; });
  return s;
}

const NEW = { teh: ['kebun_teh', 'bebas'], gula: ['kebun_tebu', 'domestik'], tembakau: ['kebun_tembakau', 'bebas'], garam: ['tambak_garam', 'domestik'] };

test('4 komoditas baru: kelas ekspor benar dan berasal dari Jawa', function () {
  Object.keys(NEW).forEach(function (cid) {
    const c = D.commodities[cid];
    assert.ok(c, cid);
    assert.strictEqual(c.exportClass, NEW[cid][1], cid);
    assert.strictEqual(c.region, 'jawa', cid);
    assert.ok(c.basePrice > 0 && c.marketDepth > 0, cid);
  });
});

test('tiap bangunan baru menghasilkan komoditasnya dan terdaftar di Jawa dengan slot peta', function () {
  Object.keys(NEW).forEach(function (cid) {
    const b = D.buildings[NEW[cid][0]];
    assert.ok(b, NEW[cid][0]);
    assert.strictEqual(b.produces, cid);
    assert.strictEqual(b.region, 'jawa');
    assert.ok(D.regions.jawa.buildings.indexOf(b.id) >= 0);
    assert.ok(D.regions.jawa.map.slots[b.id]);
  });
});

test('slot Jawa tidak saling menumpuk (jarak antar slot minimal 20 px peta)', function () {
  const S = D.geo.cellPx / D.geo.cellDeg; // px per derajat
  const ids = Object.keys(D.regions.jawa.map.slots), pts = ids.map(function (i) { return D.regions.jawa.map.slots[i]; });
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
    const d = Math.hypot((pts[i][0] - pts[j][0]) * S, (pts[i][1] - pts[j][1]) * S);
    assert.ok(d >= 20, ids[i] + ' dan ' + ids[j] + ' hanya ' + d.toFixed(1) + ' px');
  }
});

test('tabel musim 12 bulan; puncak panen sesuai kenyataan', function () {
  Object.keys(NEW).forEach(function (cid) {
    ['prod', 'price'].forEach(function (k) { assert.strictEqual(D.commodities[cid].season[k].length, 12, cid + ' ' + k); });
  });
  NT.config.seasonsEnabled = true;
  assert.ok(W.seasonProd('gula', at(7)) > 2 * W.seasonProd('gula', at(1)), 'giling tebu: Juli >> Januari');
  assert.ok(W.seasonProd('garam', at(8)) > 2 * W.seasonProd('garam', at(1)), 'garam: kemarau >> hujan');
  assert.ok(W.seasonProd('tembakau', at(8)) > 2 * W.seasonProd('tembakau', at(2)), 'tembakau: panen Agustus');
  assert.ok(W.seasonProd('teh', at(1)) > W.seasonProd('teh', at(8)), 'teh: musim hujan lebih banyak');
  NT.config.seasonsEnabled = false;
});

test('bangunan baru bisa dibangun dan memproduksi barangnya', function () {
  NT.config.seasonsEnabled = false;
  const s = rich();
  Object.keys(NEW).forEach(function (cid) {
    const bid = NEW[cid][0];
    assert.strictEqual(E.buildingLevel(s, bid), 0);
    assert.ok(E.upgradeBuilding(s, bid, t0).ok, bid);
    assert.strictEqual(E.buildingLevel(s, bid), 1);
    assert.ok(E.pending(s, bid, t0 + 10 * MIN) > 0, bid);
  });
});

test('save lama tanpa bangunan baru tetap aman (normalize)', function () {
  const s = NT.state.normalize({ cash: 10, buildings: { sawah: { level: 2 } } }, t0);
  Object.keys(NEW).forEach(function (cid) {
    assert.strictEqual(E.buildingLevel(s, NEW[cid][0]), 0);
    assert.strictEqual(s.inventory[cid], 0);
  });
});

test('gula dan garam (domestik) ditolak ekspor; teh dan tembakau boleh', function () {
  const s = rich();
  ['gula', 'garam'].forEach(function (cid) {
    s.inventory[cid] = 30;
    const r = E.exportGoods(s, cid, 'singapura', 30, t0);
    assert.ok(!r.ok && /tidak bisa diekspor/.test(r.reason), cid);
    assert.strictEqual(s.inventory[cid], 30);
  });
  s.regions.jawa.infra.pelabuhan = 4;
  ['teh', 'tembakau'].forEach(function (cid) {
    s.inventory[cid] = 30;
    const r = E.exportGoods(s, cid, 'jepang', 30, t0);
    assert.ok(r.ok, cid + ': ' + r.reason);
  });
});

test('komoditas domestik tetap menguntungkan dijual antar pulau (ongkir < hasil)', function () {
  const s = rich();
  ['gula', 'garam'].forEach(function (cid) {
    ['sumatra', 'sulawesi', 'kalimantan'].forEach(function (m) {
      const q = E.quoteSale(s, cid, m, 50, t0);
      assert.ok(q.net > 0, cid + ' ke ' + m);
    });
  });
});

test('tidak ada tujuan ekspor yang menghargai gula atau garam', function () {
  Object.keys(D.exportMarkets).forEach(function (m) {
    const d = D.exportMarkets[m].demand || {};
    assert.ok(!('gula' in d) && !('garam' in d), m);
  });
});

test('semua komoditas dan bangunan punya aset gambar (termasuk hiasan tingkat 2 dan 3)', function () {
  Object.keys(D.commodities).forEach(function (cid) { assert.ok(NT.assets.comm[cid], 'ikon ' + cid); });
  Object.keys(D.buildings).forEach(function (bid) {
    ['', '_t2', '_t3'].forEach(function (t) { assert.ok(NT.assets.sprite[bid + t], 'sprite ' + bid + t); });
  });
});

console.log(passed + ' tes lolos');
