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

    // Populasi (js/core/population.js). Semua angka awal, perlu disetel dengan tools/simulate.js (Fase 9).
    population: {
      enabled: true,
      realMillionPerIndex: 150, // indeks 1,0 = sekitar 150 juta jiwa (Jawa). Hanya untuk tampilan, perkiraan kasar.
      growthPerHour: 0.02,      // pada kesejahteraan 100: +2% per jam; pada 0: -2% per jam; 50 = stabil
      floorShare: 0.6,          // penduduk tidak turun di bawah 60% dari jumlah awal (wilayah tidak "kosong")
      housingBase: 1.6,         // daya tampung awal = 1,6 x penduduk awal
      housingPerLevel: 0.3,     // +0,3 x penduduk awal per level Perumahan
      // Kebutuhan per indeks penduduk per menit (satuan komoditas) dan bobot tiap kategori pada kesejahteraan.
      demandPerPop: { pangan: 6, sandang: 0.8, energi: 4 },
      catWeight: { pangan: 0.5, sandang: 0.25, energi: 0.25 },
      subsistence: { pangan: 0.2, sandang: 0, energi: 0 },  // swasembada dasar (kebun rumah, dll.), bagian kebutuhan yang selalu terpenuhi
      portLinkBase: 0.1,        // barang dari wilayah lain menjangkau sebuah wilayah: 0,1 + 0,225 x (pelabuhan asal + tujuan), maks 1
      portLinkPerLevel: 0.225,
      facilityBonus: 0.03,      // +3% kesejahteraan per level (tol + pelabuhan), maks +20%
      facilityBonusMax: 0.2,
      workersPerPop: 20,        // pekerja tersedia = penduduk x ini
      workersPerLevel: 0.5,     // pekerja dibutuhkan per level bangunan
      laborFloor: 0.5,          // produksi tidak turun di bawah 50% walau kekurangan pekerja
      priceExp: 0.35,           // harga jual di wilayah dikali (penduduk / penduduk awal)^0,35
      depthExp: 0.6,            // kedalaman pasar dikali penduduk^0,6 (Jawa awal = 1)
      depthMin: 0.5, depthMax: 3,
      taxPerMin: 16,            // kas per menit = penduduk x kesejahteraan/100 x ini
      minStepSec: 10,           // hitung ulang paling cepat tiap 10 detik
      stepHours: 0.5,           // langkah integrasi (penduduk berubah pelan; langkah lebih kecil tidak mengubah hasil berarti)
      maxOfflineHours: 72       // waktu pergi yang dihitung paling banyak segini
    },

    // Misi harian dan hadiah login (js/core/daily.js). Hari berganti pukul 00.00 WIB.
    daily: {
      enabled: true,
      missionCount: 3,
      unitMinutes: 15,        // 1 satuan hadiah = pemasukan sekian menit (dikunci saat hari berganti)
      unitMin: 100,           // hadiah satuan tidak kurang dari ini
      bonusUnits: 2,          // bonus bila ketiga misi selesai (x satuan)
      loginUnits: [1, 1.4, 1.8, 2.2, 2.6, 3, 6],   // hadiah login hari ke-1..7 berturut-turut (x satuan)
      earnMinutes: 20,        // misi "hasilkan Rp" = pemasukan sekian menit (minimum earnMin)
      earnMin: 300
    },

    // Zoom peta (js/core/viewport.js)
    map: {
      maxZoom: 4,             // zoom maksimum = 4x dari tampilan "pas layar"
      maxPx: 2.4,             // ...atau 2,4 piksel layar per satuan peta, mana yang lebih besar (agar HP cukup besar)
      fitMinPx: 0.5,          // bila "pas layar" membuat peta lebih kecil dari 0,5 piksel per satuan, tampilan awal di-zoom
      startPx: 0.81,          // ...ke sekitar 0,81 piksel per satuan (setara peta lebar 760 px) di sekitar wilayah awal
      tapSlop: 6,             // gerakan kurang dari 6 px dianggap ketukan, bukan geseran
      uiFromPx: 1,            // Z2: label/pin mulai dikecilkan (dalam satuan peta) di atas 1 px layar per satuan
      uiMin: 0.3,             // ...dan tidak lebih kecil dari 30%
      uiBubblePower: 0.45,    // gelembung dan lencana mengecil lebih pelan (sasaran ketuk)
      rulerMaxPx: 110,        // panjang maksimum batang penggaris km
      refineDelay: 350,       // ms setelah zoom/geser berhenti sebelum tekstur tajam dirender
      maxDpr: 2,              // rasio piksel layar yang dihitung untuk ketajaman
      texMaxPx: 2400000,      // batas piksel kanvas satu render tajam (termasuk tepi); menjaga memori dan waktu di HP
      storeKey: 'nusantara-tycoon-mapview-v1'   // posisi zoom disimpan terpisah dari save game
    }
  };
})((window.NT = window.NT || {}));
