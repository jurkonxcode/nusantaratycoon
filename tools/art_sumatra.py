"""Ilustrasi Sumatra Fase 2b: sprite Kebun Lada, Tambang Timah, Sumur Minyak (128x128)
dan ikon lada, timah, minyak (64x64). Gaya mengikuti tools/art_v2.py (vektor orisinal, cahaya dari kiri-atas).
Dipakai oleh tools/make_assets.py."""
import math, random
from art_v2 import svg, lg, rg, leaf, quad, SDEFS, base, mound, tuft


def _pepper_vine(x, yb, h, seed):
    """Tiang panjat kayu dengan sulur lada: daun hati dan untaian buah merah-hijau."""
    rnd = random.Random(seed)
    s = f'<rect x="{x - 1.6:.1f}" y="{yb - h}" width="3.2" height="{h}" fill="url(#wood)"/>'
    n = 4
    for i in range(n):
        yy = yb - h * (.12 + .82 * i / (n - 1))
        for side, a in ((-1, -150), (1, -30)):
            s += leaf(x, yy, rnd.uniform(9, 12), 3.6, a + rnd.uniform(-10, 10), rnd.choice(['#2f8a3c', '#3f9c48', '#52ad52']), '#d6f0b8', .5)
        if i in (1, 2):
            bx = x + (5 if i == 1 else -5)
            s += f'<path d="M{bx} {yy + 1:.1f}V{yy + 9:.1f}" stroke="#4a8a3a" stroke-width=".8"/>'
            for k in range(4):
                s += f'<circle cx="{bx + (k % 2 - .5) * 1.4:.1f}" cy="{yy + 2 + k * 2:.1f}" r="1.5" fill="{"#c8352a" if k > 1 else "#6fae3a"}" stroke="#3a1a10" stroke-width=".3"/>'
    return s


def s_lada():
    d = SDEFS + lg('mat', [(0, '#d9c08a'), (1, '#a88a50')], 0, 0, 1, 1) + lg('rfl', [(0, '#d8c070'), (1, '#8a6a28')], 0, 0, 1, 1)
    o = base(54, 116) + mound(98, 20, 58, 7, 18)
    # dua baris tiang lada: belakang pendek, depan tinggi
    for i in range(5):
        o += _pepper_vine(22 + i * 20, 78, 40, i)
    for i in range(4):
        o += _pepper_vine(30 + i * 22, 102, 52, 20 + i)
    # tikar jemur lada hitam dan gubuk pengering kecil di kanan atas
    o += ('<path d="M82 108L116 106 120 118 78 120Z" fill="url(#mat)" stroke="#6a4a1a" stroke-width=".8"/>')
    rnd = random.Random(5)
    for _ in range(46):
        px, py = rnd.uniform(82, 115), rnd.uniform(108, 118)
        o += f'<circle cx="{px:.1f}" cy="{py:.1f}" r="1.3" fill="#2a1a14"/>'
    o += ('<rect x="94" y="30" width="3" height="22" fill="url(#wood)"/><rect x="118" y="30" width="3" height="22" fill="url(#wood)"/>'
          '<path d="M90 32L107 16 124 32Q107 36 90 32Z" fill="url(#rfl)" stroke="#5a3a1a" stroke-width="1"/>'
          '<path d="M107 16L124 32Q115 34 111 33.5Z" fill="#6f4f1c" opacity=".4"/>')
    return svg(128, 128, d, o)


def s_timah():
    d = SDEFS + lg('pit', [(0, '#7ec0c8'), (1, '#3f8a98')], 0, 0, 0, 1) + lg('clay', [(0, '#e3d4b0'), (1, '#b09a6c')], 0, 0, 1, 1)
    d += lg('stl', [(0, '#e8edf0'), (.5, '#b9c3c9'), (1, '#7f8c94')], 0, 0, 1, 1) + lg('hull', [(0, '#c8472f'), (1, '#7a2a1c')], 0, 0, 0, 1)
    o = base(56, 118)
    # kolong bekas tambang: tanah pasir putih kekuningan dengan air kehijauan
    o += '<path d="M4 104Q64 66 124 104Q64 128 4 104Z" fill="url(#clay)"/>'
    o += '<path d="M16 102Q64 78 112 102Q64 118 16 102Z" fill="url(#pit)"/>'
    o += '<path d="M30 100Q50 92 70 98M72 104Q88 100 100 104" stroke="#ffffff" stroke-width="1.1" opacity=".6" fill="none" stroke-linecap="round"/>'
    # kapal keruk / ponton dengan ban berjalan miring dan cerobong
    o += ('<path d="M36 98H88L84 108H40Z" fill="url(#hull)" stroke="#3a1a10" stroke-width="1"/>'
          '<rect x="46" y="82" width="26" height="16" fill="#e9d9b4" stroke="#6a4a2a" stroke-width="1"/>'
          '<path d="M43 83L59 70 75 83Z" fill="#8a9aa4" stroke="#3a4a54" stroke-width="1"/>'
          '<rect x="66" y="60" width="6" height="14" fill="#6a7a84" stroke="#2f3a42" stroke-width=".8"/>'
          '<path d="M40 96L16 74" stroke="#4a5a64" stroke-width="3.5" stroke-linecap="round"/>'
          '<path d="M40 96L16 74" stroke="#9aa8b0" stroke-width="1.2" stroke-dasharray="3 3"/>'
          '<rect x="52" y="88" width="6" height="6" fill="#5a3a1a"/>')
    o += ('<ellipse cx="70" cy="56" rx="4.5" ry="3.4" fill="#f2f2f2" opacity=".7"/><ellipse cx="75" cy="49" rx="5.5" ry="4" fill="#fff" opacity=".5"/>')
    # gunungan tailing pasir dan tumpukan batang timah (ingot) perak
    for cx, cy, w, h in [(104, 82, 16, 14), (92, 86, 11, 9)]:
        o += f'<path d="M{cx - w} {cy}L{cx} {cy - h}L{cx + w} {cy}Q{cx} {cy + 4} {cx - w} {cy}Z" fill="url(#clay)" stroke="#9a845a" stroke-width=".8"/>'
    for r, n in enumerate([3, 2, 1]):
        for k in range(n):
            x = 2 + k * 13 + r * 6.5
            y = 124 - r * 7
            o += (f'<path d="M{x} {y}L{x + 3} {y - 5}H{x + 12}L{x + 14} {y}Z" fill="url(#stl)" stroke="#5a6872" stroke-width=".8"/>'
                  f'<path d="M{x + 3} {y - 4}H{x + 11}" stroke="#fff" stroke-width=".9" opacity=".8"/>')
    return svg(128, 128, d, o)


