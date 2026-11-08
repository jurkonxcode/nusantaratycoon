"""Ilustrasi Jawa Fase 2a: sprite Kebun Teh, Kebun Tebu, Kebun Tembakau, Tambak Garam (128x128)
dan ikon teh, gula, tembakau, garam (64x64). Gaya mengikuti tools/art_v2.py (vektor orisinal, cahaya dari kiri-atas).
Dipakai oleh tools/make_assets.py."""
import math, random
from art_v2 import svg, lg, rg, leaf, quad, SDEFS, base, mound, tuft


# ------------------------------------------------------------------ pembantu
def _bush(x, y, r, seed, pal=('#2c7a3c', '#43a050', '#6cc060')):
    """Rumpun semak bulat (teh) dengan sorot cahaya kiri-atas."""
    rnd = random.Random(seed)
    s = f'<ellipse cx="{x:.1f}" cy="{y + r * .35:.1f}" rx="{r * 1.05:.1f}" ry="{r * .55:.1f}" fill="#1d5a30" opacity=".55"/>'
    s += f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{r:.1f}" ry="{r * .78:.1f}" fill="{pal[0]}"/>'
    s += f'<ellipse cx="{x - r * .18:.1f}" cy="{y - r * .15:.1f}" rx="{r * .8:.1f}" ry="{r * .58:.1f}" fill="{pal[1]}"/>'
    for _ in range(4):
        dx, dy = rnd.uniform(-.5, .3) * r, rnd.uniform(-.5, 0) * r
        s += f'<ellipse cx="{x + dx:.1f}" cy="{y + dy:.1f}" rx="{r * .28:.1f}" ry="{r * .16:.1f}" fill="{pal[2]}" opacity=".85"/>'
    return s


def _cane(x, yb, h, seed, lean=0.0):
    """Satu batang tebu: ruas-ruas, dan daun panjang melengkung di pucuk."""
    rnd = random.Random(seed)
    xt = x + lean
    s = (f'<path d="M{x - 1.6:.1f} {yb}L{xt - 1.4:.1f} {yb - h}L{xt + 1.4:.1f} {yb - h}L{x + 1.6:.1f} {yb}Z" fill="url(#cane)"/>')
    n = max(2, int(h / 7))
    for i in range(1, n):
        t = i / n
        yy = yb - h * t
        xx = x + lean * t
        s += f'<path d="M{xx - 1.7:.1f} {yy:.1f}h3.4" stroke="#6a7a1e" stroke-width=".8" opacity=".8"/>'
    for a in (-150, -118, -62, -30, -92):
        s += leaf(xt, yb - h, rnd.uniform(15, 21), 2.6, a, rnd.choice(['#5aa83c', '#74c050', '#4a9232']), '#e6f5b8', .45)
    return s


def _smoke(x, y):
    return (f'<ellipse cx="{x}" cy="{y}" rx="4.5" ry="3.4" fill="#f2f2f2" opacity=".75"/>'
            f'<ellipse cx="{x + 4}" cy="{y - 6}" rx="5.5" ry="4" fill="#ffffff" opacity=".6"/>'
            f'<ellipse cx="{x + 9}" cy="{y - 13}" rx="6.5" ry="4.6" fill="#ffffff" opacity=".42"/>')


