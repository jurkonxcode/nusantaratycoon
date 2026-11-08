/* Tes logika zoom dan pan peta. Jalankan: node tests/viewport.test.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

global.window = global;
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'core', 'viewport.js'), 'utf8'), { filename: 'core/viewport.js' });

const V = global.NT.viewport;
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('ok  ' + name); }
const near = function (a, b, eps, msg) { assert.ok(Math.abs(a - b) <= (eps || 1e-6), (msg || '') + ' ' + a + ' vs ' + b); };

const world = { w: 936, h: 378 };
// Tiga ukuran kotak: desktop (rasio sama dengan peta), HP potret, HP lanskap.
const boxes = { desktop: { w: 1000, h: 1000 * 378 / 936 }, phone: { w: 360, h: 420 }, wide: { w: 800, h: 300 } };
function ctxOf(box) { return { world: world, box: box, maxZoom: 4, maxPx: 2.4 }; }

// Pseudo-acak deterministik supaya tes bisa diulang.
let seed = 12345;
function rnd() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }

function inside(view, ctx) {
  const visW = ctx.box.w / view.scale, visH = ctx.box.h / view.scale, e = 1e-6;
  const okX = visW >= ctx.world.w ? true : (view.x >= -e && view.x + visW <= ctx.world.w + e);
  const okY = visH >= ctx.world.h ? true : (view.y >= -e && view.y + visH <= ctx.world.h + e);
  return okX && okY;
}

test('fitView memuat seluruh peta dan memakai skala minimum', function () {
  Object.keys(boxes).forEach(function (k) {
    const ctx = ctxOf(boxes[k]), v = V.fitView(ctx);
    near(v.scale, V.limits(ctx).min, 1e-9, k);
    const visW = ctx.box.w / v.scale, visH = ctx.box.h / v.scale;
    assert.ok(visW >= world.w - 1e-6 && visH >= world.h - 1e-6, k + ': seluruh peta harus terlihat');
    // peta berada di tengah pada sumbu yang berlebih
    near(v.x + visW / 2, world.w / 2, 1e-6, k);
    near(v.y + visH / 2, world.h / 2, 1e-6, k);
  });
});

test('batas zoom: minimum = pas layar; maksimum = lebih besar dari 4x dan maxPx', function () {
  const d = V.limits(ctxOf(boxes.desktop));
  near(d.max, d.min * 4, 1e-9, 'desktop (4x lebih besar dari 2,4 px)');
  const p = V.limits(ctxOf(boxes.phone));
  near(p.max, 2.4, 1e-9, 'HP memakai maxPx karena 4x pas layar masih kecil');
  assert.ok(p.max > p.min * 4);
});

test('clampView tidak pernah membiarkan layar keluar dari peta (2000 acak)', function () {
  Object.keys(boxes).forEach(function (k) {
    const ctx = ctxOf(boxes[k]), lim = V.limits(ctx);
    for (let i = 0; i < 2000; i++) {
      const raw = { x: (rnd() - 0.5) * 4000, y: (rnd() - 0.5) * 2000, scale: lim.min * (0.2 + rnd() * 30) };
      const v = V.clampView(raw, ctx);
      assert.ok(inside(v, ctx), k + ' ' + JSON.stringify(v));
      assert.ok(v.scale >= lim.min - 1e-9 && v.scale <= lim.max + 1e-9, 'skala di luar batas');
    }
  });
});

test('zoomAt menjaga titik di bawah jari tetap diam', function () {
  Object.keys(boxes).forEach(function (k) {
    const ctx = ctxOf(boxes[k]), lim = V.limits(ctx);
    let checked = 0;
    for (let i = 0; i < 500; i++) {
      // mulai dari view yang sudah di dalam batas dan tidak terlalu dekat batas skala
      const start = V.clampView({ x: 100 + rnd() * 500, y: 40 + rnd() * 150, scale: lim.min * (1.5 + rnd()) }, ctx);
      const sx = ctx.box.w * (0.25 + rnd() * 0.5), sy = ctx.box.h * (0.25 + rnd() * 0.5), f = 1.1 + rnd() * 0.5;
      const before = V.toWorld(start, sx, sy);
      const after = V.toWorld(V.zoomAt(start, f, sx, sy, ctx), sx, sy);
      // tetap diam, kecuali bila pemotongan batas peta menggesernya (tepi) atau skala terbentur batas
      const moved = Math.hypot(before.x - after.x, before.y - after.y);
      const z = V.zoomAt(start, f, sx, sy, ctx);
      const wantX = before.x - sx / z.scale, wantY = before.y - sy / z.scale;
      const free = Math.abs(z.x - wantX) < 1e-9 && Math.abs(z.y - wantY) < 1e-9;   // tidak terpotong tepi
      if (free) { near(moved, 0, 1e-6, k); checked++; }
    }
    assert.ok(checked > 30, k + ': terlalu sedikit kasus yang bisa dicek (' + checked + ')');
  });
});

test('zoom lalu zoom balik di titik yang sama = view semula', function () {
  const ctx = ctxOf(boxes.desktop), lim = V.limits(ctx);
  const start = V.clampView({ x: 300, y: 100, scale: lim.min * 2 }, ctx);
  const sx = 500, sy = 200;
  const there = V.zoomAt(start, 1.5, sx, sy, ctx);
  const back = V.zoomAt(there, 1 / 1.5, sx, sy, ctx);
  near(back.scale, start.scale, 1e-9); near(back.x, start.x, 1e-6); near(back.y, start.y, 1e-6);
});

test('zoom berlebih berhenti di batas dan tidak melewatinya', function () {
  const ctx = ctxOf(boxes.desktop), lim = V.limits(ctx);
  let v = V.fitView(ctx);
  for (let i = 0; i < 40; i++) v = V.zoomAt(v, 1.4, 300, 100, ctx);
  near(v.scale, lim.max, 1e-9);
  for (let i = 0; i < 60; i++) v = V.zoomAt(v, 0.7, 300, 100, ctx);
  near(v.scale, lim.min, 1e-9);
  assert.ok(inside(v, ctx));
});

test('panBy: jari ke kanan menggeser peta ke kanan, dan terkunci di tepi', function () {
  const ctx = ctxOf(boxes.phone), lim = V.limits(ctx);
  let v = V.centerOn({ x: 0, y: 0, scale: lim.max }, 468, 189, ctx, lim.max);
  const x0 = v.x;
  const moved = V.panBy(v, 50, 0, ctx);
  near(moved.x, x0 - 50 / v.scale, 1e-9);
  for (let i = 0; i < 200; i++) v = V.panBy(v, 300, 300, ctx);   // seret terus ke kanan-bawah
  near(v.x, 0, 1e-9); near(v.y, 0, 1e-9);
  for (let i = 0; i < 400; i++) v = V.panBy(v, -300, -300, ctx);
  near(v.x + ctx.box.w / v.scale, world.w, 1e-6);
  near(v.y + ctx.box.h / v.scale, world.h, 1e-6);
});

test('centerOn menaruh titik dunia di tengah kotak (bila tidak terbentur tepi)', function () {
  const ctx = ctxOf(boxes.phone), lim = V.limits(ctx);
  const v = V.centerOn(V.fitView(ctx), 450, 190, ctx, lim.max * 0.8);
  const c = V.toWorld(v, ctx.box.w / 2, ctx.box.h / 2);
  near(c.x, 450, 1e-6); near(c.y, 190, 1e-6);
});

test('simpan lalu pulihkan memberi view yang sama, juga setelah kotak berubah ukuran', function () {
  const ctx = ctxOf(boxes.phone), lim = V.limits(ctx);
  const v = V.centerOn(V.fitView(ctx), 400, 150, ctx, lim.max * 0.7);
  const saved = JSON.parse(JSON.stringify(V.serialize(v, ctx)));
  const back = V.restore(saved, ctx);
  near(back.scale, v.scale, 1e-3); near(back.x, v.x, 0.2); near(back.y, v.y, 0.2);
  const other = ctxOf({ w: 420, h: 360 });                      // layar diputar
  const r = V.restore(saved, other);
  assert.ok(inside(r, other));
  const c = V.toWorld(r, other.box.w / 2, other.box.h / 2);
  near(c.x, saved.cx, 0.2); near(c.y, saved.cy, 0.2);
});

test('restore menolak data rusak', function () {
  const ctx = ctxOf(boxes.desktop);
  [null, undefined, {}, { cx: 'a', cy: 1, z: 1 }, { cx: 1, cy: NaN, z: 1 }, { cx: 1, cy: 1, z: Infinity }].forEach(function (bad) {
    assert.strictEqual(V.restore(bad, ctx), null);
  });
  // nilai ekstrem tetap dipotong ke dalam batas
  assert.ok(inside(V.restore({ cx: 1e9, cy: -1e9, z: 999 }, ctx), ctx));
});

test('pinch: jari menjauh = zoom in di titik tengah; titik tengah ikut menggeser', function () {
  const ctx = ctxOf(boxes.desktop), lim = V.limits(ctx);
  const v = V.clampView({ x: 300, y: 100, scale: lim.min * 2 }, ctx);
  const a0 = { x: 400, y: 200 }, b0 = { x: 500, y: 200 };
  const wBefore = V.toWorld(v, 450, 200);
  const z = V.pinch(v, a0, b0, { x: 375, y: 200 }, { x: 525, y: 200 }, ctx);   // jarak 100 -> 150, tengah tetap
  near(z.scale, v.scale * 1.5, 1e-9);
  const wAfter = V.toWorld(z, 450, 200);
  near(wAfter.x, wBefore.x, 1e-6); near(wAfter.y, wBefore.y, 1e-6);
  const p = V.pinch(v, a0, b0, { x: 430, y: 220 }, { x: 530, y: 220 }, ctx);    // jarak sama, tengah bergeser (30, 20)
  near(p.scale, v.scale, 1e-9);
  near(p.x, v.x - 30 / v.scale, 1e-6); near(p.y, v.y - 20 / v.scale, 1e-6);
});

test('viewBoxOf konsisten dengan ukuran kotak dan skala', function () {
  const ctx = ctxOf(boxes.desktop), v = V.centerOn(V.fitView(ctx), 450, 190, ctx, V.limits(ctx).min * 3);
  const parts = V.viewBoxOf(v, ctx).split(' ').map(Number);
  near(parts[2] * v.scale, ctx.box.w, 0.5); near(parts[3] * v.scale, ctx.box.h, 0.5);
  near(parts[0], v.x, 0.01); near(parts[1], v.y, 0.01);
});

console.log(passed + ' tes lolos');
