/* Peta ilustrasi Nusantara (SVG). Dibuat sekali, lalu hanya kelasnya yang diperbarui. */
(function (NT) {
  NT.ui = NT.ui || {};
  const D = NT.data;

  function islandMarkup(r) {
    return '' +
      '<g class="island" data-region="' + r.id + '" tabindex="0" role="button" aria-label="' + r.name + '">' +
        '<g class="island-shape">' + r.map.svg + '</g>' +
        '<text class="island-label" x="' + r.map.label[0] + '" y="' + r.map.label[1] + '" text-anchor="middle">' + (r.short || r.name) + '</text>' +
        '<g class="pin" transform="translate(' + r.map.pin[0] + ',' + r.map.pin[1] + ')">' +
          '<circle class="pin-pulse" r="20"/>' +
          '<circle class="pin-dot" r="20"/>' +
          '<text class="pin-icon" text-anchor="middle" dy="8">' + r.icon + '</text>' +
        '</g>' +
      '</g>';
  }

  function build() {
    const islands = Object.keys(D.regions).map(function (id) { return islandMarkup(D.regions[id]); }).join('');
    return '' +
    '<svg class="map-svg" viewBox="10 70 990 410" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Peta Nusantara">' +
      '<defs>' +
        '<linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#0a4a63"/><stop offset="1" stop-color="#127a8a"/>' +
        '</linearGradient>' +
        '<linearGradient id="land" x1="0" y1="0" x2="1" y2="1">' +
          '<stop offset="0" stop-color="#8fc46a"/><stop offset="1" stop-color="#3f8f4e"/>' +
        '</linearGradient>' +
        '<linearGradient id="landLocked" x1="0" y1="0" x2="1" y2="1">' +
          '<stop offset="0" stop-color="#cdbf94"/><stop offset="1" stop-color="#9c8d62"/>' +
        '</linearGradient>' +
        '<pattern id="waves" width="60" height="24" patternUnits="userSpaceOnUse">' +
          '<path d="M0,12 q15,-10 30,0 t30,0" fill="none" stroke="#ffffff" stroke-opacity=".10" stroke-width="2"/>' +
        '</pattern>' +
        '<filter id="shadow" x="-20%" y="-20%" width="140%" height="150%">' +
          '<feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#021c26" flood-opacity=".45"/>' +
        '</filter>' +
        '<radialGradient id="vignette" cx=".5" cy=".5" r=".75">' +
          '<stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#021c26" stop-opacity=".45"/>' +
        '</radialGradient>' +
      '</defs>' +
      '<rect width="1000" height="480" fill="url(#sea)"/>' +
      '<rect width="1000" height="480" fill="url(#waves)" class="wave-layer"/>' +
      '<g class="clouds" fill="#fff" fill-opacity=".14">' +
        '<ellipse class="cloud c1" cx="120" cy="60" rx="58" ry="14"/>' +
        '<ellipse class="cloud c2" cx="520" cy="40" rx="72" ry="16"/>' +
        '<ellipse class="cloud c3" cx="820" cy="90" rx="50" ry="12"/>' +
      '</g>' +
      islands +
      '<g class="ships" font-size="26">' +
        '<text><animateMotion dur="34s" repeatCount="indefinite" path="M330,452 C420,470 520,462 600,448 C520,440 420,444 330,452"/>⛵</text>' +
        '<text><animateMotion dur="42s" repeatCount="indefinite" path="M300,330 C330,300 380,330 360,372 C340,350 310,350 300,330"/>🚢</text>' +
        '<text><animateMotion dur="50s" repeatCount="indefinite" path="M600,340 C650,380 700,380 760,330 C710,340 650,330 600,340"/>⛵</text>' +
      '</g>' +
      '<rect width="1000" height="480" fill="url(#vignette)" pointer-events="none"/>' +
    '</svg>';
  }

  // Perbarui kelas (terkunci / dipilih / segera) dan ikon pin sesuai state.
  function update(state, selectedId) {
    const host = document.getElementById('map');
    if (!host) return;
    Object.keys(D.regions).forEach(function (id) {
      const r = D.regions[id];
      const el = host.querySelector('.island[data-region="' + id + '"]');
      if (!el) return;
      const unlocked = state.regions[id] && state.regions[id].unlocked;
      el.classList.toggle('soon', !!r.comingSoon);
      el.classList.toggle('locked', !r.comingSoon && !unlocked);
      el.classList.toggle('selected', id === selectedId);
      const icon = el.querySelector('.pin-icon');
      icon.textContent = r.comingSoon ? '…' : (unlocked ? r.icon : '🔒');
    });
  }

  NT.ui.map = {
    mount: function () {
      const host = document.getElementById('map');
      if (host) host.innerHTML = build();
    },
    update: update
  };
})((window.NT = window.NT || {}));
