/*
 * Wilayah. demand = pengali harga jual di pasar wilayah itu (default 1).
 * hub = kota pelabuhan utama (dipakai menghitung jarak dan ongkir secara nyata).
 * map.pin / label / port / slots = posisi di peta dalam [bujur, lintang]; bentuk pulau ada di data/geo.js.
 * comingSoon = wilayah yang belum bisa dimainkan (kerangka untuk pengembangan berikutnya).
 */
(function (NT) {
  NT.data = NT.data || {};

  NT.data.regions = {
    sumatra: {
      id: 'sumatra', name: 'Sumatra', icon: '☕', artIcon: 'kopi', tagline: 'Kebun kopi dan karet di tanah Andalas',
      unlockCost: 600, infraCostFactor: 1.5, buildings: ['kebun_kopi', 'kebun_karet', 'kebun_lada', 'tambang_timah', 'sumur_minyak'],
      demand: { padi: 1.3, batik: 1.4, kopi: 0.9, karet: 0.9, kakao: 1.1, cengkeh: 1.2, sawit: 1.1, batubara: 1.2 , teh: 1.2, gula: 1.3, tembakau: 1.2, garam: 1.2, lada: 0.9, timah: 0.9, minyak: 0.9 },
      hub: { name: 'Medan (Belawan)', lon: 98.7, lat: 3.78 },
      map: {
        pin: [101.3, 0.1], label: [100.9, -1.7], port: [99.6, 4.2],
        slots: { kebun_kopi: [97.7, 3.4], kebun_karet: [103.9, -2.7], kebun_lada: [105.2, -4.9], tambang_timah: [106.1, -2.1], sumur_minyak: [101.0, 1.6] }
      }
    },
    jawa: {
      id: 'jawa', name: 'Jawa', icon: '🌾', artIcon: 'padi', tagline: 'Lumbung padi dan pusat batik', start: true,
      unlockCost: 0, infraCostFactor: 1, buildings: ['sawah', 'sentra_batik', 'tambak_garam', 'kebun_teh', 'kebun_tebu', 'kebun_tembakau'],
      demand: { padi: 0.9, batik: 1.1, kopi: 1.3, karet: 1.2, kakao: 1.1, cengkeh: 1.4, sawit: 1.3, batubara: 1.4, teh: 0.9, gula: 0.9, tembakau: 0.9, garam: 0.9, lada: 1.3, timah: 1.2, minyak: 1.4 },
      hub: { name: 'Jakarta (Tanjung Priok)', lon: 106.85, lat: -6.1 },
      map: {
        pin: [110.5, -7.3], label: [110.5, -9.4], port: [106.0, -5.7],
        slots: {
          sawah: [108.4, -7.0], sentra_batik: [112.8, -7.6],
          tambak_garam: [107.5, -6.2], kebun_teh: [106.8, -7.1], kebun_tebu: [111.6, -8.0], kebun_tembakau: [114.2, -8.3]
        }
      }
    },
    sulawesi: {
      id: 'sulawesi', name: 'Sulawesi', icon: '🍫', artIcon: 'kakao', tagline: 'Kakao dan cengkeh dari tanah Celebes',
      unlockCost: 2000, infraCostFactor: 2.5, buildings: ['kebun_kakao', 'kebun_cengkeh'],
      demand: { padi: 1.2, batik: 1.3, kopi: 1.2, karet: 1.1, kakao: 0.9, cengkeh: 0.9, sawit: 1.2, batubara: 1.2 , teh: 1.2, gula: 1.3, tembakau: 1.2, garam: 1.3, lada: 1.2, timah: 1.2, minyak: 1.2 },
      hub: { name: 'Makassar', lon: 119.4, lat: -5.13 },
      map: {
        pin: [120.4, -1.6], label: [122.0, -5.9], port: [117.8, -5.0],
        slots: { kebun_kakao: [119.8, -3.8], kebun_cengkeh: [124.0, 1.05] }
      }
    },
    kalimantan: {
      id: 'kalimantan', artIcon: 'sawit', name: 'Kalimantan', icon: '🌴', tagline: 'Sawit dan batubara dari rimba Borneo',
      unlockCost: 10000, infraCostFactor: 3.5, buildings: ['kebun_sawit', 'tambang_batubara'],
      demand: { padi: 1.3, batik: 1.4, kopi: 1.2, karet: 1.2, kakao: 1.2, cengkeh: 1.3, sawit: 0.9, batubara: 0.9 , teh: 1.3, gula: 1.4, tembakau: 1.3, garam: 1.4, lada: 1.2, timah: 1.3, minyak: 1.2 },
      hub: { name: 'Balikpapan', lon: 116.8, lat: -1.27 },
      map: {
        pin: [113.8, 0.0], label: [113.8, -2.4], port: [117.9, -1.6],
        slots: { kebun_sawit: [111.2, 0.8], tambang_batubara: [115.7, -0.6] }
      }
    },
    bali_nusra: {
      id: 'bali_nusra', name: 'Bali & Nusa Tenggara', short: 'Nusa Tenggara', icon: '🏖️', tagline: 'Garam dan pariwisata (segera hadir)', comingSoon: true,
      hub: { name: 'Denpasar (Benoa)', lon: 115.2, lat: -8.75 },
      map: { pin: [120.5, -8.7], label: [120.5, -10.9] }
    },
    maluku: {
      id: 'maluku', name: 'Maluku', icon: '🌶️', tagline: 'Pala dan cengkeh (segera hadir)', comingSoon: true,
      hub: { name: 'Ambon', lon: 128.18, lat: -3.7 },
      map: { pin: [129.0, -3.1], label: [129.0, -5.1] }
    },
    papua: {
      id: 'papua', name: 'Papua', icon: '⛰️', tagline: 'Tembaga dan kopi (segera hadir)', comingSoon: true,
      hub: { name: 'Jayapura', lon: 140.7, lat: -2.5 },
      map: { pin: [137.5, -4.0], label: [137.5, -6.2] }
    }
  };

  // Jarak antar wilayah dihitung dari koordinat hub (lihat economy.distanceKm).

  // Gelar berdasarkan skor peradaban. Ambang disetel dengan tools/simulate.js (pemain aktif / santai / harian):
  // Kota Dagang sekitar 20 menit (aktif) sampai 2 jam (santai); Peradaban Nusantara target pekan pertama.
  NT.data.ranks = [
    { min: 0,      name: 'Desa Rintisan' },
    { min: 150,    name: 'Kota Dagang' },
    { min: 800,    name: 'Kabupaten Maju' },
    { min: 4000,   name: 'Provinsi Makmur' },
    { min: 20000,  name: 'Negara Maritim' },
    { min: 100000, name: 'Peradaban Nusantara' }
  ];
})((window.NT = window.NT || {}));
