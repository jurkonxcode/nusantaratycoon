"""Ilustrasi v2 Nusantara Tycoon: sprite bangunan (128x128), ikon komoditas (64x64) dan pola kawung (80x80).
Semua gambar dirancang orisinal untuk game ini (vektor murni, tanpa foto/aset pihak ketiga), memakai gradasi,
cahaya dari kiri-atas, bayangan lembut dan tekstur daun/anyaman supaya terlihat lebih nyata.
Dipakai oleh tools/make_assets.py (menimpa fungsi s_* dan i_* lama)."""
import math, random


# ------------------------------------------------------------------ pembantu
def svg(w, h, defs, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">'
            f'<defs>{defs}</defs>{body}</svg>\n')


def _stops(stops):
    out = ''
    for s in stops:
        o, c = s[0], s[1]
        a = f' stop-opacity="{s[2]}"' if len(s) > 2 else ''
        out += f'<stop offset="{o}" stop-color="{c}"{a}/>'
    return out


def lg(i, stops, x1=0, y1=0, x2=0, y2=1):
    return f'<linearGradient id="{i}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}">{_stops(stops)}</linearGradient>'


def rg(i, stops, cx=.5, cy=.5, r=.5, fx=None, fy=None):
    f = f' fx="{fx}" fy="{fy}"' if fx is not None else ''
    return f'<radialGradient id="{i}" cx="{cx}" cy="{cy}" r="{r}"{f}>{_stops(stops)}</radialGradient>'


def quad(p0, p1, p2, t):
    u = 1 - t
    return (u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1])


def leaf(x, y, ln, w, rot, fill, vein='#ffffff', vo=.35):
    """Daun runcing dengan tulang daun; titik pangkal di (x, y)."""
    return (f'<g transform="translate({x:.1f} {y:.1f}) rotate({rot:.0f})"><path d="M0 0Q{ln * .5:.1f} {-w:.1f} {ln:.1f} 0Q{ln * .5:.1f} {w:.1f} 0 0Z" fill="{fill}"/>'
            f'<path d="M1 0H{ln * .92:.1f}" stroke="{vein}" stroke-width=".7" opacity="{vo}" fill="none"/></g>')


# ------------------------------------------------------------------ dasar bersama sprite
SDEFS = (rg('sh', [(0, '#062c3b', .38), (1, '#062c3b', 0)], .5, .5, .5)
         + lg('gr', [(0, '#8ccf63'), (.55, '#5fae48'), (1, '#3f8a3c')])
         + lg('gr2', [(0, '#7cc65a'), (1, '#4a9a3f')])
         + lg('wood', [(0, '#a9794a'), (.5, '#7d5230'), (1, '#4f3119')], 0, 0, 1, 0)
         + lg('trunk', [(0, '#a88457'), (.45, '#7a5a38'), (1, '#4a3320')], 0, 0, 1, 0))


def base(rx=48, y=112):
    """Bayangan tanah lembut."""
    return f'<ellipse cx="64" cy="{y}" rx="{rx}" ry="9" fill="url(#sh)"/>'


def mound(y=100, depth=18, spread=58, seed=1, grass=26):
    """Gundukan tanah berumput dengan rumput halus."""
    rnd = random.Random(seed)
    s = (f'<path d="M{64 - spread} {y + 4}Q64 {y - depth} {64 + spread} {y + 4}Q64 {y + depth * .9:.0f} {64 - spread} {y + 4}Z" fill="url(#gr)"/>'
         f'<path d="M{64 - spread} {y + 4}Q64 {y + depth * .9:.0f} {64 + spread} {y + 4}Q64 {y + depth * 1.15:.0f} {64 - spread} {y + 4}Z" fill="#4a3320" opacity=".25"/>')
    blades = ''
    for _ in range(grass):
        t = rnd.random()
        x, yy = quad((64 - spread, y + 4), (64, y - depth), (64 + spread, y + 4), t)
        yy += rnd.random() * depth * .6
        h = 2.5 + rnd.random() * 3
        blades += f'M{x:.1f} {yy:.1f}l{rnd.uniform(-1.4, 1.4):.1f} {-h:.1f}'
    return s + f'<path d="{blades}" stroke="#2f7a38" stroke-width="1" stroke-linecap="round" fill="none" opacity=".7"/>'


