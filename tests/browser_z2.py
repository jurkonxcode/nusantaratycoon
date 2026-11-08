"""Uji browser Tahap Z2 (tekstur tajam, ukuran UI mengikuti zoom, penggaris km).
Butuh: pip install playwright && playwright install chromium
Jalankan dari akar repo: python3 tests/browser_z2.py
"""
import http.server, threading, functools, os, sys
from playwright.sync_api import sync_playwright

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
handler.log_message = lambda *a, **k: None
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:%d/index.html' % srv.server_address[1]

ok = fail = 0
def check(name, cond, extra=''):
    global ok, fail
    if cond: ok += 1; print('ok  ' + name)
    else: fail += 1; print('GAGAL ' + name + ((' -> ' + str(extra)) if extra != '' else ''))

SEED = """
  if (!localStorage.getItem('nt-seeded')) {
    localStorage.setItem('nt-seeded', '1');
    const now = Date.now();
    localStorage.setItem('nusantara-tycoon-save-v1', JSON.stringify({version:1, createdAt:now - 9*3600000, cash:5000, totalEarned:0,
      regions:{jawa:{unlocked:true,infra:{tol:0,pelabuhan:0}}, sumatra:{unlocked:true,infra:{tol:0,pelabuhan:0}}},
      buildings:{sawah:{level:1,lastCollected:now - 8*3600000}}, inventory:{padi:120}, market:{}}));
  }"""

def new_page(b, w, h, touch):
    ctx = b.new_context(viewport={'width': w, 'height': h}, has_touch=touch, is_mobile=touch)
    pg = ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    def route(r):
        u = r.request.url
        if u.endswith('js/config.js'):
            r.fulfill(body=r.fetch().text().replace("storage: 'supabase'", "storage: 'local'"), content_type='application/javascript')
        elif 'cdn.jsdelivr' in u: r.abort()
        else: r.continue_()
    pg.route('**/*', route)
    pg.add_init_script(SEED)
    return ctx, pg, errs

VB = "(() => { const v = document.querySelector('.map-svg').viewBox.baseVal; return [v.x, v.y, v.width, v.height]; })()"
# Titik dunia di bawah titik layar (clientX, clientY), lewat matriks layar SVG.
WORLD = """([x, y]) => { const s = document.querySelector('.map-svg'); const p = new DOMPoint(x, y).matrixTransform(s.getScreenCTM().inverse()); return [p.x, p.y]; }"""
def vb(pg): return pg.evaluate(VB)
def world(pg, x, y): return pg.evaluate(WORLD, [x, y])
def selected(pg): return pg.evaluate("document.querySelectorAll('.island.selected').length")
def stage_box(pg): return pg.locator('.map-scroll').bounding_box()
def island_center(pg, rid):
    b = pg.locator('.island[data-region="%s"] .pin-dot' % rid).bounding_box()
    return b['x'] + b['width'] / 2, b['y'] + b['height'] / 2

def pinch(cdp, a0, b0, a1, b1, steps=6):
    def pts(a, b): return [{'x': a[0], 'y': a[1], 'id': 1}, {'x': b[0], 'y': b[1], 'id': 2}]
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': pts(a0, b0)})
    for i in range(1, steps + 1):
        k = i / steps
        a = (a0[0] + (a1[0] - a0[0]) * k, a0[1] + (a1[1] - a0[1]) * k)
        b = (b0[0] + (b1[0] - b0[0]) * k, b0[1] + (b1[1] - b0[1]) * k)
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': pts(a, b)})
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})

def swipe(cdp, p0, p1, steps=8):
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': p0[0], 'y': p0[1], 'id': 1}]})
    for i in range(1, steps + 1):
        k = i / steps
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': p0[0] + (p1[0] - p0[0]) * k, 'y': p0[1] + (p1[1] - p0[1]) * k, 'id': 1}]})
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})


def hi_count(pg): return pg.evaluate("document.querySelectorAll('.map-svg image.hi').length")
def tstate(pg): return pg.evaluate("NT.ui.terrain.state()")
def ruler(pg): return pg.evaluate("(() => { const b = document.querySelector('.mr-bar'); return [document.querySelector('.mr-txt').textContent, b.getBoundingClientRect().width]; })()")
def label_h(pg): return pg.evaluate("document.querySelector('.island[data-region=\"jawa\"] .island-label').getBoundingClientRect().height")
def zoom_in_max(pg):
    for _ in range(30): pg.mouse.wheel(0, -300)

# Pembanding piksel: potongan jendela (k=2) harus identik dengan potongan peta penuh pada bagian dalam.
COMPARE = """() => {
  const T = NT.ui.terrain, K = T.K;
  const win = { x: 200, y: 80, w: 300, h: 160, k: K };
  const full = T.render(), part = T.render(win);
  const e = T.EDGE, ix = win.x + e, iy = win.y + e, iw = win.w - 2 * e, ih = win.h - 2 * e;
  function diff(a, b) {
    const A = a.getContext('2d').getImageData(ix * K, iy * K, iw * K, ih * K).data;
    const B = b.getContext('2d').getImageData((ix - win.x) * K, (iy - win.y) * K, iw * K, ih * K).data;
    let max = 0, sum = 0;
    for (let i = 0; i < A.length; i++) { const d = Math.abs(A[i] - B[i]); sum += d; if (d > max) max = d; }
    return [max, sum / A.length];
  }
  return { sea: diff(full.sea, part.sea), land: diff(full.land, part.land), px: [iw * K, ih * K] };
}"""

