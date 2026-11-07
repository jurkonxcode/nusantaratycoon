/*
 * Cetak tabel keseimbangan: harga, laju, dan waktu balik modal tiap bangunan.
 * Jalankan: node tools/balance.js
 * Pakai ini setiap mengubah harga, laju, atau biaya, supaya kurva kemajuan tidak patah.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
global.window = global;
const root = path.join(__dirname, '..', 'js');
['config.js', 'data/commodities.js', 'data/events.js', 'data/buildings.js', 'data/regions.js', 'core/format.js',
 'core/world.js', 'core/state.js', 'core/economy.js'].forEach(function (f) {
  vm.runInThisContext(fs.readFileSync(path.join(root, f), 'utf8'), { filename: f });
});
const NT = global.NT, D = NT.data, E = NT.economy;
NT.config.seasonsEnabled = false; NT.config.eventsEnabled = false;
const s = NT.state.createInitialState(0);

function pad(x, n) { x = String(x); return x + ' '.repeat(Math.max(0, n - x.length)); }

console.log('KOMODITAS (harga game per karung, harga pasar terbaik, ongkir terjauh)');
Object.keys(D.commodities).forEach(function (id) {
  const c = D.commodities[id];
  const ships = Object.keys(D.regions).filter(function (r) { return !D.regions[r].comingSoon && r !== c.region; })
    .map(function (r) { return D.regions[r].name + ' ' + E.shippingPerUnit(s, id, r).toFixed(1); }).join(', ');
  console.log(' ' + pad(c.name, 8) + 'Rp ' + pad(c.basePrice, 6) + ' ongkir: ' + ships);
});

console.log('\nJARAK RUTE LAUT (km)');
const ids = Object.keys(D.regions);
ids.forEach(function (a, i) { ids.slice(i + 1).forEach(function (b) {
  console.log(' ' + pad(a + '-' + b, 24) + Math.round(E.distanceKm(a, b)));
}); });

console.log('\nBALIK MODAL level 1 (menit, di pasar terbaik tanpa ongkir)');
Object.keys(D.buildings).forEach(function (id) {
  const b = D.buildings[id], c = D.commodities[b.produces];
  let best = 0;
  Object.keys(D.regions).forEach(function (r) {
    if (D.regions[r].comingSoon) return;
    best = Math.max(best, E.normalPrice(r, c.id) - E.shippingPerUnit(s, c.id, r));
  });
  const flow = b.baseRate * best;
  console.log(' ' + pad(b.name, 16) + pad('laju ' + b.baseRate + '/mnt', 14) + pad('aliran Rp ' + flow.toFixed(0) + '/mnt', 20) +
    'balik modal ' + (b.baseCost / flow).toFixed(1) + ' mnt');
});