def canopy(cx, cy, rx, ry, seed, n=60, pal=None, ids='cp'):
    """Tajuk pohon: dasar bergradasi + ratusan daun kecil; cahaya dari kiri atas."""
    pal = pal or ['#2f7a43', '#3c9150', '#4aa75c', '#5dbb6c']
    rnd = random.Random(seed)
    d = rg(ids, [(0, pal[3]), (.55, pal[1]), (1, '#1d5a35')], .38, .3, .85)
    s = (f'<ellipse cx="{cx}" cy="{cy + ry * .12:.1f}" rx="{rx}" ry="{ry}" fill="#174a2c"/>'
         f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry * .92:.1f}" fill="url(#{ids})"/>')
    for _ in range(n):
        a, r = rnd.random() * math.tau, math.sqrt(rnd.random()) * .92
        x, y = cx + math.cos(a) * rx * r, cy + math.sin(a) * ry * r * .92
        lit = (-(x - cx) / rx - (y - cy) / ry) * .5 + rnd.uniform(-.35, .35)
        c = pal[3] if lit > .35 else pal[2] if lit > 0 else pal[1] if lit > -.35 else pal[0]
        s += f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{rnd.uniform(3, 5.6):.1f}" ry="{rnd.uniform(1.8, 3):.1f}" transform="rotate({rnd.randint(-60, 60)} {x:.1f} {y:.1f})" fill="{c}" opacity=".9"/>'
    return d, s


def tuft(x, y, h, c1='#3e8e3e', c2='#6fbf55', n=5, seed=0):
    rnd = random.Random(seed + int(x * 7 + y * 13))
    s = ''
    for i in range(n):
        dx = (i - (n - 1) / 2) * 1.4
        top = h * rnd.uniform(.75, 1.1)
        s += f'<path d="M{x + dx * .4:.1f} {y:.1f}Q{x + dx:.1f} {y - top * .6:.1f} {x + dx * 1.9:.1f} {y - top:.1f}" stroke="{c1 if i % 2 else c2}" stroke-width="1.15" stroke-linecap="round" fill="none"/>'
    return s


# ------------------------------------------------------------------ SPRITE
def s_sawah():
    d = SDEFS + lg('wb', [(0, '#e7f2ee'), (.5, '#a9d8d6'), (1, '#7fb9bd')], 0, 0, 0, 1)
    d += lg('t1', [(0, '#e6c864'), (1, '#c9a23e')]) + lg('t2', [(0, '#9fd46a'), (1, '#6fb349')]) + lg('t3', [(0, '#7fc65a'), (1, '#4f9a41')])
    d += lg('thatch', [(0, '#e3c36b'), (.6, '#c39a45'), (1, '#8f6a2a')], 0, 0, 1, 1) + lg('bund', [(0, '#a98b5a'), (1, '#6e5632')])
    r = base(54, 116)

    def terr(y0, h, grad, bundc):
        top = f'M{10 - (y0 - 66) * .1:.1f} {y0}Q64 {y0 - 28} {118 + (y0 - 66) * .1:.1f} {y0}'
        x0, x1 = 10 - (y0 - 66) * .1, 118 + (y0 - 66) * .1
        s = (f'<path d="{top}L{x1 + 3:.1f} {y0 + h}Q64 {y0 + h - 28} {x0 - 3:.1f} {y0 + h}Z" fill="url(#{grad})"/>'
             f'<path d="{top}" stroke="url(#bund)" stroke-width="3.2" fill="none" stroke-linecap="round"/>'
             f'<path d="{top}" stroke="#d8c38f" stroke-width=".9" fill="none" opacity=".7" transform="translate(0 -1.2)"/>'
             f'<path d="M{x0 - 3:.1f} {y0 + h}Q64 {y0 + h - 28} {x1 + 3:.1f} {y0 + h}" stroke="#2c5a2c" stroke-width="1.2" fill="none" opacity=".35"/>')
        return s, x0, x1

    out = r
    # petak belakang (padi menguning)
    s, x0, x1 = terr(66, 12, 't1', '')
    out += s
    for row, fr in enumerate([.28, .68]):
        yy = 66 + 12 * fr
        for k in range(9):
            t = .07 + k * .108 + (0.04 if row else 0)
            px, py = quad((x0 + 4, yy), (64, yy - 28), (x1 - 4, yy), t)
            out += tuft(px, py + 2, 7, '#c79a34', '#e8c458', 5, k)
            out += f'<circle cx="{px + 2:.1f}" cy="{py - 5:.1f}" r="1.2" fill="#f2d575"/>'
    # pondok
    out += ('<path d="M74 63H98" stroke="#5a3a1a" stroke-width="2.4" stroke-linecap="round"/>'
            '<rect x="76" y="52" width="2.6" height="12" fill="url(#wood)"/><rect x="94" y="52" width="2.6" height="12" fill="url(#wood)"/>'
            '<rect x="77" y="49" width="19" height="3" fill="#7a5230"/>'
            '<path d="M68 52L86 28 106 52Q86 55 68 52Z" fill="url(#thatch)"/>'
            '<path d="M86 28L106 52Q98 53 92 52.6Z" fill="#6f4f1c" opacity=".45"/>'
            + ''.join(f'<path d="M{86 + (x - 86) * .15:.1f} {30 + i * 4.2}L{x}  {52 - 0.4}" stroke="#8f6a2a" stroke-width=".7" opacity=".6"/>' for i, x in enumerate([72, 76, 80, 84, 90, 94, 98, 102]))
            + '<path d="M70 51Q86 54 104 51" stroke="#f1dc92" stroke-width="1" fill="none" opacity=".7"/>')
    # petak tengah (hijau), petak depan (muda + air)
    s, x0, x1 = terr(80, 14, 't2', '')
    out += s
    for row, fr in enumerate([.3, .72]):
        yy = 80 + 14 * fr
        for k in range(9):
            t = .06 + k * .11 + (0.05 if row else 0)
            px, py = quad((x0 + 4, yy), (64, yy - 28), (x1 - 4, yy), t)
            out += tuft(px, py + 2, 8, '#2f7a38', '#5fb04a', 6, k + 20)
    s, x0, x1 = terr(96, 16, 't3', '')
    out += s
    out += f'<path d="M{x0 + 8:.1f} 104Q64 82 {x1 - 8:.1f} 104L{x1 - 14:.1f} 108Q64 88 {x0 + 14:.1f} 108Z" fill="url(#wb)" opacity=".55"/>'
    for row, fr in enumerate([.3, .75]):
        yy = 96 + 16 * fr
        for k in range(8):
            t = .08 + k * .12 + (0.05 if row else 0)
            px, py = quad((x0 + 6, yy), (64, yy - 28), (x1 - 6, yy), t)
            out += tuft(px, py + 2, 6.5, '#35893f', '#7bc95a', 5, k + 50)
            out += f'<ellipse cx="{px:.1f}" cy="{py + 2.6:.1f}" rx="3.4" ry=".9" fill="#ffffff" opacity=".5"/>'
    # pohon kelapa kiri
    out += ('<path d="M24 74Q27 58 22 40" stroke="#6a4a2a" stroke-width="3.2" fill="none" stroke-linecap="round"/>'
            '<path d="M24 74Q27 58 22 40" stroke="#a8825a" stroke-width="1" fill="none" opacity=".6" transform="translate(-.8 0)"/>'
            + ''.join(leaf(22, 40, 17, 3.2, a, c, '#c8e6a8', .5) for a, c in [(-160, '#2d7a3e'), (-125, '#3a9150'), (-60, '#3a9150'), (-20, '#2d7a3e'), (-95, '#4aa75c'), (15, '#2a6e38'), (165, '#2a6e38')])
            + '<circle cx="21" cy="42" r="2" fill="#6a4a2a"/><circle cx="24" cy="43" r="2" fill="#7a5a34"/>')
    return svg(128, 128, d, out)


def _batik_patterns():
    kaw = ('<pattern id="pk" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="#2a3f78"/>'
           '<g fill="none" stroke="#e9d08a" stroke-width=".7"><ellipse cx="3" cy="6" rx="3" ry="1.7"/><ellipse cx="9" cy="6" rx="3" ry="1.7"/><ellipse cx="6" cy="3" rx="1.7" ry="3"/><ellipse cx="6" cy="9" rx="1.7" ry="3"/></g>'
           '<circle cx="6" cy="6" r=".8" fill="#e9d08a"/></pattern>')
    par = ('<pattern id="pp" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><rect width="10" height="10" fill="#9c2f27"/>'
           '<path d="M0 3Q2.5 0 5 3T10 3M0 8Q2.5 5 5 8T10 8" stroke="#f0d28a" stroke-width="1.1" fill="none"/></pattern>')
    meg = ('<pattern id="pm" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="#2f6d6a"/>'
           '<path d="M1 8Q3 3 6 5Q8 2 11 7" stroke="#f1e2b0" stroke-width=".9" fill="none"/><path d="M0 11Q4 8 8 11" stroke="#f1e2b0" stroke-width=".8" fill="none" opacity=".7"/></pattern>')
    return kaw + par + meg


def s_batik():
    d = SDEFS + _batik_patterns()
    d += lg('roof', [(0, '#c5663a'), (.6, '#a24a28'), (1, '#6e2f18')], 0, 0, 0, 1) + lg('roof2', [(0, '#b4562f'), (1, '#7a3419')], 0, 0, 0, 1)
    d += lg('stone', [(0, '#d3cbb9'), (1, '#9b9382')]) + lg('floor', [(0, '#e8d8b0'), (1, '#c4ab78')])
    d += lg('sheen', [(0, '#ffffff', .35), (.5, '#ffffff', 0), (1, '#000000', .18)], 0, 0, 1, 1)
    o = base(54, 116)
    o += '<path d="M12 104L20 94H108L116 104Z" fill="url(#stone)"/><path d="M12 104H116V110H12Z" fill="#8c846f"/><path d="M12 104H116" stroke="#f3ecda" stroke-width="1" opacity=".7"/>'
    o += '<rect x="26" y="62" width="76" height="32" fill="#2c1d12" opacity=".55"/><rect x="26" y="88" width="76" height="6" fill="url(#floor)"/>'
    for x in (28, 50, 72, 94):
        o += f'<rect x="{x}" y="60" width="5" height="36" fill="url(#wood)"/><rect x="{x - 1.5}" y="93" width="8" height="3" fill="#3a2614"/>'
    o += '<rect x="26" y="59" width="76" height="4" fill="#5a3a1c"/><path d="M26 59H102" stroke="#e5b85a" stroke-width="1" opacity=".8"/>'
    # tiga kain batik dijemur
    o += '<path d="M31 70H97" stroke="#6d4a26" stroke-width="2.2" stroke-linecap="round"/>'
    for x, w, p in [(33, 16, 'pk'), (53, 16, 'pp'), (74, 18, 'pm')]:
        o += (f'<path d="M{x} 70.6H{x + w}V{88}Q{x + w * .75} 90 {x + w * .5} 88T{x} 89Z" fill="url(#{p})" stroke="#1c140c" stroke-width=".5"/>'
              f'<path d="M{x} 70.6H{x + w}V88Q{x + w * .75} 90 {x + w * .5} 88T{x} 89Z" fill="url(#sheen)"/>')
    # atap bertingkat (joglo)
    o += ('<path d="M6 62L30 40H98L122 62Q64 66 6 62Z" fill="url(#roof)"/>'
          '<path d="M98 40L122 62Q112 63.5 104 64L90 40Z" fill="#5a2612" opacity=".5"/>')
    o += ''.join(f'<path d="M{8 + i * 2.4:.1f} 61.5L{31 + i * 1.2:.1f} 41M{8 + i * 2.4:.1f} 61.5" stroke="#5a2612" stroke-width=".6" opacity=".35"/>' for i in range(0, 30, 3))
    o += '<path d="M6 62Q64 66 122 62" stroke="#f0b27a" stroke-width="1.2" fill="none" opacity=".7"/>'
    o += ('<path d="M32 40L46 22H82L96 40Z" fill="url(#roof2)"/><path d="M82 22L96 40H90L78 22Z" fill="#4f210f" opacity=".5"/>'
          '<path d="M46 22L64 10 82 22Z" fill="url(#roof)"/><path d="M64 10L82 22H76L64 14Z" fill="#4f210f" opacity=".45"/>'
          + ''.join(f'<path d="M{34 + i * 2.7:.1f} 40L{47 + i * 1.6:.1f} 22.5" stroke="#4f210f" stroke-width=".55" opacity=".3"/>' for i in range(0, 14, 2))
          + '<path d="M30 40H98" stroke="#f0b27a" stroke-width="1" opacity=".6"/><path d="M63 10V4" stroke="#d9a441" stroke-width="2" stroke-linecap="round"/><circle cx="63" cy="4" r="2.2" fill="#f1cd6a"/>')
    return svg(128, 128, d, o)


def s_kopi():
    d = SDEFS
    cd, ct = canopy(64, 27, 38, 19, 11, 44, ['#2c7a40', '#38904d', '#46a65a', '#58b86a'], 'cp1')
    d += cd + lg('lf', [(0, '#4ab063'), (1, '#1f6d3a')], 0, 0, 1, 1) + rg('ch', [(0, '#ff8d7a'), (.4, '#d83a2c'), (1, '#8f1b16')], .35, .3, .75)
    o = base(54, 114) + mound(98, 22, 58, 3, 20)
    # pohon pelindung (lamtoro) di belakang
    o += '<path d="M61 92L62.5 36H66L67.5 92Z" fill="url(#trunk)"/>' + ct
    # semak kopi: daun berkilau & buah ceri
    rnd = random.Random(7)
    bush = ''
    spots = [(34, 86), (60, 90), (88, 86), (46, 100), (76, 100), (22, 98), (104, 98)]
    for bx, by in spots:
        bush += f'<ellipse cx="{bx}" cy="{by - 5}" rx="17" ry="11" fill="#1e5f34"/>'
        for _ in range(10):
            a = rnd.uniform(-170, -10)
            bush += leaf(bx + rnd.uniform(-9, 9), by - 2 + rnd.uniform(-4, 4), rnd.uniform(11, 15), 4, a, rnd.choice(['#2f8f4e', '#3aa05a', '#27793f', '#47b063']), '#d9f2c8', .5)
        for _ in range(6):
            cx_, cy_ = bx + rnd.uniform(-12, 12), by - 5 + rnd.uniform(-5, 6)
            bush += f'<circle cx="{cx_:.1f}" cy="{cy_:.1f}" r="2.9" fill="url(#ch)"/><circle cx="{cx_ - .9:.1f}" cy="{cy_ - 1:.1f}" r=".8" fill="#fff" opacity=".8"/>'
    o += bush
    return svg(128, 128, d, o)


def s_karet():
    d = SDEFS
    cd, ct = canopy(64, 36, 42, 24, 5, 70, ['#2a7340', '#378a4d', '#46a15a', '#5ab56b'], 'cp2')
    d += cd + lg('lat', [(0, '#ffffff'), (1, '#e3ddcb')]) + lg('tr', [(0, '#c3a67d'), (.4, '#8f7048'), (1, '#4f3a22')], 0, 0, 1, 0)
    o = base(54, 114) + mound(100, 20, 58, 9, 24)
    # dua batang kecil di belakang
    o += ct.replace('cx="64"', 'cx="64"')
    # batang utama
    o += '<path d="M54 108L57 56H72L75 108Z" fill="url(#tr)"/>'
    o += '<path d="M57 56H72" stroke="#3a2a18" stroke-width="1.6"/>'
    # alur sadap (herringbone) + getah + mangkuk
    o += '<path d="M57 70L72 82M57 79L72 91" stroke="#3a2815" stroke-width="2" stroke-linecap="round" fill="none"/>'
    o += '<path d="M72 82L68 96M72 91L68 96" stroke="#f4efe0" stroke-width="1.6" stroke-linecap="round" opacity=".95"/>'
    o += '<path d="M62 70L63 100" stroke="#e8dfc4" stroke-width="1.1" opacity=".35"/>'
    o += ('<path d="M61 97H77L75.5 108H62.5Z" fill="#7b4a2b"/><path d="M61 97H77" stroke="#c9895a" stroke-width="1.4"/>'
          '<ellipse cx="69" cy="98" rx="7.5" ry="2" fill="url(#lat)"/><ellipse cx="67" cy="97.6" rx="3" ry=".7" fill="#fff"/>')
    return svg(128, 128, d, o)


def s_kakao():
    d = SDEFS
    cd, ct = canopy(64, 34, 44, 24, 21, 40, ['#2c7a40', '#3a9150', '#4aa75c', '#5cbc6d'], 'cp3')
    d += cd + lg('pod', [(0, '#ffd45a'), (.45, '#f0a02a'), (1, '#c4560f')], 0, 0, 1, 1)
    o = base(54, 114) + mound(100, 20, 58, 14, 22)
    o += '<path d="M56 108L58 44H71L73 108Z" fill="url(#trunk)"/><path d="M58 44L52 36M71 44L78 36" stroke="#5a3d22" stroke-width="3" stroke-linecap="round"/>'
    o += ct
    # daun besar menjuntai
    for x, y, r in [(34, 52, 100), (96, 54, 80), (46, 58, 120), (84, 60, 60)]:
        o += leaf(x, y, 22, 6, r, '#2f8a49', '#d9f2c8', .45)

    def pod(x, y, rot, s=1):
        return (f'<g transform="translate({x} {y}) rotate({rot}) scale({s})"><path d="M0 -15Q10 -9 10 3Q8 13 0 17Q-8 13 -10 3Q-10 -9 0 -15Z" fill="url(#pod)" stroke="#9a4a0c" stroke-width=".8"/>'
                '<path d="M-5 -12Q-8 2 -4 14M0 -15V17M5 -12Q8 2 4 14" stroke="#a8550e" stroke-width="1.1" fill="none" opacity=".7"/>'
                '<path d="M-7 -7Q-9 2 -6 10" stroke="#fff3b0" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".7"/><path d="M0 -15V-18" stroke="#4a3320" stroke-width="2"/></g>')
    o += pod(50, 74, 12) + pod(80, 80, -14) + pod(66, 90, 3, 1.05) + pod(54, 94, -8, .85)
    return svg(128, 128, d, o)


def s_cengkeh():
    d = SDEFS
    d += lg('cone', [(0, '#3da060'), (.5, '#2a7c46'), (1, '#175a34')], 0, 0, 1, 0) + lg('mat', [(0, '#d9b977'), (1, '#9f7a3a')])
    o = base(54, 114) + mound(100, 18, 58, 4, 22)
    o += '<rect x="60" y="86" width="8" height="22" fill="url(#trunk)"/>'
    # tajuk berbentuk kerucut berlapis
    layers = [(70, 104, 38), (58, 92, 32), (46, 80, 26), (36, 66, 20), (28, 54, 14)]
    rnd = random.Random(2)
    for i, (ty, by, hw) in enumerate(layers):
        o += f'<path d="M64 {ty - 14}L{64 + hw} {by}Q64 {by + 6} {64 - hw} {by}Z" fill="url(#cone)"/>'
        for _ in range(16):
            t = rnd.random()
            x = 64 + (rnd.random() - .5) * 2 * hw * (.2 + t * .8)
            y = ty - 10 + t * (by - ty + 8)
            lit = (64 - x) / hw
            c = '#58b86a' if lit > .35 else '#3a9150' if lit > -.2 else '#1f6b3f'
            o += f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="4" ry="1.8" transform="rotate({rnd.randint(-40, 40)} {x:.1f} {y:.1f})" fill="{c}" opacity=".85"/>'
    # tandan kuncup bunga merah muda
    for x, y in [(46, 84), (58, 68), (76, 74), (84, 90), (52, 98), (72, 98), (64, 50), (50, 76), (70, 58)]:
        o += (f'<g transform="translate({x} {y})"><path d="M0 0V8" stroke="#8a4a38" stroke-width="1.3"/>'
              '<circle cx="-2.6" cy="-2" r="2.2" fill="#e8869a"/><circle cx="2.6" cy="-2" r="2.2" fill="#e8869a"/><circle cx="0" cy="-3.4" r="2.4" fill="#f4a8b8"/>'
              '<circle cx="-.5" cy="-4" r=".8" fill="#fff" opacity=".8"/></g>')
    # tikar penjemuran
    o += ('<path d="M82 106L116 106L122 116H76Z" fill="url(#mat)"/><path d="M82 106H116" stroke="#f1dc92" stroke-width="1"/>'
          + ''.join(f'<path d="M{80 + i * 5} 116L{83 + i * 5.2} 106" stroke="#7a5a28" stroke-width=".5" opacity=".6"/>' for i in range(8))
          + ''.join(f'<ellipse cx="{x}" cy="{y}" rx="2" ry="1" transform="rotate({r} {x} {y})" fill="#7a3a24"/>' for x, y, r in [(88, 110, 20), (95, 112, 80), (102, 109, 50), (108, 112, 10), (92, 114, 100), (100, 114, 30), (112, 109, 70)]))
    return svg(128, 128, d, o)


def s_pelabuhan():
    d = SDEFS
    d += rg('bay', [(0, '#2fa5b6', .85), (.7, '#1a8a9c', .55), (1, '#1a8a9c', 0)], .5, .5, .5)
    d += lg('quay', [(0, '#d4cfc3'), (1, '#9a9484')]) + lg('crane', [(0, '#ef6a4f'), (1, '#b53a2b')], 0, 0, 1, 0)
    d += lg('wh', [(0, '#ece5d3'), (1, '#b7ad92')], 0, 0, 1, 0)
    # teluk kecil berair lembut (tanpa tepi persegi) + riak
    o = '<ellipse cx="64" cy="106" rx="62" ry="17" fill="url(#bay)"/>'
    o += ''.join(f'<path d="M{x} {y}q6 -3 12 0" stroke="#e3f8f6" stroke-width="1.3" fill="none" stroke-linecap="round" opacity=".6"/>' for x, y in [(8, 108), (30, 114), (74, 113), (100, 108), (54, 118)])
    # dermaga beton bersisi tebal + tiang pancang ke air
    o += '<path d="M8 98L16 84H116L122 98Z" fill="#7d7766"/><path d="M8 98L16 84H116L122 98Q64 104 8 98Z" fill="url(#quay)"/>'
    o += '<path d="M16 84H116" stroke="#f0ece0" stroke-width="1.6"/><path d="M8 98Q64 104 122 98V102Q64 108 8 102Z" fill="#5f5a4d"/>'
    o += ''.join(f'<path d="M{x} 99V106" stroke="#4a4538" stroke-width="2.2" stroke-linecap="round"/>' for x in (22, 46, 70, 94, 114))
    o += ''.join(f'<rect x="{x}" y="86" width="4" height="4" rx="1.4" fill="#2b2f33"/>' for x in (24, 100))
    # gudang
    o += ('<rect x="10" y="60" width="34" height="25" fill="url(#wh)"/><path d="M6 61L27 47 48 61Z" fill="#6f7a86"/><path d="M27 47L48 61H41L27 51Z" fill="#4f5a66"/>'
          '<rect x="19" y="68" width="12" height="17" fill="#4a5560"/><path d="M19 71H31M19 75H31M19 79H31" stroke="#6f7a86" stroke-width=".8"/>')
    # peti kemas
    def cont(x, y, c, c2):
        return (f'<rect x="{x}" y="{y}" width="21" height="10" fill="{c}" stroke="{c2}" stroke-width=".7"/>'
                + ''.join(f'<path d="M{x + 3 + i * 3.2:.1f} {y + 1}V{y + 9}" stroke="{c2}" stroke-width=".6" opacity=".7"/>' for i in range(6))
                + f'<path d="M{x} {y + .6}H{x + 21}" stroke="#ffffff" stroke-width=".8" opacity=".4"/>')
    o += cont(74, 74, '#d4503f', '#8e2a1f') + cont(96, 74, '#3a8fd1', '#1f5a8c') + cont(74, 64, '#e8a93a', '#a8741a') + cont(96, 64, '#3d9a58', '#1f6a38') + cont(85, 54, '#d4503f', '#8e2a1f')
    # derek
    o += ('<path d="M50 85V36H57V85Z" fill="url(#crane)"/><path d="M66 85V36H70V85Z" fill="url(#crane)"/>'
          '<path d="M50 42H70M50 54L70 42M50 66L70 54M50 78L70 66" stroke="#b53a2b" stroke-width="1.1" fill="none"/>'
          '<path d="M34 32H104L110 38H34Z" fill="url(#crane)"/><path d="M34 32H104" stroke="#ffb7a4" stroke-width="1.1"/>'
          '<path d="M59 32L42 18M59 32L92 24" stroke="#7c2a1f" stroke-width="1.2"/><path d="M42 18L59 32" stroke="#b53a2b" stroke-width="1.5"/>'
          '<path d="M90 38V58" stroke="#2a2a2a" stroke-width="1.3"/><rect x="85" y="56" width="11" height="3" fill="#f0b83a"/>'
          '<rect x="47" y="85" width="15" height="3" fill="#7c2a1f"/><rect x="64" y="85" width="12" height="3" fill="#7c2a1f"/>')
    return svg(128, 128, d, o)


def s_kapal():
    d = SDEFS
    d += lg('sea', [(0, '#2aa0b3'), (1, '#0d5f78')]) + lg('hull', [(0, '#8a5a32'), (.5, '#6b4122'), (1, '#3f2412')])
    d += lg('sail', [(0, '#fffaf0'), (.6, '#efe3c4'), (1, '#cdbb92')], 0, 0, 1, 1) + lg('sail2', [(0, '#fdf4de'), (1, '#d4c29a')], 0, 0, 1, 1)
    d += rg('bay', [(0, '#2aa0b3', .9), (.65, '#14788f', .6), (1, '#14788f', 0)], .5, .5, .5)
    o = '<ellipse cx="64" cy="106" rx="62" ry="15" fill="url(#bay)"/>'
    # layar
    o += ('<path d="M47 16L47 80Q34 84 20 80Q26 44 47 16Z" fill="url(#sail)" stroke="#a89466" stroke-width=".7"/>'
          '<path d="M47 16Q33 40 22 78M47 40Q36 58 26 79M47 60Q40 70 32 80" stroke="#b7a57a" stroke-width=".6" fill="none" opacity=".7"/>'
          '<path d="M79 24L79 80Q62 85 50 80Q56 48 79 24Z" fill="url(#sail2)" stroke="#a89466" stroke-width=".7"/>'
          '<path d="M79 24Q64 46 52 78M79 46Q68 62 57 79" stroke="#b7a57a" stroke-width=".6" fill="none" opacity=".7"/>'
          '<path d="M81 30L115 74L81 78Z" fill="url(#sail)" stroke="#a89466" stroke-width=".7"/><path d="M81 52L104 74M81 64L96 76" stroke="#b7a57a" stroke-width=".6" opacity=".7"/>'
          '<path d="M47 82L82 28M82 28L116 76" stroke="#3d2a14" stroke-width=".9" fill="none"/>')
    # tiang + bendera
    o += '<path d="M47 84V12M79 84V20" stroke="#4a3118" stroke-width="2.8" stroke-linecap="round"/><path d="M47 14L58 17.5L47 21Z" fill="#c0453a"/><path d="M79 22L89 25L79 28Z" fill="#e0a030"/>'
    # lambung kayu bertingkat + garis papan
    o += ('<path d="M12 80L96 82Q108 81 120 70Q116 98 94 104L30 104Q16 100 12 80Z" fill="url(#hull)"/>'
          '<path d="M14 88Q64 92 116 82M18 95Q64 99 108 91" stroke="#2f1a0c" stroke-width=".8" fill="none" opacity=".6"/>'
          '<path d="M12 80L96 82Q108 81 120 70" stroke="#e0a030" stroke-width="2.4" fill="none"/><path d="M13 83L96 85Q108 84 118 75" stroke="#c0453a" stroke-width="1.6" fill="none"/>'
          '<path d="M12 80L96 82" stroke="#f6d77a" stroke-width=".7" opacity=".7" transform="translate(0 -1.2)"/>'
          '<rect x="12" y="68" width="22" height="13" rx="1.5" fill="#a8794a" stroke="#4a3118" stroke-width=".8"/><path d="M10 68L23 60L36 68Z" fill="#6b3b17"/><rect x="18" y="72" width="4" height="4" fill="#2a4a6a"/><rect x="25" y="72" width="4" height="4" fill="#2a4a6a"/>')
    # ombak & busa
    o += ('<path d="M10 104Q26 99 42 104T76 104 112 102" stroke="#ffffff" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".85"/>'
          '<path d="M20 112Q40 108 60 112T100 112" stroke="#bfeaee" stroke-width="1.6" fill="none" opacity=".5"/>')
    return svg(128, 128, d, o)


def s_tol():
    d = SDEFS
    d += lg('asp', [(0, '#5b6068'), (1, '#33373e')]) + lg('con', [(0, '#d4cfc3'), (1, '#9a9487')]) + lg('car', [(0, '#e2594a'), (1, '#9c2a20')])
    d += lg('sign', [(0, '#3d86c8'), (1, '#1f5a96')])
    o = base(58, 118) + '<path d="M0 104Q64 98 128 104V128H0Z" fill="url(#gr)"/>'
    # pilar jembatan layang
    o += ''.join(f'<path d="M{x} 70V108" stroke="#8d8777" stroke-width="6"/><path d="M{x - 2} 70V108" stroke="#d4cfc3" stroke-width="1.6" opacity=".7"/>' for x in (22, 64, 106))
    # badan jalan
    o += '<path d="M0 64H128V98H0Z" fill="url(#asp)"/><path d="M0 64H128V69H0Z" fill="url(#con)"/><path d="M0 98H128V104H0Z" fill="url(#con)"/><path d="M0 98H128" stroke="#e0a030" stroke-width="1.6"/>'
    o += '<path d="M6 82H26M38 82H58M70 82H90M102 82H122" stroke="#f6ecd7" stroke-width="2.2" stroke-linecap="round"/>'
    o += '<path d="M0 66H128" stroke="#fff" stroke-width=".8" opacity=".5"/>'
    # pagar pengaman
    o += '<path d="M0 59H128" stroke="#b9bdc4" stroke-width="2"/>' + ''.join(f'<rect x="{x}" y="59" width="2" height="6" fill="#7b8089"/>' for x in range(4, 128, 16))
    # gerbang tol + papan petunjuk
    o += ('<rect x="84" y="16" width="38" height="26" rx="2" fill="url(#sign)" stroke="#e9f1f8" stroke-width="1.2"/>'
          '<path d="M92 31H114M106 23L114 31 106 39" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
          '<rect x="95" y="42" width="3" height="18" fill="#7b8089"/><rect x="108" y="42" width="3" height="18" fill="#7b8089"/>')
    # mobil
    o += ('<path d="M14 84L18 76Q22 72 30 72H42Q50 72 54 78L58 84Z" fill="url(#car)"/>'
          '<path d="M24 76Q26 73.5 31 73.5H40Q45 73.5 48 77L50 80H22Z" fill="#b9e3f2" opacity=".9"/><path d="M36 74V80" stroke="#9c2a20" stroke-width="1"/>'
          '<rect x="12" y="82" width="48" height="8" rx="3" fill="url(#car)"/><path d="M13 84H59" stroke="#ffb3a6" stroke-width=".8" opacity=".6"/>'
          '<circle cx="24" cy="91" r="4.2" fill="#1c1e22"/><circle cx="24" cy="91" r="1.7" fill="#aab0b8"/><circle cx="48" cy="91" r="4.2" fill="#1c1e22"/><circle cx="48" cy="91" r="1.7" fill="#aab0b8"/>'
          '<rect x="57" y="84" width="3" height="2.4" rx=".8" fill="#ffe08a"/>')
    return svg(128, 128, d, o)


# ------------------------------------------------------------------ IKON KOMODITAS (64x64)
def i_padi():
    d = lg('gr', [(0, '#fff0a0'), (.5, '#e8b93e'), (1, '#b97e1a')], 0, 0, 1, 1) + lg('bl', [(0, '#9ac85a'), (1, '#4f8f35')])
    d += rg('bg', [(0, '#fff6d6', .55), (1, '#fff6d6', 0)], .5, .5, .5)
    o = '<circle cx="32" cy="34" r="29" fill="url(#bg)"/>'
    # daun hijau
    o += (leaf(30, 60, 40, 3, -98, 'url(#bl)', '#e6f5c0', .6) + leaf(36, 60, 36, 2.6, -62, 'url(#bl)', '#e6f5c0', .6)
          + leaf(26, 60, 34, 2.4, -128, 'url(#bl)', '#e6f5c0', .6))

    def stalk(x0, ctrl, tip, grains, flip=1):
        s = f'<path d="M{x0} 60Q{ctrl[0]} {ctrl[1]} {tip[0]} {tip[1]}" stroke="#b9a74a" stroke-width="2" fill="none" stroke-linecap="round"/>'
        for k in range(grains):
            t = .46 + k * (.5 / grains)
            gx, gy = quad((x0, 60), ctrl, tip, t)
            side = flip * (1 if k % 2 == 0 else -1)
            rot = -40 * side + (tip[0] - x0) * .4
            s += (f'<g transform="translate({gx + side * 1.8:.1f} {gy:.1f}) rotate({rot:.0f})"><ellipse cx="0" cy="0" rx="2.3" ry="4.4" fill="url(#gr)" stroke="#a8721a" stroke-width=".35"/>'
                  f'<path d="M-.8 -2Q-.4 0 -.8 2.4" stroke="#fff6b0" stroke-width=".7" fill="none" opacity=".8"/><path d="M0 -4.2L{side * .6:.1f} -8" stroke="#d9a02c" stroke-width=".45"/></g>')
        return s
    o += stalk(30, (30, 30), (14, 10), 9, -1)
    o += stalk(33, (38, 28), (50, 14), 9, 1)
    o += stalk(32, (32, 24), (33, 6), 8, 1)
    return svg(64, 64, d, o)


def i_batik():
    d = _batik_patterns()
    d += lg('sh', [(0, '#ffffff', .38), (.5, '#ffffff', 0), (1, '#000000', .28)], 0, 0, 1, 1)
    d += ('<pattern id="kw" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="#6a3a1b"/>'
          '<g fill="#8a5126" stroke="#e8c26a" stroke-width=".7"><ellipse cx="3.5" cy="7" rx="3.5" ry="2"/><ellipse cx="10.5" cy="7" rx="3.5" ry="2"/><ellipse cx="7" cy="3.5" rx="2" ry="3.5"/><ellipse cx="7" cy="10.5" rx="2" ry="3.5"/></g>'
          '<circle cx="7" cy="7" r="1" fill="#f3d27a"/></pattern>')
    o = '<ellipse cx="32" cy="58" rx="24" ry="3.4" fill="#000" opacity=".22"/>'
    # kain bawah (indigo kawung)
    o += ('<g transform="rotate(-7 32 36)"><rect x="8" y="28" width="48" height="26" rx="2" fill="url(#pk)" stroke="#161a3a" stroke-width=".9"/>'
          '<rect x="8" y="28" width="48" height="26" rx="2" fill="url(#sh)"/><rect x="8" y="49" width="48" height="5" fill="#e9d08a" opacity=".92"/>'
          '<path d="M8 49H56" stroke="#8a2f27" stroke-width=".8"/>' + ''.join(f'<path d="M{10 + i * 4} 54v3" stroke="#e9d08a" stroke-width=".8"/>' for i in range(12)) + '</g>')
    # kain atas (sogan kawung), lipatan di tepi atas
    o += ('<g transform="rotate(5 32 24)"><rect x="9" y="12" width="46" height="26" rx="2" fill="url(#kw)" stroke="#2a160a" stroke-width=".9"/>'
          '<rect x="9" y="12" width="46" height="26" rx="2" fill="url(#sh)"/><rect x="9" y="12" width="46" height="6" rx="2" fill="#f0d89a"/>'
          '<path d="M9 18H55" stroke="#8a2f27" stroke-width=".9"/><path d="M9 38H55" stroke="#000" stroke-width="3" opacity=".18"/></g>')
    return svg(64, 64, d, o)


def i_kopi():
    d = rg('bn', [(0, '#a8744a'), (.45, '#6b3b17'), (1, '#2e1608')], .35, .3, .85)
    d += rg('ch', [(0, '#ff9a86'), (.4, '#d83a2c'), (1, '#8f1b16')], .35, .3, .75)
    o = '<ellipse cx="32" cy="57" rx="22" ry="3.4" fill="#000" opacity=".22"/>'

    def bean(x, y, r, s=1):
        return (f'<g transform="translate({x} {y}) rotate({r}) scale({s})"><ellipse cx="0" cy="0" rx="13" ry="17.5" fill="url(#bn)"/>'
                '<path d="M0 -17Q-6.5 -6 0 0T0 17" stroke="#1d0d04" stroke-width="2.6" fill="none" stroke-linecap="round"/>'
                '<path d="M1 -16Q-4.6 -6 1.2 0" stroke="#7a4a28" stroke-width=".7" fill="none" opacity=".7"/>'
                '<ellipse cx="-5.5" cy="-7" rx="2.6" ry="6" transform="rotate(12 -5.5 -7)" fill="#e7c49a" opacity=".55"/></g>')
    o += bean(22, 38, -22, .92) + bean(41, 32, 20, 1)
    # buah ceri + daun kecil
    o += (leaf(48, 56, 12, 3.4, -150, '#2f8f4e', '#d9f2c8', .6) + leaf(50, 56, 11, 3.2, -90, '#3aa05a', '#d9f2c8', .6)
          + '<path d="M50 56Q49 52 50 50" stroke="#4a6a2a" stroke-width="1.1" fill="none"/>'
          '<circle cx="50" cy="52" r="5.4" fill="url(#ch)"/><circle cx="48.4" cy="50.4" r="1.4" fill="#fff" opacity=".85"/><circle cx="50" cy="48.6" r="1.1" fill="#7a1814"/>')
    return svg(64, 64, d, o)


def i_karet():
    d = lg('dr', [(0, '#ffffff'), (.6, '#f2eee2'), (1, '#cfc7b2')], 0, 0, 1, 1)
    d += lg('cp', [(0, '#a8663c'), (1, '#6b3b1c')]) + lg('lf', [(0, '#4ab063'), (1, '#1f6d3a')], 0, 0, 1, 1)
    o = '<ellipse cx="32" cy="58" rx="22" ry="3.4" fill="#000" opacity=".2"/>'
    o += (leaf(10, 50, 22, 6, -40, 'url(#lf)', '#d9f2c8', .55) + leaf(54, 50, 22, 6, -140, 'url(#lf)', '#d9f2c8', .55))
    # mangkuk sadap
    o += ('<path d="M14 40H50L46 56Q32 60 18 56Z" fill="url(#cp)"/><path d="M14 40H50" stroke="#d9996a" stroke-width="1.6"/>'
          '<ellipse cx="32" cy="40" rx="18" ry="4.2" fill="#fbf8ee" stroke="#cfc7b2" stroke-width=".8"/><ellipse cx="29" cy="39.2" rx="8" ry="1.3" fill="#fff"/>')
    # tetes getah
    o += ('<path d="M32 4C25 15 21 21 21 28a11 11 0 0 0 22 0C43 21 39 15 32 4Z" fill="url(#dr)" stroke="#cfc7b2" stroke-width="1.2"/>'
          '<path d="M26 27a6.5 6.5 0 0 0 4 6" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/><ellipse cx="28" cy="20" rx="1.6" ry="3.6" transform="rotate(20 28 20)" fill="#fff" opacity=".9"/>')
    return svg(64, 64, d, o)


def i_kakao():
    d = lg('pod', [(0, '#ffe27a'), (.4, '#f2a52e'), (1, '#b8480e')], 0, 0, 1, 1)
    o = '<ellipse cx="32" cy="58" rx="20" ry="3.2" fill="#000" opacity=".22"/>'
    o += leaf(40, 14, 20, 5.4, -20, '#2f8a49', '#d9f2c8', .55)
    o += ('<g transform="rotate(-16 32 32)"><path d="M32 3Q50 12 50 34Q47 52 32 61Q17 52 14 34Q14 12 32 3Z" fill="url(#pod)" stroke="#8a3f0a" stroke-width="1.1"/>'
          '<path d="M24 8Q16 32 24 56M32 3V61M40 8Q48 32 40 56" stroke="#9a4a0c" stroke-width="1.8" fill="none" opacity=".75"/>'
          '<path d="M20 10Q11 32 19 54" stroke="#9a4a0c" stroke-width="1" fill="none" opacity=".4"/><path d="M44 10Q53 32 45 54" stroke="#9a4a0c" stroke-width="1" fill="none" opacity=".4"/>'
          '<path d="M21 14Q17 30 21 46" stroke="#fff6b8" stroke-width="3" fill="none" stroke-linecap="round" opacity=".6"/>'
          '<path d="M32 3V0" stroke="#5a3a1a" stroke-width="3" stroke-linecap="round"/></g>')
    return svg(64, 64, d, o)


def i_cengkeh():
    d = lg('st', [(0, '#a8603f'), (1, '#4a2212')], 0, 0, 1, 0) + rg('bd', [(0, '#e9906e'), (.5, '#9c4a2e'), (1, '#4a2012')], .35, .3, .8)
    o = '<ellipse cx="32" cy="58" rx="22" ry="3.4" fill="#000" opacity=".2"/>'

    def clove(x, y, r, s=1):
        return (f'<g transform="translate({x} {y}) rotate({r}) scale({s})"><path d="M-2.6 -6L2.6 -6L1.2 22L-1.2 22Z" fill="url(#st)"/>'
                '<path d="M-1.6 -4L-.6 20" stroke="#d99a72" stroke-width=".6" opacity=".6"/>'
                '<path d="M-6 -9Q-8 -4 -3 -4L-3 -8Z M6 -9Q8 -4 3 -4L3 -8Z" fill="#7a3a24"/>'
                '<path d="M-5.4 -10.2Q-4 -6 -2 -5.4M5.4 -10.2Q4 -6 2 -5.4" stroke="#b9704c" stroke-width=".8" fill="none"/>'
                '<circle cx="0" cy="-11" r="4.6" fill="url(#bd)"/><circle cx="-1.4" cy="-12.4" r="1.2" fill="#f7c8b0" opacity=".85"/></g>')
    o += clove(20, 28, -28, 1) + clove(46, 26, 26, 1) + clove(32, 30, 0, 1.12) + clove(26, 34, -12, .8)
    return svg(64, 64, d, o)


def i_koin():
    d = (lg('rim', [(0, '#fff0b0'), (.5, '#d9a441'), (1, '#8a5a12')], 0, 0, 1, 1)
         + rg('face', [(0, '#fff2b8'), (.55, '#f0bf55'), (1, '#b97f1c')], .35, .3, .9))
    o = '<ellipse cx="32" cy="59" rx="22" ry="3" fill="#000" opacity=".22"/>'
    o += '<circle cx="32" cy="32" r="28.5" fill="url(#rim)"/><circle cx="32" cy="32" r="25" fill="url(#face)"/>'
    # tepi bergerigi
    o += ''.join(f'<path d="M{32 + 26.8 * math.cos(a):.1f} {32 + 26.8 * math.sin(a):.1f}L{32 + 28.4 * math.cos(a):.1f} {32 + 28.4 * math.sin(a):.1f}" stroke="#8a5a12" stroke-width=".8" opacity=".7"/>' for a in [i * math.tau / 48 for i in range(48)])
    o += '<circle cx="32" cy="32" r="21.5" fill="none" stroke="#a8751c" stroke-width="1.4" opacity=".8"/>'
    # kawung timbul
    o += ('<g fill="#f7d77a" stroke="#9a6a18" stroke-width="1.4"><ellipse cx="23.5" cy="32" rx="8.4" ry="4.6"/><ellipse cx="40.5" cy="32" rx="8.4" ry="4.6"/>'
          '<ellipse cx="32" cy="23.5" rx="4.6" ry="8.4"/><ellipse cx="32" cy="40.5" rx="4.6" ry="8.4"/></g>'
          '<circle cx="32" cy="32" r="3" fill="#b97f1c" stroke="#8a5a12" stroke-width=".8"/><circle cx="31.2" cy="31.2" r="1" fill="#fff0b0"/>')
    o += '<path d="M13 22A21 21 0 0 1 30 10" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".7"/>'
    return svg(64, 64, d, o)


# ------------------------------------------------------------------ POLA KAWUNG (80x80, ubin tanpa sambungan)
def kawung_tile():
    d = (lg('bg', [(0, '#7b4423'), (1, '#4a2410')], 0, 0, 1, 1)
         + rg('el', [(0, '#a8662f'), (1, '#6b3b17')], .35, .3, .9))
    ells = [(20, 40, 20, 11), (60, 40, 20, 11), (40, 20, 11, 20), (40, 60, 11, 20)]
    body = '<rect width="80" height="80" fill="url(#bg)"/>'
    body += '<g fill="url(#el)" stroke="#e0b04f" stroke-width="1.6">' + ''.join(f'<ellipse cx="{a}" cy="{b}" rx="{c}" ry="{e}"/>' for a, b, c, e in ells) + '</g>'
    body += '<g fill="none" stroke="#f5d98a" stroke-width=".6" opacity=".6">' + ''.join(f'<ellipse cx="{a}" cy="{b}" rx="{c - 4}" ry="{e - 3}"/>' for a, b, c, e in ells) + '</g>'
    body += ''.join(f'<circle cx="{x}" cy="{y}" r="1.1" fill="#f5d98a" opacity=".8"/>' for x, y in [(12, 40), (28, 40), (52, 40), (68, 40), (40, 10), (40, 30), (40, 50), (40, 70)])
    body += '<g fill="#f0c968" stroke="#9a6a18" stroke-width=".8"><circle cx="40" cy="40" r="3.4"/><circle cx="0" cy="0" r="3"/><circle cx="80" cy="0" r="3"/><circle cx="0" cy="80" r="3"/><circle cx="80" cy="80" r="3"/></g>'
    return svg(80, 80, d, body)
