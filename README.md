# Nusantara Tycoon

Game simulasi ekonomi berbasis web: bangun wilayah di Nusantara, panen komoditas lokal,
jual di pasar dengan harga yang bergerak, lalu bangun tol dan pelabuhan untuk menurunkan
ongkos kirim dan membuka wilayah baru.

Prototipe ini berjalan sepenuhnya di browser (tanpa server). Penyimpanan bisa dipindah ke
Supabase nanti tanpa mengubah logika game.

## Cara mencoba

Buka `index.html` langsung di browser (klik dua kali), atau jalankan server lokal:

```
python3 -m http.server 8000
```

lalu buka http://localhost:8000. Tes: `node tests/economy.test.js` dan `node tests/world.test.js`.

## Struktur folder

```
index.html              halaman utama
css/style.css           tampilan dan tema
js/
  config.js             semua angka penyeimbang game (harga, ongkir, kecepatan, dll.)
  data/                 data murni: wilayah, komoditas, bangunan, infrastruktur
  core/                 logika game tanpa DOM (state, ekonomi, format angka)
  storage/              penyimpanan: local-storage.js, supabase-storage.js
  ui/                   peta pixel art, sprite, panel, notifikasi
  main.js               menyambungkan semuanya
supabase/schema.sql     skema awal database (belum diuji)
tests/                  tes logika ekonomi
tools/bundle.js         membuat versi satu file di dist/
```

Aturannya: `core/` dan `data/` tidak boleh menyentuh `document` atau `window.localStorage`.
Itu yang membuat logikanya bisa dites sendiri dan nanti dipindah ke server.

## Cara kerja ekonomi

- **Produksi** dihitung dari timestamp (`lastCollected`), bukan loop. Tetap jalan saat offline,
  dan gudang bangunan penuh setelah 6 jam sehingga pemain punya alasan kembali.
- **Harga pasar** = harga dasar x permintaan wilayah x fluktuasi lambat x tekanan pasokan.
  Menjual banyak di satu pasar menekan harganya, tekanan itu meluruh 8% per menit.
- **Ongkir** = berat x jarak laut nyata antar kota pelabuhan x tarif kapal. Pelabuhan di kedua ujung menurunkannya.
  Barang curah murah (padi) paling terasa ongkirnya.
- **Musim dan peristiwa** mengikuti kalender nyata (WIB): panen raya, paceklik, banjir, El Niño, lonjakan ekspor.
- **Harga dasar** mengikuti rasio harga nyata (perkiraan kasar). Cek keseimbangan: `node tools/balance.js`.
- **Jalan tol** menambah produksi 20% per level di wilayahnya.
- **Skor peradaban** menentukan gelar, dari Desa Rintisan sampai Peradaban Nusantara.

Ubah angka di `js/config.js` untuk menyeimbangkan game.

## Menaruh di GitHub Pages

1. Buat repo, push seluruh isi folder ini.
2. Di GitHub: Settings > Pages > Source: branch `main`, folder `/ (root)`.
3. Game tayang di `https://<username>.github.io/<nama-repo>/`.

## Pindah ke Supabase (bertahap)

**Tahap 1: simpan progres di cloud**
1. Buat proyek di supabase.com. Authentication > Providers: aktifkan **Anonymous sign-ins**.
2. Jalankan `supabase/schema.sql` di SQL Editor.
3. Di `index.html`, hapus tanda komentar pada tag script `supabase-js`.
4. Di `js/config.js`: ubah `storage` menjadi `'supabase'` dan isi `supabase.url` serta `supabase.anonKey`
   (kunci `anon` memang aman dipublikasikan selama RLS aktif).

Catatan: di tahap ini pemain masih bisa mengubah datanya sendiri lewat konsol browser.
Cukup untuk uji coba bersama teman, belum untuk kompetisi.

**Tahap 2: multiplayer yang adil**
- Pecah state jadi tabel (rencana ada di bagian bawah `schema.sql`).
- Pindahkan fungsi yang mengubah data di `js/core/economy.js` (`collect`, `sell`, `upgradeBuilding`,
  `upgradeInfra`, `unlockRegion`) ke Postgres function, lalu panggil dengan `supabase.rpc()`.
- Jadikan `market` satu tabel bersama dan tampilkan perubahannya lewat Supabase Realtime.

**Tahap 3:** proyek nasional (tol dan pelabuhan yang dibangun bersama), aliansi, wilayah baru
(Kalimantan, Bali dan Nusa Tenggara, Maluku, Papua sudah ada di peta sebagai kerangka).

## Menambah konten

- **Komoditas baru:** tambah di `js/data/commodities.js`.
- **Bangunan baru:** tambah di `js/data/buildings.js`, lalu daftarkan id-nya di `buildings` milik wilayahnya
  pada `js/data/regions.js`.
- **Membuka wilayah:** hapus `comingSoon` di wilayahnya dan isi `unlockCost`, `infraCostFactor`,
  `buildings`, `demand`, lalu tambahkan jaraknya di `NT.data.distance`.

## Timer pembangunan dan rasa-main (sesi 3)

- **Upgrade butuh waktu.** Kas dipotong di muka, level naik setelah timer habis. Durasi naik tiap level (x1,9 untuk bangunan,
  x2,3 untuk infrastruktur) dan lebih lama untuk bangunan/wilayah mahal. Produksi tetap memakai laju lama sampai timer habis.
  Timer jalan terus walau game ditutup; hasilnya diterapkan saat game dibuka lagi.
- **Tukang terbatas** (`maxBuilders`, awal 2): hanya dua pembangunan bisa berjalan bersamaan.
- **Percepat**: bayar sebagian biaya upgrade sesuai sisa waktu untuk menyelesaikan seketika.
- **Kartu Target Berikutnya** di tab Peta: tujuan termurah, bar progres kas, dan perkiraan waktunya.
- **Peta hidup**: gelembung 📦 muncul di bangunan yang hasilnya siap (ketuk untuk mengumpulkan), palu dan bar progres di
  bangunan yang sedang dibangun.
- **Efek**: angka melayang, confetti saat selesai, kas bergulir, tombol berdenyut saat gudang separuh penuh, suara sintetis
  (tombol 🔊 untuk senyap). Semua angka ada di `js/config.js` (`buildBaseSec`, `buildGrowth`, `maxBuilders`, `speedupCostShare`).
- Tes: `node tests/jobs.test.js`. Matikan timer untuk uji lama dengan `buildTimeEnabled: false`.

## Tampilan dan navigasi (sesi 22)

Menu utama ada di bawah layar pada HP dan tablet (mudah dijangkau jempol) dan di header pada desktop. Semua tombol utama
berukuran minimal 44 px. Tombol upgrade yang belum terjangkau terisi sesuai kas yang sudah ada. Tes sentuhan: `python3 tests/browser_touch.py`.
