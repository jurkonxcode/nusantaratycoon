/* Membuat PNG (ikon aplikasi, favicon, OG) dari SVG di assets/. Jalankan: node tools/render_assets.js (butuh paket sharp). */
const sharp = require('sharp'), fs = require('fs'), path = require('path');
const A = path.join(__dirname, '..', 'assets');
const jobs = [
  ['icons/favicon.svg', 'icons/favicon-16.png', 16], ['icons/favicon.svg', 'icons/favicon-32.png', 32], ['icons/favicon.svg', 'icons/favicon-48.png', 48],
  ['icons/app-icon.svg', 'icons/apple-touch-icon.png', 180], ['icons/app-icon.svg', 'icons/icon-192.png', 192], ['icons/app-icon.svg', 'icons/icon-512.png', 512],
  ['icons/app-icon-maskable.svg', 'icons/icon-maskable-512.png', 512], ['logo/logo-mark.svg', 'logo/logo-mark-512.png', 512],
  ['social/og-image.svg', 'social/og-image.png', 1200], ['social/banner.svg', 'social/banner.png', 1280]
];
(async () => {
  for (const [src, dst, w] of jobs) {
    await sharp(path.join(A, src), { density: 300 }).resize({ width: w }).png().toFile(path.join(A, dst));
  }
  console.log('PNG dibuat:', jobs.length);
})();
