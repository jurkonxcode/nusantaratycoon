#!/usr/bin/env python3
"""Membuat semua aset visual Nusantara Tycoon (SVG) ke folder assets/. Jalankan: python3 tools/make_assets.py
Teks logo diubah jadi path (tidak butuh font di perangkat pemain). Butuh: matplotlib. PNG dibuat oleh tools/render_assets.js."""
import os, math
from matplotlib.textpath import TextPath
from matplotlib.font_manager import FontProperties
from matplotlib.path import Path

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets')
FD = '/usr/share/fonts/truetype/google-fonts/'
BOLD, MED = FD + 'Poppins-Bold.ttf', FD + 'Poppins-Medium.ttf'

def out(rel, s):
    p = os.path.join(ROOT, rel); os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, 'w').write(s)

def svg(w, h, body, defs='', vb=None, extra=''):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb or f"0 0 {w} {h}"}" width="{w}" height="{h}"{extra}>'
            + (f'<defs>{defs}</defs>' if defs else '') + body + '</svg>\n')

def text_path(text, size, x, y, font):
    path = TextPath((0, 0), text, size=size, prop=FontProperties(fname=font))
    v, c, d, i = path.vertices, path.codes, [], 0
    f = lambda q: f'{x + q[0]:.1f} {y - q[1]:.1f}'
    while i < len(c):
        k = c[i]
        if k == Path.MOVETO: d.append('M' + f(v[i])); i += 1
        elif k == Path.LINETO: d.append('L' + f(v[i])); i += 1
        elif k == Path.CURVE3: d.append('Q' + f(v[i]) + ' ' + f(v[i + 1])); i += 2
        elif k == Path.CURVE4: d.append('C' + f(v[i]) + ' ' + f(v[i + 1]) + ' ' + f(v[i + 2])); i += 3
        else: d.append('Z'); i += 1
    return ''.join(d), path.get_extents().x1

# ------------------------------------------------------------------ Lambang
def palm(x, y, h, lean):
    tx, ty = x + lean, y - h
    fr = [(-24, 7), (-15, -9), (15, -9), (24, 7), (0, -14)]
    leaves = ''.join(f'<path d="M{tx} {ty}Q{tx + dx * .5:.1f} {ty - 12 + dy * .4:.1f} {tx + dx} {ty + dy}"/>' for dx, dy in fr)
    return (f'<path d="M{x} {y}Q{x + lean * .6:.1f} {y - h * .5:.1f} {tx} {ty}" stroke="#3d2a14" stroke-width="3.2" fill="none" stroke-linecap="round"/>'
            f'<g stroke="#2a7a4a" stroke-width="3.6" fill="none" stroke-linecap="round">{leaves}</g>')

def pinisi(ox=0, oy=0, s=1):
    return (f'<g transform="translate({ox} {oy}) scale({s})">'
      '<polygon points="326,326 326,376 386,370" fill="#c0453a"/>'
      '<polygon points="254,300 254,382 308,382" fill="#f6ecd7"/><polygon points="256,324 256,380 298,380" fill="#e8d9b8"/>'
      '<polygon points="320,324 320,382 364,382" fill="#f6ecd7"/><polygon points="322,342 322,380 352,380" fill="#e8d9b8"/>'
      '<path d="M252 384V294M318 384V318M322 322L392 366" stroke="#3d2a14" stroke-width="4" stroke-linecap="round" fill="none"/>'
      '<polygon points="252,296 252,284 272,290" fill="#c0453a"/>'
      '<path d="M208 386L372 382L390 364Q386 404 346 414L244 414Q216 408 208 386Z" fill="#5a2f14"/>'
      '<path d="M211 393L378 389" stroke="#d9a441" stroke-width="3.5" fill="none"/><path d="M216 400L370 397" stroke="#c0453a" stroke-width="3" fill="none"/></g>')