with sync_playwright() as p:
    b = p.chromium.launch()

    # =================== DESKTOP ===================
    ctx, pg, errs = new_page(b, 1280, 800, False)
    pg.goto(URL); pg.wait_for_timeout(1500)
    cmp = pg.evaluate(COMPARE)
    check('render jendela identik dengan potongan peta penuh (laut)', cmp['sea'][0] <= 2 and cmp['sea'][1] < 0.05, cmp)
    check('render jendela identik dengan potongan peta penuh (darat)', cmp['land'][0] <= 24 and cmp['land'][1] < 0.02, cmp)
    check('desktop: awal (pas layar) tidak memakai tekstur tajam', hi_count(pg) == 0 and tstate(pg) is None, hi_count(pg))
    r0 = ruler(pg)
    check('penggaris km tampil di tampilan awal (teks "N km", batang 40-110 px)', r0[0].endswith(' km') and 40 <= r0[1] <= 111, r0)
    lh0 = label_h(pg)
    box = stage_box(pg)
    pg.mouse.move(box['x'] + box['width'] * 0.45, box['y'] + box['height'] * 0.6)
    zoom_in_max(pg)
    pg.wait_for_timeout(300)
    check('desktop: sebelum jeda zoom selesai belum ada render tajam (debounce)', hi_count(pg) == 0, hi_count(pg))
    pg.wait_for_timeout(2500)
    st = tstate(pg)
    check('desktop: zoom maks -> tekstur tajam terpasang (k > 2)', st is not None and st['k'] > 2, st)
    n = hi_count(pg)
    check('desktop: gambar tajam dipasang untuk laut, tiap pulau, dan tetangga (9 gambar)', n == 9, n)
    r1 = ruler(pg)
    check('penggaris berubah saat zoom dan tetap 40-110 px', r1[0] != r0[0] and 40 <= r1[1] <= 111, (r0, r1))
    lh1 = label_h(pg)
    check('label pulau tidak ikut membesar 4x saat zoom 4x (<= 1,5x ukuran awal; tanpa LOD 4x)', lh1 <= lh0 * 1.5, (lh0, lh1))
    k1 = pg.evaluate("parseFloat(document.querySelector('.map-svg').style.getPropertyValue('--ui-k'))")
    check('variabel --ui-k mengecil di zoom maks (< 0,8)', 0.29 < k1 < 0.8, k1)
    # geser keluar area tajam -> render ulang mencakup area baru
    for _ in range(6): pg.mouse.move(box['x'] + 300, box['y'] + 150); pg.mouse.down(); pg.mouse.move(box['x'] + 60, box['y'] + 150, steps=8); pg.mouse.up()
    pg.wait_for_timeout(2500)
    st2 = tstate(pg)
    vbx = vb(pg)
    check('desktop: setelah geser jauh, area tajam mencakup tampilan baru', st2 is not None and st2['x'] <= vbx[0] + 1 and st2['x'] + st2['w'] >= vbx[0] + vbx[2] - 1, (st2, vbx))
    # kembali ke pas layar -> tekstur tajam dibuang
    pg.locator('[data-mz="reset"]').click(); pg.wait_for_timeout(2000)
    check('desktop: kembali ke pas layar membuang gambar tajam', hi_count(pg) == 0 and tstate(pg) is None, (hi_count(pg), tstate(pg)))
    check('desktop: label kembali ke ukuran awal', abs(label_h(pg) - lh0) < 1, (lh0, label_h(pg)))
    check('desktop: tanpa galat JS', not errs, errs)
    ctx.close()

    # =================== HP (sentuh, rasio piksel 3) ===================
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True, device_scale_factor=3)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    def route(r):
        u = r.request.url
        if u.endswith('js/config.js'): r.fulfill(body=r.fetch().text().replace("storage: 'supabase'", "storage: 'local'"), content_type='application/javascript')
        elif 'cdn.jsdelivr' in u: r.abort()
        else: r.continue_()
    pg.route('**/*', route); pg.add_init_script(SEED)
    pg.goto(URL); pg.wait_for_timeout(1500)
    sc = pg.evaluate("(() => { const v = document.querySelector('.map-svg').viewBox.baseVal; return document.querySelector('.map-scroll').getBoundingClientRect().width / v.width; })()")
    check('HP: tampilan awal sekitar 0,81 px/satuan -> tekstur dasar cukup untuk dpr 3? (perlu k > 2)', sc > 0.7, sc)
    # Perbesar sampai mentok lewat tombol +
    for _ in range(8):
        if pg.locator('[data-mz="in"]').is_enabled(): pg.locator('[data-mz="in"]').tap(); pg.wait_for_timeout(450)
    t0 = pg.evaluate("performance.now()")
    pg.wait_for_function("NT.ui.terrain.state() !== null", timeout=30000)
    dt = pg.evaluate("performance.now()") - t0
    st = tstate(pg)
    check('HP: render tajam selesai (k >= 3) dan area tajam cukup kecil untuk memori', st is not None and st['k'] >= 3 and (st['w'] + 60) * (st['h'] + 60) * st['k'] ** 2 <= 2400000 * 1.05, st)
    print('    (info) HP: menunggu render tajam %.0f ms (di Chromium desktop, bukan HP)' % dt)
    check('HP: gambar tajam terpasang', hi_count(pg) == 9, hi_count(pg))
    check('HP: tanpa galat JS', not errs, errs)
    ctx.close()
    b.close()

print('\n%d lolos, %d gagal' % (ok, fail))
sys.exit(1 if fail else 0)
