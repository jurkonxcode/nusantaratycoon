/* Pengaturan global game. Ubah angka di sini untuk menyeimbangkan ekonomi. */
(function (NT) {
  NT.config = {
    // 'local' = disimpan di browser. 'supabase' = disimpan di cloud (lihat README).
    storage: 'supabase',
    saveKey: 'nusantara-tycoon-save-v1',
    supabase: { url: 'https://siqrhhllukvykpcqucty.supabase.co', anonKey: 'sb_publishable_V3dCHHNr7gZs6wxsW7swQQ_w9cT5fam' },

    autosaveMs: 5000,

    // Produksi
    storageHours: 6,          // gudang bangunan penuh setelah N jam
    tolBonusPerLevel: 0.2,    // +20% produksi per level tol

    // Waktu pembangunan: makin tinggi level makin lama. Bangunan mahal dan wilayah mahal ikut lebih lama.
    buildTimeEnabled: true,
    buildBaseSec: 10,         // detik untuk upgrade pertama bangunan termurah
    buildGrowth: 1.9,         // durasi x1,9 tiap level (sampai level 'lateFromLevel')
    buildGrowthLate: 2.4,     // setelah level 2, durasi x2,4 tiap level (makin lama makin terasa)
    lateFromLevel: 2,         // level mulai berlaku pertumbuhan 'Late'
    maxDurationHours: 72,     // batas atas durasi satu pembangunan
    buildTierExp: 0.25,       // pengali tier = (biayaDasar / 60) ^ eksponen
    infraBaseSec: 30,
    infraGrowth: 2.3,
    infraGrowthLate: 3.0,
    infraRegionExp: 0.3,
    maxBuilders: 2,           // jumlah pembangunan yang bisa berjalan bersamaan
    speedupCostShare: 0.4,    // biaya percepat = 40% biaya upgrade x sisa waktu / total waktu

    // Pengiriman: penjualan juga butuh waktu. Harga dikunci saat dikirim, kas masuk saat barang tiba.
    saleTimeEnabled: true,
    saleLocalSec: 15,         // jual di wilayah asal komoditas (truk), detik
    saleSeaBaseMin: 2,        // antar pulau: menit dasar + menit per km
    saleMinPerKm: 0.02,
    saleTolSpeedup: 0.08,     // tol wilayah asal: -8% waktu kirim lokal per level (maks 50%)
    salePortSpeedup: 0.06,    // pelabuhan asal+tujuan: -6% waktu kirim laut per level (maks 50%)
    shipSlotsBase: 4,         // slot kapal bersamaan (laut dan ekspor); +1 per level pelabuhan di semua wilayah

    // Ekspor ke luar negeri (data di js/data/exports.js)
    exportFreightFactor: 0.35,   // peti kemas lebih murah per kg daripada kapal antar-pulau kecil
    exportDepthMult: 3,          // pasar luar negeri menyerap 3x lebih banyak sebelum harga jatuh
    exportBatchPerPort: 120,     // maksimum satuan per pengiriman = ini x level pelabuhan wilayah asal
    exportPortSpeedup: 0.06,     // pelabuhan wilayah asal: -6% durasi ekspor per level (maks 30%)

    // Biaya
    upgradeGrowth: 1.55,      // kenaikan biaya tiap level

    // Dunia nyata
    priceScale: 40000,        // Rp nyata per 1 Rp di dalam game (harga = harga nyata / skala)
    seaFreightRpPerKgKm: 1.0, // perkiraan ongkos kapal antar-pulau, Rp nyata per kg per km
    routeDetour: 1.25,        // rute laut lebih panjang dari garis lurus
    seasonsEnabled: true,     // musim mengikuti bulan kalender nyata (zona WIB)
    seasonMonthShift: 0,      // untuk uji: geser bulan (0 = bulan nyata)
    eventsEnabled: true,      // peristiwa acak (banjir, El Nino, dll.)
    eventSlotHours: 8,        // peristiwa berganti tiap N jam (sama untuk semua pemain)
    eventChance: 0.45,        // peluang ada peristiwa di tiap jendela waktu

    // Pasar
    portDiscountPerLevel: 0.15,
    maxShippingDiscount: 0.75,
    marketDecayPerMin: 0.08,  // tekanan pasokan turun 8% per menit
    maxMarketDrop: 0.55,      // harga paling banyak turun 55% karena banjir pasokan
    priceWaveAmplitude: 0.10, // fluktuasi harga +-10%

    // Zoom peta (js/core/viewport.js)
    map: {
      maxZoom: 4,             // zoom maksimum = 4x dari tampilan "pas layar"
      maxPx: 2.4,             // ...atau 2,4 piksel layar per satuan peta, mana yang lebih besar (agar HP cukup besar)
      fitMinPx: 0.5,          // bila "pas layar" membuat peta lebih kecil dari 0,5 piksel per satuan, tampilan awal di-zoom
      startPx: 0.81,          // ...ke sekitar 0,81 piksel per satuan (setara peta lebar 760 px) di sekitar wilayah awal
      tapSlop: 6,             // gerakan kurang dari 6 px dianggap ketukan, bukan geseran
      storeKey: 'nusantara-tycoon-mapview-v1'   // posisi zoom disimpan terpisah dari save game
    }
  };
})((window.NT = window.NT || {}));
