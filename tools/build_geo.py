#!/usr/bin/env python3
"""
Membangun js/data/geo.js dari peta kabupaten/kota (MapChart, equirectangular) di tools/geo_src/.

  python3 tools/build_geo.py            # tulis js/data/geo.js
  python3 tools/build_geo.py --preview  # juga tulis /tmp/geo_preview.png

Langkah: parse path SVG -> bujur/lintang (kalibrasi afin, galat ~0,04 derajat terhadap 30 kota)
-> kelompokkan tiap kabupaten/kota ke wilayah game -> rasterkan -> ambil kontur luar -> sederhanakan.
Daratan negara tetangga: Semenanjung Malaya dan Papua Nugini diambil dari peta lama (geo_hand_drawn.js);
Sarawak/Sabah/Brunei dan Timor Leste diturunkan dari peta lama dikurangi daratan Indonesia baru.
Bentuk pulau BUKAN data resmi: sumbernya MapChart (CC BY-SA 4.0), lihat tools/geo_src/ATRIBUSI.txt.
"""
import csv, json, os, re, subprocess, sys
import numpy as np, cv2

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'geo_src')
OUT = os.path.join(HERE, '..', 'js', 'data', 'geo.js')
LON0, LON1, LAT0, LAT1 = 95.0, 141.6, 7.3, -11.5      # sama dengan geo.js
RES = 0.02                                            # derajat per piksel raster kerja
EPS = float(os.environ.get('GEO_EPS', 0.03))          # toleransi penyederhanaan (derajat)
MIN_AREA = float(os.environ.get('GEO_MINAREA', 0.008))  # pulau lebih kecil (derajat persegi) dibuang
W = int(round((LON1 - LON0) / RES)); H = int(round((LAT0 - LAT1) / RES))

# Kalibrasi SVG -> derajat (hasil regresi pada 30 kota, lihat HANDOFF).
AX, BX, AY, BY = 0.0576125297, 93.8470868, -0.0574196, 6.99828797

def parse_d(d):
    toks = re.findall(r'[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?', d)
    i = 0; rings = []; cur = []; x = y = sx = sy = 0.0; cmd = None
    def num():
        nonlocal i
        v = float(toks[i]); i += 1; return v
    while i < len(toks):
        if toks[i].isalpha(): cmd = toks[i]; i += 1
        if cmd in 'Zz':
            if cur: rings.append(cur); cur = []
            x, y = sx, sy; continue
        if cmd in 'Mm':
            if cur: rings.append(cur); cur = []
            dx, dy = num(), num(); x, y = (x + dx, y + dy) if cmd == 'm' else (dx, dy)
            sx, sy = x, y; cur = [(x, y)]; cmd = 'L' if cmd == 'M' else 'l'
        elif cmd in 'lL':
            dx, dy = num(), num(); x, y = (x + dx, y + dy) if cmd == 'l' else (dx, dy); cur.append((x, y))
        elif cmd in 'hH':
            dx = num(); x = x + dx if cmd == 'h' else dx; cur.append((x, y))
        elif cmd in 'vV':
            dy = num(); y = y + dy if cmd == 'v' else dy; cur.append((x, y))
        elif cmd in 'cC':
            v = [num() for _ in range(6)]
            x, y = (x + v[4], y + v[5]) if cmd == 'c' else (v[4], v[5]); cur.append((x, y))
        else:
            raise SystemExit('perintah path tidak didukung: ' + cmd)
    if cur: rings.append(cur)
    return rings

def load_svg():
    s = open(os.path.join(SRC, 'MapChart_Map.svg'), encoding='utf-8').read()
    out = {}
    for m in re.finditer(r'<path id="([^"]*)"([^>]*?) d="([^"]*)"', s):
        if m.group(1).startswith('pattern'): continue
        out[m.group(1)] = [[(AX * px + BX, AY * py + BY) for px, py in r] for r in parse_d(m.group(3))]
    return out

def ring_area(r):
    a = np.array(r); x, y = a[:, 0], a[:, 1]
    return 0.5 * np.sum(x * np.roll(y, -1) - np.roll(x, -1) * y)

