/*
 * Driver penyimpanan lokal (localStorage). Semua driver punya antarmuka yang sama:
 *   load()  -> Promise<state | null>
 *   save(s) -> Promise<boolean>
 *   reset() -> Promise<void>
 * Jadi pindah ke Supabase cukup mengganti NT.config.storage.
 */
(function (NT) {
  NT.storageDrivers = NT.storageDrivers || {};

  NT.storageDrivers.local = {
    label: 'Tersimpan di browser ini',

    load: function () {
      try {
        const raw = window.localStorage.getItem(NT.config.saveKey);
        return Promise.resolve(raw ? JSON.parse(raw) : null);
      } catch (e) {
        return Promise.resolve(null);
      }
    },

    save: function (state) {
      try {
        window.localStorage.setItem(NT.config.saveKey, JSON.stringify(state));
        return Promise.resolve(true);
      } catch (e) {
        return Promise.resolve(false);
      }
    },

    reset: function () {
      try { window.localStorage.removeItem(NT.config.saveKey); } catch (e) { /* abaikan */ }
      return Promise.resolve();
    }
  };
})((window.NT = window.NT || {}));
