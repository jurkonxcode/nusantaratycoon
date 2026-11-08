"""Varian tingkat sprite bangunan (128x128): tingkat 1 = sprite dasar (level 1-2), tingkat 2 (level 3-5) dan
tingkat 3 (level 6+; pelabuhan: level 5) menambahkan gudang, peti, bendera, dan kilau emas di atas sprite dasar.
Dipakai oleh tools/make_assets.py. Menghasilkan nama aset '<id>_t2' dan '<id>_t3'."""

ACCENT = {'sawah': '#e6c864', 'sentra_batik': '#2a3f78', 'kebun_kopi': '#b5483a', 'kebun_karet': '#e9e4d0',
          'kebun_kakao': '#8a4a2a', 'kebun_cengkeh': '#7a2f3a', 'pelabuhan': '#2d8fd0'}


def crates(x, y, rows):
    """Tumpukan peti kayu; rows = jumlah peti per baris dari bawah (misal [3, 2, 1])."""
    s = ''
    for r, n in enumerate(rows):
        for k in range(n):
            cx = x + k * 11 + r * 5.5
            cy = y - r * 9
            s += (f'<rect x="{cx:.1f}" y="{cy:.1f}" width="10" height="9" rx="1" fill="#b98a55" stroke="#5a3a1a" stroke-width=".9"/>'
                  f'<path d="M{cx + 1:.1f} {cy + 1:.1f}L{cx + 9:.1f} {cy + 8:.1f}M{cx + 9:.1f} {cy + 1:.1f}L{cx + 1:.1f} {cy + 8:.1f}" stroke="#7a5230" stroke-width=".8"/>')
    return s


def flag(x, y, color):
    return (f'<path d="M{x} {y}V{y - 26}" stroke="#4a3320" stroke-width="1.6" stroke-linecap="round"/>'
            f'<path d="M{x} {y - 26}Q{x + 8} {y - 30} {x + 15} {y - 25}Q{x + 8} {y - 21} {x} {y - 17}Z" fill="{color}" stroke="#ffffff" stroke-width=".6"/>'
            f'<circle cx="{x}" cy="{y - 27}" r="1.6" fill="#e8c34a"/>')


def gudang(x, y, w, h, accent):
    """Gudang kecil beratap pelana, pintu terbuka."""
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#e9d9b4" stroke="#6a4a2a" stroke-width="1"/>'
            f'<rect x="{x + w * .34:.1f}" y="{y + h * .38:.1f}" width="{w * .32:.1f}" height="{h * .62:.1f}" fill="#5a3a1a"/>'
            f'<path d="M{x - 3} {y + 1}L{x + w / 2:.1f} {y - h * .55:.1f}L{x + w + 3} {y + 1}Z" fill="{accent}" stroke="#4a3320" stroke-width="1"/>'
            f'<path d="M{x - 3} {y + 1}L{x + w / 2:.1f} {y - h * .55:.1f}L{x + w / 2:.1f} {y + 1}Z" fill="#ffffff" opacity=".18"/>')


def sparkle(x, y, r=4):
    return (f'<path d="M{x} {y - r}L{x + r * .3:.1f} {y - r * .3:.1f}L{x + r} {y}L{x + r * .3:.1f} {y + r * .3:.1f}L{x} {y + r}'
            f'L{x - r * .3:.1f} {y + r * .3:.1f}L{x - r} {y}L{x - r * .3:.1f} {y - r * .3:.1f}Z" fill="#ffe27a" opacity=".95"/>')


def _unused_crane(x, y, big):
    """Derek pelabuhan; big=True lebih tinggi dengan wadah peti kemas."""
    h = 52 if big else 40
    s = (f'<path d="M{x} {y}V{y - h}M{x + 8} {y}V{y - h}M{x} {y - h * .5:.0f}H{x + 8}" stroke="#d98a2b" stroke-width="2" fill="none"/>'
         f'<path d="M{x - 18} {y - h}H{x + 14}" stroke="#d98a2b" stroke-width="3" stroke-linecap="round"/>'
         f'<path d="M{x - 14} {y - h}V{y - h + 12}" stroke="#444" stroke-width=".9"/>'
         f'<rect x="{x - 18}" y="{y - h + 12}" width="8" height="5" fill="#c8472f" stroke="#4a2018" stroke-width=".7"/>')
    if big:
        s += ''.join(f'<rect x="{x - 26 + k * 9}" y="{y + 2 - r * 5.5:.1f}" width="8.5" height="5" fill="{c}" stroke="#222" stroke-width=".6"/>'
                     for r in range(2) for k, c in enumerate(['#2d8fd0', '#e8c34a', '#c8472f']))
    return s


def decorate(name, tier, svg_text):
    """Sisipkan hiasan tingkat 2/3 ke sprite dasar (svg_text) sebelum </svg>."""
    if tier < 2:
        return svg_text
    ac = ACCENT.get(name, '#c8472f')
    ex = ''
    if name == 'pelabuhan':
        ex += crates(8, 116, [3] if tier == 2 else [3, 2]) + flag(14, 100, ac)
        ex += ''.join(f'<rect x="{84 + k * 10}" y="{103 - r * 6.5:.1f}" width="9.5" height="6" fill="{c}" stroke="#222" stroke-width=".6"/>'
                      for r in range(1 if tier == 2 else 2) for k, c in enumerate(['#2d8fd0', '#e8c34a', '#c8472f']))
        if tier >= 3:
            ex += sparkle(40, 24, 5) + sparkle(112, 18, 4)
    else:
        ex += crates(6, 116, [2, 1] if tier == 2 else [3, 2, 1])
        if tier == 2:
            ex += flag(106, 110, ac)
        else:
            ex += gudang(84, 92, 28, 18, ac if name != 'kebun_karet' else '#8a9a4a') + flag(98, 80, ac)
            ex += sparkle(22, 30, 5) + sparkle(110, 20, 4) + sparkle(64, 12, 3)
    return svg_text.replace('</svg>', ex + '</svg>')