def s_minyak():
    d = SDEFS + lg('dirt', [(0, '#a89070'), (1, '#6e5a40')], 0, 0, 1, 1) + lg('tank', [(0, '#e8edf0'), (.5, '#c4ccd2'), (1, '#8a96a0')], 0, 0, 1, 0)
    d += lg('pj', [(0, '#e0661f'), (1, '#9a3a10')], 0, 0, 0, 1)
    o = base(56, 118)
    o += '<path d="M4 106Q64 74 124 106Q64 130 4 106Z" fill="url(#dirt)"/>'
    o += '<path d="M20 104Q50 94 80 102" stroke="#2a1f16" stroke-width="4" opacity=".55" fill="none" stroke-linecap="round"/>'
    # pompa angguk: penyangga segitiga, balok pengimbang, kepala kuda, motor
    o += ('<path d="M44 104L58 52 72 104Z" fill="none" stroke="#3a3a40" stroke-width="3.4" stroke-linejoin="round"/>'
          '<path d="M51 84H65" stroke="#3a3a40" stroke-width="2.4"/>'
          '<g transform="rotate(-8 58 52)"><path d="M22 54H92" stroke="#e0661f" stroke-width="8" stroke-linecap="round"/>'
          '<path d="M22 50Q12 52 14 64Q24 62 26 54Z" fill="#e0661f" stroke="#5a2008" stroke-width="1"/>'
          '<rect x="84" y="46" width="12" height="16" rx="2" fill="#3a3a40"/></g>'
          '<circle cx="58" cy="52" r="5" fill="#d8dde0" stroke="#3a3a40" stroke-width="1.6"/>'
          '<path d="M18 62V104" stroke="#6a6a72" stroke-width="2.2"/>'
          '<rect x="12" y="102" width="14" height="5" fill="#4a4a52"/>'
          '<rect x="78" y="94" width="14" height="10" rx="2" fill="#3a6ea8" stroke="#1a2f4a" stroke-width="1"/>'
          '<path d="M92 76L84 94" stroke="#2f2f35" stroke-width="2"/>')
    # tangki penyimpanan silinder dan pipa
    o += ('<path d="M98 66V102Q108 108 118 102V66Z" fill="url(#tank)" stroke="#6a7882" stroke-width="1"/>'
          '<ellipse cx="108" cy="66" rx="10" ry="4" fill="#e8edf0" stroke="#6a7882" stroke-width="1"/>'
          '<path d="M98 80H118M98 92H118" stroke="#8a96a0" stroke-width=".8"/>'
          '<path d="M92 100H98" stroke="#2f2f35" stroke-width="3"/>')
    # obor gas kecil
    o += ('<path d="M120 66V44" stroke="#4a4a52" stroke-width="2"/>'
          '<path d="M120 43Q114 36 119 28Q122 33 124 30Q127 38 120 43Z" fill="#ffb03a" stroke="#d8501a" stroke-width=".8"/>'
          '<path d="M120 42Q118 38 120 34Q122 38 120 42Z" fill="#fff3a0"/>')
    # genangan minyak dan drum
    o += ('<ellipse cx="34" cy="108" rx="12" ry="3" fill="#1d1612" opacity=".7"/>'
          '<rect x="46" y="106" width="9" height="11" rx="2" fill="#2f6aa8" stroke="#142a48" stroke-width=".8"/>'
          '<rect x="56" y="108" width="9" height="11" rx="2" fill="#c8472f" stroke="#4a1810" stroke-width=".8"/>')
    return svg(128, 128, d, o)


