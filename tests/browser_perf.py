"""Ukur kelancaran geser dan zoom peta (frame time, tugas panjang).
Butuh: pip install playwright && playwright install chromium
Jalankan dari akar repo:
  python3 tests/browser_perf.py            # ringkas, dengan CPU diperlambat 4x (meniru HP menengah)
  python3 tests/browser_perf.py --rate 1   # tanpa perlambatan
  python3 tests/browser_perf.py --strict   # keluar dengan kode 1 bila melewati anggaran (untuk CI)
Catatan: Chromium headless merender dengan CPU (tanpa GPU), jadi angka mutlak LEBIH BURUK dari HP asli;
yang berguna adalah perbandingan sebelum dan sesudah perubahan di mesin yang sama.
"""
import http.server, threading, functools, os, sys, time, json, argparse
from playwright.sync_api import sync_playwright

ap = argparse.ArgumentParser()
ap.add_argument('--rate', type=float, default=4.0)
ap.add_argument('--strict', action='store_true')
ap.add_argument('--secs', type=float, default=2.4)
args = ap.parse_args()

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
handler.log_message = lambda *a, **k: None
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:%d/index.html' % srv.server_address[1]

# Save padat: empat wilayah terbuka, semua bangunan level 4, jalan tol dan pelabuhan, supaya peta ramai (kasus terburuk wajar).
SEED = """
  if (!localStorage.getItem('nt-seeded')) {
    localStorage.setItem('nt-seeded', '1');
    const now = Date.now(), R = {unlocked:true, infra:{tol:3, pelabuhan:3}};
    const B = {}; ['sawah','sentra_batik','tambak_garam','kebun_teh','kebun_tebu','kebun_tembakau','kebun_kopi','kebun_karet','kebun_lada','tambang_timah','sumur_minyak','kebun_kakao','kebun_cengkeh','kebun_sawit','tambang_batubara']
      .forEach(function (id) { B[id] = {level:4, lastCollected: now - 5*3600000}; });
    localStorage.setItem('nusantara-tycoon-save-v1', JSON.stringify({version:1, createdAt:now - 9*3600000, cash:90000, totalEarned:0,
      regions:{jawa:R, sumatra:R, sulawesi:R, kalimantan:R}, buildings:B, inventory:{padi:120}, market:{}}));
  }"""

REC = """
  window.__rec = { on:false, t:[], lt:[] };
  (function loop(t){ if (window.__rec.on) window.__rec.t.push(t); requestAnimationFrame(loop); })(0);
  try { new PerformanceObserver(function (l) { l.getEntries().forEach(function (e) { if (window.__rec.on) window.__rec.lt.push(e.duration); }); }).observe({entryTypes:['longtask']}); } catch (e) {}
"""

def new_page(b, w, h, touch, dpr):
    ctx = b.new_context(viewport={'width': w, 'height': h}, has_touch=touch, is_mobile=touch, device_scale_factor=dpr)
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
    pg.add_init_script(REC)
    return ctx, pg, errs

def stats(pg):
    r = pg.evaluate("(() => { const t = window.__rec.t, lt = window.__rec.lt; const d = []; for (let i = 1; i < t.length; i++) d.push(t[i] - t[i-1]); return {d: d, lt: lt}; })()")
    d = sorted(r['d']); lt = r['lt']
    if not d: return {'frames': 0}
    q = lambda p: d[min(len(d) - 1, int(p * len(d)))]
    return {'frames': len(d), 'p50': round(q(.5), 1), 'p95': round(q(.95), 1), 'max': round(d[-1], 1),
            'over33': round(100.0 * sum(1 for x in d if x > 33.5) / len(d), 1), 'over50': round(100.0 * sum(1 for x in d if x > 50) / len(d), 1),
            'longtasks': len(lt), 'longest': round(max(lt), 0) if lt else 0}

def drag(pg, cdp, touch, cx, cy, secs, radius=110):
    """Geser membentuk lingkaran besar sehingga peta terus bergerak."""
    import math
    kind = 'touch' if touch else 'mouse'
    def ev(typ, x, y):
        if touch:
            cdp.send('Input.dispatchTouchEvent', {'type': typ, 'touchPoints': ([] if typ == 'touchEnd' else [{'x': x, 'y': y, 'id': 1}])})
        else:
            cdp.send('Input.dispatchMouseEvent', {'type': {'touchStart': 'mousePressed', 'touchMove': 'mouseMoved', 'touchEnd': 'mouseReleased'}[typ], 'x': x, 'y': y, 'button': 'left' if typ != 'touchMove' else 'left', 'buttons': 1 if typ != 'touchEnd' else 0, 'clickCount': 1})
    ev('touchStart', cx, cy)
    t0 = time.time(); n = 0
    while time.time() - t0 < secs:
        a = n * 0.12
        ev('touchMove', cx + radius * math.sin(a), cy + radius * 0.6 * (1 - math.cos(a)))
        time.sleep(0.008); n += 1
    ev('touchEnd', cx, cy)

