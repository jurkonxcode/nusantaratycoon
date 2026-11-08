/*
 * Panduan awal dan pencapaian. Murni logika (tanpa DOM), hanya membaca state.
 * Syarat diturunkan dari state + statistik, jadi save lama (tanpa statistik) tetap benar.
 */
(function (NT) {
  const D = NT.data;
  const E = NT.economy;

  function sumLevels(state) {
    return Object.keys(state.buildings).reduce(function (a, id) { return a + state.buildings[id].level; }, 0);
  }
  function openRegions(state) {
    return Object.keys(state.regions).filter(function (id) { return state.regions[id].unlocked && !D.regions[id].start; }).length;
  }
  function playable(state) {
    return Object.keys(state.regions).filter(function (id) { return !D.regions[id].comingSoon; });
  }
  function maxInfra(state, infraId) {
    return Object.keys(state.regions).reduce(function (m, id) { return Math.max(m, state.regions[id].infra[infraId] || 0); }, 0);
  }
  function rankMin(name) { return D.ranks.filter(function (r) { return r.name === name; })[0].min; }
  function st(state, k) { return (state.stats && state.stats[k]) || 0; }

  /* ---------- Panduan awal: 5 langkah ---------- */

  const STEPS = [
    { id: 'collect', icon: '📦', title: 'Kumpulkan hasil panen',
      hint: 'Ketuk tombol “Kumpulkan semua hasil” di bawah peta.',
      done: function (s) { return st(s, 'collects') > 0 || s.totalEarned > 0; } },
    { id: 'sell', icon: '⚖️', title: 'Jual hasil di tab Pasar',
      hint: 'Buka tab Pasar, lalu ketuk “Jual semua” pada padi.',
      done: function (s) { return st(s, 'sales') > 0 || s.totalEarned > 0; } },
    { id: 'upgrade', icon: '⬆️', title: 'Naikkan level Sawah',
      hint: 'Pilih Jawa di peta, lalu ketuk tombol ⬆ pada Sawah.',
      done: function (s) {
        return st(s, 'upgrades') > 0 || sumLevels(s) > 1 || s.jobs.some(function (j) { return j.kind === 'building' && j.from > 0; });
      } },
    { id: 'build', icon: '🔨', title: 'Bangun bangunan baru',
      hint: 'Bangun Sentra Batik di Jawa untuk komoditas kedua.',
      done: function (s) {
        return st(s, 'builds') > 0 || Object.keys(s.buildings).length > 1 || s.jobs.some(function (j) { return j.kind === 'building' && j.from === 0; });
      } },
    { id: 'unlock', icon: '🔓', title: 'Buka wilayah baru',
      hint: 'Pilih Sumatra di peta dan ketuk “Buka wilayah”.',
      done: function (s) { return st(s, 'unlocks') > 0 || openRegions(s) > 0; } }
  ];

  function guide(state) {
    const steps = STEPS.map(function (x) { return { id: x.id, icon: x.icon, title: x.title, hint: x.hint, done: !!x.done(state) }; });
    const doneCount = steps.filter(function (x) { return x.done; }).length;
    const current = steps.filter(function (x) { return !x.done; })[0] || null;
    return { steps: steps, done: doneCount, total: steps.length, current: current, complete: doneCount === steps.length };
  }

  /* ---------- Pencapaian ---------- */

  const LIST = [
    { id: 'panen', icon: '🌾', name: 'Panen Pertama', desc: 'Kumpulkan hasil panen pertamamu.',
      test: function (s) { return st(s, 'collects') > 0; } },
    { id: 'dagang', icon: '🤝', name: 'Dagang Pertama', desc: 'Jual barang untuk pertama kali.',
      test: function (s) { return st(s, 'sales') > 0; } },
    { id: 'lulus', icon: '🎓', name: 'Lulus Panduan', desc: 'Selesaikan kelima langkah panduan awal.',
      test: function (s) { return guide(s).complete; } },
    { id: 'juragan', icon: '💰', name: 'Juragan Kecil', desc: 'Total pendapatan mencapai Rp 1.000.',
      test: function (s) { return s.totalEarned >= 1000; } },
    { id: 'saudagar', icon: '🪙', name: 'Saudagar', desc: 'Total pendapatan mencapai Rp 25.000.',
      test: function (s) { return s.totalEarned >= 25000; } },
    { id: 'konglomerat', icon: '👑', name: 'Konglomerat Nusantara', desc: 'Total pendapatan mencapai Rp 250.000.',
      test: function (s) { return s.totalEarned >= 250000; } },
    { id: 'lumbung', icon: '🧺', name: 'Lumbung Besar', desc: 'Kumpulkan 1.000 satuan hasil.',
      test: function (s) { return st(s, 'produced') >= 1000; } },
    { id: 'gudang', icon: '🏭', name: 'Gudang Raksasa', desc: 'Kumpulkan 25.000 satuan hasil.',
      test: function (s) { return st(s, 'produced') >= 25000; } },
    { id: 'besar', icon: '💎', name: 'Penjualan Besar', desc: 'Satu kali jual menghasilkan Rp 1.000 atau lebih.',
      test: function (s) { return st(s, 'bestSale') >= 1000; } },
    { id: 'mandor', icon: '🔨', name: 'Mandor Andal', desc: 'Bangun atau naikkan level 10 kali.',
      test: function (s) { return st(s, 'builds') + st(s, 'upgrades') >= 10; } },
    { id: 'arsitek', icon: '📐', name: 'Arsitek Nusantara', desc: 'Bangun atau naikkan level 40 kali.',
      test: function (s) { return st(s, 'builds') + st(s, 'upgrades') >= 40; } },
    { id: 'jelajah', icon: '🧭', name: 'Penjelajah', desc: 'Buka wilayah pertama selain Jawa.',
      test: function (s) { return openRegions(s) >= 1; } },
    { id: 'semua', icon: '🏝️', name: 'Tiga Pulau', desc: 'Buka semua wilayah yang tersedia.',
      test: function (s) { return playable(s).every(function (id) { return s.regions[id].unlocked; }); } },
    { id: 'tol', icon: '🛣️', name: 'Jalan Mulus', desc: 'Bangun jalan tol pertamamu.',
      test: function (s) { return maxInfra(s, 'tol') >= 1; } },
    { id: 'pelabuhan', icon: '⚓', name: 'Pelaut Handal', desc: 'Bangun pelabuhan pertamamu.',
      test: function (s) { return maxInfra(s, 'pelabuhan') >= 1; } },
    { id: 'maks', icon: '🏗️', name: 'Infrastruktur Maksimal', desc: 'Capai level maksimum pada satu infrastruktur.',
      test: function (s) {
        return Object.keys(D.infra).some(function (iid) { return maxInfra(s, iid) >= D.infra[iid].maxLevel; });
      } },
    { id: 'kota', icon: '🏘️', name: 'Kota Dagang', desc: 'Capai gelar Kota Dagang.',
      test: function (s) { return E.rank(E.score(s)).current.min >= rankMin('Kota Dagang'); } },
    { id: 'provinsi', icon: '🏛️', name: 'Provinsi Makmur', desc: 'Capai gelar Provinsi Makmur.',
      test: function (s) { return E.rank(E.score(s)).current.min >= rankMin('Provinsi Makmur'); } },
    { id: 'setia', icon: '⏳', name: 'Pemain Setia', desc: 'Bermain selama 1 jam (waktu layar terbuka).',
      test: function (s) { return st(s, 'playMs') >= 3600000; } }
  ];

  // Tandai pencapaian yang baru terpenuhi; mengembalikan daftar yang baru terbuka.
  function evaluate(state, now) {
    if (!state.achievements) state.achievements = {};
    const fresh = [];
    LIST.forEach(function (a) {
      if (state.achievements[a.id]) return;
      if (a.test(state)) { state.achievements[a.id] = now; fresh.push(a); }
    });
    return fresh;
  }

  NT.achievements = { list: LIST, evaluate: evaluate, guide: guide, STEPS: STEPS };
})((window.NT = window.NT || {}));
