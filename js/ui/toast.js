/* Notifikasi kecil di layar. */
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
    setTimeout(function () { el.classList.add('out'); }, 2800);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 3300);
  };
})((window.NT = window.NT || {}));