def to_px(r):
    return np.array([[(lo - LON0) / RES, (LAT0 - la) / RES] for lo, la in r])

def fill_rings(rings):
    """Isi even-odd (XOR tiap cincin) di kanvas kecil, kembalikan mask ukuran penuh."""
    m = np.zeros((H, W), np.uint8)
    for r in rings:
        p = to_px(r)
        x0 = max(int(p[:, 0].min()) - 2, 0); x1 = min(int(p[:, 0].max()) + 3, W)
        y0 = max(int(p[:, 1].min()) - 2, 0); y1 = min(int(p[:, 1].max()) + 3, H)
        if x1 <= x0 or y1 <= y0: continue
        t = np.zeros((y1 - y0, x1 - x0), np.uint8)
        q = np.round((p - [x0, y0]) * 16).astype(np.int32)
        cv2.fillPoly(t, [q], 1, lineType=cv2.LINE_8, shift=4)
        m[y0:y1, x0:x1] ^= t
    return m

# ---------- pengelompokan wilayah ----------
BALI = set('Badung Bangli Buleleng Gianyar Jembrana Karang_Asem Klungkung Tabanan Kota_Denpasar'.split())
NUSRA = set('''Bima Dompu Kota_Bima Kota_Mataram Lombok_Barat Lombok_Tengah Lombok_Timur Lombok_Utara Sumbawa Sumbawa_Barat
Alor Belu Ende Flores_Timur Kota_Kupang Kupang Lembata Malaka Manggarai Manggarai_Barat Manggarai_Timur Nagekeo Ngada Rote_Ndao
Sabu_Raijua Sikka Sumba_Barat Sumba_Barat_Daya Sumba_Tengah Sumba_Timur Timor_Tengah_Selatan Timor_Tengah_Utara'''.split())
MALUKU = set('''Buru Buru_Selatan Maluku_Tengah Seram_Bagian_Barat Seram_Bagian_Timur Maluku_Tenggara Kabupaten_Kepulauan_Tanimbar
Maluku_Barat_Daya Kepulauan_Aru Kota_Ambon Kota_Tual Halmahera_Barat Halmahera_Selatan Halmahera_Tengah Halmahera_Timur
Halmahera_Utara Pulau_Morotai Kepulauan_Sula Pulau_Taliabu Kota_Ternate Kota_Tidore_Kepulauan'''.split())
EXTRA_JAWA = {'Kepulauan_Seribu'}
EXTRA_SUMATRA = set('Natuna Kepulauan_Anambas Bintan Karimun Lingga Kota_Batam Kota_Tanjung_Pinang Belitung Belitung_Timur Bangka Bangka_Barat Bangka_Tengah Bangka_Selatan Kota_Pangkal_Pinang'.split())

def old_polys():
    js = "global.window=global;require(process.argv[1]);console.log(JSON.stringify(NT.data.geo))"
    out = subprocess.check_output(['node', '-e', js, os.path.join(SRC, 'geo_hand_drawn.js')])
    return json.loads(out)

def pip(x, y, poly):
    ins = False; j = len(poly) - 1
    for i in range(len(poly)):
        xi, yi = poly[i]; xj, yj = poly[j]
        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi) + xi): ins = not ins
        j = i
    return ins

def assign(name, rings, old):
    if name in BALI or name in NUSRA: return 'bali_nusra', 'nama'
    if name in MALUKU: return 'maluku', 'nama'
    if name in EXTRA_JAWA: return 'jawa', 'nama'
    if name in EXTRA_SUMATRA: return 'sumatra', 'nama'
    votes = {}
    for r in rings:
        for lo, la in r[::3]:
            for rid in ('sumatra', 'jawa', 'sulawesi', 'kalimantan', 'papua'):
                if any(pip(lo, la, pg) for pg in old['polygons'][rid]): votes[rid] = votes.get(rid, 0) + 1; break
    if votes: return max(votes, key=votes.get), 'suara'
    big = max(rings, key=lambda r: abs(ring_area(r))); lo, la = np.array(big).mean(0)
    if lo >= 130: return 'papua', 'cadangan'
    if 119 <= lo <= 127.5 and -7.5 <= la <= 4.5: return 'sulawesi', 'cadangan'
    if lo < 109 and la > -6.3 and lo < 105.9: return 'sumatra', 'cadangan'
    if lo < 109 and la > -3.5: return 'sumatra', 'cadangan'
    if 105 <= lo <= 115.5 and la < -5: return 'jawa', 'cadangan'
    return None, 'tak dikenal'

