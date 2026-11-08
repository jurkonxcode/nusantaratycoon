/*
 * Logika zoom dan geser (pan) peta. Murni, tanpa DOM, supaya bisa dites di Node.
 *
 * Istilah:
 *   world = { w, h }        ukuran peta dalam satuan viewBox (mis. 936 x 378)
 *   box   = { w, h }        ukuran kotak tampilan peta di layar, dalam piksel CSS
 *   view  = { x, y, scale } x,y = titik dunia yang berada di pojok kiri-atas kotak;
 *                           scale = piksel layar per satuan dunia
 *   ctx   = { world, box, maxZoom, maxPx }   batas zoom:
 *           minimum = peta pas di kotak (seluruh peta terlihat),
 *           maksimum = lebih besar dari antara (minimum x maxZoom) dan maxPx piksel per satuan,
 *           supaya di HP (peta kecil) zoom tetap cukup besar.
 * Semua fungsi mengembalikan view baru dan tidak mengubah masukan.
 */
(function (NT) {
  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  // Skala yang membuat seluruh peta muat di kotak.
  function fitScale(ctx) {
    return Math.min(ctx.box.w / ctx.world.w, ctx.box.h / ctx.world.h);
  }

  function limits(ctx) {
    const min = fitScale(ctx);
    const max = Math.max(min * (ctx.maxZoom || 4), ctx.maxPx || 0);
    return { min: min, max: max };
  }

  // Tahan view di dalam peta. Bila bagian yang terlihat lebih besar dari peta pada satu sumbu,
  // peta dipusatkan pada sumbu itu (tidak ada tepi yang bisa digeser).
  function clampView(view, ctx) {
    const lim = limits(ctx);
    const scale = clamp(view.scale, lim.min, lim.max);
    const visW = ctx.box.w / scale, visH = ctx.box.h / scale;
    const x = visW >= ctx.world.w ? (ctx.world.w - visW) / 2 : clamp(view.x, 0, ctx.world.w - visW);
    const y = visH >= ctx.world.h ? (ctx.world.h - visH) / 2 : clamp(view.y, 0, ctx.world.h - visH);
    return { x: x, y: y, scale: scale };
  }

  // Titik dunia di bawah titik layar (px, py) yang diukur dari pojok kiri-atas kotak.
  function toWorld(view, px, py) {
    return { x: view.x + px / view.scale, y: view.y + py / view.scale };
  }

  // Zoom dengan faktor tertentu; titik dunia di bawah (sx, sy) tetap diam (kecuali terbentur batas).
  function zoomAt(view, factor, sx, sy, ctx) {
    const lim = limits(ctx);
    const scale = clamp(view.scale * factor, lim.min, lim.max);
    const w = toWorld(view, sx, sy);
    return clampView({ x: w.x - sx / scale, y: w.y - sy / scale, scale: scale }, ctx);
  }

  // Geser peta mengikuti jari: dx, dy dalam piksel layar (jari ke kanan = peta ke kanan).
  function panBy(view, dx, dy, ctx) {
    return clampView({ x: view.x - dx / view.scale, y: view.y - dy / view.scale, scale: view.scale }, ctx);
  }

  // Pusatkan titik dunia (wx, wy) di tengah kotak; scale opsional (bawaan: skala sekarang).
  function centerOn(view, wx, wy, ctx, scale) {
    const s = scale == null ? view.scale : scale;
    const sc = clamp(s, limits(ctx).min, limits(ctx).max);
    return clampView({ x: wx - ctx.box.w / sc / 2, y: wy - ctx.box.h / sc / 2, scale: sc }, ctx);
  }

  // Tampilan yang memuat seluruh peta.
  function fitView(ctx) {
    return clampView({ x: 0, y: 0, scale: fitScale(ctx) }, ctx);
  }

  // Nilai atribut viewBox SVG untuk view ini.
  function viewBoxOf(view, ctx) {
    return [view.x, view.y, ctx.box.w / view.scale, ctx.box.h / view.scale].map(function (n) { return +n.toFixed(2); }).join(' ');
  }

  // Bentuk ringkas untuk disimpan: pusat dunia dan zoom relatif terhadap "pas layar",
  // supaya tetap masuk akal saat layar diputar atau ukurannya berubah.
  function serialize(view, ctx) {
    const c = toWorld(view, ctx.box.w / 2, ctx.box.h / 2);
    return { cx: +c.x.toFixed(1), cy: +c.y.toFixed(1), z: +(view.scale / fitScale(ctx)).toFixed(3) };
  }

  function restore(saved, ctx) {
    if (!saved || [saved.cx, saved.cy, saved.z].some(function (n) { return typeof n !== 'number' || !isFinite(n); })) return null;
    return centerOn({ x: 0, y: 0, scale: fitScale(ctx) }, saved.cx, saved.cy, ctx, saved.z * fitScale(ctx));
  }

  // Pinch dua jari: dari posisi dua jari sebelum (a0, b0) dan sesudah (a1, b1), hasilkan view baru.
  // Titik tengah ikut bergeser, jadi pinch sekaligus menggeser.
  function pinch(view, a0, b0, a1, b1, ctx) {
    const d0 = Math.hypot(b0.x - a0.x, b0.y - a0.y), d1 = Math.hypot(b1.x - a1.x, b1.y - a1.y);
    const m0 = { x: (a0.x + b0.x) / 2, y: (a0.y + b0.y) / 2 }, m1 = { x: (a1.x + b1.x) / 2, y: (a1.y + b1.y) / 2 };
    const factor = d0 > 0 && d1 > 0 ? d1 / d0 : 1;
    const zoomed = zoomAt(view, factor, m0.x, m0.y, ctx);
    return panBy(zoomed, m1.x - m0.x, m1.y - m0.y, ctx);
  }

  NT.viewport = {
    fitScale: fitScale, limits: limits, clampView: clampView, toWorld: toWorld, zoomAt: zoomAt, panBy: panBy,
    centerOn: centerOn, fitView: fitView, viewBoxOf: viewBoxOf, serialize: serialize, restore: restore, pinch: pinch
  };
})((window.NT = window.NT || {}));
