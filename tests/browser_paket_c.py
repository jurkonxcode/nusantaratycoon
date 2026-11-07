"""Uji browser Paket C (panduan awal, capaian, log, istilah, upgrade termurah).
Butuh: pip install playwright && playwright install chromium
Jalankan dari akar repo: python3 tests/browser_paket_c.py
"""
import http.server, threading, functools, os, sys, json
from playwright.sync_api import sync_playwright

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
handler.log_message = lambda *a, **k: None
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:%d/index.html' % srv.server_address[1]
KEY = 'nusantara-tycoon-save-v1'

ok = fail = 0
def check(name, cond):
    global ok, fail
    if cond: ok += 1; print('ok  ' + name)
    else: fail += 1; print('GAGAL ' + name)

NEWBIE = """(() => { if (localStorage.getItem('nt-seeded')) return; localStorage.setItem('nt-seeded','1');
  const now = Date.now();
  localStorage.setItem('%s', JSON.stringify({version:1, createdAt:now, cash:300, totalEarned:0,
    regions:{jawa:{unlocked:true,infra:{tol:0,pelabuhan:0}}, sumatra:{unlocked:false,infra:{tol:0,pelabuhan:0}}},
    buildings:{sawah:{level:1,lastCollected:now-10*60000}}, inventory:{}, market:{}})); })()""" % KEY
VETERAN = """(() => { if (localStorage.getItem('nt-seeded')) return; localStorage.setItem('nt-seeded','1');
  const now = Date.now();
  localStorage.setItem('%s', JSON.stringify({version:1, createdAt:now-86400000, cash:900, totalEarned:30000,
    regions:{jawa:{unlocked:true,infra:{tol:1,pelabuhan:1}}, sumatra:{unlocked:true,infra:{tol:0,pelabuhan:0}}},
    buildings:{sawah:{level:4,lastCollected:now}, sentra_batik:{level:2,lastCollected:now}}, inventory:{}, market:{}})); })()""" % KEY

def new_page(b, w, h, seed):
    ctx = b.new_context(viewport={'width': w, 'height': h}, has_touch=(w < 700))
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    def route(r):
        u = r.request.url
        if u.endswith('js/config.js'):
            r.fulfill(body=r.fetch().text().replace("storage: 'supabase'", "storage: 'local'"), content_type='application/javascript')
        elif 'cdn.jsdelivr' in u: r.abort()
        else: r.continue_()
    pg.route('**/*', route); pg.add_init_script(seed)
    return pg, errs

def state(pg): return pg.evaluate("JSON.parse(localStorage.getItem('%s'))" % KEY)

