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
  const COST_ACTIONS = { 'upgrade-building': 1, 'upgrade-infra': 1, unlock: 1, speedup: 1, cheapest: 1 };
  // Aksi yang dicatat di log aktivitas (ikon di depan pesan toast-nya).
  const LOG_ICONS = { sell: '💰', 'sell-everything': '💰', 'upgrade-building': '🔨', 'upgrade-infra': '🛣️', cheapest: '🔨', unlock: '🔓', speedup: '⚡' };

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

  /* ---------- Log dan pencapaian ---------- */

  function logEvent(icon, text) {
    if (!state.log) state.log = [];
    state.log.push({ t: now(), i: icon, x: text });
    while (state.log.length > NT.state.LOG_MAX) state.log.shift();
  }

  // Cek pencapaian dan panduan; true bila ada yang baru (perlu simpan dan gambar ulang).
  function checkProgress(quiet) {
    const fresh = NT.achievements.evaluate(state, now());
    let changed = fresh.length > 0;
    if (quiet && fresh.length > 1) {
      toast('🏆 ' + fresh.length + ' pencapaian terbuka dari kemajuanmu. Lihat di tab Capaian.', 'info');
    } else {
      fresh.forEach(function (a) { toast('🏆 Pencapaian: ' + a.name + '!', 'ok'); });
    }
    fresh.forEach(function (a) { logEvent('🏆', 'Pencapaian: ' + a.name); });
    if (fresh.length && !quiet) NT.ui.fx.sfx('done');
    if (!state.guideHidden && NT.achievements.guide(state).complete) {
      state.guideHidden = true;
      changed = true;
      if (!quiet) toast('🎓 Panduan awal selesai. Selamat!', 'ok');
    }
    return changed;
  }

  function celebrate(done, offline) {
    done.forEach(function (j) {
      const name = j.kind === 'building' ? NT.data.buildings[j.id].name
        : NT.data.infra[j.id].name + ' ' + NT.data.regions[j.region].name;
      const msg = name + (j.kind === 'building' && j.from === 0 ? ' selesai dibangun!' : ' naik ke Lv ' + j.to + '!');
      toast('✅ ' + msg, 'ok');
      logEvent('✅', msg);
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

    'banner-toggle': function (el) { el.classList.toggle('open'); return { silent: true, skipRender: true }; },
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
        if (res.queued) {
          res.message = '🚚 ' + F.num(res.qty) + ' ' + NT.data.commodities[cid].name + ' dikirim ke ' + NT.data.regions[market].name +
            ' · tiba dalam ' + F.short(res.durationMs) + ' (+' + F.money(res.net) + ')';
          res.sfx = 'click';
        } else {
          res.message = 'Terjual ' + F.num(res.qty) + ' ' + NT.data.commodities[cid].name +
            ' di ' + NT.data.regions[market].name + ': +' + F.money(res.net);
          res.fx = '+' + F.money(res.net); res.fxClass = 'gold'; res.sfx = 'coin';
        }
      }
      return res;
    },

    'ship-export': function (el) {
      const cid = el.getAttribute('data-c'), mid = el.getAttribute('data-x');
      const have = Math.floor(state.inventory[cid] || 0);
      const qty = Math.min(have, Math.max(1, E.exportMaxQty(state, cid)));
      const res = E.exportGoods(state, cid, mid, qty, now());
      if (res.ok) {
        res.message = '🚢 ' + F.num(res.qty) + ' ' + NT.data.commodities[cid].name + ' berlayar ke ' + NT.data.exportMarkets[mid].name +
          ' · tiba dalam ' + F.short(res.durationMs) + ' (+' + F.money(res.net) + ')' +
          (res.dmoQty ? ' · ' + F.num(res.dmoQty) + ' wajib dalam negeri (+' + F.money(res.dmoNet) + ')' : '');
        res.sfx = 'click';
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
        const tail = res.skipped.length ? ' (' + res.skipped.length + ' jenis dilewati: rugi atau kapal penuh)' : '';
        if (res.queued) {
          res.message = '🚚 ' + F.num(res.qty) + ' barang dikirim ke ' + NT.data.regions[market].name + ' · tiba dalam ' + F.short(res.durationMs) +
            ' (+' + F.money(res.net) + ')' + tail;
          res.sfx = 'click';
        } else {
          res.message = 'Terjual ' + F.num(res.qty) + ' barang di ' + NT.data.regions[market].name + ': +' + F.money(res.net) + tail;
          res.fx = '+' + F.money(res.net); res.fxClass = 'gold'; res.sfx = 'coin';
        }
      }
      return res;
    },

    cheapest: function () {
      const c = E.cheapestUpgrade(state);
      if (!c) return { ok: false, reason: 'Semua upgrade sudah level maksimum.' };
      const res = c.kind === 'building' ? E.upgradeBuilding(state, c.id, now()) : E.upgradeInfra(state, c.region, c.id, now());
      if (res.ok) {
        res.message = '🔨 ' + c.label + (res.queued ? ' · selesai dalam ' + F.short(res.durationMs) : ' selesai!');
        res.sfx = 'start';
      }
      return res;
    },

    term: function (el) {
      const text = P.glossary[el.getAttribute('data-term')];
      if (text) toast(text, 'info');
      return { silent: true, skipRender: true };
    },

    'guide-toggle': function () { P.view.guideOpen = !P.view.guideOpen; return { silent: true }; },
    'guide-hide': function () { state.guideHidden = true; P.view.guideOpen = false; persistSoon(); return { silent: true }; },
    'guide-show': function () {
      state.guideHidden = false;
      P.view.guideOpen = true;
      P.view.tab = 'map';
      persistSoon();
      return { silent: true };
    },

    'info-cash': function () { NT.ui.infobox.show('cash', state, now()); return { silent: true, skipRender: true }; },
    'info-pop': function () { NT.ui.infobox.show('pop', state, now()); return { silent: true, skipRender: true }; },

    'goods-toggle': function (el) {
      const cid = el.getAttribute('data-c');
      P.view.goodsOpen[cid] = !P.view.goodsOpen[cid];
      return { silent: true };
    },
    'export-toggle': function () { P.view.exportOpen = !P.view.exportOpen; return { silent: true }; },

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
      P.view.guideOpen = false;
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
        if (LOG_ICONS[name] && res.message) logEvent(LOG_ICONS[name], res.message.replace(/^🔨\s*/, ''));
        if (res.fx) NT.ui.fx.floatFromRect(rect, res.fx, res.fxClass);
        if (res.sfx === 'done') NT.ui.fx.confetti(window.innerWidth / 2, window.innerHeight * 0.35);
        NT.ui.fx.sfx(res.sfx || 'click');
        persistSoon();
      } else {
        toast(res.reason, 'warn');
        NT.ui.fx.sfx('error');
      }
    }
    if (!res.silent && res.ok && checkProgress(false)) persistSoon();
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
      if (island) { e.preventDefault(); selectRegion(island.getAttribute('data-region')); return; }
      const ts = e.target.closest && e.target.closest('.term-stat');
      if (ts) { e.preventDefault(); handle(ts.getAttribute('data-action') || 'term', ts); }
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
      E.settleShipments(state, t);
      const taxBack = NT.population.settle(state, t);
      if (taxBack >= 1) toast('💼 Pajak penduduk selama kamu pergi: +' + F.money(taxBack), 'ok');
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
    E.settleShipments(state, t);              // kiriman yang tiba saat pemain pergi
    const taxAway = NT.population.settle(state, t);   // pajak penduduk selama pemain pergi
    if (lastSeen && taxAway >= 1 && t - lastSeen > AWAY_MS) toast('💼 Pajak penduduk selama kamu pergi: +' + F.money(taxAway), 'ok');

    NT.ui.settings.apply();
    NT.ui.map.mount();
    bindEvents();
    bindSheet();
    P.renderAll(state, t);

    // Layar sambutan bila pemain pergi cukup lama; bila tidak, cukup toast untuk pembangunan yang selesai.
    const away = lastSeen ? t - lastSeen : 0;
    const welcomed = saved && away > AWAY_MS && NT.ui.welcome.show(state, away, finishedAway, t);
    if (!welcomed && finishedAway.length) celebrate(finishedAway, true);
    if (checkProgress(true)) { persistSoon(); P.renderAll(state, t); }
    touchSeen();

    setInterval(function () {
      const t2 = now();
      if (!document.hidden) state.stats.playMs += 1000;
      const done = E.settle(state, t2);
      const arrived = E.settleShipments(state, t2);
      NT.population.settle(state, t2);
      if (arrived.length) {
        const sum = arrived.reduce(function (a, x) { return a + x.net; }, 0);
        toast((arrived[0].kind === 'export' ? '🚢 ' : '🚚 ') + arrived.length + ' kiriman tiba: +' + F.money(sum), 'ok');
        if (NT.ui.fx && NT.ui.fx.sfx) NT.ui.fx.sfx('coin');
        persistSoon();
      }
      const gained = checkProgress(false);
      if (done.length || gained || arrived.length) { if (done.length) celebrate(done); P.renderAll(state, t2); persistSoon(); } else { P.tick(state, t2); }
    }, 1000);
    setInterval(persist, NT.config.autosaveMs);
  }

  start();
})((window.NT = window.NT || {}));
