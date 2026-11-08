/*
 * Peristiwa dunia nyata yang muncul bergantian (deterministik dari jam, jadi sama untuk semua pemain).
 * months: bulan 1-12 saat peristiwa ini masuk akal (null = kapan saja).
 * weight: seberapa sering dibanding peristiwa lain.
 * prod.commodity / prod.region: pengali produksi; price: pengali harga per komoditas.
 */
(function (NT) {
  NT.data = NT.data || {};

  NT.data.events = [
    { id: 'banjir_jawa', icon: '🌊', name: 'Banjir di Jawa', months: [11, 12, 1, 2, 3], weight: 3,
      desc: 'Sawah dan sentra batik terendam. Produksi Jawa turun, harga beras naik.',
      prod: { region: { jawa: 0.5 } }, price: { padi: 1.15 } },
    { id: 'banjir_sumatra', icon: '🌊', name: 'Banjir di Sumatra', months: [11, 12, 1, 2], weight: 2,
      desc: 'Jalan kebun terputus. Produksi Sumatra turun.',
      prod: { region: { sumatra: 0.55 } }, price: { kopi: 1.1, karet: 1.1 } },
    { id: 'el_nino', icon: '☀️', name: 'El Niño: kemarau panjang', months: [6, 7, 8, 9, 10], weight: 3,
      desc: 'Hujan tak turun. Panen padi, kopi, dan kakao merosot, harga naik.',
      prod: { commodity: { padi: 0.7, kopi: 0.8, kakao: 0.75, cengkeh: 0.9 } },
      price: { padi: 1.25, kopi: 1.2, kakao: 1.2 } },
    { id: 'panen_melimpah', icon: '🌾', name: 'Panen raya melimpah', months: [3, 4], weight: 3,
      desc: 'Gabah berlimpah. Produksi padi naik tapi harganya tertekan.',
      prod: { commodity: { padi: 1.2 } }, price: { padi: 0.85 } },
    { id: 'gempa_sulawesi', icon: '🏚️', name: 'Gempa di Sulawesi', months: null, weight: 1,
      desc: 'Kerusakan kebun dan jalan. Produksi Sulawesi turun sementara.',
      prod: { region: { sulawesi: 0.6 } }, price: {} },
    { id: 'ekspor_kopi', icon: '📈', name: 'Lonjakan permintaan kopi dunia', months: null, weight: 2,
      desc: 'Pembeli luar negeri berebut kopi Nusantara.',
      prod: {}, price: { kopi: 1.4 } },
    { id: 'karet_jatuh', icon: '📉', name: 'Harga karet dunia jatuh', months: null, weight: 2,
      desc: 'Permintaan industri ban melemah.',
      prod: {}, price: { karet: 0.7 } },
    { id: 'kakao_gagal', icon: '📈', name: 'Gagal panen kakao di Afrika Barat', months: null, weight: 2,
      desc: 'Pasokan dunia seret, harga kakao melonjak.',
      prod: {}, price: { kakao: 1.5 } },
    { id: 'festival_batik', icon: '🎉', name: 'Pekan batik dan bazar', months: [9, 10, 12], weight: 2,
      desc: 'Wisatawan dan pejabat berburu batik.',
      prod: {}, price: { batik: 1.4 } },
    { id: 'rokok_cengkeh', icon: '🏭', name: 'Pabrik rokok kretek menyerap cengkeh', months: [7, 8, 9], weight: 2,
      desc: 'Pabrik menimbun stok jelang akhir tahun.',
      prod: {}, price: { cengkeh: 1.3 } },
    { id: 'banjir_kalimantan', icon: '🌊', name: 'Banjir di Kalimantan', months: [11, 12, 1, 2, 3], weight: 2,
      desc: 'Sungai meluap, angkutan tambang dan kebun terhambat. Produksi Kalimantan turun.',
      prod: { region: { kalimantan: 0.55 } }, price: { batubara: 1.1 } },
    { id: 'karhutla', icon: '🔥', name: 'Kebakaran lahan dan kabut asap', months: [8, 9, 10], weight: 2,
      desc: 'Kemarau memicu kebakaran lahan. Panen sawit merosot.',
      prod: { commodity: { sawit: 0.8 } }, price: { sawit: 1.15 } },
    { id: 'ekspor_sawit', icon: '📈', name: 'Permintaan minyak sawit dunia melonjak', months: null, weight: 2,
      desc: 'Pembeli luar negeri memborong minyak sawit.',
      prod: {}, price: { sawit: 1.35 } },
    { id: 'batubara_anjlok', icon: '📉', name: 'Harga batubara dunia anjlok', months: null, weight: 2,
      desc: 'Permintaan pembangkit listrik melemah.',
      prod: {}, price: { batubara: 0.75 } }
  ];
})((window.NT = window.NT || {}));
