/*
 * Pengaturan pemain (suara, tampilan, permainan). Disimpan di browser ini saja (localStorage),
 * terpisah dari data game, jadi tidak ikut tersimpan di cloud dan tidak mengubah struktur save.
 */
(function (NT) {
  NT.ui = NT.ui || {};
  const KEY = 'nt-settings';

  // Pilihan untuk tiap pengaturan: [nilai, label]. Urutan = urutan tombol di panel.
  const OPTIONS = {
    volume: [['pelan', 'Pelan'], ['sedang', 'Sedang'], ['keras', 'Keras']],
    textSize: [['normal', 'Normal'], ['large', 'Besar'], ['xlarge', 'Sangat besar']],
    confirm: [['off', 'Mati'], ['half', 'Biaya ≥ 50% kas'], ['most', 'Biaya ≥ 80% kas']]
  };
  const VOLUME = { pelan: 0.4, sedang: 1, keras: 1.8 };
  const CONFIRM_FRAC = { off: 0, half: 0.5, most: 0.8 };

  const DEFAULTS = { sfx: true, volume: 'sedang', textSize: 'normal', calm: false, confirm: 'off', compact: true };
  let cfg = Object.assign({}, DEFAULTS);

  function valid(key, val) {
    if (typeof DEFAULTS[key] === 'boolean') return typeof val === 'boolean';
    return !!OPTIONS[key] && OPTIONS[key].some(function (o) { return o[0] === val; });
  }

  function load() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(KEY)); } catch (e) { /* abaikan */ }
    if (raw && typeof raw === 'object') {
      Object.keys(DEFAULTS).forEach(function (k) { if (valid(k, raw[k])) cfg[k] = raw[k]; });
    } else {
      // Pemain lama: hormati pilihan bisu dari versi sebelumnya.
      try { if (localStorage.getItem('nt-muted') === '1') cfg.sfx = false; } catch (e) { /* abaikan */ }
    }
  }

  function save() { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) { /* abaikan */ } }

  function apply() {
    NT.ui.fx.setMuted(!cfg.sfx);
    NT.ui.fx.setVolume(VOLUME[cfg.volume] || 1);
    NT.fmt.setCompact(cfg.compact);
    const cl = document.body.classList;
    cl.toggle('calm', cfg.calm);
    cl.toggle('text-large', cfg.textSize === 'large');
    cl.toggle('text-xlarge', cfg.textSize === 'xlarge');
  }

  function set(key, raw) {
    const val = raw === 'true' ? true : (raw === 'false' ? false : raw);
    if (!(key in DEFAULTS) || !valid(key, val)) return false;
    cfg[key] = val;
    save();
    apply();
    return true;
  }

  load();
  NT.ui.settings = {
    options: OPTIONS,
    get: function (key) { return cfg[key]; },
    set: set,
    apply: apply,
    // Bagian dari kas yang memicu konfirmasi pembelian (0 = tidak pernah).
    confirmFraction: function () { return CONFIRM_FRAC[cfg.confirm] || 0; }
  };
})((window.NT = window.NT || {}));
