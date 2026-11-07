/*
 * Membuat satu file HTML mandiri (CSS dan JS digabung) untuk pratinjau cepat atau dibagikan.
 * Jalankan: node tools/bundle.js  ->  hasil: dist/nusantara-tycoon.html
 * Game utama tetap memakai struktur folder; file ini hanya untuk coba-coba.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, function (_, href) {
  return '<style>\n' + fs.readFileSync(path.join(root, href), 'utf8') + '\n</style>';
});

// Abaikan skrip yang sengaja dikomentari (mis. CDN Supabase).
html = html.replace(/<!--[\s\S]*?-->/g, '');

html = html.replace(/<script src="([^"]+)"><\/script>/g, function (_, src) {
  const code = fs.readFileSync(path.join(root, src), 'utf8').replace(/<\/script>/g, '<\\/script>');
  return '<script>\n' + code + '\n</script>';
});

const outDir = path.join(root, 'dist');
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, 'nusantara-tycoon.html');
fs.writeFileSync(out, html);
console.log('Dibuat: ' + out + ' (' + Math.round(html.length / 1024) + ' KB)');
