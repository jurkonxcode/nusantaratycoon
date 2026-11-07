/* Efek rasa-main: angka melayang, confetti, suara sintetis, hitung kas bergulir. Tidak ada file aset. */
(function (NT) {
  NT.ui = NT.ui || {};

  let ctx = null;
  let muted = false;
  let volume = 1;
  try { muted = localStorage.getItem('nt-muted') === '1'; } catch (e) { /* abaikan */ }

  function audio() {
    if (muted) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, start, dur, type, vol) {
    const a = audio();
    if (!a) return;
    const o = a.createOscillator(), g = a.createGain();
    const t = a.currentTime + start;
    o.type = type || 'square';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime((vol || 0.05) * volume, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination);
    o.start(t); o.stop(t + dur + 0.03);
  }

  const SFX = {
    coin: function () { tone(988, 0, 0.08); tone(1319, 0.07, 0.16); },
    click: function () { tone(440, 0, 0.05, 'triangle', 0.06); },
    start: function () { tone(330, 0, 0.08, 'triangle', 0.07); tone(392, 0.08, 0.12, 'triangle', 0.07); },
    done: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.09, 0.2); }); },
    error: function () { tone(180, 0, 0.16, 'sawtooth', 0.04); }
  };

  function sfx(name) { try { if (SFX[name]) SFX[name](); } catch (e) { /* suara tidak boleh merusak game */ } }

  function toggleMute() {
    muted = !muted;
    try { localStorage.setItem('nt-muted', muted ? '1' : '0'); } catch (e) { /* abaikan */ }
    if (!muted) sfx('click');
    return muted;
  }

  function calm() { return document.body.classList.contains('calm'); }

  function setMuted(m) {
    muted = !!m;
    try { localStorage.setItem('nt-muted', muted ? '1' : '0'); } catch (e) { /* abaikan */ }
  }

  function floatText(x, y, text, cls) {
    if (calm()) return;
    const el = document.createElement('div');
    el.className = 'floaty ' + (cls || '');
    el.textContent = text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    document.body.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 1300);
  }

  function floatFromRect(rect, text, cls) {
    if (rect) floatText(rect.left + rect.width / 2, rect.top, text, cls);
  }

  function confetti(x, y) {
    if (calm()) return;
    const colors = ['#f0c25f', '#d9a441', '#6fbf5a', '#2d8fd0', '#e98aa8', '#c8472f'];
    for (let i = 0; i < 28; i++) {
      const p = document.createElement('i');
      const ang = Math.random() * Math.PI * 2, d = 60 + Math.random() * 120;
      p.className = 'confetti';
      p.style.left = x + 'px';
      p.style.top = y + 'px';
      p.style.background = colors[i % colors.length];
      p.style.setProperty('--dx', Math.cos(ang) * d + 'px');
      p.style.setProperty('--dy', (Math.sin(ang) * d - 50) + 'px');
      p.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
      document.body.appendChild(p);
      setTimeout(function () { if (p.parentNode) p.parentNode.removeChild(p); }, 1300);
    }
  }

  // Kas bergulir halus ke angka baru dan berkedip hijau/merah.
  function setCash(el, target) {
    if (el._to === target) return;
    const from = el._val == null ? target : el._val;
    el._to = target;
    cancelAnimationFrame(el._raf);
    if (from === target) { el._val = target; el.textContent = NT.fmt.money(target); return; }
    el.classList.remove('up', 'down');
    void el.offsetWidth;
    el.classList.add(target > from ? 'up' : 'down');
    const t0 = performance.now();
    (function step(t) {
      const k = Math.min(1, (t - t0) / 450);
      el._val = from + (target - from) * (1 - Math.pow(1 - k, 3));
      el.textContent = NT.fmt.money(el._val);
      if (k < 1) el._raf = requestAnimationFrame(step); else el._val = target;
    })(t0);
  }

  NT.ui.fx = {
    sfx: sfx, toggleMute: toggleMute, setMuted: setMuted, setVolume: function (v) { volume = v; }, isMuted: function () { return muted; },
    floatText: floatText, floatFromRect: floatFromRect, confetti: confetti, setCash: setCash
  };
})((window.NT = window.NT || {}));
