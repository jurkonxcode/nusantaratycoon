/* Tes populasi (Fase 3). Jalankan: node tests/population.test.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

global.window = global;
const root = path.join(__dirname, '..', 'js');
[
  'config.js',
  'data/commodities.js', 'data/events.js', 'data/buildings.js', 'data/regions.js', 'data/exports.js',
  'core/format.js', 'core/world.js', 'core/state.js', 'core/economy.js', 'core/population.js'
].forEach(function (f) {
  vm.runInThisContext(fs.readFileSync(path.join(root, f), 'utf8'), { filename: f });
});

const NT = global.NT;
const E = NT.economy, Pop = NT.population, D = NT.data, C = NT.config;
NT.config.seasonsEnabled = false;
NT.config.eventsEnabled = false;
const MIN = 60000, HOUR = 3600000;
const t0 = 1_700_000_000_000;
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('ok  ' + name); }
function fresh() { return NT.state.createInitialState(t0); }
function near(a, b, tol, msg) { assert.ok(Math.abs(a - b) <= tol, (msg || '') + ' ' + a + ' vs ' + b); }

test('state awal punya penduduk untuk tiap wilayah yang bisa dimainkan; Jawa = 1,0', function () {
  const s = fresh();
  ['jawa', 'sumatra', 'sulawesi', 'kalimantan'].forEach(function (id) {
    assert.ok(s.population[id] && s.population[id].pop > 0, id);
    assert.strictEqual(s.population[id].at, t0);
  });
  assert.strictEqual(s.population.jawa.pop, 1);
  assert.strictEqual(s.population.bali_nusra, undefined);
});

test('awal permainan: Jawa stabil (kesejahteraan 50), harga dan kedalaman pasar tidak berubah', function () {
  const s = fresh();
  const i = Pop.info(s, 'jawa');
  near(i.welfare, 50, 0.01, 'welfare');
  assert.strictEqual(i.labor, 1);
  assert.strictEqual(Pop.priceMult(s, 'jawa'), 1);
  assert.strictEqual(Pop.depthMult(s, 'jawa'), 1);
  const noPop = E.currentPrice(s, 'jawa', 'padi', t0);
  const saved = s.population; s.population = {};
  assert.strictEqual(E.currentPrice(s, 'jawa', 'padi', t0), noPop);
  s.population = saved;
});

test('tanpa pangan kesejahteraan turun; dengan pangan, sandang, energi naik', function () {
  const s = fresh();
  delete s.buildings.sawah;
  const low = Pop.info(s, 'jawa').welfare;
  assert.ok(low < 15, 'tanpa pangan hanya swasembada: ' + low);
  s.buildings.sawah = { level: 5, lastCollected: t0 };
  const base = Pop.info(s, 'jawa').welfare;
  s.buildings.sentra_batik = { level: 3, lastCollected: t0 };
  const withBatik = Pop.info(s, 'jawa').welfare;
  assert.ok(withBatik > base + 20, 'sandang menambah ~25');
  s.regions.sumatra.unlocked = true;
  s.buildings.sumur_minyak = { level: 3, lastCollected: t0 };
  s.regions.jawa.infra.pelabuhan = 4; s.regions.sumatra.infra.pelabuhan = 4;
  assert.ok(Pop.info(s, 'jawa').welfare > withBatik + 20, 'energi dari Sumatra lewat pelabuhan');
  assert.ok(Pop.info(s, 'jawa').welfare <= 100);
});

test('jangkauan pelabuhan: pasokan dari wilayah lain bertambah tiap level pelabuhan', function () {
  const s = fresh();
  s.regions.sumatra.unlocked = true;
  const sat0 = Pop.info(s, 'sumatra').sat.pangan;
  s.regions.jawa.infra.pelabuhan = 2; s.regions.sumatra.infra.pelabuhan = 2;
  const sat1 = Pop.info(s, 'sumatra').sat.pangan;
  assert.ok(sat1 > sat0);
  assert.strictEqual(Pop.reach(s, 'jawa', 'jawa'), 1);
  s.regions.jawa.infra.pelabuhan = 5; s.regions.sumatra.infra.pelabuhan = 5;
  assert.strictEqual(Pop.reach(s, 'jawa', 'sumatra'), 1);
});

test('pertumbuhan dibatasi daya tampung (Perumahan menaikkannya)', function () {
  const s = fresh();
  s.buildings.sawah = { level: 8, lastCollected: t0 };
  s.buildings.sentra_batik = { level: 4, lastCollected: t0 };
  s.regions.sumatra.unlocked = true; s.buildings.sumur_minyak = { level: 3, lastCollected: t0 };
  s.regions.jawa.infra.pelabuhan = 4; s.regions.sumatra.infra.pelabuhan = 4;
  Pop.settle(s, t0 + 72 * HOUR);
  const cap0 = Pop.housingCap(s, 'jawa');
  assert.ok(s.population.jawa.pop > 1.2, 'tumbuh: ' + s.population.jawa.pop);
  assert.ok(s.population.jawa.pop <= cap0 + 1e-9, 'tidak melewati daya tampung');
  near(cap0, 1.6, 1e-9);
  s.regions.jawa.infra.perumahan = 2;
  near(Pop.housingCap(s, 'jawa'), 2.2, 1e-9);
  Pop.settle(s, t0 + 200 * HOUR);
  assert.ok(s.population.jawa.pop > cap0, 'tumbuh lagi setelah Perumahan dinaikkan');
});

test('penduduk turun bila kesejahteraan rendah tetapi tidak di bawah lantai 60%', function () {
  const s = fresh();
  delete s.buildings.sawah;
  Pop.settle(s, t0 + 72 * HOUR);
  assert.ok(s.population.jawa.pop < 1);
  Pop.settle(s, t0 + 72 * HOUR + 72 * HOUR);
  assert.ok(s.population.jawa.pop >= 0.6 - 1e-9, 'lantai: ' + s.population.jawa.pop);
});

test('pekerja: produksi turun bila kekurangan tenaga kerja, tidak di bawah 50%', function () {
  const s = fresh();
  s.population.jawa.pop = 1; // 20 pekerja
  s.buildings.sawah = { level: 10, lastCollected: t0 };   // butuh 5
  assert.strictEqual(Pop.laborFactor(s, 'jawa'), 1);
  const full = E.productionRate(s, 'sawah');
  s.buildings.sawah.level = 60;                            // butuh 30 -> 20/30
  near(Pop.laborFactor(s, 'jawa'), 20 / 30, 1e-9);
  near(E.productionRate(s, 'sawah'), 6 * 60 * (20 / 30), 1e-6);
  s.buildings.sawah.level = 400;                           // butuh 200 -> 0,1 -> lantai 0,5
  assert.strictEqual(Pop.laborFactor(s, 'jawa'), 0.5);
  assert.ok(full > 0);
});

test('upgrade bangunan: hasil bangunan lain di wilayah diamankan sebelum pekerja dibagi ulang', function () {
  const s = fresh();
  s.cash = 1e9;
  s.population.jawa.pop = 0.05; // 1 pekerja: sawah lv1 (0,5) cukup, lv3 tidak
  s.buildings.sawah = { level: 1, lastCollected: t0 };
  s.buildings.sentra_batik = { level: 1, lastCollected: t0 };
  const before = E.pending(s, 'sentra_batik', t0 + 10 * MIN);
  const r = E.upgradeBuilding(s, 'sawah', t0 + 10 * MIN);
  assert.ok(r.ok);
  if (r.queued) E.settle(s, t0 + 10 * MIN + r.durationMs);
  assert.ok((s.inventory.batik || 0) >= Math.floor(before) , 'hasil batik sebelum upgrade tidak hilang');
});

test('pajak per menit = penduduk x kesejahteraan/100 x tarif; dihitung benar setelah offline lama', function () {
  const s = fresh();
  s.buildings.sawah = { level: 4, lastCollected: t0 };   // pangan penuh: Jawa 50, stabil di 1,0
  const w = Pop.info(s, 'jawa').welfare;
  near(w, 50, 0.01);
  const expectPerMin = 1 * 50 / 100 * C.population.taxPerMin;
  near(Pop.taxPerMin(s), expectPerMin, 1e-6, 'taxPerMin');
  const cash0 = s.cash;
  const got = Pop.settle(s, t0 + 600 * MIN);   // 10 jam
  near(got, expectPerMin * 600, 1e-3, 'pajak 10 jam');
  near(s.cash - cash0, got, 1e-9);
  near(s.stats.tax, got, 1e-9);
  assert.strictEqual(s.totalEarned, 0, 'pajak bukan pendapatan dagang (panduan awal memakai totalEarned)');
  s.stats.tax = 5000;
  const sc = E.score(s); s.stats.tax = 0;
  assert.strictEqual(sc - E.score(s), 5, 'pajak tetap dihitung di skor');
  assert.strictEqual(s.population.jawa.at, t0 + 600 * MIN);
});

test('offline dibatasi maxOfflineHours dan settle tidak menghitung dua kali', function () {
  const a = fresh(), b = fresh();
  a.buildings.sawah = b.buildings.sawah = { level: 4, lastCollected: t0 };
  const ta = Pop.settle(a, t0 + 1000 * HOUR);
  const tb = Pop.settle(b, t0 + C.population.maxOfflineHours * HOUR);
  near(ta, tb, 1e-6, 'batas offline');
  assert.strictEqual(Pop.settle(a, t0 + 1000 * HOUR), 0, 'panggilan kedua tidak menambah');
  assert.strictEqual(Pop.settle(a, t0 + 1000 * HOUR + 5000), 0, 'langkah < 10 detik ditunda');
});

test('wilayah terkunci tidak membayar pajak dan jam-nya ikut maju (tidak ada pajak surut saat dibuka)', function () {
  const s = fresh();
  Pop.settle(s, t0 + 5 * HOUR);
  assert.strictEqual(s.population.sumatra.at, t0 + 5 * HOUR);
  assert.strictEqual(s.population.sumatra.pop, D.regions.sumatra.population.start);
  s.regions.sumatra.unlocked = true;
  const g = Pop.settle(s, t0 + 5 * HOUR + 30 * MIN);
  assert.ok(g < 0.5 * 60 * 16 * 1.6 * 0.5, 'hanya 30 menit');
});

test('normalize: save lama tanpa populasi diisi nilai awal; nilai buruk dibersihkan', function () {
  const old = fresh();
  const raw = JSON.parse(JSON.stringify(old));
  delete raw.population;
  Object.keys(raw.regions).forEach(function (id) { delete raw.regions[id].infra.perumahan; });
  const n = NT.state.normalize(raw, t0 + 99 * HOUR);
  assert.strictEqual(n.population.jawa.pop, 1);
  assert.strictEqual(n.population.jawa.at, t0 + 99 * HOUR, 'tanpa pajak surut');
  assert.strictEqual(n.regions.jawa.infra.perumahan, 0);
  const bad = JSON.parse(JSON.stringify(old));
  bad.population.jawa = { pop: -3, welfare: 900, at: t0 + 1e12 };
  const m = NT.state.normalize(bad, t0);
  assert.strictEqual(m.population.jawa.pop, 1);
  assert.strictEqual(m.population.jawa.welfare, 50);
  assert.strictEqual(m.population.jawa.at, t0);
  const ok = JSON.parse(JSON.stringify(old));
  ok.population.jawa = { pop: 1.3, welfare: 70, at: t0 - HOUR };
  const k = NT.state.normalize(ok, t0);
  assert.strictEqual(k.population.jawa.pop, 1.3);
  assert.strictEqual(k.population.jawa.at, t0 - HOUR);
});

test('harga dan kedalaman pasar naik mengikuti penduduk', function () {
  const s = fresh();
  s.population.jawa.pop = 1.5;
  near(Pop.priceMult(s, 'jawa'), Math.pow(1.5, 0.35), 1e-9);
  near(Pop.depthMult(s, 'jawa'), Math.pow(1.5, 0.6), 1e-9);
  const hi = E.quoteSale(s, 'padi', 'jawa', 100, t0).revenue;
  s.population.jawa.pop = 1;
  const lo = E.quoteSale(s, 'padi', 'jawa', 100, t0).revenue;
  assert.ok(hi > lo);
  s.population.sumatra.pop = 100;
  assert.strictEqual(Pop.depthMult(s, 'sumatra'), C.population.depthMax);
});

test('fitur bisa dimatikan: tanpa pengaruh pada produksi, harga, dan pajak', function () {
  const s = fresh();
  s.buildings.sawah = { level: 400, lastCollected: t0 };
  C.population.enabled = false;
  assert.strictEqual(Pop.laborFactor(s, 'jawa'), 1);
  assert.strictEqual(Pop.priceMult(s, 'jawa'), 1);
  assert.strictEqual(Pop.settle(s, t0 + 10 * HOUR), 0);
  assert.strictEqual(Pop.info(s, 'jawa'), null);
  C.population.enabled = true;
});

test('ekspor tidak terpengaruh penduduk (pasar luar negeri)', function () {
  const s = fresh();
  s.regions.jawa.infra.pelabuhan = 1;
  const a = E.quoteExport(s, 'teh', 'singapura', 50, t0).revenue;
  s.population.jawa.pop = 2;
  assert.strictEqual(E.quoteExport(s, 'teh', 'singapura', 50, t0).revenue, a);
});

console.log(passed + ' tes lolos');
