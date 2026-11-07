/* Layar "Selamat datang kembali": ringkasan apa yang terjadi selama pemain pergi. */
(function (NT) {
  NT.ui = NT.ui || {};
  const D = NT.data;
  const E = NT.economy;
  const F = NT.fmt;
  let open = null;   // { el, prevFocus, onKey }

  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function jobName(j) {
    const what = j.kind === 'building' ? D.buildings[j.id].name : D.infra[j.id].name + ' ' + D.regions[j.region].name;
    return what + (j.kind === 'building' && j.from === 0 ? ' selesai dibangun' : ' naik ke Lv ' + j.to);
  }

  // Hasil yang menunggu, dijumlahkan per komoditas. "full" = ada gudang yang sudah penuh (produksi berhenti).
  function waiting(state, now) {
    const byCom = {};
    Object.keys(state.buildings).forEach(function (id) {
      const cid = D.buildings[id].produces;
      const p = E.pending(state, id, now);
      const row = byCom[cid] || (byCom[cid] = { qty: 0, full: false });
      row.qty += p;
      if (p >= E.capacity(state, id, now) - 0.001) row.full = true;
    });
    return Object.keys(byCom).map(function (cid) {
      return { cid: cid, qty: Math.floor(byCom[cid].qty), full: byCom[cid].full };
    }).filter(function (r) { return r.qty >= 1; });
  }

  function close() {
    if (!open) return;
    document.removeEventListener('keydown', open.onKey);
    if (open.el.parentNode) open.el.parentNode.removeChild(open.el);
    if (open.prevFocus && open.prevFocus.focus) open.prevFocus.focus();
    open = null;
  }

  // Mengembalikan true bila layar ditampilkan (ada sesuatu yang layak dilaporkan).
  function show(state, awayMs, finished, now) {
    if (open) return false;
    const items = waiting(state, now);
    if (!items.length && !(finished && finished.length)) return false;

    const anyFull = items.some(function (r) { return r.full; });
    let body = '';
    if (items.length) {
      body += '<h3>Siap dikumpulkan</h3><ul class="wb-list">' + items.map(function (r) {
        const c = D.commodities[r.cid];
        return '<li><span class="wb-ico">' + c.icon + '</span><span class="wb-name">' + esc(c.name) + '</span>' +
          '<b>+' + F.num(r.qty) + '</b>' + (r.full ? '<span class="tag paceklik">gudang penuh</span>' : '') + '</li>';
      }).join('') + '</ul>';
      if (anyFull) {
        body += '<p class="muted small">Gudang yang penuh berhenti berproduksi. Gudang terisi penuh setelah ' +
          NT.config.storageHours + ' jam, jadi kumpulkan lebih sering atau naikkan level bangunan.</p>';
      }
    }
    if (finished && finished.length) {
      body += '<h3>Selesai saat kamu pergi</h3><ul class="wb-list">' + finished.map(function (j) {
        return '<li><span class="wb-ico">✅</span><span class="wb-name">' + esc(jobName(j)) + '</span></li>';
      }).join('') + '</ul>';
    }

    const actions = items.length
      ? '<button class="btn primary wide" data-action="collect-all" data-close>📦 Kumpulkan semua hasil</button>' +
        '<button class="btn wide" data-close>Nanti saja</button>'
      : '<button class="btn primary wide" data-close>Lanjut bermain</button>';

    const el = document.createElement('div');
    el.className = 'modal-backdrop';
    el.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="wb-title">' +
      '<h2 id="wb-title">Selamat datang kembali!</h2>' +
      '<p class="muted">Kamu pergi selama <b>' + F.duration(awayMs) + '</b>.</p>' + body +
      '<div class="modal-actions">' + actions + '</div></div>';
    document.body.appendChild(el);

    const onKey = function (e) { if (e.key === 'Escape') close(); };
    open = { el: el, prevFocus: document.activeElement, onKey: onKey };
    document.addEventListener('keydown', onKey);
    el.addEventListener('click', function (e) {
      // Klik di luar kotak menutup; tombol bertanda data-close menutup setelah aksinya jalan.
      if (e.target === el) close();
      else if (e.target.closest('[data-close]')) setTimeout(close, 0);
    });
    const first = el.querySelector('.btn');
    if (first) first.focus();
    return true;
  }

  NT.ui.welcome = { show: show, close: close };
})((window.NT = window.NT || {}));