# ------------------------------------------------------------------ IKON (64x64)
def i_lada():
    d = lg('pp', [(0, '#6a3a30'), (1, '#1f100c')], 0, 0, 1, 1) + lg('lf', [(0, '#7fc65a'), (1, '#2f8a3c')], 0, 0, 1, 1)
    o = '<ellipse cx="32" cy="58" rx="22" ry="3.2" fill="#000" opacity=".22"/>'
    o += leaf(32, 24, 22, 6.5, -150, 'url(#lf)', '#e6f5c0', .6) + leaf(32, 24, 22, 6.5, -30, 'url(#lf)', '#e6f5c0', .6)
    o += '<path d="M32 22V10" stroke="#4f8f35" stroke-width="2.2" stroke-linecap="round"/>'
    # untaian buah lada
    o += '<path d="M32 24Q30 36 32 44" stroke="#4a8a3a" stroke-width="1.6" fill="none"/>'
    rnd = random.Random(3)
    for k in range(12):
        y = 27 + k * 1.6
        o += f'<circle cx="{31.5 + (k % 2) * 1.4 + rnd.uniform(-.4, .4):.1f}" cy="{y:.1f}" r="2.3" fill="{"#c8352a" if k > 6 else "#6fae3a"}" stroke="#3a1a10" stroke-width=".5"/>'
    # tumpukan lada hitam
    o += '<path d="M10 56Q32 38 54 56Z" fill="url(#pp)" stroke="#1a0c08" stroke-width=".9"/>'
    for _ in range(22):
        x, y = rnd.uniform(16, 48), rnd.uniform(48, 55)
        o += f'<circle cx="{x:.1f}" cy="{y:.1f}" r="1.6" fill="#3a2018" stroke="#140806" stroke-width=".4"/><circle cx="{x - .5:.1f}" cy="{y - .5:.1f}" r=".5" fill="#9a6a5a" opacity=".7"/>'
    return svg(64, 64, d, o)


def i_timah():
    d = lg('top', [(0, '#f4f7f8'), (1, '#cfd8dd')], 0, 0, 1, 1) + lg('lt', [(0, '#c4ced4'), (1, '#8a9aa4')], 0, 0, 1, 1)
    o = '<ellipse cx="32" cy="58" rx="25" ry="3.4" fill="#000" opacity=".22"/>'

    def ingot(x, y, w=26, h=9):
        return (f'<path d="M{x + 4} {y - h}H{x + w - 4}L{x + w} {y}H{x}Z" fill="url(#top)" stroke="#5a6872" stroke-width="1"/>'
                f'<path d="M{x} {y}H{x + w}V{y + 4}H{x}Z" fill="url(#lt)" stroke="#5a6872" stroke-width="1"/>'
                f'<path d="M{x + 7} {y - h + 2.5}H{x + w - 7}" stroke="#ffffff" stroke-width="1.3" opacity=".9" stroke-linecap="round"/>'
                f'<path d="M{x + 8} {y - 3}H{x + w - 8}" stroke="#7f8c94" stroke-width=".8"/>')
    o += ingot(6, 56) + ingot(32, 56) + ingot(19, 44) + ingot(19, 32, 26, 9)
    o += '<path d="M50 14l1.6 3.4 3.4 1.6-3.4 1.6-1.6 3.4-1.6-3.4-3.4-1.6 3.4-1.6Z" fill="#ffe27a" opacity=".95"/>'
    return svg(64, 64, d, o)


def i_minyak():
    d = lg('dr', [(0, '#3a3a42'), (.5, '#1f1f26'), (1, '#0e0e12')], 0, 0, 1, 0) + lg('dp', [(0, '#5a5a66'), (1, '#2a2a32')], 0, 0, 0, 1)
    d += lg('dropg', [(0, '#3a3a46'), (1, '#0a0a0e')], 0, 0, 1, 1)
    o = '<ellipse cx="32" cy="59" rx="20" ry="3" fill="#000" opacity=".25"/>'
    # drum minyak berpita dan setetes minyak berkilau
    o += ('<path d="M16 24V54Q32 60 48 54V24Z" fill="url(#dr)" stroke="#000" stroke-width="1"/>'
          '<ellipse cx="32" cy="24" rx="16" ry="5" fill="url(#dp)" stroke="#000" stroke-width="1"/>'
          '<path d="M16 34Q32 40 48 34M16 44Q32 50 48 44" stroke="#e0661f" stroke-width="2.4" fill="none"/>'
          '<path d="M21 28V50" stroke="#fff" stroke-width="1.4" opacity=".25" stroke-linecap="round"/>')
    o += ('<path d="M32 3Q40 13 40 18Q40 23 32 23Q24 23 24 18Q24 13 32 3Z" fill="url(#dropg)" stroke="#000" stroke-width="1"/>'
          '<path d="M28 13Q26 17 27.5 20" stroke="#ffffff" stroke-width="1.6" fill="none" opacity=".7" stroke-linecap="round"/>')
    return svg(64, 64, d, o)
