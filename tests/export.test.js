/* Tes klasifikasi ekspor (Fase 1). Jalankan: node tests/export.test.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

global.window = global;
const root = path.join(__dirname, '..', 'js');
[
  'config.js',
  'data/commodities.js', 'data/events.js', 'data/buildings.js', 'data/regions.js', 'data/exports.js',
  'core/format.js', 'core/world.js', 'core/state.js', 'core/economy.js', 'core/achievements.js'
].forEach(function (f) {
  vm.runInThisContext(fs.readFileSync(path.join(root, f), 'utf8'), { filename: f });
});

const NT = global.NT, E = NT.economy, D = NT.data;
NT.config.seasonsEnabled = false;
NT.config.eventsEnabled = false;
NT.config.buildTimeEnabled = false;
NT.config.saleTimeEnabled = false;
const t0 = 1_700_000_000_000;
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('ok  ' + name); }
function rich() {
  const s = NT.state.createInitialState(t0);
  s.cash = 1e9;
  Object.keys(s.regions).forEach(function (r) { s.regions[r].unlocked = true; s.regions[r].infra.pelabuhan = 4; });
  return s;
}

test('setiap komoditas punya exportClass yang sah', function () {
  Object.keys(D.commodities).forEach(function (id) {
    assert.ok(['bebas', 'terbatas', 'domestik'].indexOf(D.commodities[id].exportClass) >= 0, id);
  });
  assert.strictEqual(E.exportClassOf('padi'), 'domestik');
  assert.strictEqual(E.exportClassOf('kopi'), 'bebas');
  assert.strictEqual(E.exportClassOf('batubara'), 'terbatas');
});

test('padi (domestik) ditolak, stok tidak berubah, pesan menunjuk jalan keluar', function () {
  const s = rich(); s.inventory.padi = 50;
  const r = E.exportGoods(s, 'padi', 'singapura', 50, t0);
  assert.ok(!r.ok);
  assert.ok(/tidak bisa diekspor/.test(r.reason) && /pasar pulau lain/.test(r.reason));
  assert.strictEqual(s.inventory.padi, 50);
  assert.strictEqual(E.slotsUsed(s), 0);
});

test('padi tetap bisa dijual ke pasar dalam negeri', function () {
  const s = rich(); s.inventory.padi = 20;
  assert.ok(E.sell(s, 'padi', 'sumatra', 20, t0).ok);
});

test('tidak ada tujuan ekspor yang menghargai komoditas domestik', function () {
  Object.keys(D.exportMarkets).forEach(function (m) {
    Object.keys(D.exportMarkets[m].demand || {}).forEach(function (cid) {
      assert.notStrictEqual(E.exportClassOf(cid), 'domestik', m + ' menghargai ' + cid);
    });
  });
});

test('komoditas bebas (kopi) diekspor penuh tanpa potongan', function () {
  const s = rich(); s.inventory.kopi = 40;
  const r = E.exportGoods(s, 'kopi', 'singapura', 40, t0);
  assert.ok(r.ok);
  assert.strictEqual(r.qty, 40);
  assert.strictEqual(r.dmoQty, 0);
  assert.strictEqual(s.inventory.kopi, 0);
});

test('batubara terbatas: 25% dipotong DMO, dibayar tunai, sisanya berlayar', function () {
  const s = rich(); s.inventory.batubara = 100;
  const plan = E.exportPlan('batubara', 100);
  assert.deepStrictEqual([plan.dmoQty, plan.exportQty], [25, 75]);
  const cash0 = s.cash;
  const r = E.exportGoods(s, 'batubara', 'tiongkok', 100, t0);
  assert.ok(r.ok, r.reason);
  assert.strictEqual(r.qty, 75);
  assert.strictEqual(r.dmoQty, 25);
  assert.ok(r.dmoNet > 0);
  assert.ok(Math.abs(s.cash - (cash0 + r.dmoNet)) < 1e-6, 'DMO langsung masuk kas');
  assert.strictEqual(s.inventory.batubara, 0, 'seluruh 100 keluar gudang');
  assert.strictEqual(s.shipments.length, 1);
  assert.strictEqual(s.shipments[0].qty, 75);
});

test('DMO menambah tekanan stok di pasar wilayah asal', function () {
  const s = rich(); s.inventory.batubara = 100;
  const before = E.quoteSale(s, 'batubara', 'kalimantan', 1, t0).revenue;
  assert.ok(E.exportGoods(s, 'batubara', 'tiongkok', 100, t0).ok);
  const after = E.quoteSale(s, 'batubara', 'kalimantan', 1, t0).revenue;
  assert.ok(after < before);
});

test('jumlah kecil: kuota dibulatkan ke bawah (1 satuan tidak kena DMO)', function () {
  const p = E.exportPlan('batubara', 3);
  assert.deepStrictEqual([p.dmoQty, p.exportQty], [0, 3]);
});

test('exportRule.needBuilding: ditolak tanpa bangunan, lolos setelah dibangun', function () {
  const rule = D.commodities.batubara.exportRule;
  const saved = rule.needBuilding;
  try {
    rule.needBuilding = 'tambang_batubara';
    const s = rich(); s.inventory.batubara = 40;
    delete s.buildings.tambang_batubara;
    const r = E.exportGoods(s, 'batubara', 'tiongkok', 40, t0);
    assert.ok(!r.ok && /Bangun Tambang/.test(r.reason), r.reason);
    assert.strictEqual(s.inventory.batubara, 40);
    s.buildings.tambang_batubara = { level: 1, lastCollected: t0 };
    assert.ok(E.exportGoods(s, 'batubara', 'tiongkok', 40, t0).ok);
  } finally { rule.needBuilding = saved; if (!saved) delete rule.needBuilding; }
});

test('exportStatus tidak mengubah state', function () {
  const s = rich(); s.inventory.padi = 5;
  const snap = JSON.stringify(s);
  E.exportStatus(s, 'padi'); E.exportStatus(s, 'batubara');
  assert.strictEqual(JSON.stringify(s), snap);
});

console.log(passed + ' tes lolos');
