/* Bangunan penghasil komoditas dan infrastruktur wilayah. */
(function (NT) {
  NT.data = NT.data || {};

  // baseRate = unit (karung 50 kg) per menit pada level 1. Komoditas mahal berlaju kecil: itu cerminan
  // hasil panen per hektare yang nyata (padi berton-ton, cengkeh hanya ratusan kilo).
  // baseCost = harga membangun (level 0 -> 1).
  NT.data.buildings = {
    sawah:         { id: 'sawah',         name: 'Sawah',          icon: '🌾', region: 'jawa',     produces: 'padi',    baseCost: 60,   baseRate: 6 },
    sentra_batik:  { id: 'sentra_batik',  name: 'Sentra Batik',   icon: '👘', region: 'jawa',     produces: 'batik',   baseCost: 400,  baseRate: 1 },
    kebun_kopi:    { id: 'kebun_kopi',    name: 'Kebun Kopi',     icon: '☕', region: 'sumatra',  produces: 'kopi',    baseCost: 900,  baseRate: 0.7 },
    kebun_karet:   { id: 'kebun_karet',   name: 'Kebun Karet',    icon: '🛞', region: 'sumatra',  produces: 'karet',   baseCost: 700,  baseRate: 3 },
    kebun_kakao:   { id: 'kebun_kakao',   name: 'Kebun Kakao',    icon: '🍫', region: 'sulawesi', produces: 'kakao',   baseCost: 2000, baseRate: 0.65 },
    kebun_cengkeh: { id: 'kebun_cengkeh', name: 'Kebun Cengkeh',  icon: '🌿', region: 'sulawesi', produces: 'cengkeh', baseCost: 3000, baseRate: 0.75 },
    kebun_sawit:   { id: 'kebun_sawit',   name: 'Kebun Sawit',    icon: '🌴', region: 'kalimantan', produces: 'sawit',   baseCost: 4500, baseRate: 9 },
    tambang_batubara: { id: 'tambang_batubara', name: 'Tambang Batubara', icon: '⛏️', region: 'kalimantan', produces: 'batubara', baseCost: 7000, baseRate: 4.5 }
  };

  NT.data.infra = {
    tol: {
      id: 'tol', name: 'Jalan Tol', icon: '🛣️', baseCost: 500, maxLevel: 5,
      desc: '+20% produksi semua bangunan di wilayah ini per level'
    },
    pelabuhan: {
      id: 'pelabuhan', name: 'Pelabuhan', icon: '⚓', baseCost: 400, maxLevel: 5,
      desc: '-15% ongkos kirim dari dan ke wilayah ini per level'
    }
  };
})((window.NT = window.NT || {}));
