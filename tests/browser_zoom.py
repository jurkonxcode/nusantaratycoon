"""Uji browser Tahap Z1 (zoom dan geser peta).
Butuh: pip install playwright && playwright install chromium
Jalankan dari akar repo: python3 tests/browser_zoom.py
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

with sync_playwright() as p:
    b = p.chromium.launch()

    # =================== DESKTOP (mouse) ===================
    ctx, pg, errs = new_page(b, 1280, 800, False)
    pg.goto(URL); pg.wait_for_timeout(900)
    box = stage_box(pg)
    v0 = vb(pg)
    check('desktop: tampilan awal memuat seluruh peta', v0[0] < 1 and v0[1] < 1 and abs(v0[2] - 936) < 2 and abs(v0[3] - 378) < 2, v0)
    check('desktop: tombol + / - / reset ada, - mati di zoom minimum',
          pg.locator('.mz-btn').count() == 3 and pg.locator('[data-mz="out"]').is_disabled() and pg.locator('[data-mz="in"]').is_enabled())

    # roda mouse: zoom ke arah kursor, titik di bawah kursor tetap diam
    cx, cy = box['x'] + box['width'] * 0.62, box['y'] + box['height'] * 0.55
    w_before = world(pg, cx, cy)
    pg.mouse.move(cx, cy)
    for _ in range(4): pg.mouse.wheel(0, -120); pg.wait_for_timeout(40)
    pg.wait_for_timeout(150)
    v1 = vb(pg); w_after = world(pg, cx, cy)
    check('desktop: roda mouse memperbesar', v1[2] < v0[2] * 0.7, v1)
    check('desktop: titik di bawah kursor tetap diam saat zoom', abs(w_before[0] - w_after[0]) < 1.5 and abs(w_before[1] - w_after[1]) < 1.5, (w_before, w_after))

    # batas atas zoom (maks 4x dari pas layar), tidak bisa keluar peta
    for _ in range(30): pg.mouse.wheel(0, -300)
    pg.wait_for_timeout(250)
    vmax = vb(pg)
    check('desktop: zoom berhenti di 4x', abs(936 / vmax[2] - 4) < 0.05, vmax)
    check('desktop: tombol + mati di zoom maksimum', pg.locator('[data-mz="in"]').is_disabled())
    check('desktop: layar tidak keluar dari peta', vmax[0] >= -0.01 and vmax[1] >= -0.01 and vmax[0] + vmax[2] <= 936.01 and vmax[1] + vmax[3] <= 378.01, vmax)

    # reset
    pg.locator('[data-mz="reset"]').click(); pg.wait_for_timeout(600)
    v = vb(pg)
    check('desktop: tombol reset mengembalikan seluruh peta', abs(v[2] - 936) < 2 and v[0] < 1, v)

    # tombol +
    pg.locator('[data-mz="in"]').click(); pg.wait_for_timeout(600)
    check('desktop: tombol + memperbesar 1,6x', abs(936 / vb(pg)[2] - 1.6) < 0.05, vb(pg))
    pg.locator('[data-mz="in"]').click(); pg.locator('[data-mz="in"]').click(); pg.wait_for_timeout(700)

    # geser dengan mouse; geseran yang dimulai di atas pulau TIDAK boleh memilih pulau
    pg.evaluate("NT.ui.map.focus('jawa')"); pg.wait_for_timeout(600)
    jx, jy = island_center(pg, 'jawa')
    sb = stage_box(pg)
    check('desktop: focus() membawa pin Jawa ke dalam kotak peta', sb['x'] < jx < sb['x'] + sb['width'] and sb['y'] < jy < sb['y'] + sb['height'], (jx, jy, sb))
    vs = vb(pg); wj_before = world(pg, jx, jy)
    sel_before = selected(pg)
    pg.mouse.move(jx, jy); pg.mouse.down()
    for i in range(1, 11): pg.mouse.move(jx - 8 * i, jy + 3 * i); pg.wait_for_timeout(10)
    pg.mouse.up(); pg.wait_for_timeout(250)
    vp_ = vb(pg); wj_after = world(pg, jx - 80, jy + 30)
    check('desktop: geser mouse memindahkan peta', abs(vp_[0] - vs[0]) > 5, (vs, vp_))
    check('desktop: titik yang diseret ikut bergerak bersama kursor', abs(wj_before[0] - wj_after[0]) < 2 and abs(wj_before[1] - wj_after[1]) < 2, (wj_before, wj_after))
    check('desktop: geseran di atas pulau tidak memilih pulau', selected(pg) == sel_before, selected(pg))

    # ketukan biasa tetap memilih pulau
    pg.locator('[data-mz="reset"]').click(); pg.wait_for_timeout(600)
    sx, sy = island_center(pg, 'sumatra')
    pg.mouse.click(sx, sy); pg.wait_for_timeout(500)
    check('desktop: klik pulau tetap memilih pulau', pg.evaluate("document.querySelector('.island[data-region=\"sumatra\"]').classList.contains('selected')"))
    check('desktop: memilih pulau tidak mengubah zoom saat seluruh peta terlihat', abs(vb(pg)[2] - 936) < 2, vb(pg))

    # klik gelembung hasil siap tetap berfungsi
    pg.wait_for_timeout(1300)
    nb = pg.locator('.bubble.on').count()
    check('desktop: ada gelembung hasil siap', nb >= 1, nb)
    if nb:
        bb = pg.locator('.bubble.on').first.bounding_box()
        pg.mouse.click(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2); pg.wait_for_timeout(1500)
        check('desktop: klik gelembung masih mengumpulkan hasil', pg.locator('.bubble.on').count() < nb, pg.locator('.bubble.on').count())

    # ketuk dua kali di laut: zoom
    pg.locator('[data-mz="reset"]').click(); pg.wait_for_timeout(600)
    box = stage_box(pg)
    seax, seay = box['x'] + box['width'] * 0.08, box['y'] + box['height'] * 0.9
    pg.mouse.dblclick(seax, seay); pg.wait_for_timeout(600)
    # (dblclick mouse menghasilkan dua pointerup berurutan, sama seperti ketuk dua kali)
    check('desktop: ketuk dua kali di laut memperbesar', vb(pg)[2] < 936 * 0.7, vb(pg))

    # ingat posisi: muat ulang, posisi pulih; save game tidak berisi data peta
    pg.mouse.move(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
    for _ in range(3): pg.mouse.wheel(0, -120)
    pg.wait_for_timeout(900)
    before = vb(pg)
    stored = pg.evaluate("localStorage.getItem('nusantara-tycoon-mapview-v1')")
    check('desktop: posisi zoom disimpan di kunci sendiri', stored is not None and '"cx"' in stored, stored)
    save = pg.evaluate("localStorage.getItem('nusantara-tycoon-save-v1')")
    check('desktop: save game tidak tersentuh data peta', save is not None and 'cx' not in save and 'viewBox' not in save)
    pg.reload(); pg.wait_for_timeout(900)
    after = vb(pg)
    check('desktop: posisi dan zoom pulih setelah muat ulang', abs(after[2] - before[2]) < 2 and abs(after[0] - before[0]) < 3 and abs(after[1] - before[1]) < 3, (before, after))

    # data tersimpan rusak tidak merusak peta
    pg.evaluate("localStorage.setItem('nusantara-tycoon-mapview-v1', '{\"cx\":\"x\"')")
    pg.reload(); pg.wait_for_timeout(900)
    check('desktop: data posisi rusak diabaikan (kembali ke seluruh peta)', abs(vb(pg)[2] - 936) < 2, vb(pg))

    # update() tidak mereset zoom: perbesar, lalu tunggu beberapa detik (tickJobs/update berjalan)
    pg.locator('[data-mz="in"]').click(); pg.wait_for_timeout(600)
    z = vb(pg); pg.wait_for_timeout(2500)
    check('desktop: pembaruan lapisan dinamis tidak mereset zoom', vb(pg) == z, (z, vb(pg)))
    check('desktop: tidak ada galat JS', not errs, errs)
    ctx.close()

    # =================== HP (sentuh) ===================
    ctx, pg, errs = new_page(b, 390, 844, True)
    pg.goto(URL); pg.wait_for_timeout(900)
    cdp = ctx.new_cdp_session(pg)
    # Gulir halaman di luar peta (pada halaman bersih): harus menggulung halaman.
    swipe(cdp, (60, 300), (60, 50), 10); pg.wait_for_timeout(600)
    check('HP: gulir vertikal di luar peta tetap menggulung halaman', pg.evaluate("window.scrollY") > 100, pg.evaluate("window.scrollY"))
    pg.evaluate("window.scrollTo(0, 0)"); pg.wait_for_timeout(300)
    sel0 = selected(pg)
    box = stage_box(pg)
    v0 = vb(pg)
    scale0 = box['width'] / v0[2]
    check('HP: tampilan awal sekitar 0,81 px/satuan (setara peta lebar 760 px)', abs(scale0 - 0.81) < 0.03, scale0)
    jx = world(pg, box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)[0]
    jpin = pg.evaluate("NT.raster.toPx(...NT.data.regions.jawa.map.pin).x")
    check('HP: tampilan awal berpusat di sekitar Jawa', abs(jx - jpin) < 40, (jx, jpin))
    check('HP: tidak ada gulir samping pada kotak peta', pg.evaluate("document.querySelector('.map-scroll').scrollWidth <= document.querySelector('.map-scroll').clientWidth + 1"))
    check('HP: kotak peta cukup tinggi untuk disentuh (>= 280 px)', box['height'] >= 280, box['height'])

    # pinch: jari menjauh -> zoom in, titik tengah tetap
    mx, my = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2
    wm_before = world(pg, mx, my)
    pinch(cdp, (mx - 40, my), (mx + 40, my), (mx - 90, my), (mx + 90, my))
    pg.wait_for_timeout(300)
    v1 = vb(pg); wm_after = world(pg, mx, my)
    check('HP: pinch memperbesar peta', v1[2] < v0[2] * 0.7, (v0, v1))
    check('HP: pinch menjaga titik tengah tetap diam', abs(wm_before[0] - wm_after[0]) < 3 and abs(wm_before[1] - wm_after[1]) < 3, (wm_before, wm_after))
    check('HP: pinch tidak men-zoom halaman', pg.evaluate("window.visualViewport.scale") == 1 and pg.evaluate("window.scrollX") == 0, pg.evaluate("window.visualViewport.scale"))
    check('HP: pinch tidak mengubah pilihan pulau', selected(pg) == sel0)

    # pinch mengecil sampai batas minimum
    pinch(cdp, (mx - 120, my), (mx + 120, my), (mx - 10, my), (mx + 10, my), 8)
    pinch(cdp, (mx - 120, my), (mx + 120, my), (mx - 10, my), (mx + 10, my), 8)
    pg.wait_for_timeout(300)
    vmin = vb(pg)
    check('HP: pinch kecil berhenti saat seluruh peta terlihat', vmin[2] >= 936 - 2 and vmin[0] <= 1, vmin)

    # zoom lagi, lalu geser satu jari
    pinch(cdp, (mx - 40, my), (mx + 40, my), (mx - 100, my), (mx + 100, my)); pg.wait_for_timeout(200)
    pinch(cdp, (mx - 40, my), (mx + 40, my), (mx - 100, my), (mx + 100, my)); pg.wait_for_timeout(300)
    va = vb(pg)
    sy0 = window_y = box['y'] + box['height'] * 0.5
    swipe(cdp, (box['x'] + 280, sy0), (box['x'] + 80, sy0)); pg.wait_for_timeout(300)
    vbb = vb(pg)
    check('HP: geser satu jari menggerakkan peta (jari ke kiri = peta ke kiri)', vbb[0] > va[0] + 5, (va, vbb))
    check('HP: geseran satu jari tidak mengubah pilihan pulau', selected(pg) == sel0)
    check('HP: geseran tidak menggulung halaman', pg.evaluate("window.scrollY") == 0, pg.evaluate("window.scrollY"))

    # ketuk pulau (sentuh) memilih pulau
    pg.locator('[data-mz="reset"]').tap(); pg.wait_for_timeout(600)
    pg.evaluate("document.querySelector('.island[data-region=\"jawa\"]').scrollIntoView && 0")
    tx, ty = island_center(pg, 'jawa')
    bx = stage_box(pg)
    if bx['x'] <= tx <= bx['x'] + bx['width'] and bx['y'] <= ty <= bx['y'] + bx['height']:
        pg.touchscreen.tap(tx, ty); pg.wait_for_timeout(600)
        check('HP: ketuk pulau memilih pulau', pg.evaluate("document.querySelector('.island[data-region=\"jawa\"]').classList.contains('selected')"))
    else:
        check('HP: pin Jawa terlihat di kotak peta setelah reset', False, (tx, ty, bx))

    check('HP: tidak ada galat JS', not errs, errs)
    ctx.close()
    b.close()

print('\n%d lolos, %d gagal' % (ok, fail))
sys.exit(1 if fail else 0)
