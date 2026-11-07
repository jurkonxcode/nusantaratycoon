/*
 * Driver Supabase (tahap 1: simpan seluruh state sebagai satu baris JSON per pemain).
 * BELUM DIUJI. Langkah mengaktifkan ada di README.md.
 *
 * Catatan keamanan: di tahap ini klien masih bisa mengubah state-nya sendiri.
 * Untuk multiplayer sungguhan, pindahkan aturan di js/core/economy.js
 * (sell, collect, upgrade, unlock) ke Postgres function lalu panggil lewat supabase.rpc().
 */
(function (NT) {
  NT.storageDrivers = NT.storageDrivers || {};

  let client = null;

  function getClient() {
    if (client) return client;
    if (!window.supabase || !window.supabase.createClient) {
      throw new Error('supabase-js belum dimuat. Aktifkan tag script CDN di index.html.');
    }
    const cfg = NT.config.supabase;
    if (!cfg.url || !cfg.anonKey) {
      throw new Error('Isi supabase.url dan supabase.anonKey di js/config.js.');
    }
    client = window.supabase.createClient(cfg.url, cfg.anonKey);
    return client;
  }

  // Masuk anonim dulu (aktifkan "Anonymous sign-ins" di dashboard Supabase).
  // Nanti bisa diganti login email / Google.
  async function userId() {
    const c = getClient();
    const current = await c.auth.getSession();
    let session = current.data.session;
    if (!session) {
      const res = await c.auth.signInAnonymously();
      if (res.error) throw res.error;
      session = res.data.session;
    }
    return session.user.id;
  }

  NT.storageDrivers.supabase = {
    label: 'Tersimpan di cloud (Supabase)',

    async load() {
      const c = getClient();
      const uid = await userId();
      const res = await c.from('game_saves').select('state').eq('user_id', uid).maybeSingle();
      if (res.error) throw res.error;
      return res.data ? res.data.state : null;
    },

    async save(state) {
      const c = getClient();
      const uid = await userId();
      const res = await c.from('game_saves').upsert({
        user_id: uid,
        state: state,
        updated_at: new Date().toISOString()
      });
      if (res.error) throw res.error;
      return true;
    },

    async reset() {
      const c = getClient();
      const uid = await userId();
      const res = await c.from('game_saves').delete().eq('user_id', uid);
      if (res.error) throw res.error;
    }
  };
})((window.NT = window.NT || {}));