# ------------------------------------------------------------------ SPRITE
def s_teh():
    d = SDEFS + lg('tt1', [(0, '#7fc65a'), (1, '#4f9a41')]) + lg('rf', [(0, '#d2543f'), (1, '#8f2f22')], 0, 0, 1, 1)
    o = base(54, 116) + mound(98, 20, 58, 6, 18)
    # tiga teras bersusun, makin ke depan makin lebar; tiap teras berisi baris semak teh
    rows = [(72, 6), (86, 7), (100, 8)]
    for ri, (y0, n) in enumerate(rows):
        x0, x1 = 14 - ri * 3, 114 + ri * 3
        o += (f'<path d="M{x0} {y0}Q64 {y0 - 16} {x1} {y0}L{x1 + 2} {y0 + 11}Q64 {y0 - 4} {x0 - 2} {y0 + 11}Z" fill="url(#tt1)"/>'
              f'<path d="M{x0} {y0}Q64 {y0 - 16} {x1} {y0}" stroke="#a98b5a" stroke-width="2.2" fill="none" stroke-linecap="round"/>')
        for k in range(n):
            t = .1 + k * (.8 / (n - 1))
            px, py = quad((x0, y0 + 4), (64, y0 - 12), (x1, y0 + 4), t)
            o += _bush(px, py + 2, 5.4 + ri * .5, ri * 20 + k)
    # pabrik teh kecil di kanan atas: tembok, atap merah, cerobong
    o += ('<rect x="86" y="34" width="26" height="18" fill="#e9d9b4" stroke="#6a4a2a" stroke-width="1"/>'
          '<rect x="95" y="41" width="8" height="11" fill="#5a3a1a"/>'
          '<path d="M83 35L99 20 115 35Z" fill="url(#rf)" stroke="#4a2018" stroke-width="1"/>'
          '<path d="M83 35L99 20 99 35Z" fill="#fff" opacity=".18"/>'
          '<rect x="104" y="14" width="5" height="14" fill="#8a5a3a" stroke="#4a3320" stroke-width=".7"/>')
    o += _smoke(107, 11)
    # pemetik teh: topi caping dan keranjang
    o += ('<g transform="translate(40 80)"><path d="M0 0V-9" stroke="#e0883a" stroke-width="3.2" stroke-linecap="round"/>'
          '<circle cx="0" cy="-12" r="2.4" fill="#d9a070"/><path d="M-5 -12.4L0 -18 5 -12.4Z" fill="#e8c34a" stroke="#8f6a2a" stroke-width=".6"/>'
          '<path d="M3 -6Q9 -3 7 3L2 2Z" fill="#b98a55" stroke="#5a3a1a" stroke-width=".6"/></g>')
    return svg(128, 128, d, o)


def s_tebu():
    d = SDEFS + lg('cane', [(0, '#b8cf50'), (.5, '#8fae34'), (1, '#5f7a22')], 0, 0, 1, 0) + lg('rf2', [(0, '#c9a24a'), (1, '#7a5a22')], 0, 0, 1, 1)
    d += lg('brick', [(0, '#c4684a'), (1, '#8a3f2a')], 0, 0, 1, 0)
    o = base(54, 116) + mound(100, 20, 58, 4, 22)
    # pabrik gula di belakang kiri: bangunan, cerobong bata, asap
    o += ('<rect x="10" y="48" width="30" height="22" fill="#e6d6b0" stroke="#6a4a2a" stroke-width="1"/>'
          '<path d="M6 49L25 34 44 49Z" fill="url(#rf2)" stroke="#4a3320" stroke-width="1"/>'
          '<rect x="19" y="57" width="9" height="13" fill="#5a3a1a"/>'
          '<rect x="42" y="22" width="8" height="40" fill="url(#brick)" stroke="#4a2018" stroke-width=".8"/>'
          '<path d="M41 22H51" stroke="#2a1a10" stroke-width="2"/>')
    o += _smoke(46, 18)
    # rumpun tebu: dua barisan, belakang lebih pendek
    rnd = random.Random(11)
    for i in range(9):
        x = 52 + i * 8.2 + rnd.uniform(-1, 1)
        o += _cane(x, 82 + rnd.uniform(-1, 1), 34 + rnd.uniform(-3, 4), i, rnd.uniform(-3, 3))
    for i in range(8):
        x = 22 + i * 12 + rnd.uniform(-1.5, 1.5)
        o += _cane(x, 104 + rnd.uniform(-1, 1), 46 + rnd.uniform(-4, 5), 30 + i, rnd.uniform(-4, 4))
    # ikat tebu di depan kanan
    for k in range(5):
        o += f'<path d="M{86 + k * 2.2:.1f} 112L{101 + k * 2.2:.1f} 105" stroke="url(#cane)" stroke-width="3" stroke-linecap="round"/>'
    o += '<path d="M92 109.5L96 107.5" stroke="#6a3a1a" stroke-width="2.2"/>'
    return svg(128, 128, d, o)


