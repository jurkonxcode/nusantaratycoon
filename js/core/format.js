/* Pemformat angka dan waktu (format Indonesia). Tidak menyentuh DOM. */
(function (NT) {
  function num(n, decimals) {
    return new Intl.NumberFormat('id-ID', {
      maximumFractionDigits: decimals || 0,
      minimumFractionDigits: 0
    }).format(n);
  }

  function compact(n) {
    const a = Math.abs(n);
    if (a >= 1e12) return num(n / 1e12, 2) + ' T';
    if (a >= 1e9) return num(n / 1e9, 2) + ' M';
    if (a >= 1e6) return num(n / 1e6, 2) + ' jt';
    return num(n, 0);
  }

  NT.fmt = {
    num: num,
    compact: compact,
    // Kas / jumlah uang besar
    money: function (n) { return 'Rp ' + compact(n); },
    // Harga satuan (boleh desimal)
    price: function (n) { return 'Rp ' + num(n, Math.abs(n) < 100 ? 1 : 0); },
    duration: function (ms) {
      const s = Math.max(0, Math.round(ms / 1000));
      if (s < 60) return s + ' detik';
      const m = Math.floor(s / 60);
      if (m < 60) return m + ' menit';
      const h = Math.floor(m / 60);
      return h + ' jam ' + (m % 60) + ' menit';
    }
  };
})((window.NT = window.NT || {}));
