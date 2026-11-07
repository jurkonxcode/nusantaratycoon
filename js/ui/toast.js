/* Notifikasi kecil di layar. kind: ok | warn | info. Teks panjang tampil lebih lama. */
(function (NT) {
  NT.ui = NT.ui || {};

  NT.ui.toast = function (message, kind) {
    const host = document.getElementById('toasts');
    if (!host) return;
    const el = document.createElement('div');
    el.className = 'toast ' + (kind || 'ok');
    el.textContent = message;
    host.appendChild(el);
    while (host.children.length > 3) host.removeChild(host.firstChild);
    const hold = kind === 'info' ? Math.min(9000, 2800 + message.length * 45) : 2800;
    setTimeout(function () { el.classList.add('out'); }, hold);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, hold + 500);
  };
})((window.NT = window.NT || {}));