def _tob_plant(x, y, sc, seed):
    """Tanaman tembakau: batang pendek dengan daun lebar bersusun."""
    rnd = random.Random(seed)
    s = f'<path d="M{x} {y}V{y - 14 * sc:.1f}" stroke="#5f8a38" stroke-width="{2 * sc:.1f}" stroke-linecap="round"/>'
    for a, ln, yy in [(-165, 13, 0), (-15, 13, 0), (-140, 12, 5), (-40, 12, 5), (-155, 10, 9), (-25, 10, 9), (-100, 11, 13), (-80, 9, 15)]:
        fill = rnd.choice(['#5aa040', '#6cb44c', '#4a9038'])
        s += leaf(x, y - yy * sc, ln * sc, 4.6 * sc, a, fill, '#e6f5b8', .5)
    return s


def s_tembakau():
    d = SDEFS + lg('barn', [(0, '#b98a55'), (1, '#6f4a28')], 0, 0, 1, 1) + lg('rf3', [(0, '#d8c070'), (1, '#8a6a28')], 0, 0, 1, 1)
    o = base(54, 116) + mound(100, 20, 58, 9, 16)
    # gubuk pengering: tiang bambu, atap jerami, daun cokelat bergantungan
    o += ('<rect x="68" y="44" width="3" height="40" fill="url(#wood)"/><rect x="108" y="44" width="3" height="40" fill="url(#wood)"/>'
          '<path d="M62 46L90 24 118 46Q90 50 62 46Z" fill="url(#rf3)" stroke="#5a3a1a" stroke-width="1"/>'
          '<path d="M90 24L118 46Q104 48 96 47.5Z" fill="#6f4f1c" opacity=".4"/>'
          '<path d="M68 56H111M68 68H111" stroke="#5a3a1a" stroke-width="2"/>')
    for row, yy in enumerate((56, 68)):
        for k in range(8):
            x = 72 + k * 5
            o += (f'<path d="M{x} {yy}Q{x - 2} {yy + 7} {x + .5} {yy + 11}Q{x + 3} {yy + 7} {x + 2} {yy}Z" fill="{"#a8702e" if (k + row) % 2 else "#8f5a22"}" stroke="#5a3a14" stroke-width=".5"/>')
    # petak tanaman tembakau di depan
    for ri, (y0, n) in enumerate([(86, 5), (100, 6)]):
        for k in range(n):
            x = 14 + k * (96 / (n - 1)) * (.62 if ri == 0 else .9) + (0 if ri else 2)
            o += _tob_plant(x, y0 + (k % 2) * 2, 1.0 + ri * .12, ri * 10 + k)
    return svg(128, 128, d, o)


def s_garam():
    d = SDEFS + lg('pan', [(0, '#a9dceb'), (1, '#6fb6d0')], 0, 0, 0, 1) + lg('salt', [(0, '#ffffff'), (1, '#d5dde3')], 0, 0, 1, 1)
    d += lg('mud', [(0, '#a89878'), (1, '#6e6048')]) + lg('thatch2', [(0, '#e3c36b'), (1, '#8f6a2a')], 0, 0, 1, 1)
    o = base(56, 118)
    # tanah lempung dan petak-petak tambak berundak (jajaran genjang)
    o += '<path d="M6 100Q64 70 122 100Q64 126 6 100Z" fill="url(#mud)"/>'

    def pan(x, y, w, h, fill):
        s = (f'<path d="M{x} {y}L{x + w} {y}L{x + w + 8} {y + h}L{x - 8} {y + h}Z" fill="#7a6a4a"/>'
             f'<path d="M{x + 1.5} {y + 1.5}L{x + w - 1.5} {y + 1.5}L{x + w + 4.5} {y + h - 1.5}L{x - 4.5} {y + h - 1.5}Z" fill="{fill}"/>')
        return s
    o += pan(26, 78, 40, 9, 'url(#pan)') + pan(70, 78, 34, 9, 'url(#salt)')
    o += pan(14, 92, 46, 11, 'url(#salt)') + pan(66, 92, 44, 11, 'url(#pan)')
    # kilau air dan garis kristal
    o += '<path d="M32 82H50M80 96H100M22 98H44" stroke="#ffffff" stroke-width="1.2" opacity=".7" stroke-linecap="round"/>'
    o += '<path d="M76 82H96M26 96H50" stroke="#b9c6cf" stroke-width=".8" opacity=".8"/>'
    # gunungan garam putih dan gubuk kecil
    for cx, cy, w, h in [(98, 70, 15, 16), (86, 74, 11, 11), (108, 73, 11, 9)]:
        o += (f'<path d="M{cx - w} {cy}L{cx} {cy - h}L{cx + w} {cy}Q{cx} {cy + 4} {cx - w} {cy}Z" fill="url(#salt)" stroke="#b9c6cf" stroke-width=".8"/>'
              f'<path d="M{cx} {cy - h}L{cx + w} {cy}Q{cx + w * .5:.1f} {cy + 2} {cx} {cy + 3}Z" fill="#aab6c0" opacity=".45"/>')
    o += ('<rect x="14" y="64" width="2.6" height="14" fill="url(#wood)"/><rect x="34" y="64" width="2.6" height="14" fill="url(#wood)"/>'
          '<path d="M9 66L25 48 41 66Q25 69 9 66Z" fill="url(#thatch2)" stroke="#5a3a1a" stroke-width="1"/>'
          '<path d="M25 48L41 66Q33 67.5 28 67Z" fill="#6f4f1c" opacity=".4"/>'
          '<path d="M16 76H34" stroke="#5a3a1a" stroke-width="2"/>')
    return svg(128, 128, d, o)


