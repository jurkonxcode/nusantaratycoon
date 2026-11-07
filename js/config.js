/* Pengaturan global game. Ubah angka di sini untuk menyeimbangkan ekonomi. */
(function (NT) {
  NT.config = {
    // 'local' = disimpan di browser. 'supabase' = disimpan di cloud (lihat README).
    storage: 'supabase',
    saveKey: 'nusantara-tycoon-save-v1',
    supabase: { url: 'https://siqrhhllukvykpcqucty.supabase.co', anonKey: 'sb_publishable_V3dCHHNr7gZs6wxsW7swQQ_w9cT5fam' },

    autosaveMs: 5000,

    // Produksi
    storageHours: 2,          // gudang bangunan penuh setelah N jam
    tolBonusPerLevel: 0.2,    // +20% produksi per level tol

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
    priceWaveAmplitude: 0.10  // fluktuasi harga +-10%
  };
})((window.NT = window.NT || {}));
