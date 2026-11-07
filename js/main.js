/* Titik masuk: memuat data, menyambungkan aksi pemain, menjalankan loop. */
(function (NT) {
  const E = NT.economy;
  const F = NT.fmt;
  const P = NT.ui.panels;
  const toast = NT.ui.toast;

  let state = null;
  let storage = null;
  let saveTimer = null;
  let saveErrorShown = false;
  // Jika memuat gagal, jangan menyimpan agar progres cloud tidak tertimpa.
  let loadFailed = false;

  const AWAY_MS = 2 * 60000;   // pergi lebih lama dari ini = tampilkan layar sambutan
  const SEEN_KEY = 'nt-lastseen';
  const COST_ACTIONS = { 'upgrade-building': 1, 'upgrade-infra': 1, unlock: 1, speedup: 1 };

  function now() { return Date.now(); }

  function readSeen() { try { return Number(localStorage.getItem(SEEN_KEY)) || 0; } catch (e) { return 0; } }
  function touchSeen() { try { localStorage.setItem(SEEN_KEY, String(now())); } catch (e) { /* abaikan */ } }

  /* ---------- Simpan ---------- */

  function persist() {
    touchSeen();
    if (loadFailed) return Promise.resolve();
    return storage.save(state).then(function (ok) {
      if (ok === false && !saveErrorShown) {
        saveErrorShown = true;
        toast('Gagal menyimpan. Kemajuan mungkin hilang bila halaman ditutup.', 'warn');
      }
    }).catch(function (e) {
      if (!saveErrorShown) {
        saveErrorShown = true;
        toast('Gagal menyimpan: ' + e.message, 'warn');
      }
    });
  }

  function persistSoon() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 400);
  }

  /* ---------- Aksi pemain ---------- */

  function describeItems(items) {
    return Object.keys(items).map(function (cid) {
      return F.num(items[cid]) + ' ' + NT.data.commodities[cid].name;
    }).join(', ');
  }

  function celebrate(done, offline) {
    done.forEach(function (j) {
      const name = j.kind === 'building' ? NT.data.buildings[j.id].name
        : NT.data.infra[j.id].name + ' ' + NT.data.regions[j.region].name;
      toast('✅ ' + name + (j.kind === 'building' && j.from === 0 ? ' selesai dibangun!' : ' naik ke Lv ' + j.to + '!'), 'ok');
    });
    NT.ui.fx.sfx('done');
    if (!offline) NT.ui.fx.confetti(window.innerWidth / 2, window.innerHeight * 0.35);
  }

  const actions = {
    setting: function (el) {
      if (NT.ui.settings.set(el.getAttribute('data-key'), el.getAttribute('data-value'))) NT.ui.fx.sfx('click');
      return { silent: true };
    },

    export: function () {
      const data = JSON.stringify({ game: 'nusantara-tycoon', exportedAt: new Date().toISOString(), state: state }, null, 2);
      const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'nusantara-tycoon-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      return { ok: true, message: 'Cadangan disimpan ke file.', sfx: 'coin' };
    },

    'reset-ask': function () { P.view.resetArmed = true; return { silent: true }; },
    'reset-cancel': function () { P.view.resetArmed = false; return { silent: true }; },

    speedup: function (el) {
      const res = E.speedup(state, el.getAttribute('data-key'), now());
      if (res.ok) { res.message = '⚡ Selesai seketika!'; res.sfx = 'done'; }
      return res;
    },

    tab: function (el) {
      P.view.tab = el.getAttribute('data-id');
      P.view.resetArmed = false;
      return { silent: true };
    },

    'collect-all': function () {
      const res = E.collectAll(state, now());
      if (res.ok) { res.message = 'Terkumpul: ' + describeItems(res.items); res.fx = '+' + F.num(res.total) + ' 📦'; res.sfx = 'coin'; }
      return res;
    },

    collect: function (el) {
      const res = E.collect(state, el.getAttribute('data-id'), now());
      if (res.ok) { res.message = '+' + F.num(res.amount) + ' ' + NT.data.commodities[res.commodity].name; res.fx = '+' + F.num(res.amount) + ' ' + NT.data.commodities[res.commodity].icon; res.sfx = 'coin'; }
      return res;
    },

    'upgrade-building': function (el) {
      const res = E.upgradeBuilding(state, el.getAttribute('data-id'), now());
      if (res.ok) {
        res.message = res.queued ? '🔨 ' + (res.built ? 'Mulai dibangun' : 'Upgrade dimulai') + ' · selesai dalam ' + F.short(res.durationMs)
          : (res.built ? 'Dibangun!' : 'Naik ke level ' + res.level + '!');
        res.sfx = 'start';
      }
      return res;
    },

    'upgrade-infra': function (el) {
      const res = E.upgradeInfra(state, el.getAttribute('data-region'), el.getAttribute('data-id'), now());
      if (res.ok) {
        res.message = res.queued ? '🔨 Pembangunan dimulai · selesai dalam ' + F.short(res.durationMs) : 'Infrastruktur naik ke level ' + res.level + '!';
        res.sfx = 'start';
      }
      return res;
    },

    unlock: function (el) {
      const id = el.getAttribute('data-id');
      const res = E.unlockRegion(state, id);
      if (res.ok) res.message = NT.data.regions[id].name + ' terbuka! Pasar baru tersedia.';
      return res;
    },

    sell: function (el) {
      const cid = el.getAttribute('data-c');
      const q = el.getAttribute('data-qty');
      const qty = q === 'all' ? (state.inventory[cid] || 0) : Number(q);
      const market = P.view.market;
      const res = E.sell(state, cid, market, qty, now());
      if (res.ok) {
        res.message = 'Terjual ' + F.num(res.qty) + ' ' + NT.data.commodities[cid].name +
          ' di ' + NT.data.regions[market].name + ': +' + F.money(res.net);
        res.fx = '+' + F.money(res.net); res.fxClass = 'gold'; res.sfx = 'coin';
      }
      return res;
    },

    'pick-region': function (el) {
      selectRegion(el.getAttribute('data-id'));
      return { silent: true, skipRender: true };
    },

    'sell-everything': function () {
      const market = P.view.market;
      const res = E.sellAll(state, market, now());
      if (res.ok) {
        res.message = 'Terjual ' + F.num(res.qty) + ' barang di ' + NT.data.regions[market].name + ': +' + F.money(res.net) +
          (res.skipped.length ? ' (' + res.skipped.length + ' jenis dilewati karena rugi)' : '');
        res.fx = '+' + F.money(res.net); res.fxClass = 'gold'; res.sfx = 'coin';
      }
      return res;
    },

    'sheet-close': function () { P.view.sheet = false; return { silent: true }; },

    'market-region': function (el) {
      P.view.market = el.getAttribute('data-id');
      return { silent: true };
    },

    reset: function () {
      if (!P.view.resetArmed) return { silent: true };
      P.view.resetArmed = false;
      try { localStorage.removeItem(SEEN_KEY); } catch (e) { /* abaikan */ }
      state = NT.state.createInitialState(now());
      P.view.region = 'jawa';
      P.view.market = 'jawa';
      P.view.tab = 'map';
      loadFailed = false;
      storage.reset().then(persist);
      return { ok: true, message: 'Game dimulai ulang.' };
    }
  };

  function handle(name, el) {
    const fn = actions[name];
    if (!fn) return;
    const rect = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
    const early = E.settle(state, now()); // pastikan pembangunan yang waktunya habis sudah diterapkan
    if (early.length) celebrate(early);
    if (COST_ACTIONS[name]) {
      const frac = NT.ui.settings.confirmFraction();
      const cost = Number(el.getAttribute('data-cost')) || 0;
      if (frac && cost > 0 && cost >= state.cash * frac &&
          !window.confirm('Keluarkan ' + F.money(cost) + ' (' + Math.round(cost / state.cash * 100) + '% dari kasmu)?')) return;
    }
    const res = fn(el);
    if (!res.silent) {
      if (res.ok) {
        if (res.message) toast(res.message, 'ok');
        if (res.fx) NT.ui.fx.floatFromRect(rect, res.fx, res.fxClass);
        if (res.sfx === 'done') NT.ui.fx.confetti(window.innerWidth / 2, window.innerHeight * 0.35);
        NT.ui.fx.sfx(res.sfx || 'click');
        persistSoon();
      } else {
        toast(res.reason, 'warn');
        NT.ui.fx.sfx('error');
      }
    }
    if (!res.skipRender) P.renderAll(state, now());
  }

  /* ---------- Impor cadangan ---------- */

  function importFile(file, input) {
    const reader = new FileReader();
    reader.onload = function () {
      input.value = '';
      let obj = null;
      try { obj = JSON.parse(reader.result); } catch (e) { /* ditangani di bawah */ }
      const saved = obj && obj.state ? obj.state : obj;
      if (!saved || typeof saved !== 'object' || !Number.isFinite(Number(saved.cash)) || !saved.buildings || typeof saved.buildings !== 'object') {
        toast('File ini bukan cadangan Nusantara Tycoon yang valid.', 'warn');
        return;
      }
      if (!window.confirm('Timpa kemajuan sekarang dengan isi file ini?')) return;
      state = NT.state.normalize(saved, now());
      loadFailed = false;
      persist();
      P.renderAll(state, now());
      toast('Cadangan dipulihkan.', 'ok');
    };
    reader.onerror = function () { toast('File tidak bisa dibaca.', 'warn'); };
    reader.readAsText(file);
  }

  // Di HP panel wilayah berupa lembar dari bawah; di desktop kelas "open" tidak berpengaruh.
  function selectRegion(id) {
    const wasOpen = P.view.sheet;
    P.view.region = id;
    P.view.sheet = true;
    P.renderAll(state, now());
    NT.ui.map.focus(id);
    if (!wasOpen && window.matchMedia('(max-width: 979px)').matches) {
      const card = document.querySelector('.map-card');
      if (card) card.scrollIntoView({ block: 'start', behavior: document.body.classList.contains('calm') ? 'auto' : 'smooth' });
    }
  }

  // Geser lembar ke bawah untuk menutup.
  function bindSheet() {
    const grab = document.getElementById('sheet-grab');
    const box = document.getElementById('sheet-box');
    if (!grab || !box) return;
    let y0 = null, dy = 0;
    grab.addEventListener('touchstart', function (e) { y0 = e.touches[0].clientY; dy = 0; box.style.transition = 'none'; }, { passive: true });
    grab.addEventListener('touchmove', function (e) {
      if (y0 === null) return;
      dy = Math.max(0, e.touches[0].clientY - y0);
      box.style.transform = 'translateY(' + dy + 'px)';
    }, { passive: true });
    function end() {
      if (y0 === null) return;
      const close = dy > 70;
      y0 = null;
      box.style.transition = '';
      box.style.transform = '';
      if (close) { P.view.sheet = false; P.renderAll(state, now()); }
    }
    grab.addEventListener('touchend', end);
    grab.addEventListener('touchcancel', end);
    grab.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); P.view.sheet = false; P.renderAll(state, now()); }
    });
  }

  function bindEvents() {
    document.addEventListener('click', function (e) {
      const bubble = e.target.closest('.bubble.on');
      if (bubble) { handle('collect', bubble); return; }

      const island = e.target.closest('.island');
      if (island) { selectRegion(island.getAttribute('data-region')); return; }

      const el = e.target.closest('[data-action]');
      if (!el || el.disabled) return;
      handle(el.getAttribute('data-action'), el);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && P.view.sheet) { P.view.sheet = false; P.renderAll(state, now()); return; }
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const island = e.target.closest && e.target.closest('.island');
      if (island) { e.preventDefault(); selectRegion(island.getAttribute('data-region')); }
    });

    document.addEventListener('change', function (e) {
      if (e.target && e.target.id === 'import-file' && e.target.files && e.target.files[0]) importFile(e.target.files[0], e.target);
    });

    // Kembali ke tab setelah lama: tampilkan ringkasan seperti saat membuka game.
    let hiddenAt = 0;
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { hiddenAt = now(); persist(); return; }
      if (!hiddenAt || !state) return;
      const t = now(), away = t - hiddenAt;
      hiddenAt = 0;
      if (away < AWAY_MS) return;
      const done = E.settle(state, t);
      if (!NT.ui.welcome.show(state, away, done, t) && done.length) celebrate(done, true);
      P.renderAll(state, t);
    });
    window.addEventListener('pagehide', persist);
  }

  /* ---------- Mulai ---------- */

  async function start() {
    const lastSeen = readSeen();   // dibaca sebelum apa pun menimpanya
    storage = NT.getStorage();

    let saved = null;
    try {
      saved = await storage.load();
    } catch (e) {
      loadFailed = true;
      toast('Gagal memuat data tersimpan: ' + e.message + '. Progres tidak akan disimpan sampai halaman dimuat ulang.', 'warn');
    }

    const t = now();
    state = NT.state.normalize(saved, t);
    const finishedAway = E.settle(state, t); // pembangunan yang selesai saat pemain pergi

    NT.ui.settings.apply();
    NT.ui.map.mount();
    bindEvents();
    bindSheet();
    P.renderAll(state, t);

    // Layar sambutan bila pemain pergi cukup lama; bila tidak, cukup toast untuk pembangunan yang selesai.
    const away = lastSeen ? t - lastSeen : 0;
    const welcomed = saved && away > AWAY_MS && NT.ui.welcome.show(state, away, finishedAway, t);
    if (!welcomed && finishedAway.length) celebrate(finishedAway, true);
    touchSeen();

    setInterval(function () {
      const t2 = now();
      const done = E.settle(state, t2);
      if (done.length) { celebrate(done); P.renderAll(state, t2); persistSoon(); } else { P.tick(state, t2); }
    }, 1000);
    setInterval(persist, NT.config.autosaveMs);
  }

  start();
})((window.NT = window.NT || {}));
