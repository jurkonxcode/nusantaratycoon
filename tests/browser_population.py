"""Tes antarmuka populasi (Fase 3): kotak Penduduk di panel wilayah, tanpa galat JS, pembaruan live, Perumahan.
Jalankan dari akar repo: python3 tests/browser_population.py  (opsional: --shot lokasi.png)"""
import http.server, threading, functools, os, sys
from playwright.sync_api import sync_playwright

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
handler.log_message = lambda *a, **k: None
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:%d/index.html' % srv.server_address[1]
SHOT = sys.argv[sys.argv.index('--shot') + 1] if '--shot' in sys.argv else None

ok = fail = 0
def check(name, cond, extra=''):
    global ok, fail
    if cond: ok += 1; print('ok  ' + name)
    else: fail += 1; print('GAGAL ' + name + ((' -> ' + str(extra)) if extra != '' else ''))

def route(r):
    u = r.request.url
    if u.endswith('js/config.js'): r.fulfill(body=r.fetch().text().replace("storage: 'supabase'", "storage: 'local'"), content_type='application/javascript')
    elif 'cdn.jsdelivr' in u: r.abort()
    else: r.continue_()

with sync_playwright() as p:
    b = p.chromium.launch()
    for name, w, h, touch in (('desktop', 1280, 800, False), ('HP 390', 390, 780, True)):
        ctx = b.new_context(viewport={'width': w, 'height': h}, has_touch=touch, is_mobile=touch, device_scale_factor=2 if touch else 1)
        pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.route('**/*', route)
        pg.goto(URL); pg.wait_for_selector('.map-svg .island'); pg.wait_for_timeout(1500)
        pg.evaluate("document.querySelector('.island[data-region=\"jawa\"]').dispatchEvent(new MouseEvent('click', {bubbles: true}))")
        pg.wait_for_selector('[data-live="popbox"] .pop-box', timeout=3000)
        txt = pg.inner_text('[data-live="popbox"]')
        check(name + ': kotak Penduduk tampil dengan jiwa, kesejahteraan, pajak', 'juta jiwa' in txt and 'Kesejahteraan' in txt and 'Pajak' in txt, txt[:200])
        check(name + ': Jawa awal sekitar 150 juta jiwa dan kesejahteraan 50', '150 juta' in txt and '50' in txt, txt[:120])
        check(name + ': baris Perumahan ada di Infrastruktur', pg.locator('text=Perumahan').count() >= 1)
        over = pg.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1")
        check(name + ': tanpa luapan horizontal', over)
        pg.evaluate("window.__sig = document.querySelector('[data-live=\"popbox\"]').getAttribute('data-sig')")
        pg.wait_for_timeout(2500)
        check(name + ': pembaruan tiap detik tidak menimbulkan galat', not errs, errs)
        if SHOT and name == 'HP 390':
            pg.locator('#region-panel').scroll_into_view_if_needed()
            pg.locator('[data-live="popbox"]').scroll_into_view_if_needed()
            pg.screenshot(path=SHOT)
        # buka Sumatra (terkunci -> tidak ada kotak), lalu cek wilayah segera hadir tidak error
        pg.evaluate("document.querySelector('.island[data-region=\"maluku\"]').dispatchEvent(new MouseEvent('click', {bubbles: true}))")
        pg.wait_for_timeout(300)
        check(name + ': wilayah segera hadir tidak memunculkan kotak penduduk', pg.locator('[data-live="popbox"]').count() == 0)
        check(name + ': tanpa galat JS', not errs, errs)
        ctx.close()
    b.close()
print('\n%d lolos, %d gagal' % (ok, fail))
sys.exit(1 if fail else 0)