with sync_playwright() as p:
    b = p.chromium.launch()

    # ---------- Pemain baru di HP
    pg, errs = new_page(b, 390, 844, NEWBIE)
    pg.goto(URL); pg.wait_for_timeout(800)
    check('Panduan tampil untuk pemain baru (0/5)', '0/5' in pg.locator('.guide-head').inner_text())
    check('Panduan awal tertutup (ringkas)', pg.locator('.guide-list').count() == 0)
    pg.locator('.guide-head').click(); pg.wait_for_timeout(200)
    check('Panduan dibuka: 5 langkah', pg.locator('.guide-list li').count() == 5)
    check('Langkah aktif menampilkan petunjuk', pg.locator('.guide-list li.cur small').count() == 1)
    pg.locator('.guide-head').click()
    check('Tab Capaian ada dan semua tab muat di layar 390px',
          pg.locator('.tab[data-id="stats"]').is_visible() and pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1")
          and pg.evaluate("(()=>{const t=document.querySelector('.tabs');return t.scrollWidth<=t.clientWidth+1})()"))

    pg.locator('.collect-all').click(); pg.wait_for_timeout(500)
    check('Kumpulkan -> panduan 1/5', '1/5' in pg.locator('.guide-head').inner_text())
    check('Toast pencapaian Panen Pertama', 'Panen Pertama' in pg.locator('#toasts').inner_text())
    check('Statistik tersimpan di state', state(pg)['stats']['collects'] >= 1 and state(pg)['stats']['produced'] >= 20)

    pg.locator('.tab[data-id="market"]').click(); pg.wait_for_timeout(300)
    pg.locator('.sell-everything').click(); pg.wait_for_timeout(500)
    pg.wait_for_timeout(600)
    check('Jual -> pencapaian Dagang Pertama tersimpan', 'dagang' in state(pg)['achievements'] and state(pg)['stats']['sales'] >= 1)
    pg.locator('.tab[data-id="map"]').click(); pg.wait_for_timeout(300)
    check('Panduan 2/5 setelah jual', '2/5' in pg.locator('.guide-head').inner_text())

    cash_before = pg.evaluate("NT.economy && document.getElementById('stat-cash').textContent")
    label = pg.locator('.cheapest').inner_text()
    check('Tombol upgrade termurah menyebut Sawah', 'Sawah' in label and 'Rp' in label)
    pg.locator('.cheapest').click(); pg.wait_for_timeout(600)
    s = state(pg)
    check('Upgrade termurah memulai pekerjaan Sawah', len(s['jobs']) == 1 and s['jobs'][0]['id'] == 'sawah')
    check('Panduan 3/5 setelah upgrade', '3/5' in pg.locator('.guide-head').inner_text())

    # Istilah
    pg.locator('.term-stat').click(); pg.wait_for_timeout(300)
    check('Ketuk Peradaban menampilkan penjelasan', 'Skor peradaban' in pg.locator('#toasts').inner_text())
    pg.locator('.tab[data-id="market"]').click(); pg.wait_for_timeout(300)
    pg.locator('button.term[data-term="ongkir"]').first.click(); pg.wait_for_timeout(300)
    check('Ketuk ongkir menampilkan penjelasan', 'Ongkir:' in pg.locator('#toasts').inner_text())

    # Tab Capaian
    pg.locator('.tab[data-id="stats"]').click(); pg.wait_for_timeout(400)
    check('Capaian: 8 ubin statistik', pg.locator('.tile').count() == 8)
    check('Capaian: badge terbuka >= 2', pg.locator('.badge.got').count() >= 2)
    check('Capaian: badge terkunci memakai 🔒', '🔒' in pg.locator('.badge:not(.got) .badge-ico').first.inner_text())
    check('Capaian: log berisi aktivitas jual dan bangun', pg.locator('.log li').count() >= 3)
    check('Capaian: waktu bermain terisi', pg.locator('[data-live="playtime"]').first.inner_text().strip() != '')
    check('Capaian: tanpa lebar berlebih di HP', pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"))
    pg.screenshot(path='/tmp/c_stats.png', full_page=True)

    # Sembunyikan panduan, lalu tampilkan lagi lewat Pengaturan
    pg.locator('.tab[data-id="map"]').click(); pg.locator('.guide-head').click(); pg.locator('[data-action="guide-hide"]').click(); pg.wait_for_timeout(300)
    check('Sembunyikan panduan menghapusnya', pg.locator('.guide').count() == 0)
    pg.locator('.tab[data-id="settings"]').click(); pg.locator('[data-action="guide-show"]').click(); pg.wait_for_timeout(300)
    check('Tampilkan lagi dari Pengaturan', pg.locator('.guide').count() == 1 and pg.evaluate("NT.ui.panels.view.tab") == 'map')

    pg.wait_for_timeout(600); pg.reload(); pg.wait_for_timeout(800)
    s = state(pg)
    check('Muat ulang: statistik dan pencapaian bertahan', s['stats']['sales'] >= 1 and len(s['achievements']) >= 2 and len(s['log']) >= 3)
    pg.screenshot(path='/tmp/c_map.png')
    check('HP: tanpa error JS', not errs)
    if errs: print(errs)

    # ---------- Pemain lama (tanpa statistik)
    pv, errs_v = new_page(b, 390, 844, VETERAN)
    pv.goto(URL); pv.wait_for_timeout(900)
    check('Veteran: panduan tidak muncul (semua langkah sudah terlampaui)', pv.locator('.guide').count() == 0)
    check('Veteran: toast ringkasan pencapaian awal', 'pencapaian terbuka' in pv.locator('#toasts').inner_text())
    pv.locator('.tab[data-id="stats"]').click(); pv.wait_for_timeout(300)
    check('Veteran: Juragan Kecil dan Saudagar terbuka', pv.locator('.badge.got b:text("Saudagar")').count() == 1 and pv.locator('.badge.got b:text("Juragan Kecil")').count() == 1)
    check('Veteran: Tiga Pulau belum terbuka', pv.locator('.badge.got b:text("Tiga Pulau")').count() == 0)
    check('Veteran: tanpa error JS', not errs_v)

    # ---------- Desktop
    pd, errs_d = new_page(b, 1280, 800, NEWBIE)
    pd.goto(URL); pd.wait_for_timeout(800)
    check('Desktop: panduan dan tombol termurah tampil', pd.locator('.guide').is_visible() and pd.locator('.cheapest').is_visible())
    pd.locator('.tab[data-id="stats"]').click(); pd.wait_for_timeout(300)
    check('Desktop: 4 ubin per baris', pd.evaluate("(()=>{const t=[...document.querySelectorAll('.tile')].map(e=>Math.round(e.getBoundingClientRect().top));return t.filter(x=>x===t[0]).length===4})()"))
    check('Desktop: tanpa error JS', not errs_d)
    pd.screenshot(path='/tmp/c_desk.png')
    b.close()

print('\n%d lolos, %d gagal' % (ok, fail))
sys.exit(1 if fail else 0)
