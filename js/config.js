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

    // Pasar
    shippingRate: 0.06,       // ongkir per satuan jarak, sebagai bagian dari harga dasar
    portDiscountPerLevel: 0.15,
    maxShippingDiscount: 0.75,
    marketDecayPerMin: 0.08,  // tekanan pasokan turun 8% per menit
    maxMarketDrop: 0.55,      // harga paling banyak turun 55% karena banjir pasokan
    priceWaveAmplitude: 0.10  // fluktuasi harga +-10%
  };
})((window.NT = window.NT || {}));
