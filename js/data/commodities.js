/* Komoditas. marketDepth = berapa unit yang bisa diserap pasar sebelum harga mulai jatuh. */
(function (NT) {
  NT.data = NT.data || {};
  NT.data.commodities = {
    padi:    { id: 'padi',    name: 'Padi',    icon: '🌾', region: 'jawa',     basePrice: 8,  marketDepth: 300 },
    batik:   { id: 'batik',   name: 'Batik',   icon: '👘', region: 'jawa',     basePrice: 40, marketDepth: 60 },
    kopi:    { id: 'kopi',    name: 'Kopi',    icon: '☕', region: 'sumatra',  basePrice: 25, marketDepth: 100 },
    karet:   { id: 'karet',   name: 'Karet',   icon: '🛞', region: 'sumatra',  basePrice: 15, marketDepth: 150 },
    kakao:   { id: 'kakao',   name: 'Kakao',   icon: '🍫', region: 'sulawesi', basePrice: 30, marketDepth: 80 },
    cengkeh: { id: 'cengkeh', name: 'Cengkeh', icon: '🌿', region: 'sulawesi', basePrice: 55, marketDepth: 60 }
  };
})((window.NT = window.NT || {}));
