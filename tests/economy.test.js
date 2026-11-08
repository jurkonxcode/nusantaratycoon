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
  'core/format.js', 'core/world.js', 'core/state.js', 'core/economy.js', 'core/achievements.js'
].forEach(function (f) {
  vm.runInThisContext(fs.readFileSync(path.join(root, f), 'utf8'), { filename: f });
});

const NT = global.NT;
const E = NT.economy;
// Tes ekonomi inti berjalan tanpa musim dan peristiwa; keduanya dites tersendiri di bawah.
NT.config.seasonsEnabled = false;
NT.config.eventsEnabled = false;
NT.config.buildTimeEnabled = false; // timer pembangunan dites di tests/jobs.test.js
NT.config.saleTimeEnabled = false; // pengiriman berwaktu dites di tests/timing.test.js
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
  assert.strictEqual(E.capacity(s, 'sawah'), 6 * 60 * NT.config.storageHours); // laju 6/menit
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
  assert.strictEqual(E.rank(5000).current.name, 'Provinsi Makmur');
  assert.strictEqual(E.rank(100000).current.name, 'Peradaban Nusantara');
});

test('normalize aman untuk data lama atau rusak', function () {
  assert.strictEqual(NT.state.normalize(null, t0).cash, 50);
  const s = NT.state.normalize({ cash: 77, buildings: { sawah: { level: 3 } } }, t0);
  assert.strictEqual(s.cash, 77);
  assert.strictEqual(E.buildingLevel(s, 'sawah'), 3);
});

test('sellAll menjual seluruh gudang ke satu pasar dan cocok dengan quoteSellAll', function () {
  const s = NT.state.createInitialState(t0);
  s.regions.sumatra.unlocked = true;
  s.inventory.padi = 100;
  s.inventory.batik = 5;
  const q = E.quoteSellAll(s, 'jawa', t0);
  const cash0 = s.cash;
  const r = E.sellAll(s, 'jawa', t0);
  assert.ok(r.ok);
  assert.strictEqual(r.items.length, 2);
  assert.strictEqual(s.inventory.padi, 0);
  assert.strictEqual(s.inventory.batik, 0);
  assert.ok(Math.abs(r.net - q.net) < 1e-6);
  assert.ok(Math.abs(s.cash - cash0 - r.net) < 1e-6);
});

test('sellAll gagal bila gudang kosong atau pasar terkunci', function () {
  const s = NT.state.createInitialState(t0);
  assert.strictEqual(E.sellAll(s, 'jawa', t0).ok, false);
  s.inventory.padi = 10;
  assert.strictEqual(E.sellAll(s, 'sumatra', t0).ok, false);
  assert.strictEqual(s.inventory.padi, 10);
});

test('priceSeries: titik sekarang sama dengan currentPrice, jumlah titik benar', function () {
  const s = NT.state.createInitialState(t0);
  const ser = E.priceSeries(s, 'jawa', 'padi', t0, 30, 30, 60);
  assert.strictEqual(ser.length, 61);
  assert.ok(Math.abs(ser[30].price - E.currentPrice(s, 'jawa', 'padi', t0)) < 1e-9);
  assert.ok(ser.every(function (p) { return p.price > 0; }));
});

test('priceSignal: bagus/rendah/normal mengikuti rasio terhadap harga normal', function () {
  const s = NT.state.createInitialState(t0);
  const seen = {};
  for (let m = 0; m < 120; m++) seen[E.priceSignal(s, 'jawa', 'batik', t0 + m * MIN).id] = true;
  assert.ok(seen.bagus && seen.rendah && seen.normal, 'ketiga isyarat muncul dalam 2 jam');
  const sig = E.priceSignal(s, 'jawa', 'padi', t0);
  assert.ok(Math.abs(sig.ratio - E.currentPrice(s, 'jawa', 'padi', t0) / E.normalPrice('jawa', 'padi')) < 1e-9);
});

test('priceSignal: tekanan jual besar membuat isyarat rendah', function () {
  const s = NT.state.createInitialState(t0);
  s.market.jawa.padi = { stock: 5000, updatedAt: t0 };
  assert.strictEqual(E.priceSignal(s, 'jawa', 'padi', t0).id, 'rendah');
});

test('statistik: collect, sell, upgrade, build, unlock menambah penghitung', function () {
  const s = NT.state.createInitialState(t0);
  s.cash = 1e6;
  E.collect(s, 'sawah', t0 + 10 * MIN);
  assert.strictEqual(s.stats.collects, 1);
  assert.ok(s.stats.produced >= 60);
  const sold = E.sell(s, 'padi', 'jawa', 10, t0 + 10 * MIN);
  assert.strictEqual(s.stats.sales, 1);
  assert.strictEqual(s.stats.sold, 10);
  assert.ok(Math.abs(s.stats.bestSale - sold.net) < 1e-9);
  E.upgradeBuilding(s, 'sawah', t0 + 11 * MIN);
  E.upgradeBuilding(s, 'sentra_batik', t0 + 11 * MIN);
  E.unlockRegion(s, 'sumatra');
  assert.strictEqual(s.stats.upgrades, 1);
  assert.strictEqual(s.stats.builds, 1);
  assert.strictEqual(s.stats.unlocks, 1);
});

