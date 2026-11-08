"""Audit kestabilan tata letak: pergeseran layout (CLS) yang bukan akibat sentuhan, luapan horizontal,
dan beban pembaruan tiap detik. Butuh: pip install playwright && playwright install chromium
Jalankan dari akar repo: python3 tests/browser_layout.py [--strict]
"""
import http.server, threading, functools, os, sys, re
from playwright.sync_api import sync_playwright

STRICT = '--strict' in sys.argv
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

SEED = re.search(r'SEED = """(.*?)"""', open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'browser_perf.py'), encoding='utf-8').read(), re.S).group(1)

CLS = """
  window.__cls = { total: 0, items: [] };
  try { new PerformanceObserver(function (l) { l.getEntries().forEach(function (e) {
    if (e.hadRecentInput) return;
    window.__cls.total += e.value;
    window.__cls.items.push({ v: +e.value.toFixed(4), t: Math.round(e.startTime), src: (e.sources || []).slice(0, 3).map(function (s) {
      const n = s.node; return n ? (n.nodeName + (n.id ? '#' + n.id : '') + (n.className && n.className.baseVal === undefined ? '.' + String(n.className).split(' ').join('.') : '')) : '?'; }) });
  }); }).observe({ type: 'layout-shift', buffered: true }); } catch (e) {}
  window.__long = [];
  try { new PerformanceObserver(function (l) { l.getEntries().forEach(function (e) { window.__long.push(Math.round(e.duration)); }); }).observe({ entryTypes: ['longtask'] }); } catch (e) {}
"""

def page(b, w, h, touch=False, dpr=1):
    ctx = b.new_context(viewport={'width': w, 'height': h}, has_touch=touch, is_mobile=touch, device_scale_factor=dpr)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    def route(r):
        u = r.request.url
        if u.endswith('js/config.js'): r.fulfill(body=r.fetch().text().replace("storage: 'supabase'", "storage: 'local'"), content_type='application/javascript')
        elif 'cdn.jsdelivr' in u: r.abort()
        else: r.continue_()
    pg.route('**/*', route); pg.add_init_script(SEED); pg.add_init_script(CLS)
    return ctx, pg, errs

with sync_playwright() as p:
    b = p.chromium.launch()
    for name, w, h, touch, dpr in (('HP 360x740', 360, 740, True, 2), ('HP 390x780', 390, 780, True, 2), ('tablet 768x1024', 768, 1024, True, 2), ('laptop 1024x700', 1024, 700, False, 1), ('desktop 1280x800', 1280, 800, False, 1), ('lebar 1920x1080', 1920, 1080, False, 1)):
        ctx, pg, errs = page(b, w, h, touch, dpr)
        pg.goto(URL); pg.wait_for_selector('.map-svg .island'); pg.wait_for_timeout(4500)
        pg.evaluate("window.__cls.total = 0; window.__cls.items = []; window.__long = []")
        pg.wait_for_timeout(8000)                                    # diam 8 detik: hanya pembaruan tiap detik yang bekerja
        idle = pg.evaluate("({cls: window.__cls.total, items: window.__cls.items.slice(0, 4), long: window.__long})")
        check('%s: tanpa pergeseran layout saat diam 8 dtk (CLS %.4f)' % (name, idle['cls']), idle['cls'] < 0.001, idle['items'])
        check('%s: tanpa tugas panjang saat diam (%s)' % (name, idle['long']), not [x for x in idle['long'] if x > 60], idle['long'])
        over = pg.evaluate("({sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth})")
        check('%s: tanpa luapan horizontal (%d <= %d)' % (name, over['sw'], over['cw']), over['sw'] <= over['cw'] + 1, over)
        # pindah tab dan buka isi: tidak boleh ada galat dan halaman tidak boleh melebar
        tabs = pg.locator('.tab[data-action="tab"], nav.tabs button')
        n = tabs.count()
        for i in range(n):
            try:
                tabs.nth(i).click(timeout=1500); pg.wait_for_timeout(250)
            except Exception: pass
            sw = pg.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1")
            if not sw: check('%s: tab %d tidak melebarkan halaman' % (name, i), False)
        pg.evaluate("window.__cls.total = 0; window.__cls.items = []")
        pg.wait_for_timeout(2500)
        later = pg.evaluate("({cls: window.__cls.total, items: window.__cls.items.slice(0, 4)})")
        check('%s: stabil setelah berpindah tab (CLS %.4f)' % (name, later['cls']), later['cls'] < 0.001, later['items'])
        check('%s: tanpa galat JS' % name, not errs, errs)
        ctx.close()
    b.close()
print('\n%d lolos, %d gagal' % (ok, fail))
if STRICT and fail: sys.exit(1)
