/* Tes durasi level tinggi, penjualan berwaktu, dan ekspor. Jalankan: node tests/timing.test.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

global.window = global;
const root = path.join(__dirname, '..', 'js');
[
  'config.js',
  'data/commodities.js', 'data/events.js', 'data/buildings.js', 'data/regions.js', 'data/exports.js',
  'core/format.js', 'core/world.js', 'core/state.js', 'core/economy.js'
].forEach(function (f) {
  vm.runInThisContext(fs.readFileSync(path.join(root, f), 'utf8'), { filename: f });
});

const NT = global.NT;
const E = NT.economy;
NT.config.seasonsEnabled = false;
NT.config.eventsEnabled = false;
const MIN = 60000, HOUR = 3600000, SEC = 1000;
const t0 = 1_700_000_000_000;
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('ok  ' + name); }
function rich() {
  const s = NT.state.createInitialState(t0); s.cash = 1e9;
  Object.keys(s.regions).forEach(function (r) { s.regions[r].unlocked = true; });
  return s;
}

test('durasi level 0-2 tetap, setelah level 2 naik lebih curam', function () {
  const d = [0, 1, 2, 3, 4, 5].map(function (l) { return E.buildDuration('sawah', l); });
  assert.strictEqual(d[0], 10 * SEC);
  assert.ok(Math.abs(d[1] / d[0] - 1.9) < 0.1);
  assert.ok(Math.abs(d[2] / d[1] - 1.9) < 0.1);
  assert.ok(d[3] / d[2] > 2.3, 'level 2->3 harus lebih curam dari 1.9x');
  assert.ok(d[5] / d[4] > 2.3);
});

test('durasi punya batas atas (72 jam)', function () {
  assert.ok(E.buildDuration('tambang_batubara', 30) <= 72 * HOUR);
  assert.ok(E.infraDuration('kalimantan', 30) <= 72 * HOUR);
});

test('jual di wilayah asal: truk cepat, tidak memakai slot kapal', function () {
  const s = rich(); s.inventory.padi = 20;
  const r = E.sell(s, 'padi', 'jawa', 20, t0);
  assert.ok(r.ok && r.queued);
  assert.strictEqual(r.durationMs, 15 * SEC);
  assert.strictEqual(s.cash, 1e9, 'kas belum masuk');
  assert.strictEqual(E.slotsUsed(s), 0);
  assert.strictEqual(E.settleShipments(s, t0 + 14 * SEC).length, 0);
  const done = E.settleShipments(s, t0 + 15 * SEC);
  assert.strictEqual(done.length, 1);
  assert.ok(Math.abs(s.cash - (1e9 + r.net)) < 1e-6);
  assert.ok(Math.abs(s.totalEarned - r.net) < 1e-6);
});

test('jual antar pulau: butuh slot, lebih lama, dipercepat pelabuhan', function () {
  const s = rich(); s.inventory.padi = 10;
  const slow = E.saleDuration(s, 'padi', 'sumatra');
  assert.ok(slow > 10 * MIN, 'antar pulau lebih dari 10 menit');
  s.regions.jawa.infra.pelabuhan = 3;
  assert.ok(E.saleDuration(s, 'padi', 'sumatra') < slow);
  const r = E.sell(s, 'padi', 'sumatra', 10, t0);
  assert.ok(r.ok);
  assert.strictEqual(E.slotsUsed(s), 1);
});

test('slot kapal penuh menolak pengiriman laut baru', function () {
  const s = rich();
  const n = E.shipSlots(s);
  for (let i = 0; i < n; i++) { s.inventory.padi = 5; assert.ok(E.sell(s, 'padi', 'sumatra', 5, t0).ok); }
  s.inventory.padi = 5;
  const r = E.sell(s, 'padi', 'sumatra', 5, t0);
  assert.ok(!r.ok && /kapal/i.test(r.reason));
  assert.strictEqual(s.inventory.padi, 5, 'barang tidak hilang saat ditolak');
  E.settleShipments(s, t0 + 48 * HOUR);
  assert.ok(E.sell(s, 'padi', 'sumatra', 5, t0 + 48 * HOUR).ok);
});

test('ekspor butuh pelabuhan level minimum di wilayah asal', function () {
  const s = rich(); s.inventory.kopi = 50;
  let r = E.exportGoods(s, 'kopi', 'singapura', 10, t0);
  assert.ok(!r.ok && /Pelabuhan level 1/.test(r.reason));
  s.regions.sumatra.infra.pelabuhan = 1;
  r = E.exportGoods(s, 'kopi', 'singapura', 10, t0);
  assert.ok(r.ok, r.reason);
  assert.ok(Math.abs(r.durationMs - 1 * HOUR * (1 - 0.06)) < 1000, 'sekitar 1 jam dikurangi bonus pelabuhan');
  r = E.exportGoods(s, 'kopi', 'jepang', 10, t0);
  assert.ok(!r.ok && /level 2/.test(r.reason));
});

test('durasi ekspor dari 1 jam sampai lebih dari 24 jam', function () {
  const s = rich();
  s.regions.sumatra.infra.pelabuhan = 1;
  const sg = E.exportDuration(s, 'kopi', 'singapura');
  const nl = E.exportDuration(s, 'kopi', 'belanda');
  assert.ok(sg >= 0.9 * HOUR && sg <= 1 * HOUR);
  assert.ok(nl > 24 * HOUR);
  s.regions.sumatra.infra.pelabuhan = 5;
  assert.ok(E.exportDuration(s, 'kopi', 'belanda') > 24 * HOUR, 'pelabuhan maks tetap > 24 jam');
});

test('ekspor: muatan dibatasi pelabuhan, kas masuk saat tiba, harga lebih tinggi dari lokal', function () {
  const s = rich(); s.regions.jawa.infra.pelabuhan = 2; s.inventory.batik = 1000;
  assert.ok(!E.exportGoods(s, 'batik', 'jepang', 241, t0).ok, 'maks 120 x level 2 = 240');
  const q = E.quoteExport(s, 'batik', 'jepang', 50, t0);
  const local = E.quoteSale(s, 'batik', 'jawa', 50, t0);
  assert.ok(q.revenue > local.revenue, 'harga ekspor lebih tinggi');
  const r = E.exportGoods(s, 'batik', 'jepang', 50, t0);
  assert.ok(r.ok, r.reason);
  assert.strictEqual(s.inventory.batik, 950);
  assert.strictEqual(s.cash, 1e9);
  assert.strictEqual(E.settleShipments(s, t0 + r.durationMs - 1).length, 0);
  assert.strictEqual(E.settleShipments(s, t0 + r.durationMs).length, 1);
  assert.ok(Math.abs(s.cash - (1e9 + r.net)) < 1e-6);
  assert.strictEqual(s.stats.exports, 1);
});

test('ekspor ditolak bila ongkir lebih mahal dari hasil jual', function () {
  const s = rich(); s.regions.kalimantan.infra.pelabuhan = 4; s.inventory.sawit = 100;
  const r = E.exportGoods(s, 'sawit', 'belanda', 100, t0);
  // sawit murah dan Belanda jauh: boleh rugi tipis atau ditolak, tetapi tidak boleh menghasilkan kas negatif
  if (r.ok) assert.ok(r.net > 0); else assert.ok(/Ongkir/.test(r.reason));
});

test('pengiriman tersimpan dan dipulihkan lewat normalize (offline)', function () {
  const s = rich(); s.regions.sumatra.infra.pelabuhan = 1; s.inventory.kopi = 30;
  const r = E.exportGoods(s, 'kopi', 'singapura', 30, t0);
  assert.ok(r.ok);
  const saved = JSON.parse(JSON.stringify(s));
  saved.shipments.push({ id: 'rusak', kind: 'export', market: 'mars', commodity: 'kopi', qty: 1, net: 1, startedAt: t0, endsAt: t0 + 1 });
  const s2 = NT.state.normalize(saved, t0 + 2 * HOUR);
  assert.strictEqual(s2.shipments.length, 1, 'yang rusak dibuang');
  const before = s2.cash;
  assert.strictEqual(E.settleShipments(s2, t0 + 2 * HOUR).length, 1);
  assert.ok(s2.cash > before);
});

test('sellAll memakai pengiriman berwaktu dan melaporkan durasi', function () {
  const s = rich(); s.inventory.padi = 20; s.inventory.batik = 5;
  const r = E.sellAll(s, 'jawa', t0);
  assert.ok(r.ok && r.queued && r.durationMs === 15 * SEC);
  assert.strictEqual(s.shipments.length, 2);
});

console.log('\n' + passed + ' tes lolos');