test('upgrade yang mengamankan hasil otomatis tidak dihitung sebagai panen pemain', function () {
  const s = NT.state.createInitialState(t0);
  s.cash = 1e6;
  E.upgradeBuilding(s, 'sawah', t0 + 10 * MIN);
  assert.strictEqual(s.stats.collects, 0);
});

test('normalize: statistik, pencapaian, dan log aman untuk save lama dan data rusak', function () {
  const old = NT.state.normalize({ cash: 10, buildings: { sawah: { level: 1 } } }, t0);
  assert.strictEqual(old.stats.sales, 0);
  assert.deepStrictEqual(old.log, []);
  const bad = NT.state.normalize({ cash: 1, stats: { sales: -5, sold: 'x', playMs: 7 }, achievements: { a: 5, b: 'q' },
    log: [{ t: 1, i: '💰', x: 'ok' }, { t: 'z' }, null, { t: 2, x: 5 }] }, t0);
  assert.strictEqual(bad.stats.sales, 0);
  assert.strictEqual(bad.stats.sold, 0);
  assert.strictEqual(bad.stats.playMs, 7);
  assert.deepStrictEqual(Object.keys(bad.achievements), ['a']);
  assert.strictEqual(bad.log.length, 1);
});

test('panduan: langkah selesai mengikuti state, dan save lama berpenghasilan dianggap selesai sebagian', function () {
  const s = NT.state.createInitialState(t0);
  assert.strictEqual(NT.achievements.guide(s).done, 0);
  assert.strictEqual(NT.achievements.guide(s).current.id, 'collect');
  const veteran = NT.state.normalize({ cash: 5, totalEarned: 5000, buildings: { sawah: { level: 3 }, sentra_batik: { level: 1 } },
    regions: { jawa: { unlocked: true }, sumatra: { unlocked: true } } }, t0);
  assert.ok(NT.achievements.guide(veteran).complete);
});

test('pencapaian: terbuka sekali, tidak diulang, dan sesuai syarat', function () {
  const s = NT.state.createInitialState(t0);
  assert.strictEqual(NT.achievements.evaluate(s, t0).length, 0);
  s.cash = 1e6;
  E.collect(s, 'sawah', t0 + 10 * MIN);
  const first = NT.achievements.evaluate(s, t0 + 10 * MIN).map(function (a) { return a.id; });
  assert.deepStrictEqual(first, ['panen']);
  assert.strictEqual(NT.achievements.evaluate(s, t0 + 11 * MIN).length, 0);
  s.totalEarned = 30000;
  const more = NT.achievements.evaluate(s, t0 + 12 * MIN).map(function (a) { return a.id; });
  assert.ok(more.indexOf('juragan') !== -1 && more.indexOf('saudagar') !== -1 && more.indexOf('konglomerat') === -1);
});

test('pencapaian: id unik dan semua punya ikon, nama, deskripsi', function () {
  const ids = NT.achievements.list.map(function (a) { return a.id; });
  assert.strictEqual(new Set(ids).size, ids.length);
  NT.achievements.list.forEach(function (a) { assert.ok(a.icon && a.name && a.desc && typeof a.test === 'function'); });
});

test('cheapestUpgrade: memilih termurah, mengabaikan buka wilayah dan pekerjaan berjalan', function () {
  const s = NT.state.createInitialState(t0);
  const c = E.cheapestUpgrade(s);
  assert.strictEqual(c.kind, 'building');
  assert.strictEqual(c.id, 'sawah');
  assert.strictEqual(c.cost, E.buildingCost('sawah', 1));
  assert.notStrictEqual(E.nextGoal(s).kind, undefined);
  s.regions.jawa.infra.tol = 5; s.regions.jawa.infra.pelabuhan = 5;
  s.buildings.sawah.level = 40; s.buildings.sentra_batik = { level: 40, lastCollected: t0 };
  assert.ok(E.cheapestUpgrade(s).cost > 1000);
});

test('ambang gelar naik tegas dan semua wilayah yang bisa dimainkan punya bangunan', function () {
  for (let i = 1; i < NT.data.ranks.length; i++) assert.ok(NT.data.ranks[i].min > NT.data.ranks[i - 1].min * 2, 'gelar ' + i);
  Object.keys(NT.data.regions).forEach(function (id) {
    const r = NT.data.regions[id];
    if (!r.comingSoon) assert.ok(r.buildings.length > 0, id);
  });
});

console.log('\n' + passed + ' tes lolos');