# ------------------------------------------------------------------ IKON (64x64)
def i_teh():
    d = lg('tl', [(0, '#8fd16a'), (1, '#3f8f3a')], 0, 0, 1, 1) + lg('dl', [(0, '#8a5a2a'), (1, '#4f3016')])
    o = '<ellipse cx="32" cy="57" rx="22" ry="3.4" fill="#000" opacity=".22"/>'
    # tumpukan daun teh kering di bawah
    rnd = random.Random(21)
    o += '<path d="M8 54Q32 30 56 54Z" fill="url(#dl)" stroke="#2f1a0a" stroke-width=".8"/>'
    for _ in range(16):
        x, y = rnd.uniform(14, 50), rnd.uniform(44, 53)
        o += f'<path d="M{x:.1f} {y:.1f}q3 -3 6 -1" stroke="#c89a5a" stroke-width="1.1" fill="none" stroke-linecap="round" opacity=".8"/>'
    # pucuk teh: satu kuncup dan dua daun muda
    o += '<path d="M32 46V26" stroke="#4f8f35" stroke-width="2.6" stroke-linecap="round"/>'
    o += leaf(32, 38, 18, 5.4, -140, 'url(#tl)', '#e6f5c0', .6) + leaf(32, 38, 18, 5.4, -40, 'url(#tl)', '#e6f5c0', .6)
    o += leaf(32, 28, 16, 4.6, -112, 'url(#tl)', '#e6f5c0', .6) + leaf(32, 28, 16, 4.6, -68, 'url(#tl)', '#e6f5c0', .6)
    o += '<path d="M32 28Q29 18 32 9Q35 18 32 28Z" fill="#b9e08a" stroke="#6fae48" stroke-width=".8"/>'
    return svg(64, 64, d, o)


def i_gula():
    d = lg('top', [(0, '#ffffff'), (1, '#e6ecef')], 0, 0, 1, 1) + lg('lt', [(0, '#f4f7f8'), (1, '#cbd5da')], 0, 0, 1, 1)
    d += lg('rt', [(0, '#dde4e8'), (1, '#a9b6bd')], 0, 0, 1, 1) + lg('cn', [(0, '#b8cf50'), (1, '#5f7a22')], 0, 0, 1, 0)
    o = '<ellipse cx="32" cy="58" rx="24" ry="3.4" fill="#000" opacity=".22"/>'

    def cube(x, y, s):
        h = s * .5
        return (f'<path d="M{x} {y - s}L{x + s} {y - s + h}L{x} {y - s + 2 * h}L{x - s} {y - s + h}Z" fill="url(#top)" stroke="#b6c2c9" stroke-width=".8"/>'
                f'<path d="M{x - s} {y - s + h}L{x} {y - s + 2 * h}L{x} {y + h}L{x - s} {y}Z" fill="url(#lt)" stroke="#b6c2c9" stroke-width=".8"/>'
                f'<path d="M{x + s} {y - s + h}L{x} {y - s + 2 * h}L{x} {y + h}L{x + s} {y}Z" fill="url(#rt)" stroke="#b6c2c9" stroke-width=".8"/>'
                f'<circle cx="{x - s * .5:.1f}" cy="{y - s * .45:.1f}" r=".9" fill="#fff"/><circle cx="{x + s * .3:.1f}" cy="{y - s * .55:.1f}" r=".7" fill="#fff"/>')
    o += cube(20, 54, 12) + cube(42, 54, 12) + cube(31, 46, 12)
    # batang tebu di belakang
    o += '<path d="M48 36L56 8" stroke="url(#cn)" stroke-width="5" stroke-linecap="round"/><path d="M50.5 28H54.5M52 22H56" stroke="#6a7a1e" stroke-width="1"/>'
    o += leaf(56, 8, 12, 2.6, -150, '#5aa83c', '#e6f5b8', .45) + leaf(56, 8, 12, 2.6, -60, '#74c050', '#e6f5b8', .45)
    return svg(64, 64, d, o)


