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

  function now() { return Date.now(); }

  /* ---------- Simpan ---------- */

  function persist() {
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

  const actions = {
    tab: function (el) {
      P.view.tab = el.getAttribute('data-id');
      return { silent: true };
    },

    'collect-all': function () {
      const res = E.collectAll(state, now());
      if (res.ok) res.message = 'Terkumpul: ' + describeItems(res.items);
      return res;
    },

    collect: function (el) {
      const res = E.collect(state, el.getAttribute('data-id'), now());
      if (res.ok) res.message = '+' + F.num(res.amount) + ' ' + NT.data.commodities[res.commodity].name;
      return res;
    },

    'upgrade-building': function (el) {
      const res = E.upgradeBuilding(state, el.getAttribute('data-id'), now());
      if (res.ok) res.message = (res.built ? 'Dibangun!' : 'Naik ke level ' + res.level + '!');
      return res;
    },

    'upgrade-infra': function (el) {
      const res = E.upgradeInfra(state, el.getAttribute('data-region'), el.getAttribute('data-id'), now());
      if (res.ok) res.message = 'Infrastruktur naik ke level ' + res.level + '!';
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
      }
      return res;
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
      storage.reset().then(persist);
      return { ok: true, message: 'Game dimulai ulang.' };
    }
  };

  function handle(name, el) {
    const fn = actions[name];
    if (!fn) return;
    const res = fn(el);
    if (!res.silent) {
      if (res.ok) {
        if (res.message) toast(res.message, 'ok');
        persistSoon();
      } else {
        toast(res.reason, 'warn');
      }
    }
    P.renderAll(state, now());
  }

  function selectRegion(id) {
    P.view.region = id;
    P.renderAll(state, now());
  }

  function bindEvents() {
    document.addEventListener('click', function (e) {
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
      toast('Gagal memuat data tersimpan: ' + e.message, 'warn');
    }

    const t = now();
    state = NT.state.normalize(saved, t);

    NT.ui.map.mount();
    bindEvents();
    P.renderAll(state, t);

    // Sambutan kembali bila pemain pergi cukup lama.
    if (saved) {
      const away = t - Math.min.apply(null, Object.keys(state.buildings).map(function (id) {
        return state.buildings[id].lastCollected;
      }));
      if (away > 2 * 60000) {
        toast('Selamat datang kembali! ' + F.duration(away) + ' berlalu, hasil bumi menunggu di kebunmu.', 'ok');
      }
    }

    setInterval(function () { P.tick(state, now()); }, 1000);
    setInterval(persist, NT.config.autosaveMs);
  }

  start();
})((window.NT = window.NT || {}));