def mark_inner(p='m'):
    rays = ''.join(
        f'<path d="M256 236L{256 + 270 * math.cos(a - .04):.1f} {236 + 270 * math.sin(a - .04):.1f}L{256 + 270 * math.cos(a + .04):.1f} {236 + 270 * math.sin(a + .04):.1f}Z"/>'
        for a in [i * math.pi / 12 for i in range(24)])
    kawung = ''.join(f'<ellipse cx="{256 + dx}" cy="{236 + dy}" rx="{rx}" ry="{ry}"/>' for dx, dy, rx, ry in [(-19, 0, 17, 9), (19, 0, 17, 9), (0, -19, 9, 17), (0, 19, 9, 17)])
    shimmer = ''.join(f'<rect x="{256 - w / 2}" y="{y}" width="{w}" height="5" rx="2.5" opacity="{o}"/>' for w, y, o in [(150, 298, .8), (118, 309, .6), (88, 320, .45), (58, 332, .32)])
    crest = ''.join(f'<path d="M{x} {y}q14 -9 28 0" />' for x, y in [(40, 396), (150, 388), (420, 392), (70, 430), (340, 440), (210, 452), (450, 450)])
    return (
      f'<defs><linearGradient id="{p}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#08394b"/><stop offset=".5" stop-color="#136f84"/><stop offset=".78" stop-color="#e9a95a"/><stop offset="1" stop-color="#f6d58a"/></linearGradient>'
      f'<linearGradient id="{p}sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a8a9c"/><stop offset="1" stop-color="#062c3b"/></linearGradient>'
      f'<radialGradient id="{p}sun" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#fdeaa6"/><stop offset=".6" stop-color="#f0bf55"/><stop offset="1" stop-color="#c58a22"/></radialGradient>'
      f'<linearGradient id="{p}isl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#46ad62"/><stop offset="1" stop-color="#1d6a43"/></linearGradient>'
      f'<linearGradient id="{p}gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbe29a"/><stop offset=".5" stop-color="#d9a441"/><stop offset="1" stop-color="#9a6a18"/></linearGradient>'
      f'<clipPath id="{p}c"><circle cx="256" cy="256" r="212"/></clipPath></defs>'
      f'<circle cx="256" cy="256" r="240" fill="url(#{p}gold)"/><circle cx="256" cy="256" r="218" fill="#062c3b"/>'
      + ''.join(f'<path d="M0-6L4 0 0 6-4 0Z" transform="translate({256 + 229 * math.cos(i * math.pi / 18):.1f} {256 + 229 * math.sin(i * math.pi / 18):.1f}) rotate({i * 10 + 90})" fill="#6b3b17" opacity=".85"/>' for i in range(36))
      + f'<g clip-path="url(#{p}c)"><rect width="512" height="296" fill="url(#{p}sky)"/><g fill="#ffe9a8" opacity=".2">{rays}</g>'
      f'<circle cx="256" cy="236" r="74" fill="url(#{p}sun)"/><circle cx="256" cy="236" r="62" fill="none" stroke="#a8751c" stroke-width="3" opacity=".7"/>'
      f'<g fill="#f6cf6c" stroke="#a8751c" stroke-width="2.5">{kawung}</g><circle cx="256" cy="236" r="5" fill="#a8751c"/>'
      '<path d="M20 298C60 290 92 272 118 240L132 214 146 240C170 264 198 282 232 292L232 298Z" fill="#124f40"/>'
      '<path d="M118 240L132 214 146 240C140 236 134 238 132 232 130 238 124 236 118 240Z" fill="#8fbf9a" opacity=".55"/>'
      '<path d="M296 298C330 286 352 264 380 252L398 232 416 254C440 270 464 284 502 294L502 298Z" fill="#17614a"/>'
      f'<rect y="292" width="512" height="230" fill="url(#{p}sea)"/><g fill="#f7d57a">{shimmer}</g>'
      f'<path d="M54 326C96 306 150 300 204 308 236 298 292 300 332 310 384 300 430 308 462 326 400 334 110 334 54 326Z" fill="url(#{p}isl)"/>'
      + palm(118, 312, 42, 6) + palm(146, 310, 30, -4) + palm(384, 312, 38, -6) + palm(410, 314, 28, 5)
      + '<path d="M0 374Q64 358 128 374T256 374 384 374 512 374V512H0Z" fill="#0f566b" opacity=".9"/>'
      + pinisi()
      + '<path d="M0 404Q64 390 128 404T256 404 384 404 512 404V512H0Z" fill="#0b3d4f"/><path d="M0 446Q64 432 128 446T256 446 384 446 512 446V512H0Z" fill="#062c3b"/>'
      + f'<g fill="none" stroke="#d6f3f1" stroke-width="3" stroke-linecap="round" opacity=".55">{crest}</g></g>')

def logo_mark(): return svg(512, 512, mark_inner('m'))

def app_icon(scale, pad_bg='rounded'):
    t = (512 - 512 * scale) / 2
    bg = ('<rect width="512" height="512" rx="112" fill="#062c3b"/>' if pad_bg == 'rounded' else '<rect width="512" height="512" fill="#062c3b"/>')
    return svg(512, 512, bg + f'<g transform="translate({t:.1f} {t:.1f}) scale({scale})">{mark_inner("a")}</g>')

