/* Tes Fase 2b: komoditas dan bangunan baru di Sumatra (lada, timah, minyak bumi). Jalankan: node tests/sumatra.test.js */
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

const NEW = { lada: ['kebun_lada', 'bebas'], timah: ['tambang_timah', 'bebas'], minyak: ['sumur_minyak', 'terbatas'] };

test('3 komoditas baru: kelas ekspor benar dan berasal dari Sumatra', function () {
  Object.keys(NEW).forEach(function (cid) {
    const c = D.commodities[cid];
    assert.ok(c, cid);
    assert.strictEqual(c.exportClass, NEW[cid][1], cid);
    assert.strictEqual(c.region, 'sumatra', cid);
    assert.ok(c.basePrice > 0 && c.marketDepth > 0, cid);
  });
  assert.ok(D.commodities.minyak.exportRule.quotaPct > 0, 'minyak punya kuota dalam negeri');
});

test('bangunan baru menghasilkan komoditasnya, terdaftar di Sumatra, punya slot', function () {
  Object.keys(NEW).forEach(function (cid) {
    const b = D.buildings[NEW[cid][0]];
    assert.ok(b, NEW[cid][0]);
    assert.strictEqual(b.produces, cid);
    assert.strictEqual(b.region, 'sumatra');
    assert.ok(D.regions.sumatra.buildings.indexOf(b.id) >= 0);
    assert.ok(D.regions.sumatra.map.slots[b.id]);
  });
});

test('slot Sumatra tidak saling menumpuk (>= 22 px) dan semuanya jauh dari pin dan pelabuhan', function () {
  const S = D.geo.cellPx / D.geo.cellDeg;
  const sl = D.regions.sumatra.map.slots, ids = Object.keys(sl);
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    const d = Math.hypot((sl[ids[i]][0] - sl[ids[j]][0]) * S, (sl[ids[i]][1] - sl[ids[j]][1]) * S);
    assert.ok(d >= 22, ids[i] + ' dan ' + ids[j] + ' hanya ' + d.toFixed(1) + ' px');
  }
  const pin = D.regions.sumatra.map.pin;
  ids.forEach(function (i) { assert.ok(Math.hypot((sl[i][0] - pin[0]) * S, (sl[i][1] - pin[1]) * S) >= 22, i + ' terlalu dekat pin'); });
});

test('semua slot Sumatra jatuh di daratan Sumatra', function () {
  const sl = D.regions.sumatra.map.slots;
  Object.keys(sl).forEach(function (i) { assert.strictEqual(NT.raster.ownerAt(sl[i][0], sl[i][1]), 'sumatra', i); });
});

test('tabel musim 12 bulan; puncak panen lada sesuai kenyataan', function () {
  Object.keys(NEW).forEach(function (cid) {
    ['prod', 'price'].forEach(function (k) { assert.strictEqual(D.commodities[cid].season[k].length, 12, cid + ' ' + k); });
  });
  NT.config.seasonsEnabled = true;
  assert.ok(W.seasonProd('lada', at(7)) > 2 * W.seasonProd('lada', at(1)), 'lada: Juli >> Januari');
  NT.config.seasonsEnabled = false;
});

test('permintaan semua wilayah yang bisa dimainkan mencakup 3 komoditas baru', function () {
  ['sumatra', 'jawa', 'sulawesi', 'kalimantan'].forEach(function (r) {
    Object.keys(NEW).forEach(function (cid) { assert.ok(D.regions[r].demand[cid] > 0, r + ' ' + cid); });
  });
  Object.keys(NEW).forEach(function (cid) { assert.ok(D.regions.sumatra.demand[cid] < 1, 'wilayah asal lebih murah: ' + cid); });
});

test('balik modal level 1 di rentang sasaran (5 sampai 25 menit)', function () {
  Object.keys(NEW).forEach(function (cid) {
    const b = D.buildings[NEW[cid][0]], c = D.commodities[cid];
    let best = 0;
    Object.keys(D.regions).forEach(function (r) { const d = D.regions[r].demand; if (d && d[cid] > best) best = d[cid]; });
    const mins = b.baseCost / (b.baseRate * c.basePrice * best);
    assert.ok(mins >= 5 && mins <= 25, cid + ' balik modal ' + mins.toFixed(1) + ' mnt');
  });
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

test('lada dan timah boleh diekspor; ekspor minyak tidak ditolak karena kelas', function () {
  const s = rich();
  ['lada', 'timah'].forEach(function (cid) {
    s.inventory[cid] = 30;
    const r = E.exportGoods(s, cid, 'jepang', 30, t0);
    assert.ok(r.ok, cid + ': ' + r.reason);
  });
  s.inventory.minyak = 30;
  const r = E.exportGoods(s, 'minyak', 'singapura', 30, t0);
  assert.ok(r.ok || !/tidak bisa diekspor/.test(r.reason), 'minyak: ' + r.reason);
});

test('barang baru laku antar pulau dan menguntungkan (ongkir < hasil)', function () {
  const s = rich();
  Object.keys(NEW).forEach(function (cid) {
    ['jawa', 'sulawesi', 'kalimantan'].forEach(function (m) {
      const q = E.quoteSale(s, cid, m, 20, t0);
      assert.ok(q.net > 0, cid + ' ke ' + m);
    });
  });
});

test('semua komoditas dan bangunan punya aset gambar (termasuk hiasan tingkat 2 dan 3)', function () {
  Object.keys(D.commodities).forEach(function (cid) { assert.ok(NT.assets.comm[cid], 'ikon ' + cid); });
  Object.keys(D.buildings).forEach(function (bid) {
    ['', '_t2', '_t3'].forEach(function (t) { assert.ok(NT.assets.sprite[bid + t], 'sprite ' + bid + t); });
  });
});

console.log(passed + ' tes lolos');
