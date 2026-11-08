"""Audit sentuhan dan navigasi (sesi 22). Memastikan kontrol utama >= 44x44 px di HP, tablet, dan desktop,
navigasi bawah tidak menutupi isi, dan header tidak melebihi layar. Jalankan dari akar repo: python3 tests/browser_touch.py
Pengecualian yang disengaja: istilah inline (ongkir, paceklik/panen raya) boleh 32 px karena berada di dalam teks (WCAG 2.2: 2.5.8)."""
import http.server, threading, functools, os, re
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a, **k): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Q, directory=ROOT))
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:%d/index.html' % srv.server_address[1]
SEED = re.search(r'SEED = """(.*?)"""', open(os.path.join(HERE, 'browser_perf.py'), encoding='utf-8').read(), re.S).group(1)

ok = fail = 0
def check(name, cond, extra=''):
    global ok, fail
    if cond: ok += 1; print('ok  ' + name)
    else: fail += 1; print('GAGAL ' + name + ((' -> ' + str(extra)) if extra != '' else ''))

AUDIT = """(function () {
  const sel = 'button, a[href], [role=button], [role=tab], .island, .chip, .seg, input, select, [data-action], .bubble.on';
  const seen = new Set(), out = [];
  document.querySelectorAll(sel).forEach(function (el) {
    if (seen.has(el)) return; seen.add(el);
    if (el.closest('svg') && !el.classList.contains('island') && !el.classList.contains('bubble')) return;
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    if (r.width === 0 || r.height === 0 || cs.visibility === 'hidden' || cs.display === 'none' || cs.pointerEvents === 'none') return;
    out.push({ cls: String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className).slice(0, 40),
      act: el.getAttribute('data-action') || '', w: Math.round(r.width), h: Math.round(r.height), txt: (el.textContent || '').trim().slice(0, 20) });
  });
  return out;
})()"""
INLINE = ('term', 'term-tag')   # istilah di dalam teks

def mk(b, w, h, touch):
    ctx = b.new_context(viewport={'width': w, 'height': h}, has_touch=touch, is_mobile=touch, device_scale_factor=2 if touch else 1)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    def route(r):
        u = r.request.url
        if u.endswith('js/config.js'): r.fulfill(body=r.fetch().text().replace("storage: 'supabase'", "storage: 'local'"), content_type='application/javascript')
        elif 'cdn.jsdelivr' in u: r.abort()
        else: r.continue_()
    pg.route('**/*', route); pg.add_init_script(SEED)
    return pg, errs

with sync_playwright() as p:
    b = p.chromium.launch()
    for name, w, h, touch in (('HP 360', 360, 740, True), ('HP 390', 390, 780, True), ('tablet 768', 768, 1024, True), ('desktop 1280', 1280, 800, False)):
        pg, errs = mk(b, w, h, touch)
        pg.goto(URL); pg.wait_for_selector('.map-svg .island'); pg.wait_for_timeout(2500)
        small = []
        pg.click('.chip[data-id="jawa"]'); pg.wait_for_timeout(700)
        small += [('panel', e) for e in pg.evaluate(AUDIT) if min(e['w'], e['h']) < 44]
        for tab in ('map', 'market', 'stats', 'about', 'settings'):
            (pg.click('.tab[data-id="kingdom"]'), pg.click('#kingdom-seg [data-id="%s"]' % tab)) if tab in ('stats','about','settings') else pg.click('.tab[data-id="%s"]' % tab); pg.wait_for_timeout(450)
            small += [(tab, e) for e in pg.evaluate(AUDIT) if min(e['w'], e['h']) < 44]
        bad = [(t, e) for t, e in small if not any(c in e['cls'].split() for c in INLINE)]
        check('%s: semua kontrol utama >= 44 px' % name, not bad, bad[:4])
        inl = [e for t, e in small if any(c in e['cls'].split() for c in INLINE) and min(e['w'], e['h']) < 28]
        check('%s: istilah inline >= 28 px' % name, not inl, inl[:3])
        over = pg.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1")
        check('%s: tanpa luapan horizontal' % name, over)
        pg.click('.tab[data-id="map"]'); pg.wait_for_timeout(300)
        hb = pg.locator('.masthead').bounding_box()
        check('%s: header <= 90 px (%d)' % (name, hb['height']), hb['height'] <= 90)
        if w < 980:
            nav = pg.locator('nav.tabs').bounding_box()
            check('%s: navigasi menempel di dasar layar' % name, abs(nav['y'] + nav['height'] - h) <= 1 and nav['width'] >= w - 1)
            # isi paling bawah halaman tidak boleh tertutup navigasi
            pg.evaluate("window.scrollTo(0, document.body.scrollHeight)"); pg.wait_for_timeout(200)
            last = pg.evaluate("(() => { const m = document.querySelector('.tab-panel.on'); const r = m.getBoundingClientRect(); return r.bottom; })()")
            check('%s: isi akhir halaman tidak tertutup navigasi' % name, last <= nav['y'] + 1, (last, nav['y']))
            check('%s: 5 tab muat tanpa menggulir' % name, pg.evaluate("(()=>{const t=document.querySelector('.tabs');return t.scrollWidth<=t.clientWidth+1})()"))
        else:
            tb = pg.locator('nav.tabs').bounding_box()
            check('%s: navigasi di header (atas)' % name, tb['y'] < 100)
        # gelembung hasil di peta: area ketuk
        pg.evaluate("window.scrollTo(0, 0)")
        bub = pg.locator('#map .bubble.on')
        if bub.count():
            sizes = [bub.nth(i).bounding_box() for i in range(min(bub.count(), 6))]
            check('%s: gelembung peta >= 36 px (terkecil %d)' % (name, min(min(s['width'], s['height']) for s in sizes)), all(min(s['width'], s['height']) >= 36 for s in sizes))
        check('%s: tanpa galat JS' % name, not errs, errs[:2])
    b.close()
print('\n%d lolos, %d gagal' % (ok, fail))
raise SystemExit(1 if fail else 0)
