"""Uji browser Paket B (lembar wilayah di HP, pasar informatif).
Butuh: pip install playwright && playwright install chromium
Jalankan dari akar repo: python3 tests/browser_paket_b.py
"""
import http.server, threading, functools, json, time, os, sys
from playwright.sync_api import sync_playwright

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
handler.log_message = lambda *a, **k: None
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:%d/index.html' % srv.server_address[1]

ok = fail = 0
def check(name, cond):
    global ok, fail
    if cond: ok += 1; print('ok  ' + name)
    else: fail += 1; print('GAGAL ' + name)

def new_page(b, w, h):
    ctx = b.new_context(viewport={'width': w, 'height': h}, has_touch=(w < 700))
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
    pg.add_init_script("""
      if (!localStorage.getItem('nt-seeded')) {
        localStorage.setItem('nt-seeded', '1');
        const now = Date.now();
        localStorage.setItem('nusantara-tycoon-save-v1', JSON.stringify({version:1, createdAt:now, cash:5000, totalEarned:0,
          regions:{jawa:{unlocked:true,infra:{tol:0,pelabuhan:0}}, sumatra:{unlocked:true,infra:{tol:0,pelabuhan:0}}},
          buildings:{sawah:{level:1,lastCollected:now}}, inventory:{padi:120,batik:4}, market:{}}));
      }""")
    return pg, errs

with sync_playwright() as p:
    b = p.chromium.launch()

    # ---- HP 390px
    pg, errs = new_page(b, 390, 844)
    pg.goto(URL); pg.wait_for_timeout(700)
    key = pg.evaluate("NT.config.saveKey")
    pg.evaluate("(k)=>{}", key)
    check('HP: lembar tertutup saat awal', not pg.evaluate("document.getElementById('sheet').classList.contains('open')"))
    check('HP: panel wilayah tidak terlihat saat tertutup', not pg.locator('#region-panel').is_visible())
    pg.locator('.chip[data-id="sumatra"]').click(); pg.wait_for_timeout(500)
    check('HP: ketuk chip membuka lembar', pg.evaluate("document.getElementById('sheet').classList.contains('open')"))
    check('HP: panel wilayah terlihat', pg.locator('#region-panel').is_visible())
    check('HP: judul lembar = Sumatra', 'Sumatra' in pg.locator('#sheet-title').inner_text())
    box = pg.locator('#sheet-box').bounding_box()
    check('HP: lembar menempel di bawah dan tidak lebih dari 60% layar', box['y'] + box['height'] >= 843 and box['height'] <= 844 * 0.6)
    mapbox = pg.locator('.map-card').bounding_box()
    check('HP: peta tetap terlihat di atas lembar', mapbox['y'] >= -2 and mapbox['y'] < box['y'] - 100)
    pg.locator('#sheet-grab').click(); pg.wait_for_timeout(450)
    check('HP: tombol tutup menutup lembar', not pg.evaluate("document.getElementById('sheet').classList.contains('open')"))
    pg.locator('.chip[data-id="jawa"]').click(); pg.wait_for_timeout(400)
    pg.keyboard.press('Escape'); pg.wait_for_timeout(400)
    check('HP: Esc menutup lembar', not pg.evaluate("document.getElementById('sheet').classList.contains('open')"))
    check('HP: halaman tidak melebar ke samping', pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"))

    # ---- Pasar
    pg.locator('.tab[data-id="market"]').click(); pg.wait_for_timeout(500)
    check('Pasar: ada grafik di tiap kartu komoditas', pg.locator('.spark svg').count() >= 2)
    check('Pasar: grafik punya garis masa lalu dan masa depan', pg.locator('.sp-past').count() >= 2 and pg.locator('.sp-fut').count() >= 2)
    est = pg.locator('[data-live="sellall-est"]').first.inner_text()
    check('Pasar: tombol jual semua menampilkan perkiraan', '≈' in est)
    check('Pasar: kutipan jual semua per komoditas', 'bersih' in pg.locator('[data-live="quote"][data-c="padi"]').inner_text())
    cash0 = pg.evaluate("document.getElementById('stat-cash').textContent")
    pg.locator('.sell-everything').click(); pg.wait_for_timeout(500)
    inv = pg.evaluate("(()=>{const s=JSON.parse(localStorage.getItem(NT.config.saveKey)||'{}');return s})()")
    check('Pasar: jual semua mengosongkan gudang (UI)', pg.locator('[data-live="stock"][data-c="padi"]').inner_text() == '0')
    check('Pasar: tombol jual semua nonaktif saat gudang kosong', pg.locator('.sell-everything').is_disabled())
    check('Pasar: kas bertambah', pg.evaluate("document.getElementById('stat-cash').textContent") != cash0)
    check('HP: tanpa error JS', not errs)
    if errs: print(errs)
    pg.screenshot(path='/tmp/hp_pasar.png')
    pg.locator('.tab[data-id="map"]').click(); pg.locator('.chip[data-id="jawa"]').click(); pg.wait_for_timeout(600)
    pg.screenshot(path='/tmp/hp_sheet.png')

    # ---- Desktop 1280px
    pg2, errs2 = new_page(b, 1280, 800)
    pg2.goto(URL); pg2.wait_for_timeout(700)
    check('Desktop: panel wilayah langsung terlihat di kolom samping', pg2.locator('#region-panel').is_visible())
    check('Desktop: tombol tutup lembar tersembunyi', not pg2.locator('#sheet-grab').is_visible())
    sb = pg2.locator('#sheet-box').bounding_box(); mb = pg2.locator('.map-card').bounding_box()
    check('Desktop: panel di kanan peta, bukan menutupi', sb['x'] > mb['x'] + mb['width'] - 5)
    check('Desktop: tanpa error JS', not errs2)
    pg2.screenshot(path='/tmp/desk.png')
    b.close()

print('\n%d lolos, %d gagal' % (ok, fail))
sys.exit(1 if fail else 0)