def contours(mask, min_area=MIN_AREA, eps=EPS):
    cs, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    out = []
    for c in cs:
        a = cv2.contourArea(c) * RES * RES
        if a < min_area: continue
        ap = cv2.approxPolyDP(c, eps / RES, True)[:, 0, :].astype(float)
        if len(ap) < 3: continue
        ring = [[round(LON0 + (x + 0.5) * RES, 2), round(LAT0 - (y + 0.5) * RES, 2)] for x, y in ap]
        out.append((a, ring))
    out.sort(key=lambda t: -t[0])
    return [r for _, r in out]

def main():
    preview = '--preview' in sys.argv
    old = old_polys()
    svg = load_svg()
    names_csv = [r['Regency/city'].replace(' ', '_').replace('/', '_') for r in csv.DictReader(open(os.path.join(SRC, 'MapChart_CSV_Export.csv'), encoding='utf-8'))]
    miss_svg = sorted(set(names_csv) - set(svg)); miss_csv = sorted(set(svg) - set(names_csv))
    print('CSV %d baris, SVG %d path; ada di CSV tanpa path: %s; path tanpa baris CSV: %s' % (len(names_csv), len(svg), miss_svg[:6], miss_csv[:6]))

    groups = {}; how = {}
    for name, rings in svg.items():
        rid, h = assign(name, rings, old)
        if rid is None: print('TIDAK DIKENAL:', name); continue
        groups.setdefault(rid, []).append(name); how[h] = how.get(h, 0) + 1
    print({k: len(v) for k, v in groups.items()}, how)
    for k in ('cadangan',):
        pass

    order = ['sumatra', 'jawa', 'sulawesi', 'kalimantan', 'bali_nusra', 'maluku', 'papua']
    masks = {}
    for rid in order:
        m = np.zeros((H, W), np.uint8)
        for name in groups[rid]: m |= fill_rings(svg[name])
        masks[rid] = m
    polys = {rid: contours(masks[rid]) for rid in order}

    # Tetangga: peta lama dikurangi daratan Indonesia baru, dibatasi ke wilayah yang memang hilang.
    allnew = np.zeros((H, W), np.uint8)
    for rid in order: allnew |= masks[rid]
    def old_mask(rid):
        m = np.zeros((H, W), np.uint8)
        for pg in old['polygons'][rid]:
            q = np.round(to_px([tuple(p) for p in pg]) * 16).astype(np.int32)
            t = np.zeros((H, W), np.uint8); cv2.fillPoly(t, [q], 1, lineType=cv2.LINE_8, shift=4); m |= t
        return m
    def box(lo0, lo1, la0, la1):
        b = np.zeros((H, W), np.uint8)
        x0 = int((lo0 - LON0) / RES); x1 = int((lo1 - LON0) / RES); y0 = int((LAT0 - la1) / RES); y1 = int((LAT0 - la0) / RES)
        b[max(y0, 0):max(y1, 0), max(x0, 0):max(x1, 0)] = 1; return b
    k5 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11))
    borneo_n = old_mask('kalimantan') & (1 - allnew) & box(108.5, 119.6, 0.9, 7.4)
    borneo_n = cv2.morphologyEx(borneo_n, cv2.MORPH_OPEN, k5); borneo_n = cv2.dilate(borneo_n, np.ones((3, 3), np.uint8))
    timor_e = old_mask('bali_nusra') & (1 - allnew) & box(124.0, 127.6, -10.2, -8.0)
    timor_e = cv2.morphologyEx(timor_e, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))); timor_e = cv2.dilate(timor_e, np.ones((3, 3), np.uint8))
    nb = contours(borneo_n, 0.05) + contours(timor_e, 0.03) + [[list(p) for p in pg] for pg in old['polygons']['neighbor']]
    polys['neighbor'] = nb

    # Tulis geo.js
    old_txt = open(os.path.join(SRC, 'geo_hand_drawn.js'), encoding='utf-8').read()
    lanes = re.search(r'    // Jalur kapal hiasan.*?\n    lanes: \[.*?\n    \]\n', old_txt, re.S).group(0)
    labels = {'sumatra': 'Sumatra, Bangka-Belitung, Kepulauan Riau, Natuna', 'jawa': 'Jawa, Madura, Kepulauan Seribu', 'sulawesi': 'Sulawesi dan pulau sekitarnya',
              'kalimantan': 'Kalimantan (hanya wilayah Indonesia)', 'bali_nusra': 'Bali, NTB, NTT (belum bisa dimainkan)', 'maluku': 'Maluku dan Maluku Utara (belum bisa dimainkan)',
              'papua': 'Papua (belum bisa dimainkan)', 'neighbor': 'Daratan negara tetangga (hiasan, tidak bisa dimainkan)'}
    def fmt(ring): return '[' + ', '.join('[%g, %g]' % (p[0], p[1]) for p in ring) + ']'
    body = []
    for rid in order + ['neighbor']:
        rs = polys[rid]
        body.append('      // %s: %d poligon\n      %s: [\n%s\n      ]' % (labels[rid], len(rs), rid, ',\n'.join('        ' + fmt(r) for r in rs)))
    txt = ('/*\n * Geografi peta pixel art. Poligon pulau dalam [bujur, lintang] (derajat), DIBANGUN OTOMATIS dari peta kabupaten/kota\n'
           ' * (MapChart, CC BY-SA 4.0) oleh tools/build_geo.py: jangan edit tangan, ubah sumber atau skripnya lalu jalankan ulang.\n'
           ' * Garis pantai disederhanakan (toleransi %g derajat, pulau < %g derajat persegi dibuang), jadi tetap perkiraan, bukan data survei.\n'
           ' * Tes tests/world.test.js menjaga agar pin, bangunan, dan hub tetap jatuh di daratan wilayahnya.\n */\n'
           '(function (NT) {\n  NT.data = NT.data || {};\n\n  NT.data.geo = {\n'
           '    // Batas peta dan ukuran sel.\n    lon0: %g, lon1: %g, lat0: %g, lat1: %g, cellDeg: 0.3, cellPx: 6,\n\n    polygons: {\n%s\n    },\n\n%s  };\n})((window.NT = window.NT || {}));\n'
           ) % (EPS, MIN_AREA, LON0, LON1, LAT0, LAT1, ',\n'.join(body), lanes)
    open(OUT, 'w', encoding='utf-8').write(txt)
    nv = {k: sum(len(r) for r in v) for k, v in polys.items()}
    print('simpul per wilayah', nv, 'total', sum(nv.values()), '| geo.js', len(txt.encode()), 'byte')
    json.dump({k: groups[k] for k in groups}, open('/tmp/geo_groups.json', 'w'))

    if preview:
        import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
        fig, ax = plt.subplots(2, 1, figsize=(16, 14))
        cols = dict(sumatra='#4c9a2a', jawa='#e0a800', sulawesi='#c0392b', kalimantan='#2980b9', bali_nusra='#8e44ad', maluku='#16a085', papua='#d35400', neighbor='#999999')
        for a, which in zip(ax, ('baru', 'lama')):
            P = polys if which == 'baru' else old['polygons']
            for rid, rs in P.items():
                for r in rs:
                    q = np.array(r); a.fill(q[:, 0], q[:, 1], color=cols[rid], alpha=.85, lw=.3, ec='k')
            a.set_xlim(LON0, LON1); a.set_ylim(LAT1, LAT0); a.set_aspect('equal'); a.set_title('peta ' + which)
        plt.tight_layout(); plt.savefig('/tmp/geo_preview.png', dpi=70)
main()