def scenario(b, name, w, h, touch, dpr, zoom_steps, rate):
    ctx, pg, errs = new_page(b, w, h, touch, dpr)
    pg.goto(URL)
    pg.wait_for_selector('.map-svg .island')
    pg.wait_for_timeout(3000)                     # tekstur dasar selesai
    cdp = ctx.new_cdp_session(pg)
    box = pg.locator('.map-scroll').bounding_box()
    cx, cy = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2
    for _ in range(zoom_steps):                   # zoom dengan roda (desktop) atau tombol +
        pg.locator('[data-mz="in"]').click(); pg.wait_for_timeout(450)
    pg.wait_for_timeout(2500)                     # biarkan render tajam (refine) selesai
    if rate > 1: cdp.send('Emulation.setCPUThrottlingRate', {'rate': rate})
    out = {}
    # 1) geser terus-menerus
    pg.evaluate("window.__rec.t = []; window.__rec.lt = []; window.__rec.on = true")
    drag(pg, cdp, touch, cx, cy, args.secs)
    pg.evaluate("window.__rec.on = false")
    out['geser'] = stats(pg)
    # 2) urutan nyata: geser -> berhenti (memicu render tajam setelah 350 ms) -> geser lagi. Seluruh urutan direkam,
    #    jadi pembekuan akibat render tajam di thread utama tampak sebagai bingkai sangat panjang atau tugas panjang.
    pg.wait_for_timeout(300)
    pg.evaluate("window.__rec.t = []; window.__rec.lt = []; window.__rec.on = true")
    drag(pg, cdp, touch, cx, cy, 0.7)
    pg.wait_for_timeout(600)                      # jeda: render tajam dimulai di sini
    drag(pg, cdp, touch, cx, cy, 1.2)             # pemain langsung menggeser lagi
    pg.evaluate("window.__rec.on = false")
    out['berhenti-lalu-geser'] = stats(pg)
    out['galat_js'] = errs
    ctx.close()
    return out

res = {}
with sync_playwright() as p:
    b = p.chromium.launch()
    res['desktop 1280x800'] = scenario(b, 'desktop', 1280, 800, False, 1, 0, args.rate)
    res['desktop 1280x800, diperbesar 3x tombol'] = scenario(b, 'desktop-zoom', 1280, 800, False, 1, 3, args.rate)
    res['HP 390x780 dpr2, zoom awal'] = scenario(b, 'hp', 390, 780, True, 2, 0, args.rate)
    res['HP 390x780 dpr2, diperbesar'] = scenario(b, 'hp-zoom', 390, 780, True, 2, 2, args.rate)
    b.close()

print('CPU diperlambat %gx' % args.rate)
bad = 0
for k, v in res.items():
    print('\n' + k)
    for s in ('geser', 'berhenti-lalu-geser'):
        m = v[s]
        print('  %-20s bingkai=%-4s p50=%-5s p95=%-6s maks=%-6s >33ms=%-5s%% >50ms=%-5s%% tugas panjang=%s (terpanjang %s ms)' % (
            s, m.get('frames'), m.get('p50'), m.get('p95'), m.get('max'), m.get('over33'), m.get('over50'), m.get('longtasks'), m.get('longest')))
        # anggaran: tidak ada tugas panjang atau bingkai > 250 ms, dan bingkai > 50 ms kurang dari 5%
        if m.get('frames') and (m['longest'] > 250 or m['max'] > 250 or m['over50'] > 5): bad += 1
    if v['galat_js']: print('  GALAT JS:', v['galat_js']); bad += 1
print('\n' + ('LOLOS anggaran' if not bad else 'MELEWATI anggaran (%d)' % bad))
json.dump(res, open(os.path.join(os.environ.get('TMPDIR', '/tmp'), 'perf_last.json'), 'w'), indent=1)
if args.strict and bad: sys.exit(1)
