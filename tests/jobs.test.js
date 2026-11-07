/* Tes timer pembangunan. Jalankan: node tests/jobs.test.js */
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
NT.config.seasonsEnabled = false;
NT.config.eventsEnabled = false;
const MIN = 60000, SEC = 1000;
const t0 = 1_700_000_000_000;
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('ok  ' + name); }
function rich() { const s = NT.state.createInitialState(t0); s.cash = 1e9; return s; }

test('durasi naik tiap level dan lebih lama untuk bangunan mahal', function () {
  const d = [0, 1, 2, 3, 4].map(function (l) { return E.buildDuration('sawah', l); });
  for (let i = 1; i < d.length; i++) assert.ok(d[i] > d[i - 1] * 1.5, 'level ' + i);
  assert.strictEqual(d[0], 10 * SEC);
  assert.ok(E.buildDuration('kebun_cengkeh', 0) > E.buildDuration('sawah', 0));
  assert.ok(E.infraDuration('sulawesi', 0) > E.infraDuration('jawa', 0));
});

test('upgrade memotong kas di muka tapi level baru naik setelah timer habis', function () {
  const s = rich();
  const cost = E.buildingCost('sawah', 1);
  const r = E.upgradeBuilding(s, 'sawah', t0);
  assert.ok(r.ok && r.queued);
  assert.strictEqual(s.cash, 1e9 - cost);
  assert.strictEqual(E.buildingLevel(s, 'sawah'), 1);
  assert.strictEqual(E.settle(s, t0 + r.durationMs - 1).length, 0);
  assert.strictEqual(E.buildingLevel(s, 'sawah'), 1);
  const done = E.settle(s, t0 + r.durationMs);
  assert.strictEqual(done.length, 1);
  assert.strictEqual(E.buildingLevel(s, 'sawah'), 2);
  assert.strictEqual(s.jobs.length, 0);
});

test('produksi memakai laju lama sampai timer habis, laju baru sesudahnya', function () {
  const s = rich();
  const r = E.upgradeBuilding(s, 'sawah', t0); // lv1 -> lv2, durasi 19 detik
  const end = t0 + r.durationMs;
  E.settle(s, end + 60 * SEC); // diselesaikan terlambat (misalnya pemain offline)
  // 19 detik x 6/menit = 1,9 unit (laju lama), lalu 60 detik x 12/menit = 12 unit
  const pend = E.pending(s, 'sawah', end + 60 * SEC);
  assert.ok(Math.abs((pend + s.inventory.padi) - (6 * 19 / 60 + 12)) < 0.01, 'total ' + (pend + s.inventory.padi));
});

test('bangunan baru mulai berproduksi setelah selesai dibangun, bukan sebelumnya', function () {
  const s = rich();
  const r = E.upgradeBuilding(s, 'sentra_batik', t0);
  assert.ok(r.built && r.queued);
  assert.strictEqual(E.buildingLevel(s, 'sentra_batik'), 0);
  E.settle(s, t0 + r.durationMs + 5 * MIN);
  assert.strictEqual(E.buildingLevel(s, 'sentra_batik'), 1);
  assert.strictEqual(s.buildings.sentra_batik.lastCollected, t0 + r.durationMs);
});

test('jumlah tukang dibatasi dan satu bangunan tidak bisa dobel antre', function () {
  const s = rich();
  assert.ok(E.upgradeBuilding(s, 'sawah', t0).ok);
  assert.strictEqual(E.upgradeBuilding(s, 'sawah', t0).ok, false);
  assert.ok(E.upgradeBuilding(s, 'sentra_batik', t0).ok);
  const third = E.upgradeInfra(s, 'jawa', 'tol', t0);
  assert.strictEqual(third.ok, false);
  assert.ok(/tukang/i.test(third.reason));
  E.settle(s, t0 + 10 * MIN);
  assert.ok(E.upgradeInfra(s, 'jawa', 'tol', t0 + 10 * MIN).ok);
});

test('percepat membayar sebagian biaya sesuai sisa waktu dan langsung menyelesaikan', function () {
  const s = rich();
  const r = E.upgradeBuilding(s, 'sawah', t0);
  const job = s.jobs[0];
  const full = E.speedupCost(job, t0);
  const half = E.speedupCost(job, t0 + r.durationMs / 2);
  assert.ok(half < full && half >= Math.floor(full / 2) - 1);
  const before = s.cash;
  const sp = E.speedup(s, 'b:sawah', t0 + r.durationMs / 2);
  assert.ok(sp.ok);
  assert.strictEqual(before - s.cash, half);
  assert.strictEqual(E.buildingLevel(s, 'sawah'), 2);
  assert.strictEqual(E.speedup(s, 'b:sawah', t0).ok, false);
});

test('percepat ditolak bila kas kurang', function () {
  const s = rich();
  E.upgradeBuilding(s, 'sawah', t0);
  s.cash = 0;
  assert.strictEqual(E.speedup(s, 'b:sawah', t0).ok, false);
  assert.strictEqual(s.jobs.length, 1);
});

test('tol baru berlaku setelah selesai dan hasil lama diamankan', function () {
  const s = rich();
  const r = E.upgradeInfra(s, 'jawa', 'tol', t0);
  assert.ok(r.queued);
  assert.strictEqual(E.infraLevel(s, 'jawa', 'tol'), 0);
  E.settle(s, t0 + r.durationMs);
  assert.strictEqual(E.infraLevel(s, 'jawa', 'tol'), 1);
  assert.ok(s.inventory.padi > 0);
});

test('normalize menjaga pembangunan yang valid dan membuang yang rusak', function () {
  const s = rich();
  E.upgradeBuilding(s, 'sawah', t0);
  const saved = JSON.parse(JSON.stringify(s));
  saved.jobs.push({ key: 'x', kind: 'building', id: 'tidak_ada', region: 'jawa', startedAt: 1, endsAt: 2 });
  const n = NT.state.normalize(saved, t0);
  assert.strictEqual(n.jobs.length, 1);
  assert.strictEqual(n.jobs[0].key, 'b:sawah');
  assert.deepStrictEqual(NT.state.normalize(null, t0).jobs, []);
});

test('target berikutnya memilih opsi termurah', function () {
  const s = NT.state.createInitialState(t0);
  const g = E.nextGoal(s);
  assert.ok(g && g.cost > 0 && g.label);
  assert.ok(E.incomePerMin(s, t0) > 0);
});

console.log('\n' + passed + ' tes lolos');
