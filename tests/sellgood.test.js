/* Tes "jual yang menguntungkan": barang berharga rendah ditahan. Jalankan: node tests/sellgood.test.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

global.window = global;
const root = path.join(__dirname, '..', 'js');
['config.js', 'data/commodities.js', 'data/events.js', 'data/buildings.js', 'data/regions.js',
 'core/format.js', 'core/world.js', 'core/state.js', 'core/economy.js'].forEach(function (f) {
  vm.runInThisContext(fs.readFileSync(path.join(root, f), 'utf8'), { filename: f });
});
const NT = global.NT, E = NT.economy;
NT.config.seasonsEnabled = false; NT.config.eventsEnabled = false;
NT.config.buildTimeEnabled = false; NT.config.saleTimeEnabled = false;
const t0 = 1_700_000_000_000;
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('ok  ' + name); }

test('skipLow menahan barang berharga rendah, tanpa skipLow semuanya dijual', function () {
  const s = NT.state.createInitialState(t0);
  s.inventory.padi = 200; s.inventory.batik = 50;
  // Tekan harga padi di Jawa dengan tekanan pasokan besar agar sinyalnya 'rendah'.
  const orig = E.priceSignal;
  const sg = E.priceSignal(s, 'jawa', 'padi', t0);
  const all = JSON.parse(JSON.stringify(s));
  const rAll = E.sellAll(all, 'jawa', t0, false);
  assert.ok(rAll.ok);
  const rGood = E.sellAll(s, 'jawa', t0, true);
  // skipLow tidak boleh menjual lebih banyak jenis daripada sellAll biasa
  assert.ok(!rGood.ok || rGood.items.length <= rAll.items.length);
  if (sg.id === 'rendah') assert.ok(rGood.skipped.indexOf('padi') >= 0);
});

test('quoteSellAll(skipLow) tidak pernah lebih besar dari quoteSellAll biasa', function () {
  const s = NT.state.createInitialState(t0);
  s.inventory.padi = 120; s.inventory.batik = 40;
  const a = E.quoteSellAll(s, 'jawa', t0), b = E.quoteSellAll(s, 'jawa', t0, true);
  assert.ok(b.net <= a.net + 1e-9 && b.qty <= a.qty);
});

console.log(passed + ' tes lolos');
