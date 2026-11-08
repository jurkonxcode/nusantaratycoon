"""Ilustrasi wilayah Kalimantan: sprite kebun sawit dan tambang batubara (128x128), ikon sawit dan batubara (64x64).
Gaya mengikuti tools/art_v2.py (vektor orisinal, cahaya dari kiri-atas). Dipakai oleh tools/make_assets.py."""
import math, random
from art_v2 import svg, lg, rg, leaf, quad, SDEFS, base, mound


def _palm(x, yb, yt, seed, sc=1.0):
    rnd = random.Random(seed)
    lean = rnd.uniform(-3, 3)
    s = (f'<path d="M{x - 2.6 * sc:.1f} {yb}Q{x + lean:.1f} {(yb + yt) / 2:.0f} {x - 1.6 * sc + lean:.1f} {yt}L{x + 1.8 * sc + lean:.1f} {yt}Q{x + 1 + lean:.1f} {(yb + yt) / 2:.0f} {x + 2.8 * sc:.1f} {yb}Z" fill="url(#trunk)"/>')
    # cincin bekas pelepah
    n = int((yb - yt) / 4.2)
    for i in range(n):
        t = i / max(1, n)
        yy = yb - 3 - t * (yb - yt - 4)
        xx = x + lean * (1 - (1 - t) ** 2)
        s += f'<path d="M{xx - 2.4 * sc:.1f} {yy:.1f}l{4.8 * sc:.1f} 1.2" stroke="#3a2812" stroke-width=".8" opacity=".55"/>'
    cx, cy = x + lean, yt
    # tandan buah di bawah tajuk
    for dx, dy, r in [(-3, 3, 2.7), (0, 4.5, 2.9), (3, 3, 2.6), (-1.5, 6.5, 2.4), (2, 6.8, 2.5)]:
        s += f'<circle cx="{cx + dx * sc:.1f}" cy="{cy + dy * sc:.1f}" r="{r * sc:.1f}" fill="url(#sw)"/>'
    # pelepah: panjang melengkung
    pal = ['#2a6e38', '#3a8c4a', '#4aa75c', '#2f7a3f']
    for a in [-172, -150, -128, -104, -78, -54, -32, -10, 12, 168, 150]:
        ln = (27 if abs(a + 90) < 45 else 25) * sc
        s += leaf(cx, cy, ln, 3.4 * sc, a, rnd.choice(pal), '#d6efc0', .45)
    return s


def s_sawit():
    d = SDEFS + rg('sw', [(0, '#ffb066'), (.45, '#e0661f'), (1, '#8f3010')], .35, .3, .8)
    o = base(54, 114) + mound(100, 20, 58, 5, 22)
    # lantai kebun berpola jalur
    o += '<path d="M20 100Q64 112 108 100" stroke="#8a6a3a" stroke-width="2" fill="none" opacity=".35"/>'
    o += _palm(98, 98, 52, 3, .95) + _palm(30, 98, 48, 1, .95) + _palm(64, 104, 36, 2, 1.1)
    # tumpukan tandan di depan
    for i, (bx, by) in enumerate([(84, 108), (91, 110), (98, 107), (88, 104)]):
        o += f'<ellipse cx="{bx}" cy="{by}" rx="5.4" ry="4" fill="url(#sw)" stroke="#5a2410" stroke-width=".7"/>'
        o += f'<path d="M{bx - 3} {by - 1}l1.6 1.4M{bx + 1} {by - 2}l1.6 1.6M{bx - 1} {by + 1.5}l1.4 -1.2" stroke="#3a1608" stroke-width=".8" opacity=".6"/>'
    return svg(128, 128, d, o)


