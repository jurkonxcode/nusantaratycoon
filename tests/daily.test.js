/* Tes misi harian dan hadiah login. Jalankan: node tests/daily.test.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

global.window = global;
const root = path.join(__dirname, '..', 'js');
['config.js', 'data/commodities.js', 'data/events.js', 'data/buildings.js', 'data/regions.js', 'data/exports.js',
 'core/format.js', 'core/world.js', 'core/state.js', 'core/economy.js', 'core/population.js', 'core/daily.js', 'core/achievements.js'].forEach(function (f) {
  vm.runInThisContext(fs.readFileSync(path.join(root, f), 'utf8'), { filename: f });
});
const NT = global.NT, DL = NT.daily;
NT.config.seasonsEnabled = false; NT.config.eventsEnabled = false;
const DAY = 86400000;
// 2026-11-08 12:00 WIB = 05:00 UTC
const t0 = Date.UTC(2026, 10, 8, 5, 0, 0);
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('ok  ' + name); }
function fresh() { const s = NT.state.createInitialState(t0); DL.sync(s, t0); return s; }

test('hari berganti pukul 00.00 WIB (bukan UTC)', function () {
  assert.strictEqual(DL.dayKey(Date.UTC(2026, 10, 8, 16, 59, 0)), '2026-11-08');   // 23:59 WIB
  assert.strictEqual(DL.dayKey(Date.UTC(2026, 10, 8, 17, 0, 0)), '2026-11-09');    // 00:00 WIB
});

test('sync memilih 3 misi berbeda, deterministik, dan tidak mengulang di hari yang sama', function () {
  const a = fresh(), b = fresh();
  assert.strictEqual(a.daily.picks.length, 3);
  assert.strictEqual(new Set(a.daily.picks).size, 3);
  assert.deepStrictEqual(a.daily.picks, b.daily.picks);
  assert.strictEqual(DL.sync(a, t0 + 1000), false);
  assert.ok(a.daily.unit >= NT.config.daily.unitMin);
});

test('misi ekspor hanya muncul bila ada pelabuhan', function () {
  for (let i = 0; i < 40; i++) {
    const s = NT.state.createInitialState(t0);
    DL.sync(s, t0 + i * DAY);
    assert.ok(s.daily.picks.indexOf('export') < 0);
  }
  let seen = false;
  for (let i = 0; i < 40; i++) {
    const s = NT.state.createInitialState(t0);
    s.regions.jawa.infra.pelabuhan = 1;
    DL.sync(s, t0 + i * DAY);
    if (s.daily.picks.indexOf('export') >= 0) seen = true;
  }
  assert.ok(seen);
});

test('kemajuan misi = selisih dari awal hari; klaim butuh selesai dan tidak bisa dua kali', function () {
  const s = fresh();
  const id = s.daily.picks[0];
  const row = function () { return DL.view(s, t0).missions.filter(function (x) { return x.id === id; })[0]; };
  assert.strictEqual(row().have, 0);
  assert.strictEqual(DL.claim(s, id, t0).ok, false);
  // penuhi semua metrik sekaligus
  s.stats.collects += 50; s.stats.sales += 50; s.stats.builds += 50; s.stats.exports += 50; s.totalEarned += 1e9;
  assert.ok(row().done);
  const cash0 = s.cash;
  const r = DL.claim(s, id, t0);
  assert.ok(r.ok);
  assert.strictEqual(s.cash, cash0 + s.daily.unit);
  assert.strictEqual(DL.claim(s, id, t0).ok, false);
  assert.strictEqual(s.totalEarned, 1e9 + 0, 'hadiah tidak boleh masuk totalEarned');
});

test('bonus hanya setelah semua misi diambil, sekali saja', function () {
  const s = fresh();
  s.stats.collects += 50; s.stats.sales += 50; s.stats.builds += 50; s.stats.exports += 50; s.totalEarned += 1e9;
  assert.strictEqual(DL.claim(s, 'bonus', t0).ok, false);
  s.daily.picks.forEach(function (id) { assert.ok(DL.claim(s, id, t0).ok); });
  const cash0 = s.cash;
  assert.ok(DL.claim(s, 'bonus', t0).ok);
  assert.strictEqual(s.cash, cash0 + s.daily.unit * NT.config.daily.bonusUnits);
  assert.strictEqual(DL.claim(s, 'bonus', t0).ok, false);
});

test('hadiah login: naik tiap hari berturut-turut, putus bila bolos, hari ke-7 terbesar', function () {
  const s = fresh();
  const U = NT.config.daily.loginUnits;
  let t = t0, last = 0;
  for (let d = 1; d <= 7; d++) {
    DL.sync(s, t);
    const before = s.cash;
    assert.ok(DL.claim(s, 'login', t).ok);
    const got = s.cash - before;
    assert.strictEqual(got, Math.round(s.daily.unit * U[d - 1]));
    assert.ok(got >= last); last = got;
    assert.strictEqual(DL.claim(s, 'login', t).ok, false, 'tidak bisa dua kali sehari');
    t += DAY;
  }
  assert.strictEqual(s.daily.streak, 7);
  // hari ke-8 kembali ke awal siklus tetapi rangkaian terus naik
  DL.sync(s, t); DL.claim(s, 'login', t);
  assert.strictEqual(s.daily.streak, 8);
  assert.strictEqual(DL.loginInfo(s, t).dayInCycle, 1);
  // bolos 2 hari: rangkaian putus
  t += 3 * DAY; DL.sync(s, t);
  assert.strictEqual(DL.loginInfo(s, t).streak, 0);
  DL.claim(s, 'login', t);
  assert.strictEqual(s.daily.streak, 1);
  assert.strictEqual(s.daily.best, 8);
});

test('hari baru mengosongkan klaim dan mengganti foto statistik', function () {
  const s = fresh();
  s.stats.collects += 99; s.totalEarned += 5000;
  DL.sync(s, t0 + DAY);
  assert.deepStrictEqual(s.daily.claimed, []);
  assert.strictEqual(s.daily.base.collects, 99);
  DL.view(s, t0 + DAY).missions.forEach(function (m) { assert.strictEqual(m.have, 0); });
});

test('fresh() memberi tahu misi selesai sekali saja', function () {
  const s = fresh();
  s.stats.collects += 50; s.stats.sales += 50; s.stats.builds += 50; s.stats.exports += 50; s.totalEarned += 1e9;
  assert.strictEqual(DL.fresh(s, t0).length, 3);
  assert.strictEqual(DL.fresh(s, t0).length, 0);
});

test('normalize: save lama tanpa daily aman; data rusak dibersihkan; round-trip JSON', function () {
  const old = JSON.parse(JSON.stringify(fresh())); delete old.daily;
  const n = NT.state.normalize(old, t0);
  assert.strictEqual(n.daily.day, '');
  assert.ok(DL.sync(n, t0));
  const bad = JSON.parse(JSON.stringify(fresh()));
  bad.daily.day = 'kemarin'; bad.daily.streak = -5; bad.daily.picks = [1, 'collect', null]; bad.daily.unit = 'x';
  const m = NT.state.normalize(bad, t0);
  assert.strictEqual(m.daily.day, ''); assert.strictEqual(m.daily.streak, 0);
  assert.deepStrictEqual(m.daily.picks, ['collect']); assert.strictEqual(m.daily.unit, 0);
  const s = fresh(); s.daily.streak = 4; s.daily.best = 4; s.daily.lastClaim = s.daily.day;
  const r = NT.state.normalize(JSON.parse(JSON.stringify(s)), t0);
  assert.deepStrictEqual(r.daily, s.daily);
});

test('pencapaian Rutin/Konsisten/Pemburu Misi membaca state.daily', function () {
  const s = fresh();
  const ids = function () { return NT.achievements.evaluate(s, t0).map(function (a) { return a.id; }); };
  assert.ok(ids().indexOf('rutin') < 0);
  s.daily.best = 3; assert.ok(ids().indexOf('rutin') >= 0);
  s.daily.best = 7; s.daily.total = 10;
  const got = ids(); assert.ok(got.indexOf('konsisten') >= 0 && got.indexOf('misi') >= 0);
});

console.log('\n' + passed + ' tes lolos');