def i_tembakau():
    d = lg('lf', [(0, '#c48a42'), (.55, '#9a6428'), (1, '#6a4016')], 0, 0, 1, 1) + lg('rl', [(0, '#b57a36'), (1, '#6a4016')], 0, 0, 1, 0)
    o = '<ellipse cx="32" cy="58" rx="24" ry="3.2" fill="#000" opacity=".22"/>'
    # daun tembakau kering lebar dengan tulang daun
    o += ('<path d="M10 50Q10 18 34 8Q54 22 48 46Q30 58 10 50Z" fill="url(#lf)" stroke="#4a2c0c" stroke-width="1.2"/>'
          '<path d="M12 49Q28 34 38 14" stroke="#e8c88a" stroke-width="1.6" fill="none" opacity=".8"/>'
          '<path d="M20 43L12 36M26 37L16 28M31 30L22 20M35 24L28 14M24 41L34 40M30 33L42 32M34 26L44 24" stroke="#d9b070" stroke-width=".9" fill="none" opacity=".65"/>')
    # cerutu gulung di depan
    o += ('<g transform="rotate(-14 34 50)"><rect x="14" y="44" width="40" height="9" rx="4.5" fill="url(#rl)" stroke="#3a2008" stroke-width="1"/>'
          '<rect x="46" y="44" width="8" height="9" rx="3" fill="#d6c090" stroke="#3a2008" stroke-width=".8"/>'
          '<rect x="40" y="44" width="2.4" height="9" fill="#e8c34a" opacity=".9"/><path d="M18 47H38" stroke="#c48a42" stroke-width="1" opacity=".6"/></g>')
    return svg(64, 64, d, o)


def i_garam():
    d = lg('sl', [(0, '#ffffff'), (1, '#dfe6ea')], 0, 0, 1, 1) + lg('sd', [(0, '#c3ced5'), (1, '#8a9aa5')], 0, 0, 1, 1)
    o = '<ellipse cx="32" cy="58" rx="25" ry="3.4" fill="#000" opacity=".22"/>'
    # gundukan garam putih
    o += ('<path d="M6 54Q16 36 32 10Q48 36 58 54Q32 62 6 54Z" fill="url(#sl)" stroke="#b6c4cc" stroke-width="1.2"/>'
          '<path d="M32 10Q48 36 58 54Q46 58 32 58Z" fill="url(#sd)" opacity=".55"/>'
          '<path d="M18 48Q24 38 31 26M26 52Q30 44 34 36M40 50Q43 42 40 32" stroke="#b6c4cc" stroke-width="1" fill="none" opacity=".8"/>')
    # butir kristal berkilau
    for x, y, r in [(22, 44, 1.6), (38, 38, 1.4), (30, 22, 1.4), (46, 50, 1.5), (16, 52, 1.3)]:
        o += f'<path d="M{x} {y - r * 2}L{x + r} {y}L{x} {y + r * 2}L{x - r} {y}Z" fill="#ffffff" stroke="#9fb4c0" stroke-width=".5"/>'
    o += '<path d="M44 14l1.6 3.4 3.4 1.6-3.4 1.6-1.6 3.4-1.6-3.4-3.4-1.6 3.4-1.6Z" fill="#ffe27a" opacity=".95"/>'
    return svg(64, 64, d, o)
