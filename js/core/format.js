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
    // Singkat: 19 dtk, 3m 20d, 1j 5m
    short: function (ms) {
      const s = Math.max(0, Math.round(ms / 1000));
      if (s < 60) return s + ' dtk';
      const m = Math.floor(s / 60);
      if (m < 60) return m + 'm ' + (s % 60) + 'd';
      return Math.floor(m / 60) + 'j ' + (m % 60) + 'm';
    },
    // Hitung mundur: 01:05 atau 1:02:03
    clock: function (ms) {
      const s = Math.max(0, Math.ceil(ms / 1000));
      const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
      const p = function (n) { return (n < 10 ? '0' : '') + n; };
      return h ? h + ':' + p(m) + ':' + p(sec) : p(m) + ':' + p(sec);
    },
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