def s_batubara():
    d = SDEFS + lg('earth', [(0, '#a98a62'), (.55, '#8a6b45'), (1, '#5d452b')])
    d += lg('pit1', [(0, '#6e5538'), (1, '#3b2d1d')]) + lg('pit2', [(0, '#463727'), (1, '#1e1812')]) + lg('pit3', [(0, '#2b2219'), (1, '#0d0a08')])
    d += lg('coal', [(0, '#4a4f58'), (.5, '#22252b'), (1, '#0c0d10')], 0, 0, 1, 1) + lg('belt', [(0, '#555'), (1, '#222')])
    o = base(56, 116)
    # tanah dan lubang tambang berundak
    o += '<path d="M6 100Q64 70 122 100Q64 124 6 100Z" fill="url(#earth)"/>'
    o += '<path d="M6 100Q64 124 122 100Q64 130 6 100Z" fill="#3a2a18" opacity=".4"/>'
    o += '<ellipse cx="52" cy="98" rx="38" ry="14" fill="url(#pit1)"/><ellipse cx="52" cy="99" rx="28" ry="10" fill="url(#pit2)"/><ellipse cx="52" cy="100" rx="17" ry="6" fill="url(#pit3)"/>'
    o += '<path d="M16 95Q52 80 88 95" stroke="#c7ac7d" stroke-width="1" fill="none" opacity=".6"/>'
    # jalan tanjakan truk melingkar
    o += '<path d="M24 104Q34 112 56 112Q80 110 92 100" stroke="#b8a074" stroke-width="3" fill="none" stroke-linecap="round" opacity=".75"/>'
    # tumpukan batubara
    pile = 'M84 108L90 90 97 82 104 90 112 108Z'
    o += f'<path d="{pile}" fill="url(#coal)" stroke="#000" stroke-width=".6"/>'
    o += '<path d="M90 90L97 82 99 92Z" fill="#6c727d" opacity=".55"/><path d="M96 98L103 90 106 100Z" fill="#6c727d" opacity=".35"/>'
    for x, y in [(88, 100), (95, 96), (101, 102), (107, 104), (93, 106)]:
        o += f'<circle cx="{x}" cy="{y}" r="1.1" fill="#9aa1ad" opacity=".75"/>'
    # ban berjalan dari lubang ke tumpukan
    o += '<path d="M52 92L92 60" stroke="url(#belt)" stroke-width="5" stroke-linecap="round"/><path d="M52 90L92 58" stroke="#8d8d8d" stroke-width="1" opacity=".7"/>'
    for t in (.2, .5, .8):
        x, y = 52 + 40 * t, 92 - 32 * t
        o += f'<path d="M{x:.1f} {y + 2:.1f}V{y + 22:.1f}" stroke="#444" stroke-width="2"/>'
    o += '<path d="M92 60L97 78" stroke="#22252b" stroke-width="3" stroke-dasharray="2 2.4"/>'
    # truk tambang kuning
    o += ('<g transform="translate(36 104)"><rect x="0" y="-10" width="18" height="8" rx="1.5" fill="#e8b020" stroke="#5a3a00" stroke-width=".8"/>'
          '<path d="M1 -10L5 -16H17L19 -10Z" fill="#222" stroke="#000" stroke-width=".6"/><rect x="12" y="-8" width="6" height="5" fill="#9ed0e8"/>'
          '<circle cx="4" cy="-1" r="3.2" fill="#222"/><circle cx="14" cy="-1" r="3.2" fill="#222"/><circle cx="4" cy="-1" r="1.2" fill="#888"/><circle cx="14" cy="-1" r="1.2" fill="#888"/></g>')
    # pondok kantor kecil dan bendera
    o += ('<rect x="10" y="78" width="16" height="11" fill="#d8ccb0" stroke="#5a3a1a" stroke-width=".9"/><path d="M8 79L18 70 28 79Z" fill="#7a3a2a" stroke="#4a2018" stroke-width=".8"/>'
          '<rect x="15" y="82" width="5" height="7" fill="#5a3a1a"/>')
    return svg(128, 128, d, o)


def i_sawit():
    d = rg('sw', [(0, '#ffb066'), (.45, '#e0661f'), (1, '#8f3010')], .35, .3, .8)
    o = '<ellipse cx="32" cy="57" rx="20" ry="3.2" fill="#000" opacity=".22"/>'
    rnd = random.Random(4)
    pts = []
    for row, (y, n) in enumerate([(22, 3), (30, 4), (39, 4), (48, 3)]):
        for k in range(n):
            x = 32 + (k - (n - 1) / 2) * 11 + rnd.uniform(-1.2, 1.2)
            pts.append((x, y + rnd.uniform(-1, 1)))
    o += '<ellipse cx="32" cy="37" rx="24" ry="22" fill="#5a2410"/>'
    for x, y in pts:
        o += f'<circle cx="{x:.1f}" cy="{y:.1f}" r="6.2" fill="url(#sw)" stroke="#6a2a10" stroke-width=".6"/><circle cx="{x - 2:.1f}" cy="{y - 2:.1f}" r="1.5" fill="#fff" opacity=".55"/>'
    for a in (-160, -118, -62, -20):
        o += leaf(32, 18, 17, 3.6, a, '#2f8f4e', '#d9f2c8', .5)
    o += '<path d="M32 18V10" stroke="#6a4a2a" stroke-width="2.2" stroke-linecap="round"/>'
    return svg(64, 64, d, o)


def i_batubara():
    d = lg('c1', [(0, '#5a606b'), (.5, '#23262c'), (1, '#0b0c0f')], 0, 0, 1, 1)
    o = '<ellipse cx="32" cy="57" rx="22" ry="3.4" fill="#000" opacity=".25"/>'

    def lump(pts, hi):
        p = 'M' + 'L'.join(f'{x} {y}' for x, y in pts) + 'Z'
        return (f'<path d="{p}" fill="url(#c1)" stroke="#000" stroke-width=".8" stroke-linejoin="round"/>'
                f'<path d="M{hi[0][0]} {hi[0][1]}L{hi[1][0]} {hi[1][1]}L{hi[2][0]} {hi[2][1]}Z" fill="#aab1bd" opacity=".5"/>')

    o += lump([(8, 50), (10, 36), (20, 28), (32, 33), (36, 46), (28, 54)], [(11, 37), (20, 30), (22, 40)])
    o += lump([(30, 52), (32, 36), (42, 24), (54, 30), (57, 46), (48, 54)], [(34, 38), (42, 26), (47, 38)])
    o += lump([(20, 34), (24, 22), (34, 16), (42, 24), (36, 36), (28, 38)], [(25, 24), (34, 18), (35, 28)])
    return svg(64, 64, d, o)
