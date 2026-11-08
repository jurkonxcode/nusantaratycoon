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
    tambang_batubara: { id: 'tambang_batubara', name: 'Tambang Batubara', icon: '⛏️', region: 'kalimantan', produces: 'batubara', baseCost: 7000, baseRate: 4.5 },
    // Jawa (Fase 2a)
    tambak_garam:    { id: 'tambak_garam',    name: 'Tambak Garam',    icon: '🧂', region: 'jawa', produces: 'garam',    baseCost: 250,  baseRate: 20 },
    kebun_teh:       { id: 'kebun_teh',       name: 'Kebun Teh',       icon: '🍵', region: 'jawa', produces: 'teh',      baseCost: 800,  baseRate: 2.2 },
    kebun_tebu:      { id: 'kebun_tebu',      name: 'Kebun Tebu',      icon: '🎋', region: 'jawa', produces: 'gula',     baseCost: 1200, baseRate: 3.5 },
    kebun_tembakau:  { id: 'kebun_tembakau',  name: 'Kebun Tembakau',  icon: '🍂', region: 'jawa', produces: 'tembakau', baseCost: 1600, baseRate: 1.1 },
    // Sumatra (Fase 2b). Angka awal, setel dengan tools/balance.js
    kebun_lada:      { id: 'kebun_lada',      name: 'Kebun Lada',      icon: '🟤', region: 'sumatra', produces: 'lada',   baseCost: 1500, baseRate: 0.55 },
    tambang_timah:   { id: 'tambang_timah',   name: 'Tambang Timah',   icon: '🔩', region: 'sumatra', produces: 'timah',  baseCost: 3800, baseRate: 0.28 },
    sumur_minyak:    { id: 'sumur_minyak',    name: 'Sumur Minyak',    icon: '🛢️', region: 'sumatra', produces: 'minyak', baseCost: 5000, baseRate: 7 }
  };

  NT.data.infra = {
    tol: {
      id: 'tol', name: 'Jalan Tol', icon: '🛣️', baseCost: 500, maxLevel: 5,
      desc: '+20% produksi semua bangunan di wilayah ini per level'
    },
    perumahan: {
      id: 'perumahan', name: 'Perumahan', icon: '🏘️', baseCost: 350, maxLevel: 5,
      desc: '+30% daya tampung penduduk wilayah ini per level'
    },
    pelabuhan: {
      id: 'pelabuhan', name: 'Pelabuhan', icon: '⚓', baseCost: 400, maxLevel: 5,
      desc: '-15% ongkos kirim dari dan ke wilayah ini per level'
    }
  };
})((window.NT = window.NT || {}));
