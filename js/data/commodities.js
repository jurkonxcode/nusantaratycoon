/*
 * Komoditas. Harga game = harga nyata per satuan / config.priceScale.
 * 1 satuan = 1 karung 50 kg (batik: 10 lembar kain, sekitar 4 kg).
 * realRpPerKg adalah PERKIRAAN kasar (2025-2026) untuk menjaga rasio antar komoditas, bukan kurs resmi.
 * Harga komoditas nyata sangat bergejolak; ubah angkanya di sini bila ingin menyesuaikan.
 *   - Padi: acuan pemerintah (HPP gabah kering panen) Rp 6.500/kg.
 *   - Kopi, kakao, cengkeh, karet: kisaran kasar harga tingkat petani/pengepul.
 *
 * season.prod  = pengali produksi per bulan (Jan..Des), season.price = pengali harga per bulan.
 * Tabel dinormalkan di world.js sehingga rata-rata setahun = 1 (musim hanya menggeser waktu, bukan total).
 * marketDepth = berapa unit yang bisa diserap pasar sebelum harga mulai jatuh.
 */
(function (NT) {
  NT.data = NT.data || {};

  function make(o) {
    o.pricePerUnitRp = o.realRpPerKg * o.unitKg;
    o.basePrice = Math.round(o.pricePerUnitRp / NT.config.priceScale * 10) / 10;
    return o;
  }

  NT.data.commodities = {
    padi: make({
      id: 'padi', name: 'Padi', icon: '🌾', region: 'jawa', realRpPerKg: 6500, unitKg: 50, marketDepth: 300,
      seasonNote: 'Panen raya Mar-Apr, panen gadu Jul-Sep, paceklik Okt-Jan',
      season: {
        prod:  [0.8, 1.0, 1.4, 1.4, 1.0, 0.9, 1.1, 1.2, 1.1, 0.8, 0.7, 0.7],
        price: [1.15, 1.0, 0.85, 0.85, 0.95, 1.0, 0.95, 0.95, 1.0, 1.1, 1.15, 1.15]
      }
    }),
    batik: make({
      id: 'batik', name: 'Batik', icon: '👘', region: 'jawa', realRpPerKg: 625000, unitKg: 4, marketDepth: 60,
      seasonNote: 'Permintaan naik jelang Lebaran, Hari Batik (2 Okt), dan akhir tahun; sulit dijemur saat hujan',
      season: {
        prod:  [0.9, 0.9, 1.0, 1.0, 1.0, 1.05, 1.05, 1.05, 1.05, 1.0, 0.95, 0.9],
        price: [1.05, 1.05, 1.15, 1.05, 1.0, 0.95, 0.95, 0.95, 1.0, 1.15, 1.0, 1.1]
      }
    }),
    kopi: make({
      id: 'kopi', name: 'Kopi', icon: '☕', region: 'sumatra', realRpPerKg: 75000, unitKg: 50, marketDepth: 100,
      seasonNote: 'Panen raya Mei-Agu',
      season: {
        prod:  [0.6, 0.6, 0.7, 0.9, 1.3, 1.5, 1.5, 1.3, 0.9, 0.7, 0.6, 0.6],
        price: [1.1, 1.1, 1.05, 1.0, 0.92, 0.88, 0.88, 0.92, 1.0, 1.05, 1.1, 1.1]
      }
    }),
    karet: make({
      id: 'karet', name: 'Karet', icon: '🛞', region: 'sumatra', realRpPerKg: 17000, unitKg: 50, marketDepth: 150,
      seasonNote: 'Getah turun saat gugur daun (Feb-Apr) dan hujan lebat; puncak Agu-Okt',
      season: {
        prod:  [0.75, 0.65, 0.65, 0.8, 0.95, 1.05, 1.15, 1.2, 1.2, 1.15, 0.95, 0.8],
        price: [1.05, 1.08, 1.08, 1.03, 1.0, 0.97, 0.95, 0.93, 0.93, 0.95, 1.0, 1.04]
      }
    }),
    kakao: make({
      id: 'kakao', name: 'Kakao', icon: '🍫', region: 'sulawesi', realRpPerKg: 110000, unitKg: 50, marketDepth: 80,
      seasonNote: 'Panen utama Apr-Jul, panen kecil Okt-Des',
      season: {
        prod:  [0.8, 0.8, 0.9, 1.2, 1.3, 1.3, 1.2, 1.0, 0.8, 1.0, 1.0, 0.9],
        price: [1.05, 1.05, 1.03, 0.95, 0.92, 0.92, 0.95, 1.0, 1.05, 1.0, 1.0, 1.03]
      }
    }),
    cengkeh: make({
      id: 'cengkeh', name: 'Cengkeh', icon: '🌿', region: 'sulawesi', realRpPerKg: 130000, unitKg: 50, marketDepth: 60,
      seasonNote: 'Panen Jun-Okt (puncak Jul-Sep), sisanya sepi',
      season: {
        prod:  [0.5, 0.5, 0.5, 0.6, 0.8, 1.3, 1.7, 1.8, 1.6, 1.1, 0.6, 0.5],
        price: [1.1, 1.1, 1.1, 1.08, 1.05, 0.98, 0.9, 0.88, 0.9, 0.98, 1.05, 1.1]
      }
    })
  };
})((window.NT = window.NT || {}));
