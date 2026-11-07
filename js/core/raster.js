/*
 * Mengubah poligon geografi (data/geo.js) menjadi grid sel untuk peta pixel art.
 * Murni (tanpa DOM) supaya bisa dites. Hasilnya dihitung sekali dan disimpan.
 */
(function (NT) {
  let cache = null;

  function pointInPolygon(x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }

  function build() {
    const G = NT.data.geo;
    const W = Math.ceil((G.lon1 - G.lon0) / G.cellDeg);
    const H = Math.ceil((G.lat0 - G.lat1) / G.cellDeg);
    const owner = new Array(W * H).fill(null);   // id wilayah pemilik sel, atau null = laut
    const ids = Object.keys(G.polygons);

    for (let cy = 0; cy < H; cy++) {
      const lat = G.lat0 - (cy + 0.5) * G.cellDeg;
      for (let cx = 0; cx < W; cx++) {
        const lon = G.lon0 + (cx + 0.5) * G.cellDeg;
        for (let k = 0; k < ids.length; k++) {
          const polys = G.polygons[ids[k]];
          let hit = false;
          for (let p = 0; p < polys.length && !hit; p++) hit = pointInPolygon(lon, lat, polys[p]);
          if (hit) { owner[cy * W + cx] = ids[k]; break; }
        }
      }
    }

    // Jarak ke daratan terdekat (sel), terbatas 3, untuk laut dangkal.
    const dist = new Array(W * H).fill(9);
    for (let i = 0; i < owner.length; i++) if (owner[i]) dist[i] = 0;
    for (let pass = 1; pass <= 3; pass++) {
      for (let cy = 0; cy < H; cy++) {
        for (let cx = 0; cx < W; cx++) {
          const i = cy * W + cx;
          if (dist[i] !== 9) continue;
          const near = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].some(function (d) {
            const x = cx + d[0], y = cy + d[1];
            return x >= 0 && y >= 0 && x < W && y < H && dist[y * W + x] === pass - 1;
          });
          if (near) dist[i] = pass;
        }
      }
    }
    return { W: W, H: H, owner: owner, dist: dist };
  }

  function grid() { if (!cache) cache = build(); return cache; }

  // Koordinat geografis -> sel dan piksel.
  function toCell(lon, lat) {
    const G = NT.data.geo;
    return { cx: (lon - G.lon0) / G.cellDeg, cy: (G.lat0 - lat) / G.cellDeg };
  }
  function toPx(lon, lat) {
    const G = NT.data.geo;
    const c = toCell(lon, lat);
    return { x: c.cx * G.cellPx, y: c.cy * G.cellPx };
  }
  // Pemilik sel pada koordinat (null = laut).
  function ownerAt(lon, lat) {
    const g = grid();
    const c = toCell(lon, lat);
    const x = Math.floor(c.cx), y = Math.floor(c.cy);
    if (x < 0 || y < 0 || x >= g.W || y >= g.H) return null;
    return g.owner[y * g.W + x];
  }

  NT.raster = { grid: grid, toCell: toCell, toPx: toPx, ownerAt: ownerAt, pointInPolygon: pointInPolygon };
})((window.NT = window.NT || {}));