def favicon():
    return svg(64, 64,
      '<defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#136f84"/><stop offset="1" stop-color="#062c3b"/></linearGradient></defs>'
      '<rect width="64" height="64" rx="14" fill="url(#f)"/><circle cx="32" cy="28" r="14" fill="#f0bf55"/><circle cx="32" cy="28" r="9" fill="none" stroke="#a8751c" stroke-width="2.5"/>'
      '<path d="M6 40Q32 30 58 40L58 46Q32 38 6 46Z" fill="#2f8f4e"/><path d="M10 52H54L48 58H16Z" fill="#5a2f14"/><path d="M30 52V38L42 52Z" fill="#f6ecd7"/>')

def wordmark_paths(size, x, ytop_base, ysub_base, dark_bg=False):
    d1, w1 = text_path('Nusantara', size, x, ytop_base, BOLD)
    d2, w2 = text_path('Tycoon', size, x, ysub_base, BOLD)
    c1 = '#f6ecd7' if dark_bg else '#062c3b'
    return d1, w1, d2, w2, c1

def logo_horizontal(dark=False):
    d1, w1, d2, w2, c1 = wordmark_paths(112, 392, 188, 300, dark)
    dots = ''.join(f'<circle cx="{398 + i * 20}" cy="224" r="3.2"/>' for i in range(int((w1 - 6) // 20)))
    return svg(int(392 + w1 + 30), 340,
      f'<g transform="translate(20 10) scale(.625)">{mark_inner("h")}</g><path d="{d1}" fill="{c1}"/>'
      f'<g fill="#d9a441" opacity=".9">{dots}</g><path d="{d2}" fill="url(#hg)"/>',
      '<linearGradient id="hg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e9b84f"/><stop offset="1" stop-color="#b9801f"/></linearGradient>')

def logo_stacked(dark=False):
    d1, w1, d2, w2, c1 = wordmark_paths(96, 0, 0, 0, dark)
    d1, w1 = text_path('Nusantara', 96, 360 - text_path('Nusantara', 96, 0, 0, BOLD)[1] / 2, 590, BOLD)
    d2, w2 = text_path('Tycoon', 96, 360 - text_path('Tycoon', 96, 0, 0, BOLD)[1] / 2, 690, BOLD)
    return svg(720, 730, f'<g transform="translate(110 10) scale(.98)">{mark_inner("s")}</g><path d="{d1}" fill="{c1}"/><path d="{d2}" fill="url(#sg)"/>',
      '<linearGradient id="sg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e9b84f"/><stop offset="1" stop-color="#b9801f"/></linearGradient>')

# ------------------------------------------------------------------ Pola batik kawung
def kawung_tile():
    e = ''.join(f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}"/>' for cx, cy, rx, ry in [(20, 40, 20, 11), (60, 40, 20, 11), (40, 20, 11, 20), (40, 60, 11, 20)])
    return svg(80, 80, '<rect width="80" height="80" fill="#6b3b17"/>' + f'<g fill="#8a4f1f" stroke="#d9a441" stroke-width="1.6">{e}</g>'
               '<g fill="#e9b84f"><circle cx="40" cy="40" r="3.4"/><circle cx="0" cy="0" r="3"/><circle cx="80" cy="0" r="3"/><circle cx="0" cy="80" r="3"/><circle cx="80" cy="80" r="3"/></g>')

# ------------------------------------------------------------------ Sprite bangunan (128x128)
SH = '<ellipse cx="64" cy="116" rx="46" ry="7" fill="#062c3b" opacity=".22"/>'
def sp(body, defs=''): return svg(128, 128, SH + body, defs)

def s_sawah():
    t = [('M10 66Q64 38 118 66L118 78Q64 50 10 78Z', '#b9e07a'), ('M6 80Q64 52 122 80L122 94Q64 66 6 94Z', '#92cf5f'), ('M2 96Q64 68 126 96L126 112Q64 84 2 112Z', '#6db54c')]
    g = ''.join(f'<path d="{d}" fill="{c}" stroke="#3f7f3a" stroke-width="1.4"/>' for d, c in t)
    w = ''.join(f'<path d="M{a} {b}Q64 {b - 22} {128 - a} {b}" stroke="#d3ecec" stroke-width="2" fill="none" opacity=".75"/>' for a, b in [(22, 70), (18, 86), (14, 103)])
    tufts = ''.join(f'<path d="M{x} {y}l-2 -7M{x} {y}l0 -8M{x} {y}l2 -7" stroke="#2f7a38" stroke-width="1.6" stroke-linecap="round"/>' for x, y in [(30, 88), (52, 84), (80, 86), (98, 90), (40, 104), (70, 102), (96, 104), (22, 106)])
    return sp(g + w + tufts + '<path d="M70 52L86 30 102 52Z" fill="#cfa84f"/><path d="M86 30L102 52 94 52 86 38Z" fill="#a98334"/><rect x="76" y="52" width="20" height="13" fill="#7a4a24"/><rect x="84" y="56" width="5" height="9" fill="#2b1a0c"/><path d="M74 66H98" stroke="#5a3a1a" stroke-width="2"/>')

def s_batik():
    k = ''.join(f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="none" stroke="#f4d58a" stroke-width="1.3"/>' for x, y, rx, ry in [(40, 86, 6, 3.5), (52, 86, 6, 3.5), (46, 80, 3.5, 6), (46, 92, 3.5, 6)])
    return sp('<rect x="18" y="82" width="92" height="24" rx="3" fill="#a07a4a"/><rect x="24" y="52" width="80" height="34" fill="#f1e3c0"/>'
              '<path d="M10 54L64 20 118 54Z" fill="#8a4f1f"/><path d="M22 54L64 30 106 54Z" fill="#a8622a"/><path d="M64 20L118 54 106 54 64 30Z" fill="#6b3b17"/><circle cx="64" cy="26" r="3" fill="#e9b84f"/>'
              '<g fill="#7a4a24"><rect x="30" y="54" width="5" height="34"/><rect x="93" y="54" width="5" height="34"/><rect x="61" y="54" width="5" height="34"/></g>'
              '<rect x="34" y="72" width="26" height="32" fill="#2a4a86"/><g stroke="#f4d58a" stroke-width="1" fill="none"><path d="M34 80H60M34 90H60"/></g>' + k +
              '<rect x="70" y="72" width="22" height="32" fill="#a8372c"/><g fill="#f4d58a"><circle cx="76" cy="80" r="2.4"/><circle cx="86" cy="80" r="2.4"/><circle cx="81" cy="90" r="2.4"/><circle cx="76" cy="99" r="2.4"/><circle cx="86" cy="99" r="2.4"/></g>')

def s_kopi():
    cherries = ''.join(f'<circle cx="{x}" cy="{y}" r="4.6" fill="#c8332b"/><circle cx="{x - 1.4}" cy="{y - 1.6}" r="1.3" fill="#ff8d80"/>' for x, y in [(46, 62), (58, 74), (78, 58), (90, 74), (66, 88), (44, 84), (84, 92)])
    leaves = ''.join(f'<ellipse cx="{x}" cy="{y}" rx="15" ry="7" transform="rotate({r} {x} {y})" fill="{c}"/>' for x, y, r, c in [(40, 56, -30, '#2f8f4e'), (64, 46, -80, '#3aa05a'), (90, 52, 28, '#2f8f4e'), (36, 78, 20, '#3aa05a'), (94, 82, -24, '#3aa05a'), (64, 70, 0, '#27793f'), (62, 96, 8, '#2f8f4e')])
    return sp('<path d="M8 112Q64 78 120 112Z" fill="#7bbf5a"/><path d="M8 112Q64 90 120 112Z" fill="#5da24a"/><rect x="60" y="92" width="8" height="22" fill="#5a3a1a"/>' + leaves + cherries)

def s_karet():
    cuts = ''.join(f'<path d="M{54 + i * 2} {70 + i * 9}L{70 - i * 1} {80 + i * 9}" stroke="#4a2f16" stroke-width="2"/>' for i in range(3))
    return sp('<path d="M8 112Q64 84 120 112Z" fill="#6fb552"/><path d="M52 112L56 60H72L76 112Z" fill="#8a6a46"/><path d="M56 60H72L73 80 55 80Z" fill="#9c7a52"/>' + cuts +
              '<path d="M60 96L68 100" stroke="#d8d0c2" stroke-width="2.5"/><path d="M56 100h16l-2 10H58Z" fill="#f2efe6"/><path d="M58 101h12" stroke="#fff" stroke-width="3"/>'
              '<ellipse cx="64" cy="40" rx="40" ry="26" fill="#2b7a43"/><ellipse cx="44" cy="46" rx="22" ry="16" fill="#35914f"/><ellipse cx="86" cy="44" rx="22" ry="16" fill="#35914f"/><ellipse cx="64" cy="30" rx="22" ry="14" fill="#46ad62"/>')

def s_kakao():
    def pod(x, y, r): return (f'<g transform="rotate({r} {x} {y})"><ellipse cx="{x}" cy="{y}" rx="9" ry="15" fill="#e7a02e"/><path d="M{x - 4} {y - 13}Q{x - 7} {y} {x - 4} {y + 13}M{x + 4} {y - 13}Q{x + 7} {y} {x + 4} {y + 13}M{x} {y - 15}V{y + 15}" stroke="#b86d12" stroke-width="1.6" fill="none"/><ellipse cx="{x - 3}" cy="{y - 5}" rx="2" ry="5" fill="#f8cf72" opacity=".8"/></g>')
    return sp('<path d="M8 112Q64 84 120 112Z" fill="#6fb552"/><rect x="58" y="50" width="12" height="64" fill="#6b4a2a"/><path d="M58 50H70V70H58Z" fill="#7d5a36"/>'
              '<ellipse cx="64" cy="34" rx="44" ry="24" fill="#2b7a43"/><ellipse cx="42" cy="40" rx="20" ry="13" fill="#35914f"/><ellipse cx="88" cy="40" rx="20" ry="13" fill="#35914f"/>'
              '<path d="M52 58L48 66M76 58L82 68" stroke="#4a2f16" stroke-width="2"/>' + pod(46, 76, 8) + pod(84, 80, -10) + pod(66, 88, 0))

def s_cengkeh():
    buds = ''.join(f'<g transform="translate({x} {y})"><path d="M0 0V9" stroke="#8a4a38" stroke-width="2"/><circle cx="0" cy="-1" r="3" fill="#e08a9a"/><circle cx="-2.4" cy="-3" r="1.6" fill="#f4b0bc"/><circle cx="2.4" cy="-3" r="1.6" fill="#f4b0bc"/></g>' for x, y in [(44, 70), (58, 52), (74, 62), (86, 80), (50, 90), (70, 92), (64, 36), (40, 54), (90, 58)])
    return sp('<path d="M8 112Q64 84 120 112Z" fill="#6fb552"/><rect x="60" y="92" width="8" height="22" fill="#5a3a1a"/>'
              '<path d="M64 8L104 100H24Z" fill="#1f6b3f"/><path d="M64 8L84 54 44 54Z" fill="#2b8a4f"/><path d="M64 34L98 96H30Z" fill="#2b8a4f"/><path d="M64 8L104 100H88Z" fill="#175a34"/>' + buds)

def s_pelabuhan():
    cont = ''.join(f'<rect x="{x}" y="{y}" width="20" height="10" fill="{c}" stroke="#2a2a2a" stroke-width=".8"/><path d="M{x + 5} {y}v10M{x + 10} {y}v10M{x + 15} {y}v10" stroke="#00000033"/>' for x, y, c in [(66, 78, '#c0453a'), (88, 78, '#2d8fd0'), (66, 68, '#e0a030'), (88, 68, '#2f8f4e'), (77, 58, '#c0453a')])
    return sp('<rect x="0" y="94" width="128" height="34" fill="#1a8a9c"/><path d="M0 100Q16 94 32 100T64 100 96 100 128 100V128H0Z" fill="#0f6f84"/>'
              '<path d="M4 84H124V98H4Z" fill="#8f8a80"/><path d="M4 84H124V88H4Z" fill="#b3aea2"/><g stroke="#6f6a60" stroke-width="1.2"><path d="M20 88V98M44 88V98M68 88V98M92 88V98M112 88V98"/></g>' + cont +
              '<path d="M16 84V30H24V84Z" fill="#d1493a"/><path d="M12 32H64V40H12Z" fill="#d1493a"/><path d="M52 40V62" stroke="#3a3a3a" stroke-width="1.6"/><rect x="47" y="62" width="11" height="7" fill="#e0a030"/><path d="M16 30L38 14 64 32" stroke="#a8372c" stroke-width="2.4" fill="none"/>'
              '<rect x="14" y="66" width="12" height="18" fill="#f1e3c0" opacity="0"/><circle cx="108" cy="80" r="3" fill="#2b2f33"/>')

def s_kapal():
    return svg(128, 128, pinisi(-122, -149, .62) + '<path d="M40 109Q64 116 92 108" stroke="#ffffff" stroke-width="3" fill="none" opacity=".75" stroke-linecap="round"/>')

def s_tol():
    return sp('<path d="M0 96H128V128H0Z" fill="#6fb552"/><path d="M0 70L128 70 128 100 0 100Z" fill="#4a4e55"/><path d="M0 70H128V74H0Z" fill="#6b6f77"/>'
              '<path d="M8 86H24M36 86H52M64 86H80M92 86H108" stroke="#f6ecd7" stroke-width="2.4" stroke-linecap="round"/><path d="M0 96H128" stroke="#e0a030" stroke-width="2"/>'
              '<path d="M0 54H128V62H0Z" fill="#8f8a80"/><path d="M0 54H128V57H0Z" fill="#b3aea2"/><path d="M20 62V70M64 62V70M108 62V70" stroke="#6f6a60" stroke-width="5"/>'
              '<rect x="86" y="22" width="30" height="20" rx="2" fill="#2d6fb0"/><path d="M92 34H110M104 28L110 34 104 40" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/><rect x="99" y="42" width="3" height="12" fill="#6f6a60"/>'
              '<rect x="16" y="76" width="16" height="8" rx="2" fill="#c0453a"/><rect x="22" y="73" width="8" height="4" rx="1" fill="#e8d9b8"/><circle cx="20" cy="85" r="2" fill="#222"/><circle cx="29" cy="85" r="2" fill="#222"/>')

# ------------------------------------------------------------------ Ikon komoditas (64x64)
def ic(body): return svg(64, 64, body)
def i_padi():
    st = ''.join(f'<path d="M{x} 58Q{x + b} 34 {x + c} 10" stroke="#8ab04a" stroke-width="2.4" fill="none"/>' + ''.join(f'<ellipse cx="{x + c * t + b * (1 - t) * .3:.1f}" cy="{58 - 48 * t:.1f}" rx="2.6" ry="4.4" transform="rotate({c * 3} {x + c * t:.1f} {58 - 48 * t:.1f})" fill="#e8c34a"/>' for t in [.55, .68, .8, .92]) for x, b, c in [(32, -2, -8), (20, -6, -14), (44, 6, 14)])
    return ic(st)
def i_batik():
    return ic('<rect x="8" y="8" width="48" height="48" rx="4" fill="#6b3b17"/><g fill="#8a4f1f" stroke="#d9a441" stroke-width="1.2"><ellipse cx="20" cy="20" rx="8" ry="4.5"/><ellipse cx="44" cy="20" rx="8" ry="4.5"/><ellipse cx="20" cy="44" rx="8" ry="4.5"/><ellipse cx="44" cy="44" rx="8" ry="4.5"/><ellipse cx="32" cy="32" rx="4.5" ry="8"/><ellipse cx="32" cy="32" rx="8" ry="4.5"/></g><circle cx="32" cy="32" r="2.6" fill="#e9b84f"/>')
def i_kopi():
    b = lambda x, y, r: f'<g transform="rotate({r} {x} {y})"><ellipse cx="{x}" cy="{y}" rx="13" ry="18" fill="#6b3b17"/><ellipse cx="{x - 4}" cy="{y - 6}" rx="3" ry="7" fill="#9a6a3c" opacity=".7"/><path d="M{x} {y - 17}Q{x - 7} {y} {x} {y + 2}T{x} {y + 17}" stroke="#2f1a0a" stroke-width="2.6" fill="none"/></g>'
    return ic(b(24, 34, -20) + b(42, 30, 22))
def i_karet():
    return ic('<path d="M32 6C20 22 14 32 14 40a18 18 0 0 0 36 0C50 32 44 22 32 6Z" fill="#f2efe6" stroke="#bdb6a6" stroke-width="2"/><path d="M22 40a10 10 0 0 0 7 9" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M44 52Q54 48 56 38Q46 40 44 52Z" fill="#2f8f4e"/>')
def i_kakao():
    return ic('<g transform="rotate(-18 32 32)"><ellipse cx="32" cy="32" rx="16" ry="25" fill="#e7a02e"/><path d="M24 10Q19 32 24 54M40 10Q45 32 40 54M32 7V57" stroke="#b86d12" stroke-width="2.2" fill="none"/><ellipse cx="26" cy="24" rx="3" ry="9" fill="#f8cf72" opacity=".8"/></g><path d="M32 6V0" stroke="#5a3a1a" stroke-width="3"/>')
def i_cengkeh():
    return ic('<g transform="rotate(-25 32 32)"><path d="M32 22V58" stroke="#7a3f2e" stroke-width="5" stroke-linecap="round"/><circle cx="32" cy="16" r="9" fill="#a0503a"/><circle cx="23" cy="10" r="5.5" fill="#b9644c"/><circle cx="41" cy="10" r="5.5" fill="#b9644c"/><circle cx="32" cy="5" r="5" fill="#b9644c"/><circle cx="32" cy="16" r="3.4" fill="#5a2a1c"/></g>')
def i_koin():
    return ic('<defs><radialGradient id="c" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#fdeaa6"/><stop offset=".6" stop-color="#f0bf55"/><stop offset="1" stop-color="#c58a22"/></radialGradient></defs><circle cx="32" cy="32" r="28" fill="url(#c)" stroke="#a8751c" stroke-width="3"/><circle cx="32" cy="32" r="21" fill="none" stroke="#a8751c" stroke-width="2" opacity=".7"/><g fill="#f6cf6c" stroke="#a8751c" stroke-width="1.8"><ellipse cx="24" cy="32" rx="8" ry="4.5"/><ellipse cx="40" cy="32" rx="8" ry="4.5"/><ellipse cx="32" cy="24" rx="4.5" ry="8"/><ellipse cx="32" cy="40" rx="4.5" ry="8"/></g><circle cx="32" cy="32" r="3" fill="#a8751c"/>')

# ------------------------------------------------------------------ Sampul (banner README 1280x320, OG 1200x630)
def cover(w, h, mark_size, tag=True):
    d1, w1 = text_path('Nusantara', 118 * h / 320 if h < 400 else 132, 0, 0, BOLD)
    size = 76 if h < 400 else 132
    d1, w1 = text_path('Nusantara', size, 0, 0, BOLD)
    gap, total = 44, mark_size + 44 + w1
    x0 = (w - total) / 2; ty = h / 2 + (-6 if tag else 30)
    d1, _ = text_path('Nusantara', size, x0 + mark_size + gap, ty, BOLD)
    d2, _ = text_path('Tycoon', size, x0 + mark_size + gap, ty + size * .98, BOLD)
    tg = ''
    if tag:
        T = 'Bangun kerajaan dagang dari Sabang sampai Merauke'
        _, wt = text_path(T, 100, 0, 0, MED)
        ts = min(size * .24, 100 * w1 / wt)
        dt, _ = text_path(T, ts, x0 + mark_size + gap + 4, ty + size * 1.42, MED)
        tg = f'<path d="{dt}" fill="#f6ecd7" opacity=".85"/>'
    my = (h - mark_size) / 2 - (8 if h < 400 else 20)
    pat = f'<rect width="{w}" height="{h}" fill="url(#bp)" opacity=".10"/>'
    defs = ('<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0f566b"/><stop offset="1" stop-color="#051f2a"/></linearGradient>'
            '<linearGradient id="gg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f3cc6a"/><stop offset="1" stop-color="#c58a22"/></linearGradient>'
            '<pattern id="bp" width="80" height="80" patternUnits="userSpaceOnUse"><g fill="none" stroke="#f6ecd7" stroke-width="1.6"><ellipse cx="20" cy="40" rx="20" ry="11"/><ellipse cx="60" cy="40" rx="20" ry="11"/><ellipse cx="40" cy="20" rx="11" ry="20"/><ellipse cx="40" cy="60" rx="11" ry="20"/></g></pattern>')
    return svg(w, h, f'<rect width="{w}" height="{h}" fill="url(#bg)"/>' + pat + f'<rect y="{h - 12}" width="{w}" height="12" fill="#6b3b17"/><rect y="{h - 12}" width="{w}" height="3" fill="#d9a441"/>'
               f'<g transform="translate({x0:.1f} {my:.1f}) scale({mark_size / 512:.4f})">{mark_inner("v")}</g><path d="{d1}" fill="#f6ecd7"/><path d="{d2}" fill="url(#gg)"/>' + tg, defs)

def webmanifest():
    return ('{\n  "name": "Nusantara Tycoon",\n  "short_name": "Nusantara",\n  "description": "Bangun kerajaan dagang dari Sabang sampai Merauke.",\n  "start_url": "./index.html",\n  "display": "standalone",\n  "background_color": "#062c3b",\n  "theme_color": "#0b3d4f",\n  "lang": "id",\n'
            '  "icons": [\n    { "src": "assets/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },\n    { "src": "assets/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },\n'
            '    { "src": "assets/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }\n  ]\n}\n')

# ------------------------------------------------------------------ Ilustrasi v2 (lebih realistis, lihat tools/art_v2.py)
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import art_v2 as _v2
from art_tiers import decorate
import art_kalimantan as _kal
import art_jawa as _jw
s_sawit, s_batubara, i_sawit, i_batubara = _kal.s_sawit, _kal.s_batubara, _kal.i_sawit, _kal.i_batubara
s_sawah, s_batik, s_kopi, s_karet, s_kakao, s_cengkeh = _v2.s_sawah, _v2.s_batik, _v2.s_kopi, _v2.s_karet, _v2.s_kakao, _v2.s_cengkeh
s_pelabuhan, s_kapal, s_tol = _v2.s_pelabuhan, _v2.s_kapal, _v2.s_tol
i_padi, i_batik, i_kopi, i_karet, i_kakao, i_cengkeh, i_koin = _v2.i_padi, _v2.i_batik, _v2.i_kopi, _v2.i_karet, _v2.i_kakao, _v2.i_cengkeh, _v2.i_koin
kawung_tile = _v2.kawung_tile
s_teh, s_tebu, s_tembakau, s_garam, i_teh, i_gula, i_tembakau, i_garam = _jw.s_teh, _jw.s_tebu, _jw.s_tembakau, _jw.s_garam, _jw.i_teh, _jw.i_gula, _jw.i_tembakau, _jw.i_garam

if __name__ == '__main__':
    out('logo/logo-mark.svg', logo_mark())
    out('logo/logo-horizontal.svg', logo_horizontal(False)); out('logo/logo-horizontal-dark.svg', logo_horizontal(True))
    out('logo/logo-stacked.svg', logo_stacked(False)); out('logo/logo-stacked-dark.svg', logo_stacked(True))
    out('icons/favicon.svg', favicon()); out('icons/app-icon.svg', app_icon(.86)); out('icons/app-icon-maskable.svg', app_icon(.66, 'square'))
    out('patterns/batik-kawung.svg', kawung_tile())
    for n, f in [('sawah', s_sawah), ('sentra_batik', s_batik), ('kebun_kopi', s_kopi), ('kebun_karet', s_karet), ('kebun_kakao', s_kakao), ('kebun_cengkeh', s_cengkeh), ('kebun_sawit', s_sawit), ('tambang_batubara', s_batubara), ('kebun_teh', s_teh), ('kebun_tebu', s_tebu), ('kebun_tembakau', s_tembakau), ('tambak_garam', s_garam), ('pelabuhan', s_pelabuhan), ('kapal', s_kapal), ('tol', s_tol)]:
        out(f'sprites/{n}.svg', f())
        if n not in ('kapal', 'tol'):
            for t in (2, 3):
                out(f'sprites/{n}_t{t}.svg', decorate(n, t))
    for n, f in [('padi', i_padi), ('batik', i_batik), ('kopi', i_kopi), ('karet', i_karet), ('kakao', i_kakao), ('cengkeh', i_cengkeh), ('sawit', i_sawit), ('batubara', i_batubara), ('teh', i_teh), ('gula', i_gula), ('tembakau', i_tembakau), ('garam', i_garam), ('koin', i_koin)]:
        out(f'commodities/{n}.svg', f())
    out('social/banner.svg', cover(1280, 320, 210, True)); out('social/og-image.svg', cover(1200, 630, 330, True))
    out('../manifest.webmanifest', webmanifest())
    import base64, glob
    def uri(f): return 'data:image/svg+xml;base64,' + base64.b64encode(open(f, 'rb').read()).decode()
    grp = lambda d: ',\n    '.join('%s: "%s"' % (os.path.basename(f)[:-4], uri(f)) for f in sorted(glob.glob(os.path.join(ROOT, d, '*.svg'))))
    js = ('/* DIBUAT OTOMATIS oleh tools/make_assets.py, jangan diedit. Gambar SVG sebagai data URI (jalan juga di dist satu file). */\n(function (NT) {\n  NT.assets = {\n  sprite: {\n    '
          + grp('sprites') + '\n  },\n  comm: {\n    ' + grp('commodities') + '\n  }\n  };\n})((window.NT = window.NT || {}));\n')
    open(os.path.join(ROOT, '..', 'js', 'ui', 'assets.js'), 'w').write(js)
    print('Aset SVG dibuat di', os.path.abspath(ROOT))
