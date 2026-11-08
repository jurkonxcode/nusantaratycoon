/*
 * Pasar luar negeri (ekspor). Seperti Sim Companies: makin jauh makin lama di jalan, tetapi harga jual lebih tinggi.
 *   km         = jarak pelayaran dari Indonesia (untuk ongkir)
 *   baseHours  = durasi dasar pengiriman (dikurangi oleh level pelabuhan wilayah asal)
 *   minPort    = level pelabuhan minimum di wilayah asal komoditas
 *   mult       = pengali harga default; demand = pengali khusus per komoditas
 */
(function (NT) {
  NT.data = NT.data || {};
  NT.data.exportMarkets = {
    singapura: { id: 'singapura', name: 'Singapura',    icon: '🇸🇬', km: 900,   baseHours: 1,  minPort: 1, mult: 1.2,
      demand: { sawit: 1.35, karet: 1.3, teh: 1.25 } },
    tiongkok:  { id: 'tiongkok',  name: 'Tiongkok',     icon: '🇨🇳', km: 4500,  baseHours: 6,  minPort: 2, mult: 1.3,
      demand: { batubara: 1.5, karet: 1.45, sawit: 1.4 } },
    jepang:    { id: 'jepang',    name: 'Jepang',       icon: '🇯🇵', km: 5800,  baseHours: 10, minPort: 2, mult: 1.35,
      demand: { kopi: 1.6, kakao: 1.5, batik: 1.7, teh: 1.5, tembakau: 1.45 } },
    india:     { id: 'india',     name: 'India',        icon: '🇮🇳', km: 4800,  baseHours: 14, minPort: 3, mult: 1.3,
      demand: { sawit: 1.55, cengkeh: 1.5, batubara: 1.45 } },
    belanda:   { id: 'belanda',   name: 'Belanda (Eropa)', icon: '🇳🇱', km: 11500, baseHours: 36, minPort: 4, mult: 1.5,
      demand: { kakao: 1.8, kopi: 1.7, cengkeh: 1.7, batik: 1.9, teh: 1.65, tembakau: 1.7 } }
  };
})((window.NT = window.NT || {}));
