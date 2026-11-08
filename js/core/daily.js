/*
 * Misi harian dan hadiah login. Murni logika (tanpa DOM). Hari berganti pukul 00.00 WIB.
 * Hadiah berupa kas (tidak masuk totalEarned, supaya panduan awal dan skor tidak terdorong),
 * dan besarnya ikut pemasukan pemain: satuan hadiah dikunci saat hari berganti.
 * Kemajuan misi = selisih statistik sekarang dengan foto statistik saat hari dimulai (daily.base).
 */
(function (NT) {
  const D = NT.data;
  const WIB_MS = 7 * 3600 * 1000;

  function C() { return NT.config.daily; }
  function dayKey(now) { return new Date(now + WIB_MS).toISOString().slice(0, 10); }
  function prevDay(now) { return dayKey(now - 86400000); }
  function st(s, k) { return (s.stats && s.stats[k]) || 0; }
  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  // Bulatkan ke 2 angka penting supaya angka hadiah enak dibaca.
  function nice(v) { if (v < 100) return Math.round(v); const p = Math.pow(10, Math.floor(Math.log10(v)) - 1); return Math.round(v / p) * p; }
  function hasPort(s) {
    return Object.keys(s.regions).some(function (id) { return s.regions[id].unlocked && (s.regions[id].infra.pelabuhan || 0) >= 1; });
  }
  function income(s, now) { return NT.economy.incomePerMin(s, now) + (NT.population ? NT.population.taxPerMin(s) : 0); }

  // Ukuran yang dilacak untuk misi.
  const METRICS = {
    collects: function (s) { return st(s, 'collects'); },
    sales: function (s) { return st(s, 'sales'); },
    work: function (s) { return st(s, 'builds') + st(s, 'upgrades'); },
    exports: function (s) { return st(s, 'exports'); },
    earned: function (s) { return s.totalEarned || 0; }
  };
  function snapshot(s) { const o = {}; Object.keys(METRICS).forEach(function (k) { o[k] = METRICS[k](s); }); return o; }

  // Jenis misi. target(state, unit): jumlah yang harus dicapai. ok(state): boleh dipilih hari ini.
  const POOL = [
    { id: 'collect', icon: '📦', metric: 'collects', target: function () { return 6; },
      text: function (n) { return 'Kumpulkan hasil panen ' + n + ' kali'; } },
    { id: 'sell', icon: '⚖️', metric: 'sales', target: function () { return 4; },
      text: function (n) { return 'Jual barang ' + n + ' kali'; } },
    { id: 'work', icon: '🔨', metric: 'work', target: function () { return 2; },
      text: function (n) { return 'Bangun atau naikkan level ' + n + ' kali'; } },
    { id: 'earn', icon: '💰', metric: 'earned', target: function (s, now) { return Math.max(C().earnMin, nice(income(s, now) * C().earnMinutes)); },
      text: function (n) { return 'Hasilkan Rp ' + Math.round(n).toLocaleString('id-ID') + ' dari penjualan'; } },
    { id: 'export', icon: '🚢', metric: 'exports', target: function () { return 1; }, ok: hasPort,
      text: function (n) { return 'Kirim ' + n + ' ekspor ke luar negeri'; } }
  ];
  function def(id) { return POOL.filter(function (m) { return m.id === id; })[0]; }

  // Pilih misi hari itu secara deterministik dari kunci hari (urutan acak tetap per hari).
  function pickMissions(s, day) {
    const avail = POOL.filter(function (m) { return !m.ok || m.ok(s); });
    const order = avail.map(function (m) { return { id: m.id, k: hash(day + ':' + m.id) }; })
      .sort(function (a, b) { return a.k - b.k; });
    return order.slice(0, C().missionCount).map(function (o) { return o.id; });
  }

  // Ganti hari bila perlu. Mengembalikan true bila ada perubahan (perlu simpan dan gambar ulang).
  function sync(s, now) {
    if (!C().enabled) return false;
    const d = s.daily, day = dayKey(now);
    if (d.day === day) return false;
    d.day = day;
    d.base = snapshot(s);
    d.picks = pickMissions(s, day);
    d.targets = {};
    d.picks.forEach(function (id) { d.targets[id] = def(id).target(s, now); });
    d.seen = []; d.claimed = []; d.bonus = false;
    d.unit = Math.max(C().unitMin, nice(income(s, now) * C().unitMinutes));
    return true;
  }

  // Hari ke berapa (1-7) dalam rangkaian login bila diambil sekarang, dan rangkaian yang berlaku.
  function loginInfo(s, now) {
    const d = s.daily, day = dayKey(now);
    const claimedToday = d.lastClaim === day;
    const alive = d.lastClaim === day || d.lastClaim === prevDay(now);
    const streak = alive ? d.streak : 0;
    const next = claimedToday ? streak : streak + 1;
    const idx = ((Math.max(1, next) - 1) % 7);
    return { claimedToday: claimedToday, streak: streak, dayInCycle: idx + 1, reward: Math.round(d.unit * C().loginUnits[idx]) };
  }

  // Tampilan lengkap untuk UI. Target dikunci di d.targets saat hari berganti supaya tidak bergeser.
  function view(s, now) {
    const d = s.daily;
    if (!d.day) return null;
    const list = d.picks.map(function (id) {
      const m = def(id);
      const target = d.targets && d.targets[id] ? d.targets[id] : m.target(s, now);
      const have = Math.max(0, METRICS[m.metric](s) - (d.base[m.metric] || 0));
      const done = have >= target;
      return { id: id, icon: m.icon, text: m.text(target), have: Math.min(have, target), target: target, pct: Math.min(100, have / target * 100),
        done: done, claimed: d.claimed.indexOf(id) >= 0, reward: d.unit };
    });
    const allClaimed = list.length > 0 && list.every(function (x) { return x.claimed; });
    const li = loginInfo(s, now);
    const ready = list.filter(function (x) { return x.done && !x.claimed; }).length + (li.claimedToday ? 0 : 1) + (allClaimed && !d.bonus ? 1 : 0);
    return { missions: list, doneCount: list.filter(function (x) { return x.done; }).length, allClaimed: allClaimed,
      bonus: { claimed: d.bonus, ready: allClaimed && !d.bonus, reward: d.unit * C().bonusUnits },
      login: li, ready: ready, best: d.best };
  }

  function pay(s, amount) { s.cash += amount; return amount; }

  function claim(s, id, now) {
    sync(s, now);
    const d = s.daily;
    if (id === 'login') {
      const li = loginInfo(s, now);
      if (li.claimedToday) return { ok: false, reason: 'Hadiah login hari ini sudah diambil.' };
      d.streak = li.streak + 1;
      d.best = Math.max(d.best, d.streak);
      d.lastClaim = d.day;
      pay(s, li.reward);
      return { ok: true, amount: li.reward, message: '🎁 Hadiah login hari ke-' + li.dayInCycle + ': +Rp ' + li.reward.toLocaleString('id-ID') };
    }
    if (id === 'bonus') {
      const v = view(s, now);
      if (d.bonus) return { ok: false, reason: 'Bonus sudah diambil.' };
      if (!v.allClaimed) return { ok: false, reason: 'Ambil dulu hadiah ketiga misi.' };
      d.bonus = true;
      const amt = Math.round(v.bonus.reward);
      pay(s, amt);
      return { ok: true, amount: amt, message: '🎉 Bonus semua misi: +Rp ' + amt.toLocaleString('id-ID') };
    }
    const row = view(s, now).missions.filter(function (x) { return x.id === id; })[0];
    if (!row) return { ok: false, reason: 'Misi tidak ditemukan.' };
    if (row.claimed) return { ok: false, reason: 'Hadiah misi ini sudah diambil.' };
    if (!row.done) return { ok: false, reason: 'Misi belum selesai.' };
    d.claimed.push(id);
    d.total += 1;
    pay(s, row.reward);
    return { ok: true, amount: row.reward, message: '✅ Misi selesai: +Rp ' + row.reward.toLocaleString('id-ID') };
  }

  // Misi yang baru selesai tetapi belum pernah diberitahukan (untuk toast).
  function fresh(s, now) {
    const v = view(s, now);
    if (!v) return [];
    const out = v.missions.filter(function (x) { return x.done && s.daily.seen.indexOf(x.id) < 0; });
    out.forEach(function (x) { s.daily.seen.push(x.id); });
    return out;
  }

  NT.daily = { dayKey: dayKey, sync: sync, view: view, claim: claim, fresh: fresh, loginInfo: loginInfo, POOL: POOL };
})((window.NT = window.NT || {}));
