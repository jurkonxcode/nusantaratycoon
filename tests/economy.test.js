/* Tes logika ekonomi tanpa browser. Jalankan: node tests/economy.test.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

global.window = global;
const root = path.join(__dirname, '..', 'js');
[
  'config.js',
  'data/commodities.js', 'data/events.js', 'data/buildings.js', 'data/regions.js',
  'core/format.js', 'core/world.js', 'core/state.js', 'core/economy.js'
].forEach(function (f) {
  vm.runInThisContext(fs.readFileSync(path.join(root, f), 'utf8'), { filename: f });
});

const NT = global.NT;
const E = NT.economy;
// Tes ekonomi inti berjalan tanpa musim dan peristiwa; keduanya dites tersendiri di bawah.
NT.config.seasonsEnabled = false;
NT.config.eventsEnabled = false;
NT.config.buildTimeEnabled = false; // timer pembangunan dites di tests/jobs.test.js
const MIN = 60000;
const t0 = 1_700_000_000_000;
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('ok  ' + name); }

test('state awal: sawah level 1, kas 50, hanya Jawa terbuka', function () {
  const s = NT.state.createInitialState(t0);
  assert.strictEqual(s.cash, 50);
  assert.strictEqual(E.buildingLevel(s, 'sawah'), 1);
  assert.strictEqual(s.regions.jawa.unlocked, true);
  assert.strictEqual(s.regions.sumatra.unlocked, false);
});

test('produksi dihitung dari waktu dan dibatasi kapasitas gudang', function () {
  const s = NT.state.createInitialState(t0);
  assert.strictEqual(Math.floor(E.pending(s, 'sawah', t0 + 5 * MIN)), 30); // 6/menit
  assert.strictEqual(E.pending(s, 'sawah', t0 + 10 * 60 * MIN), E.capacity(s, 'sawah'));
  assert.strictEqual(E.capacity(s, 'sawah'), 720);
});

test('collect memindahkan hasil ke gudang dan menyimpan sisa pecahan', function () {
  const s = NT.state.createInitialState(t0);
  const r = E.collect(s, 'sawah', t0 + 2.5 * MIN); // 15 unit
  assert.ok(r.ok);
  assert.strictEqual(r.amount, 15);
  assert.strictEqual(s.inventory.padi, 15);
  assert.strictEqual(E.collect(s, 'sawah', t0 + 2.5 * MIN).ok, false);
});

test('jual: kas naik, stok turun, harga turun setelah banjir pasokan', function () {
  const s = NT.state.createInitialState(t0);
  s.inventory.padi = 400;
  const before = E.currentPrice(s, 'jawa', 'padi', t0);
  const r = E.sell(s, 'padi', 'jawa', 200, t0);
  assert.ok(r.ok);
  assert.strictEqual(s.inventory.padi, 200);
  assert.ok(s.cash > 50);
  assert.ok(E.currentPrice(s, 'jawa', 'padi', t0) < before);
  // tekanan pasokan meluruh
  assert.ok(E.marketStock(s, 'jawa', 'padi', t0 + 30 * MIN) < E.marketStock(s, 'jawa', 'padi', t0));
});

test('jual tidak boleh melebihi stok atau ke wilayah tertutup', function () {
  const s = NT.state.createInitialState(t0);
  s.inventory.padi = 5;
  assert.strictEqual(E.sell(s, 'padi', 'jawa', 10, t0).ok, false);
  assert.strictEqual(E.sell(s, 'padi', 'sumatra', 5, t0).ok, false);
});

test('ongkir: nol di wilayah asal, turun dengan pelabuhan', function () {
  const s = NT.state.createInitialState(t0);
  s.regions.sumatra.unlocked = true;
  assert.strictEqual(E.shippingPerUnit(s, 'padi', 'jawa'), 0);
  const base = E.shippingPerUnit(s, 'padi', 'sumatra');
  assert.ok(base > 0);
  s.regions.jawa.infra.pelabuhan = 2;
  assert.ok(E.shippingPerUnit(s, 'padi', 'sumatra') < base);
});

test('upgrade bangunan memotong kas, menaikkan level dan laju produksi', function () {
  const s = NT.state.createInitialState(t0);
  s.cash = 1000;
  const rate1 = E.productionRate(s, 'sawah');
  const r = E.upgradeBuilding(s, 'sawah', t0 + MIN);
  assert.ok(r.ok);
  assert.strictEqual(E.buildingLevel(s, 'sawah'), 2);
  assert.ok(E.productionRate(s, 'sawah') > rate1);
  assert.strictEqual(s.inventory.padi, 6); // hasil 1 menit diamankan sebelum upgrade
});

test('tidak bisa upgrade bila kas kurang atau wilayah tertutup', function () {
  const s = NT.state.createInitialState(t0);
  s.cash = 1;
  assert.strictEqual(E.upgradeBuilding(s, 'sawah', t0).ok, false);
  s.cash = 99999;
  assert.strictEqual(E.upgradeBuilding(s, 'kebun_kopi', t0).ok, false);
});

test('buka wilayah lalu bangun kebun', function () {
  const s = NT.state.createInitialState(t0);
  s.cash = 700;
  assert.ok(E.unlockRegion(s, 'sumatra').ok);
  assert.strictEqual(s.cash, 100);
  s.cash = 5000;
  const r = E.upgradeBuilding(s, 'kebun_kopi', t0);
  assert.ok(r.ok && r.built);
});

test('tol menambah produksi dan punya batas level', function () {
  const s = NT.state.createInitialState(t0);
  s.cash = 1e9;
  const r0 = E.productionRate(s, 'sawah');
  assert.ok(E.upgradeInfra(s, 'jawa', 'tol', t0).ok);
  assert.ok(E.productionRate(s, 'sawah') > r0);
  for (let i = 0; i < 10; i++) E.upgradeInfra(s, 'jawa', 'tol', t0);
  assert.strictEqual(E.infraLevel(s, 'jawa', 'tol'), 5);
});

test('skor dan gelar naik seiring kemajuan', function () {
  const s = NT.state.createInitialState(t0);
  const a = E.score(s);
  s.regions.sumatra.unlocked = true;
  s.regions.jawa.infra.tol = 2;
  assert.ok(E.score(s) > a);
  assert.strictEqual(E.rank(0).current.name, 'Desa Rintisan');
  assert.strictEqual(E.rank(5000).current.name, 'Peradaban Nusantara');
});

test('normalize aman untuk data lama atau rusak', function () {
  assert.strictEqual(NT.state.normalize(null, t0).cash, 50);
  const s = NT.state.normalize({ cash: 77, buildings: { sawah: { level: 3 } } }, t0);
  assert.strictEqual(s.cash, 77);
  assert.strictEqual(E.buildingLevel(s, 'sawah'), 3);
});

console.log('\n' + passed + ' tes lolos');
