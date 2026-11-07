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

  function now() { return Date.now(); }

  /* ---------- Simpan ---------- */

  function persist() {
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
    mute: function () { NT.ui.fx.toggleMute(); return { silent: true }; },

    speedup: function (el) {
      const res = E.speedup(state, el.getAttribute('data-key'), now());
      if (res.ok) { res.message = '⚡ Selesai seketika!'; res.sfx = 'done'; }
      return res;
    },

    tab: function (el) {
      P.view.tab = el.getAttribute('data-id');
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

    'market-region': function (el) {
      P.view.market = el.getAttribute('data-id');
      return { silent: true };
    },

    reset: function () {
      if (!window.confirm('Mulai ulang dari awal? Semua kemajuan akan hilang.')) return { silent: true };
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

  function selectRegion(id) {
    P.view.region = id;
    P.renderAll(state, now());
    NT.ui.map.focus(id);
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
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const island = e.target.closest && e.target.closest('.island');
      if (island) { e.preventDefault(); selectRegion(island.getAttribute('data-region')); }
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) persist();
    });
    window.addEventListener('pagehide', persist);
  }

  /* ---------- Mulai ---------- */

  async function start() {
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

    NT.ui.map.mount();
    bindEvents();
    P.renderAll(state, t);

    if (finishedAway.length) celebrate(finishedAway, true);

    // Sambutan kembali bila pemain pergi cukup lama.
    if (saved) {
      const away = t - Math.min.apply(null, Object.keys(state.buildings).map(function (id) {
        return state.buildings[id].lastCollected;
      }));
      if (away > 2 * 60000) {
        toast('Selamat datang kembali! ' + F.duration(away) + ' berlalu, hasil bumi menunggu di kebunmu.', 'ok');
      }
    }

    setInterval(function () {
      const t2 = now();
      const done = E.settle(state, t2);
      if (done.length) { celebrate(done); P.renderAll(state, t2); persistSoon(); } else { P.tick(state, t2); }
    }, 1000);
    setInterval(persist, NT.config.autosaveMs);
  }

  start();
})((window.NT = window.NT || {}));
