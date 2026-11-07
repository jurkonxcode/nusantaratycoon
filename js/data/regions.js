/*
 * Wilayah. demand = pengali harga jual di pasar wilayah itu (default 1).
 * map.svg = bentuk pulau di peta (viewBox 1000x480), map.pin = posisi ikon, map.label = posisi nama.
 * comingSoon = wilayah yang belum bisa dimainkan (kerangka untuk pengembangan berikutnya).
 */
(function (NT) {
  NT.data = NT.data || {};

  NT.data.regions = {
    sumatra: {
      id: 'sumatra', name: 'Sumatra', icon: '☕', tagline: 'Kebun kopi dan karet di tanah Andalas',
      unlockCost: 600, infraCostFactor: 1.5, buildings: ['kebun_kopi', 'kebun_karet'],
      demand: { padi: 1.3, batik: 1.4, kopi: 0.9, karet: 0.9, kakao: 1.1, cengkeh: 1.2 },
      map: {
        svg: '<path d="M40,110 C60,88 95,96 130,128 C170,164 215,205 255,250 C285,285 310,318 322,345 C328,360 312,366 298,358 C262,342 220,318 180,284 C135,246 92,200 62,160 C46,138 30,128 40,110 Z"/>',
        pin: [190, 215], label: [120, 262]
      }
    },
    jawa: {
      id: 'jawa', name: 'Jawa', icon: '🌾', tagline: 'Lumbung padi dan pusat batik', start: true,
      unlockCost: 0, infraCostFactor: 1, buildings: ['sawah', 'sentra_batik'],
      demand: { padi: 0.9, batik: 1.1, kopi: 1.3, karet: 1.2, kakao: 1.1, cengkeh: 1.4 },
      map: {
        svg: '<path d="M318,392 C345,378 380,380 420,386 C455,391 480,386 515,392 C540,396 556,404 552,412 C535,420 500,416 462,414 C420,412 380,414 345,410 C322,406 306,400 318,392 Z"/>',
        pin: [432, 398], label: [432, 440]
      }
    },
    sulawesi: {
      id: 'sulawesi', name: 'Sulawesi', icon: '🍫', tagline: 'Kakao dan cengkeh dari tanah Celebes',
      unlockCost: 2000, infraCostFactor: 2.5, buildings: ['kebun_kakao', 'kebun_cengkeh'],
      demand: { padi: 1.2, batik: 1.3, kopi: 1.2, karet: 1.1, kakao: 0.9, cengkeh: 0.9 },
      map: {
        svg: '<path d="M628,150 C648,138 676,142 690,158 C700,170 694,184 680,190 C668,196 664,206 670,216 C690,214 716,222 736,238 C742,244 736,250 726,250 C706,248 686,252 676,262 C672,282 676,306 672,330 C668,344 650,346 646,332 C640,310 644,284 640,262 C626,244 618,222 620,200 C618,180 616,162 628,150 Z"/>',
        pin: [662, 232], label: [700, 296]
      }
    },
    kalimantan: {
      id: 'kalimantan', name: 'Kalimantan', icon: '🌳', tagline: 'Hutan dan tambang (segera hadir)', comingSoon: true,
      map: {
        svg: '<path d="M372,150 C395,112 450,92 505,108 C550,122 585,160 585,210 C585,262 560,302 515,316 C470,328 428,316 402,284 C378,254 358,196 372,150 Z"/>',
        pin: [478, 206], label: [478, 260]
      }
    },
    bali_nusra: {
      id: 'bali_nusra', name: 'Bali & Nusa Tenggara', short: 'Nusa Tenggara', icon: '🏖️', tagline: 'Garam dan pariwisata (segera hadir)', comingSoon: true,
      map: {
        svg: '<ellipse cx="578" cy="418" rx="14" ry="6"/><ellipse cx="612" cy="422" rx="16" ry="6"/><ellipse cx="650" cy="426" rx="18" ry="6"/><ellipse cx="690" cy="430" rx="16" ry="6"/><ellipse cx="722" cy="434" rx="12" ry="5"/>',
        pin: [650, 408], label: [650, 455]
      }
    },
    maluku: {
      id: 'maluku', name: 'Maluku', icon: '🌶️', tagline: 'Pala dan cengkeh (segera hadir)', comingSoon: true,
      map: {
        svg: '<ellipse cx="790" cy="200" rx="14" ry="22"/><ellipse cx="815" cy="238" rx="12" ry="18"/><ellipse cx="775" cy="256" rx="10" ry="14"/><ellipse cx="830" cy="190" rx="10" ry="12"/>',
        pin: [796, 214], label: [800, 282]
      }
    },
    papua: {
      id: 'papua', name: 'Papua', icon: '⛰️', tagline: 'Tembaga dan kopi (segera hadir)', comingSoon: true,
      map: {
        svg: '<path d="M846,262 C880,238 930,232 968,252 C992,268 996,300 975,322 C948,344 900,342 868,322 C846,308 832,280 846,262 Z"/>',
        pin: [914, 288], label: [914, 360]
      }
    }
  };

  // Jarak antar wilayah yang bisa dimainkan (kunci: id diurutkan abjad, dipisah |).
  NT.data.distance = {
    'jawa|sumatra': 2,
    'jawa|sulawesi': 3,
    'sulawesi|sumatra': 4
  };

  // Gelar berdasarkan skor peradaban.
  NT.data.ranks = [
    { min: 0,    name: 'Desa Rintisan' },
    { min: 150,  name: 'Kota Dagang' },
    { min: 400,  name: 'Kabupaten Maju' },
    { min: 900,  name: 'Provinsi Makmur' },
    { min: 1800, name: 'Negara Maritim' },
    { min: 3500, name: 'Peradaban Nusantara' }
  ];
})((window.NT = window.NT || {}));
