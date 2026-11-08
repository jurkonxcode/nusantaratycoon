# HANDOFF: Nusantara Tycoon

Dokumen serah-terima untuk melanjutkan proyek di sesi baru (dengan Claude atau siapa pun).
Terakhir diperbarui: 8 November 2026 (sesi 17: Tahap Z1, zoom dan geser peta).

> **Sumber kebenaran adalah repo GitHub**, bukan salinan di chat. Repo: `github.com/jurkonxcode/nusantaratycoon`.
> Kalau kode di repo berbeda dengan yang dijelaskan di sini, percayai repo, lalu perbarui dokumen ini.

---

## 1. Ringkasan

Game simulasi ekonomi berbasis web bertema Indonesia. Pemain membangun wilayah di Nusantara,
memanen komoditas lokal (padi, batik, kopi, karet, kakao, cengkeh), menjualnya di pasar dengan
harga yang bergerak, lalu membangun tol dan pelabuhan untuk menaikkan produksi dan menurunkan
ongkos kirim. Tujuan jangka panjang: "membangun peradaban baru", dengan proyek nasional bersama
(misalnya Tol Trans-Sumatra) dan multiplayer.

- **Stack:** HTML + CSS + JavaScript biasa (tanpa framework dan tanpa build step), hosting GitHub Pages,
  backend Supabase (Auth, Postgres, Realtime).
- **Pemilik:** bukan programmer berpengalaman, bekerja banyak dari HP dan GitHub Codespaces.
  Jelaskan langkah dengan perintah yang bisa disalin, hindari asumsi pengetahuan git tingkat lanjut.
- **Bahasa:** UI, komentar kode, dan komunikasi memakai Bahasa Indonesia.
- **Motivasi pemilik:** sempat ragu apakah akan betah mengembangkannya. Setelah mencoba prototipe,
  pemilik mulai menyukai game ini. Jaga agar tiap langkah menghasilkan sesuatu yang bisa dimainkan dan
  dilihat (hasil nyata menjaga semangat lebih baik daripada fondasi panjang tanpa hasil).

## 2. Status saat ini

| Bagian | Status |
|---|---|
| Game solo (produksi, pasar, ongkir, tol, pelabuhan, skor) | Selesai dan diuji |
| Tes logika ekonomi (`node tests/economy.test.js`) | 12 tes lolos |
| Tampilan peta SVG, panel, pasar, info | Selesai, diuji di Chrome headless |
| Penyimpanan lokal (localStorage) | Selesai, jalan |
| Driver Supabase (simpan satu baris JSON per pemain) | Ditulis, lolos tes dengan Supabase tiruan |
| Tabel `game_saves` di Supabase + RLS | Berfungsi (dikonfirmasi pemilik, 7 Nov 2026) |
| Game memakai Supabase (`storage: 'supabase'`, tag CDN aktif) | Berfungsi, ada 1 pengguna anonim di Auth |
| Musim panen nyata, peristiwa acak, harga/ongkir realistis | Selesai, 18 tes lolos (`tests/world.test.js`) |
| Peta pixel art dari poligon bujur/lintang nyata + sprite bangunan | Selesai, diuji di Chrome headless (HP dan desktop) |
| Sprite berubah per level (tingkat 1/2/3) | Selesai (sesi 9), diuji di Chrome headless; belum dilihat di HP sungguhan |
| Deploy GitHub Pages | Perlu dikonfirmasi (Settings > Pages > `main` / root) |
| Login (email/Google), leaderboard, pasar bersama, proyek nasional | Belum ada |
| Wilayah Kalimantan (sawit, batubara) | Selesai (sesi 11), dapat dimainkan |
| Peta realistis (garis pantai fraktal, relief, gunung api, danau, sungai, batimetri laut) | Selesai (sesi 13), diuji di Chrome headless (desktop dan HP 430 px) |
| Wilayah Nusa Tenggara, Maluku, Papua | Hanya kerangka di peta (`comingSoon`) |

**Checklist yang perlu dikonfirmasi pemilik di awal sesi berikutnya:**

- [ ] Situs tayang di `https://jurkonxcode.github.io/nusantaratycoon/`
- [ ] Setelah bermain sebentar, tabel `game_saves` di Supabase punya satu baris
- [ ] Muat ulang halaman mempertahankan kas dan level
- [ ] Authentication > Sign In / Providers > **Anonymous sign-ins** menyala
- [ ] Tidak ada toast "Gagal memuat data tersimpan" saat game dibuka

Kalau toast itu muncul, penyebab tersering: login anonim belum menyala, SQL belum sukses, atau
tag script `supabase-js` di `index.html` masih dikomentari.

**Sesi 18:** panel Kas dan Penduduk di header bisa diketuk (`js/ui/infobox.js`): rincian pemasukan per bangunan, pajak per wilayah, uang yang belum masuk kas, target berikutnya; dan penduduk, kesejahteraan, kebutuhan, pekerja, tren per wilayah. Tab Pasar dipersingkat: barang berstok kosong jadi baris tipis, grafik/saran per barang dilipat (tombol ▾), kartu Ekspor dilipat.

## 3. Keputusan desain dan alasannya

1. **Script klasik dengan namespace `window.NT`, bukan ES modules.** Supaya `index.html` bisa dibuka
   dengan klik dua kali (modul diblokir di `file://`) dan tanpa bundler. Konsekuensinya: **urutan tag
   `<script>` di `index.html` penting**, dan file baru harus didaftarkan di sana.
2. **`data/` dan `core/` tidak boleh menyentuh `document` atau `localStorage`.** Itu yang membuat logika
   bisa dites di Node dan nanti dipindahkan ke Postgres function.
3. **Produksi dihitung dari timestamp** (`lastCollected`), bukan loop. Hemat, tetap jalan saat offline,
   dan ringan di backend.
4. **Penyimpanan lewat driver** (`load`, `save`, `reset`, semuanya Promise). Pindah backend = ganti
   `NT.config.storage`, logika game tidak berubah.
5. **Fungsi yang mengubah data mengembalikan `{ ok: true, ... }` atau `{ ok: false, reason }`.** UI
   menampilkan `reason` sebagai toast. Pola ini sengaja dipertahankan agar mudah dipetakan ke RPC.
6. **Render penuh setelah aksi, tick 1 detik hanya memperbarui angka bertanda `data-live`.** Mencegah
   tombol berkedip dan hilang fokus.
7. **Peta pixel art top-down** (diputuskan sesi 2). Daratan dihitung dari poligon bujur/lintang nyata (1 sel = 0,3 derajat)
   lalu digambar sebagai persegi SVG; bangunan berupa sprite 8x8 yang tampil sesuai level. Bentuk pulau tetap perkiraan.
8. **Ongkos kirim sebagai pembeda utama game**: infrastruktur punya efek ekonomi nyata, bukan hiasan.

## 4. Struktur folder

```
index.html                  halaman utama, daftar script (urutan penting)
css/style.css               tema laut tropis + aksen emas batik
js/
  config.js                 semua angka penyeimbang + pilihan storage + kunci Supabase
  data/
    commodities.js          komoditas (harga dasar, kedalaman pasar, wilayah asal)
    buildings.js            bangunan produksi + infrastruktur (tol, pelabuhan)
    regions.js              wilayah, permintaan, hub pelabuhan, posisi pin/bangunan di peta, gelar
    events.js               peristiwa dunia nyata (banjir, El Nino, lonjakan ekspor, dst.)
    geo.js                  poligon pulau [bujur, lintang] + jalur kapal (perkiraan)
  core/
    format.js               format angka Indonesia (NT.fmt)
    state.js                bentuk data pemain: createInitialState, normalize
    economy.js              SEMUA aturan: produksi, pasar, ongkir, upgrade, skor (NT.economy)
    world.js                musim (bulan WIB) dan peristiwa acak deterministik (NT.world)
    raster.js               poligon -> grid sel untuk peta (NT.raster)
    achievements.js         panduan awal 5 langkah + 19 pencapaian (NT.achievements); murni logika
  storage/
    local-storage.js        driver localStorage
    supabase-storage.js     driver Supabase (satu baris JSON per pemain)
    index.js                NT.getStorage() memilih driver
  ui/
    toast.js                notifikasi
    sprites.js              sprite pixel art 8x8 (bangunan, pelabuhan, kapal); cadangan bila SVG tidak ada
    terrain.js              render peta realistis: pantai fraktal, relief, bioma, laut berkedalaman (lihat bagian 27)
    fx.js, settings.js, welcome.js   efek/suara, pengaturan, layar selamat datang
    map.js                  peta pixel art SVG (dibuat sekali; kelas dan lapisan dinamis diperbarui)
    panels.js               panel wilayah, tab pasar, tab info, tick
  main.js                   menyambungkan data, aksi pemain, loop, simpan
supabase/schema.sql         tabel game_saves + RLS (tahap 1) + rencana tabel (tahap 2)
tests/economy.test.js       tes logika inti tanpa browser (musim/peristiwa dimatikan)
tests/world.test.js         tes musim, peristiwa, ongkir km, dan geografi peta
tools/simulate.js           simulator pemain otomatis (aktif/santai/harian) untuk menyetel keseimbangan
tools/balance.js            cetak harga, ongkir, jarak, dan waktu balik modal tiap bangunan
tools/bundle.js             membuat dist/nusantara-tycoon.html (satu file) untuk pratinjau
tools/art_tiers.py, art_kalimantan.py   hiasan tingkat sprite (sesi 9) dan sprite/ikon Kalimantan (sesi 11)
README.md                   panduan singkat pengguna dan deploy
HANDOFF.md                  dokumen ini
```

**Konvensi kode:** setiap file berupa IIFE `(function (NT) { ... })(window.NT = window.NT || {})`;
string UI berbahasa Indonesia; hindari `innerHTML` untuk teks yang berasal dari pemain (saat ini semua
teks berasal dari data game sendiri, jadi aman, tapi berubah begitu ada nama pemain atau chat).

## 5. Bentuk data pemain (state)

```js
{
  version: 1, createdAt: <ms>, cash: 50, totalEarned: 0,
  regions:   { jawa: { unlocked: true, infra: { tol: 0, pelabuhan: 0 } }, sumatra: {...}, sulawesi: {...} },
  buildings: { sawah: { level: 1, lastCollected: <ms> }, ... },   // hanya bangunan yang sudah dibangun
  inventory: { padi: 0, batik: 0, kopi: 0, karet: 0, kakao: 0, cengkeh: 0 },
  stats: { collects, produced, sales, sold, upgrades, builds, unlocks, bestSale, playMs },  // sesi 7
  achievements: { <id>: <waktu terbuka ms> }, log: [{ t, i, x }], guideHidden: false,        // sesi 7
  market:    { jawa: { padi: { stock: 0, updatedAt: <ms> } }, ... } // tekanan pasokan hasil penjualan pemain
}
```

Awal game: kas Rp 50, satu Sawah level 1 di Jawa. `normalize()` menggabungkan data tersimpan dengan
struktur terbaru sehingga aman bila nanti ada wilayah atau komoditas baru.

## 6. Mekanik ekonomi (angka saat ini)

Semua konstanta ada di `js/config.js` dan `js/data/*`. Angka di bawah adalah **tebakan awal yang belum
dimainkan lama**; keseimbangan butuh uji main.

**Produksi**
- `laju = baseRate × level × (1 + 0.2 × levelTol)` unit per menit.
- `kapasitas gudang = floor(laju × 60 × 2)`, artinya penuh setelah 2 jam (alasan untuk kembali bermain).
- Mengumpulkan hasil memindahkan `floor(tertunda)` ke gudang dan menyimpan sisa pecahan, kecuali gudang penuh.
- Sebelum upgrade (bangunan atau tol), hasil tertunda otomatis dikumpulkan agar perubahan laju tidak
  berlaku surut.

**Biaya** (level `n` ke `n+1`)
- Bangunan: `round(baseCost × 1.55^n)`.
- Infrastruktur: `round(baseCostInfra × faktorWilayah × 1.55^n)`. Maksimum level 5.

**Pasar**
- `harga = hargaDasar × permintaanWilayah × gelombang × (1 − 0.55 × tekanan)`.
- `tekanan = stok / (stok + kedalamanPasar)`. Stok naik saat pemain menjual, meluruh `exp(−0.08 × menit)`.
- `gelombang = 1 + 0.10 × sin(waktu/7 menit + hash(wilayah+komoditas))`, fluktuasi deterministik ±10%.
- Menjual n unit dihitung unit demi unit (tiap unit menaikkan tekanan), jadi menjual banyak sekaligus
  rata-rata lebih murah.
- Penjualan ditolak bila hasil bersih ≤ 0. Pasar hanya bisa dipakai di wilayah yang sudah dibuka.

**Ongkir** per unit = `hargaDasar × 0.06 × jarak × (1 − diskon)`;
`diskon = min(0.75, 0.15 × (levelPelabuhanAsal + levelPelabuhanTujuan))`. Jual di wilayah asal = tanpa ongkir.

**Skor peradaban** = `Σ level bangunan × 10 + Σ level infrastruktur × 25 + 100 per wilayah (non-awal) terbuka + floor(totalEarned / 1000)`.
Gelar: 0 Desa Rintisan, 150 Kota Dagang, 400 Kabupaten Maju, 900 Provinsi Makmur, 1800 Negara Maritim, 3500 Peradaban Nusantara.

**Data**

| Komoditas | Wilayah | Harga dasar | Kedalaman pasar |
|---|---|---|---|
| Padi | Jawa | 8 | 300 |
| Batik | Jawa | 40 | 60 |
| Kopi | Sumatra | 25 | 100 |
| Karet | Sumatra | 15 | 150 |
| Kakao | Sulawesi | 30 | 80 |
| Cengkeh | Sulawesi | 55 | 60 |

| Bangunan | Wilayah | Biaya bangun | Laju Lv1 (/menit) |
|---|---|---|---|
| Sawah | Jawa | 60 | 6 |
| Sentra Batik | Jawa | 400 | 1,5 |
| Kebun Kopi | Sumatra | 900 | 2,5 |
| Kebun Karet | Sumatra | 700 | 4 |
| Kebun Kakao | Sulawesi | 2000 | 3 |
| Kebun Cengkeh | Sulawesi | 3000 | 2,2 |

| Wilayah | Biaya buka | Faktor infra | Tol (dasar) | Pelabuhan (dasar) |
|---|---|---|---|---|
| Jawa | 0 (awal) | 1 | 500 | 400 |
| Sumatra | 600 | 1,5 | 500 | 400 |
| Sulawesi | 2000 | 2,5 | 500 | 400 |

Jarak: Jawa-Sumatra 2, Jawa-Sulawesi 3, Sumatra-Sulawesi 4 (selain itu 5).
Permintaan (pengali harga jual) per wilayah ada di `js/data/regions.js`: wilayah penghasil punya
permintaan rendah (0,9) untuk sebagian besar barangnya sendiri (pengecualian: batik di Jawa 1,1), wilayah lain 1,1 sampai 1,4. Itu yang membuat
berdagang antar-wilayah menguntungkan.

### Pembaruan dunia nyata (sesi 2): menggantikan angka lama di atas bila berbeda

- **Satuan:** 1 satuan = 1 karung 50 kg (batik: 10 lembar, ~4 kg). `harga = harga nyata per satuan / 40.000` (`config.priceScale`).
  Harga nyata di `commodities.js` (`realRpPerKg`) adalah **perkiraan kasar**; hanya gabah (Rp 6.500/kg, HPP) yang dicek ke sumber.
  Hasil: padi 8,1; karet 21,3; batik 62,5; kopi 93,8; kakao 137,5; cengkeh 162,5.
- **Laju produksi** disesuaikan agar kurva balik modal tetap sama (`node tools/balance.js`): sawah 6, batik 1, kopi 0,7,
  karet 3, kakao 0,65, cengkeh 0,75 per menit. Biaya bangunan tidak berubah.
- **Musim:** bulan kalender WIB; tabel 12 bulan per komoditas (produksi dan harga), dinormalkan rata-rata 1.
  Pengali musim dipakai untuk seluruh jendela hasil tertunda (gudang hanya 2 jam, jadi selisih di batas bulan kecil).
  `productionRate/capacity(state, id, now)`: tanpa `now`, musim dan peristiwa tidak dihitung (dipakai tes).
- **Peristiwa:** jendela `eventSlotHours` (8 jam); peluang `eventChance` (0,45); dipilih dari hash jendela waktu, dibatasi bulan
  yang masuk akal (banjir hanya musim hujan, El Nino hanya kemarau). Sama untuk semua pemain, siap dipindah ke server.
- **Ongkir** = `unitKg x km x seaFreightRpPerKgKm / priceScale x (1 - diskon pelabuhan)`. `km` = jarak haversine antar hub
  pelabuhan x 1,25. Padi kehilangan ~21% harga untuk pelayaran Jawa-Sumatra; batik kurang dari 1%.
- Waktu produksi **tidak diubah** (sesuai pilihan pemilik: hanya kecepatan yang disetel).

## 7. Supabase

- **Project URL dan kunci publishable** ada di `js/config.js`. Kunci `sb_publishable_...` memang aman berada
  di kode publik selama RLS aktif. **Jangan pernah** menaruh `service_role` atau secret key di repo.
- **Tahap 1 (sekarang):** tabel `game_saves(user_id uuid pk, state jsonb, updated_at)` dengan RLS: tiap
  pemain hanya bisa select/insert/update/delete barisnya sendiri (`auth.uid() = user_id`).
- **Login:** anonim (`signInAnonymously`). Akun terikat ke browser. Bila data browser dihapus, akun dan
  progres cloud tidak bisa diakses lagi. Perlu login email atau Google sebelum dibuka ke publik.
- **Autosave:** tiap 5 detik, setelah aksi (debounce 400 ms), saat tab disembunyikan, dan saat `pagehide`.
- **Pelindung:** bila `load()` gagal, `loadFailed = true` dan game **tidak menyimpan apa pun** supaya game kosong
  tidak menimpa progres cloud. Pelindung ini sengaja ada setelah ditemukan celah di versi awal.
- **Tidak ada migrasi otomatis** dari localStorage ke cloud. Mengganti `storage` ke `'supabase'` berarti
  progres lokal lama tidak ikut terbawa.

## 8. Alur kerja dan deploy

- **Repo:** `jurkonxcode/nusantaratycoon`, branch `main`. Pages: Settings > Pages > Deploy from branch > `main` / root.
- **Mengedit:** lewat GitHub Codespaces. Commit lewat panel Source Control atau terminal:
  ```
  git pull --no-rebase --no-edit
  git add .
  git commit -m "pesan commit"
  git push
  ```
- **Pelajaran dari sesi pertama:** pemilik sempat mengedit `config.js` langsung di github.com, sehingga Codespace
  tertinggal dan `git push` ditolak ("fetch first"). **Selalu `git pull` sebelum mulai, dan sebelum push bila
  ragu.** Hindari mengedit di dua tempat sekaligus.
- **Coba lokal:** buka `index.html`, atau `python3 -m http.server 8000`.
- **Tes:** `node tests/economy.test.js`. **Satu file:** `node tools/bundle.js` menghasilkan `dist/nusantara-tycoon.html`.
- **Pratinjau cepat tanpa deploy:** `dist/nusantara-tycoon.html` bisa dibuka langsung (storage tetap sesuai config).

## 9. Yang sudah dan belum diuji

**Sudah:** 12 tes unit ekonomi; smoke test browser headless (15 pengecekan: peta, kumpulkan, jual, pasar,
ongkir, buka wilayah, bangun, tab info, tanpa error JS); driver Supabase terhadap klien tiruan (muat,
simpan, jalur gagal-muat tidak menyimpan).

**Belum:**
- Koneksi nyata ke Supabase (sandbox pembuat tidak bisa menjangkaunya). Lihat checklist di bagian 2.
- Skrip smoke test browser **tidak disimpan di repo**. Disarankan menambahkannya (Playwright). Sesi 2 hanya memeriksa tangkapan layar manual.
- Harga nyata, tabel musim, dan peluang peristiwa adalah perkiraan; belum dimainkan lama.
- Keseimbangan ekonomi lewat bermain lama, dan tampilan di berbagai ukuran layar/browser selain Chrome.
- `supabase/schema.sql` belum diuji ulang bila dijalankan dua kali (akan error "policy already exists", tidak berbahaya).

## 10. Risiko dan batasan yang diketahui

1. **Bisa dicurangi di tahap 1:** state ada di klien, pemain bisa mengubah kas lewat konsol. Tidak masalah untuk uji coba
   bersama teman, **tidak boleh** dipakai untuk leaderboard atau pasar bersama.
2. **Waktu memakai jam perangkat** (`Date.now()`). Mengubah jam HP mempercepat produksi. Versi server harus memakai `now()` Postgres.
3. **Dua tab/perangkat bersamaan** saling menimpa save (last write wins). Perlu kolom versi atau pindah ke fungsi server.
4. **`pagehide` + simpan jaringan** tidak dijamin selesai bila tab ditutup mendadak.
5. **Paket gratis Supabase:** proyek bisa tertidur bila lama tidak aktif; ada batas database dan koneksi Realtime. Cek angka terbaru di dashboard.
6. **Pasar masih lokal per pemain:** tekanan pasokan hanya mencerminkan penjualan pemain itu sendiri, bukan pasar bersama.
7. **Bentuk pulau di peta perkiraan** (simpul poligon dari ingatan, resolusi 33 km/sel). Kalimantan, Nusa Tenggara, Maluku, Papua baru berupa daratan abu-abu `comingSoon`.
8. **Peta di HP lebar 760px dan bisa digeser horizontal**; chip wilayah di bawah peta memudahkan memilih pulau kecil.

## 11. Peta jalan (urutan yang disarankan)

**Tahap A: perkaya game solo (cepat terasa, risiko kecil)**
- Uji main 30-60 menit, catat bagian membosankan atau terlalu mudah, setel `config.js` dan `data/`.
- Buka wilayah baru satu per satu (tahap per wilayah: data, jarak, permintaan, bangunan, bentuk peta sudah ada).
  Ide komoditas: Kalimantan (kayu, batu bara), Nusa Tenggara (garam, pariwisata), Maluku (pala, cengkeh), Papua (tembaga, kopi).
- Pencapaian dan misi harian, event acak (musim panen, gagal panen, harga naik), efek suara dan animasi kecil
  (asap pabrik, truk di tol), tampilan bangunan yang berubah saat di-upgrade.
- Simpan skrip smoke test ke `tests/`.
- Buka Kalimantan (peta, jarak, hub, dan poligon sudah siap; tinggal komoditas, bangunan, permintaan, dan sprite). Sprite baru ditambah di `ui/sprites.js` dan slotnya di `regions.js`; tes geo memeriksa posisinya.

**Tahap B: akun dan identitas**
- Login email atau Google (ganti login anonim), nama tampilan pemain, tabel `players`.
- Migrasi satu kali dari localStorage ke cloud untuk pemain lama.

**Tahap C: multiplayer yang adil (perubahan arsitektur terbesar)**
- Pecah `game_saves` menjadi tabel: `players`, `player_regions`, `player_buildings`, `inventory`, `market_state` (dibagi semua pemain).
- Pindahkan fungsi pengubah data di `core/economy.js` ke Postgres function (`security definer`, memakai `auth.uid()` dan `now()` server),
  panggil lewat `supabase.rpc()`. Tutup tulis langsung ke tabel dengan RLS.

  | Fungsi JS sekarang | Rencana RPC |
  |---|---|
  | `collect(buildingId)` | `collect(p_building_id)` |
  | `sell(commodityId, marketId, qty)` | `sell(p_commodity_id, p_market_id, p_qty)` |
  | `upgradeBuilding(id)` | `upgrade_building(p_building_id)` |
  | `upgradeInfra(region, infra)` | `upgrade_infra(p_region_id, p_infra_id)` |
  | `unlockRegion(id)` | `unlock_region(p_region_id)` |

- Konstanta (harga dasar, biaya, laju) harus punya **satu sumber kebenaran**. Usulan: tabel `game_data` di Postgres
  yang diisi dari `js/data/*` lewat skrip, supaya JS dan SQL tidak berbeda.
- `market_state` dibagi bersama dan dipublikasikan lewat Supabase Realtime (cukup untuk pasar dan progres proyek).
- Klien tetap boleh menghitung perkiraan harga untuk tampilan, tetapi hasil resmi berasal dari server.

**Tahap D: sisi sosial**
- Proyek nasional (Tol Trans-Sumatra, pelabuhan nasional): semua pemain menyumbang kas, manfaat dinikmati semua,
  kontributor terbesar dapat gelar. Tabel `national_projects` dan `contributions`.
- Aliansi/kas wilayah, leaderboard mingguan, event musiman.

## 12. Menambah konten (ringkas)

- **Komoditas baru:** `js/data/commodities.js`. Tambahkan juga permintaan di `demand` tiap wilayah (default 1).
- **Bangunan baru:** `js/data/buildings.js`, lalu daftarkan id-nya di `buildings` milik wilayahnya di `regions.js`.
- **Membuka wilayah:** hapus `comingSoon`; isi `unlockCost`, `infraCostFactor`, `buildings`, `demand`; tambahkan jarak di
  `NT.data.distance`; tambahkan komoditas dan bangunannya. `state.normalize()` otomatis menambah wilayah baru ke save lama.
- **Infrastruktur baru** (misalnya listrik, bandara): `NT.data.infra`, lalu pakai efeknya di `economy.js`
  (`productionRate` atau `shippingPerUnit`) dan tambahkan test.
- Setelah mengubah logika: jalankan `node tests/economy.test.js`.

## 13. Pertanyaan terbuka untuk pemilik

1. Gaya visual jangka panjang: tetap peta ilustrasi 2D, atau beralih ke isometrik/pixel art dengan bangunan yang terlihat?
2. Siapa target pemain awal (teman, komunitas lokal, publik)? Ini menentukan kapan login dan anti-curang harus siap.
3. Apakah game tetap santai (idle/tycoon) atau ingin ada kompetisi antar-pemain? Itu menentukan prioritas tahap C dan D.
4. Nama final game, logo, dan nada bahasa (formal, santai, humor lokal).

## 14. Prompt untuk memulai sesi baru

Tempel ini di awal percakapan baru (sertakan zip repo atau tautan repo bila diminta):

> Saya melanjutkan proyek game web "Nusantara Tycoon" (GitHub Pages + Supabase). Baca `HANDOFF.md` di repo
> `jurkonxcode/nusantaratycoon` dulu, lalu `README.md`. Jelaskan langkah dengan perintah yang bisa disalin karena
> saya bekerja dari HP dan Codespaces. Pelajaran: selalu `git pull` sebelum mulai. Tugas hari ini: <isi di sini,
> misalnya "uji main dan setel keseimbangan", "tambahkan wilayah Kalimantan", atau "mulai tahap login dan tabel terpisah">.

## 15. Riwayat singkat keputusan

- Pemilik ingin game online berbasis web yang belum banyak ada, dengan stack GitHub + Supabase.
- Dari beberapa ide, dipilih **game ekonomi kota Indonesia** yang berkembang menjadi "membangun peradaban Nusantara":
  mengumpulkan kas dari berbagai wilayah dan membangun tol serta infrastruktur lain.
- Kekhawatiran pemilik: tidak betah di tengah jalan. Jawabannya: prototipe kecil dulu supaya bisa dirasakan sebelum investasi besar.
- Prototipe dibuat dengan folder terpisah agar mudah dikembangkan dan dipisahkan (data, logika, penyimpanan, tampilan).
- Prototipe selesai, diunggah ke repo lewat Codespaces, lalu dihubungkan ke Supabase. Ditemukan dan diperbaiki
  celah "gagal memuat lalu menimpa progres". Pemilik mulai menyukai game ini.

## 16. Sesi 3: timer pembangunan dan rasa-main (7 November 2026)

Permintaan pemilik: visual belum terasa "nagih", dan upgrade level seharusnya punya timer yang menyesuaikan.

- **State baru:** `state.jobs[]` = `{ key ('b:<id>' | 'i:<wilayah>:<infra>'), kind, id, region, from, to, startedAt, endsAt, cost }`.
  `normalize()` membuang job rusak. Tidak perlu migrasi: save lama otomatis `jobs: []`.
- **Aturan (`core/economy.js`):** `upgradeBuilding/upgradeInfra` memotong kas lalu mengantre job (durasi dari `buildDuration/infraDuration`),
  `settle(state, now)` menerapkan job yang selesai pada `endsAt` (aman dipanggil belakangan; sisa pecahan produksi dipertahankan lewat
  `rebase`), `speedup(state, key, now)` membayar `cost x 0,4 x sisa/total`. Dengan `buildTimeEnabled: false` upgrade kembali instan (dipakai tes lama).
- **Wajib saat memindah ke server (tahap C):** `settle` dan `speedup` ikut jadi Postgres function memakai `now()` server.
- **UI:** `ui/fx.js` (angka melayang, confetti, suara WebAudio, kas bergulir), kartu target, baris dengan timer dan tombol Percepat,
  lencana dan gelembung 📦 di `ui/map.js` (`tickJobs`). Gelembung bisa diketuk untuk `collect`.
- **Tes:** `tests/jobs.test.js` (10 tes). Uji browser headless (Playwright, 18 pengecekan) dijalankan manual di sesi ini, skripnya belum ada di repo.
- **Belum:** keseimbangan angka timer lewat bermain lama, sprite bangunan yang berubah per level di peta selain ukuran, misi harian, pencapaian.

## 20. Sesi 6: Paket B (7 November 2026)

**Lembar wilayah di HP** (layar < 980px). `#region-panel` kini berada di dalam `#sheet` yang naik dari bawah (tinggi maksimal 58% layar).
Ketuk pulau atau chip membuka lembar dan menggulir peta ke atas layar supaya tetap terlihat. Tutup lewat tab bilah/✕, geser ke bawah (>70px), atau Esc.
Tanpa latar gelap, jadi pulau lain di peta tetap bisa diketuk saat lembar terbuka. Di desktop `#sheet` hanya pembungkus biasa (kolom samping).
State: `view.sheet` (hanya di UI, tidak disimpan). Saat terbuka, `body.sheet-open` menambah ruang di bawah halaman dan memindahkan toast ke atas.

**Pasar informatif**
- Grafik mini per komoditas: 30 menit lalu sampai 30 menit ke depan (garis putus-putus = perkiraan), garis titik = harga normal. Data dari `E.priceSeries`
  (rumus harga yang sama dengan pasar, tekanan jual meluruh; sebelum penjualan terakhir kurvanya datar karena riwayat stok tidak disimpan). Digambar ulang tiap tick hanya saat tab Pasar aktif.
- Isyarat harga `E.priceSignal`: 🔥 bagus (>= 108% harga normal), 🕳️ rendah (<= 92%), plus petunjuk puncak dalam 30 menit bila >= 5% lebih tinggi.
- Tombol **Jual semua isi gudang** (aksi `sell-everything` -> `E.sellAll`) menjual semua komoditas ke pasar terpilih; komoditas yang akan rugi dilewati.
  Kutipan hasil bersih tampil di tombol dan di tiap kartu (`E.quoteSellAll`, `E.quoteSale`).
- **Server nanti:** `sellAll` ikut dijadikan RPC (`sell_all(p_market_id)`) di tahap C.

**Tes:** `tests/economy.test.js` menjadi 17 tes (sellAll, quoteSellAll, priceSeries, priceSignal). Baru: `tests/browser_paket_b.py` (22 pengecekan, HP 390px dan desktop 1280px).
**Catatan:** `tests/browser_smoke.py` yang disebut di bagian 0, 2, dan 18 **tidak ada di zip yang diterima sesi ini**; cek apakah ada di repo GitHub.

| Sesi | File yang berubah |
|---|---|
| 6 (paket B) | `index.html`, `css/style.css`, `js/main.js`, `js/core/economy.js`, `js/ui/panels.js`, `tests/economy.test.js`, `dist/nusantara-tycoon.html`; baru: `tests/browser_paket_b.py`; `HANDOFF.md` |

## 21. Sesi 7: Paket C (7 November 2026)

**State baru** (`core/state.js`; save lama otomatis diisi nol lewat `normalize`, tanpa migrasi): `stats`, `achievements`, `log` (maks 40, paling lama di depan), `guideHidden`.
- `stats` dihitung di `core/economy.js` lewat `stat(state, key, n)`: `collect` (dan `collectAll`) -> `collects`, `produced`; `sell` -> `sales`, `sold`, `bestSale`;
  `upgradeBuilding/Infra` -> `builds` (level 0 ke 1) atau `upgrades`; `unlockRegion` -> `unlocks`. Pengumpulan otomatis sebelum upgrade memakai `gather` (tanpa statistik).
- `playMs` ditambah 1000 tiap detik oleh loop di `main.js` selama tab terlihat. Waktu pakai jam perangkat, jadi bisa dicurangi seperti hal lain di tahap 1.

**Panduan awal** (`NT.achievements.guide(state)`): 5 langkah (kumpulkan, jual, naikkan level Sawah, bangun bangunan baru, buka wilayah).
Syarat diturunkan dari state **dan** statistik, jadi pemain lama tidak melihat panduan yang sudah terlampaui. Kartu ringkas di atas peta (ketuk untuk membuka daftar);
hilang sendiri saat selesai, atau lewat "Sembunyikan"; bisa ditampilkan lagi di Pengaturan > Bantuan. Cukup ubah `STEPS` untuk menambah/mengganti langkah.

**Pencapaian** (`NT.achievements.list`, 19 buah): tiap entri `{ id, icon, name, desc, test(state) }`. `evaluate(state, now)` menandai yang baru terpenuhi (sekali saja) dan mengembalikannya.
Dipanggil dari `checkProgress` di `main.js` setelah aksi berhasil, tiap detik, dan saat membuka game. Saat membuka game dengan lebih dari satu pencapaian baru (pemain lama) hanya muncul satu toast ringkasan.
Menambah pencapaian = satu objek di `LIST` (+ penghitung baru di `stats` bila perlu, daftarkan di `STAT_KEYS` di `state.js`).

**Tab 🏆 Capaian** (`renderStats`): 8 ubin statistik, kisi lencana (terkunci tampil 🔒 dan redup), log aktivitas (waktu relatif dihitung saat render ulang, bukan tiap detik).
Log diisi `logEvent` di `main.js` untuk: jual, pembangunan/upgrade, buka wilayah, percepat, pembangunan selesai, pencapaian. Pengumpulan hasil sengaja tidak dicatat (terlalu sering).

**Upgrade termurah**: tombol di bawah "Kumpulkan semua" (aksi `cheapest`, `E.cheapestUpgrade`): bangunan atau infrastruktur termurah yang belum dikerjakan; tidak termasuk buka wilayah.
`nextGoal` kini memakai `candidates()` yang sama (hasil ditambah `kind`, `id`, `region`). Ikut konfirmasi pembelian mahal.

**Istilah**: `GLOSSARY` di `panels.js`; elemen `button.term[data-term]` (ongkir, label panen raya/paceklik, kartu Peradaban) memicu toast penjelasan (`kind: 'info'`, tampil lebih lama sesuai panjang teks).

**Belum / catatan**
- Zoom dan geser peta yang lebih halus (butir di paket C lama) belum dikerjakan; belum jelas apa yang terasa kurang. Catat dulu dari uji main.
- Layar Selamat datang kembali belum memakai statistik atau pencapaian.
- Tidak ada hadiah kas dari pencapaian (hanya lencana); bisa jadi ide keseimbangan nanti.
- Pengaturan "Konfirmasi pembelian" masih memakai `window.confirm`.
- `tests/browser_smoke.py` tetap tidak ada di zip yang diterima (lihat bagian 20).

**Tes:** `tests/economy.test.js` menjadi 24 tes (statistik, normalize, panduan, pencapaian, termurah); `tests/browser_paket_c.py` 33 pengecekan (HP 390px, pemain lama, desktop 1280px). Paket B tetap hijau (22).

| Sesi | File yang berubah |
|---|---|
| 7 (paket C) | `index.html`, `css/style.css`, `js/main.js`, `js/core/economy.js`, `js/core/state.js`, `js/ui/panels.js`, `js/ui/toast.js`, `tests/economy.test.js`, `dist/nusantara-tycoon.html`; baru: `js/core/achievements.js`, `tests/browser_paket_c.py`; `HANDOFF.md` |


## 23. Sesi 9: sprite berubah per level (8 November 2026)

### 23.1 Yang dikerjakan

- Sprite bangunan kini punya **tiga tingkat**. Tingkat 1 = sprite dasar. Tingkat 2 dan 3 menambah hiasan di atas sprite dasar:
  - Bangunan produksi: tingkat 2 pada **level 3-5** (tumpukan peti + bendera), tingkat 3 pada **level 6 ke atas** (peti lebih banyak,
    gudang kecil, bendera di atap, kilau emas). Warna bendera/atap mengikuti komoditas (`ACCENT`).
  - Pelabuhan: tingkat 2 pada **level 3-4**, tingkat 3 pada **level 5** (peti kemas di dermaga, peti kayu, bendera, kilau).
  - Kapal dan tol tidak punya varian tingkat.
- File baru `tools/art_tiers.py` (fungsi `decorate(nama, tingkat, svg)`); `tools/make_assets.py` memanggilnya dan menulis
  `assets/sprites/<id>_t2.svg` dan `<id>_t3.svg` (14 file baru) ke `js/ui/assets.js`.
- `js/ui/map.js`: fungsi `tierName(id, tingkat)` di `dynMarkup()` memilih `<id>_t2/_t3` bila ada di `NT.assets.sprite`, kalau tidak jatuh ke sprite dasar.
- Tidak ada perubahan logika game; 24 + 10 + 18 tes tetap lolos.

### 23.2 Catatan

- `dist/nusantara-tycoon.html` naik dari sekitar 400 KB ke **727 KB** (sprite sawah paling besar; 14 SVG baru sekitar 268 KB). Bila terasa berat
  di HP: kurangi jumlah rumpun di `s_sawah` (`art_v2.py`), atau buat varian tingkat sawah dari sprite yang lebih ringan.
- Hiasan cukup halus di ukuran peta (40-50 px). Mau lebih mencolok: perbesar `gudang`/`crates` di `art_tiers.py`.
- Mengubah ambang tingkat: angka `6` dan `3` (produksi) serta `5` dan `3` (pelabuhan) di `dynMarkup()`.
- Fungsi `_unused_crane` di `art_tiers.py` sisa percobaan derek (boleh dihapus).

### 23.3 Cara menerapkan di Codespaces

```bash
cd /workspaces/nusantaratycoon && git pull
unzip -oq nusantaratycoon-update-tingkat.zip -d /tmp/upd
S=/tmp/upd
cp -r $S/assets/sprites assets/
cp $S/js/ui/map.js $S/js/ui/assets.js js/ui/
cp $S/tools/art_tiers.py $S/tools/make_assets.py tools/
cp $S/dist/nusantara-tycoon.html dist/
cp $S/HANDOFF.md .
rm nusantaratycoon-update-tingkat.zip
for t in tests/*.test.js; do node $t | tail -1; done
git add -A && git commit -m "Sprite berubah per level (tingkat 1-3)" && git push
```

### 23.4 Langkah berikutnya

Sama seperti 22.5: pastikan deploy tayang, uji main 15-20 menit, lalu pilih Kalimantan / misi harian / setel keseimbangan.

| Sesi | File yang berubah |
|---|---|
| 9 | `tools/art_tiers.py` (baru), `tools/make_assets.py`, `js/ui/map.js`, `js/ui/assets.js`, `assets/sprites/*_t2.svg`, `assets/sprites/*_t3.svg`, `dist/nusantara-tycoon.html`; `HANDOFF.md` |


## 24. Sesi 10: rapikan kecil (8 November 2026)

- **Ukuran dikecilkan.** Aset tingkat 2/3 (`<id>_t2.svg`, `<id>_t3.svg`) kini hanya **lapisan hiasan kecil** (sekitar 1-2 KB), bukan salinan penuh
  sprite. `put()` di `js/ui/map.js` menggambar sprite dasar lalu lapisan hiasan di atasnya; `tierName()` mengembalikan `[id, tingkat]`.
  `js/ui/assets.js` turun dari 531 KB ke 227 KB, `dist/nusantara-tycoon.html` dari 744 KB ke 430 KB.
  `decorate(nama, tingkat)` di `tools/art_tiers.py` kini hanya mengembalikan lapisan itu.
- **Ikon wilayah memakai ilustrasi.** Field baru `artIcon` di `js/data/regions.js` (Sumatra: kopi, Jawa: padi, Sulawesi: kakao) menunjuk ikon
  komoditas di `NT.assets.comm`. Dipakai di pin peta (`<image class="pin-img">`), tombol wilayah, judul panel, dan kartu wilayah.
  Wilayah terkunci tetap 🔒, wilayah "segera hadir" tetap '…' (judul panel memakai emoji aslinya). Wilayah baru: isi `artIcon`
  (atau biarkan kosong untuk jatuh ke emoji `icon`).
- Tes tetap 24 + 10 + 18 lolos. Belum dilihat di HP sungguhan.


## 25. Sesi 11: wilayah Kalimantan (8 November 2026)

- **Wilayah:** `kalimantan` tidak lagi `comingSoon`. `unlockCost` 6000, `infraCostFactor` 3.5 (Sulawesi: 2000 dan 2.5). Pin `[113.8, 0.0]`,
  pelabuhan `[117.9, -1.6]` (laut), slot sawit `[111.2, 0.8]` dan batubara `[115.7, -0.6]` (darat); dicek otomatis oleh `tests/world.test.js`.
  Hub Balikpapan; jarak ke wilayah lain dihitung otomatis dari koordinat hub.
- **Komoditas baru** (`js/data/commodities.js`): `sawit` (minyak sawit/CPO, Rp 14.000/kg, 1 satuan = 50 kg, harga game 17,5) dan `batubara`
  (Rp 1.600/kg, **1 satuan = 1 ton**, harga game 40). Keduanya punya musim (sawit melimpah Agu-Nov; batubara lancar Jun-Sep).
  `demand` sawit dan batubara ditambahkan di Sumatra, Jawa, Sulawesi, Kalimantan.
- **Bangunan baru** (`js/data/buildings.js`): `kebun_sawit` (biaya 4500, laju 12/mnt, balik modal sekitar 18 mnt) dan `tambang_batubara`
  (biaya 7000, laju 6/mnt, sekitar 23 mnt). Angka masih tebakan awal; cek dengan `node tools/balance.js`.
- **Ongkir:** komoditas boleh punya `freightFactor` (default 1). Batubara 0.12 karena kapal curah raksasa jauh lebih murah per kg;
  tanpa itu ongkirnya lebih mahal dari harganya. Rumus ada di `shippingPerUnit()` (`js/core/economy.js`).
- **Peristiwa baru** (`js/data/events.js`): banjir Kalimantan, kebakaran lahan, lonjakan permintaan sawit, harga batubara anjlok.
- **Seni:** `tools/art_kalimantan.py` (sprite kebun sawit dan tambang batubara, ikon sawit dan batubara); `make_assets.py` memanggilnya.
  Hiasan tingkat (`_t2`, `_t3`) otomatis dibuat juga untuk dua bangunan ini. `artIcon` wilayah = `sawit`. Sprite piksel cadangan ada di `js/ui/sprites.js`.
- **Tes:** `tests/world.test.js` menjadi 20 tes (dua tes Kalimantan baru); ekonomi 24, jobs 10.
- **Belum dilakukan:** pencapaian/panduan khusus Kalimantan, tampilan di HP sungguhan, uji keseimbangan dengan main sungguhan.
- Wilayah berikutnya yang masih `comingSoon`: Nusa Tenggara, Maluku, Papua (ikuti bagian 12).

| Sesi | File yang berubah |
|---|---|
| 11 | `js/data/commodities.js`, `js/data/buildings.js`, `js/data/regions.js`, `js/data/events.js`, `js/core/economy.js`, `js/ui/sprites.js`, `js/ui/assets.js`, `assets/sprites/*`, `assets/commodities/*`, `tools/art_kalimantan.py` (baru), `tools/make_assets.py`, `tools/art_tiers.py`, `tests/world.test.js`, `dist/nusantara-tycoon.html`; `HANDOFF.md` |


## 26. Sesi 12: penyetelan keseimbangan ekonomi (8 November 2026)

**Alat baru:** `node tools/simulate.js [jam=48] [musim=0|1]` memainkan game dengan bot serakah (panen, jual ke pasar terbaik, beli yang balik modalnya
tercepat, pakai kas lebih untuk mempercepat bangunan) dalam tiga gaya: **aktif** (cek tiap 5 menit), **santai** (tiap 60 menit), **harian** (tiap 8 jam).
Mencetak kapan wilayah terbuka, kas/pemasukan/skor per jam, porsi pendapatan tiap komoditas, dan level akhir.
Coba angka lain tanpa mengubah file: `OVR='{"storageHours":8}' node tools/simulate.js 72`.

**Temuan sebelum disetel** (hanya hasil simulasi bot, bukan pemain sungguhan):
1. Gudang hanya 2 jam: pemain yang cek 8 jam sekali hampir tidak maju (pemasukan 50/mnt setelah 8 jam, skor 113 setelah 3 hari).
2. Pemain aktif mencapai gelar tertinggi (3500 poin) dalam sekitar 4-5 jam; ambang gelar terlalu rendah dibanding laju skor (skor 200 ribu setelah seminggu).
3. Sawit dan batubara menyumbang sekitar 40% pendapatan (laju/aliran per level jauh di atas komoditas lain), dan Kalimantan terbuka lebih cepat daripada Sulawesi untuk pemain aktif.

**Perubahan:**
| Angka | Sebelum | Sesudah |
|---|---|---|
| `storageHours` (`js/config.js`) | 2 | 6 |
| Gelar (`NT.data.ranks`, `js/data/regions.js`) | 0 / 150 / 400 / 900 / 1800 / 3500 | 0 / 150 / 800 / 4000 / 20000 / 100000 |
| Kalimantan `unlockCost` | 6000 | 10000 |
| Kebun Sawit `baseRate` | 12 | 9 (balik modal sekitar 24 mnt) |
| Tambang Batubara `baseRate` | 6 | 4,5 (balik modal sekitar 30 mnt) |

Pencapaian "Kota Dagang" dan "Provinsi Makmur" kini membaca ambang dari daftar gelar (`rankMin()` di `js/core/achievements.js`), jadi tidak perlu diubah lagi saat gelar disetel.

**Hasil sesudah** (tanpa musim): aktif: Kota Dagang sekitar 20 mnt, Provinsi Makmur sekitar 2 jam, Negara Maritim sekitar 1 hari, Peradaban Nusantara sekitar 5 hari.
Santai: Kabupaten Maju sekitar 10 jam, Negara Maritim sekitar 3 hari. Harian: Provinsi Makmur sekitar 3 hari, Peradaban Nusantara sekitar 1 pekan.
Wilayah dibuka (santai): Sumatra 1 jam, Sulawesi 9 jam, Kalimantan 21 jam. Porsi pendapatan terbesar tinggal sekitar 18%.

**Belum disetel / catatan:**
- Semua ini dari bot; **uji main sungguhan tetap perlu** (apakah menunggu terasa wajar, apakah ingin kembali). Angka di tabel gampang diubah.
- Pemain aktif masih sangat cepat di jam pertama (3 wilayah dalam kurang dari 2 jam). Bila terasa kurang menantang, naikkan `unlockCost` Sulawesi atau `buildGrowth`.
- Pemasukan pemain aktif mendatar sekitar 30 ribu/mnt setelah hari pertama (biaya level naik x1,55, hasil naik linear). Bila ingin kemajuan tak terbatas: tambah infrastruktur baru, prestise, atau proyek nasional.
- Tes browser Python (`tests/browser_paket_*.py`) tidak dijalankan ulang; teks gelar dan lama gudang bisa memengaruhi pengecekannya.

| Sesi | File yang berubah |
|---|---|
| 12 | `js/config.js`, `js/data/buildings.js`, `js/data/regions.js`, `js/core/achievements.js`, `js/core/economy.js` (komentar), `tools/simulate.js` (baru), `tests/economy.test.js`, `README.md`, `dist/nusantara-tycoon.html`; `HANDOFF.md` |


## 27. Sesi 13: peta lebih realistis (8 November 2026)

**Catatan temuan:** `js/ui/terrain.js` (peta realistis dari sesi sebelumnya: garis pantai fraktal, peta ketinggian, hillshade, bioma, laut dangkal Sunda/Sahul)
sudah ada di repo tetapi **belum tercatat** di dokumen ini. Cara kerjanya: `compute()` membuat dua kanvas (laut dan darat) sekali setelah peta tampil,
lalu `attach()` memasangnya ke elemen `<image data-tex="sea|<id wilayah>">`. Geometri (path poligon) sinkron; tekstur menyusul sekitar 30 ms kemudian.
`js/ui/map.js` hanya memasang lapisan (kedalaman pulau, label, pin, sprite bangunan, kapal).

### 27.1 Yang dikerjakan

1. **Garis pantai** (`js/data/geo.js`): Kalimantan digambar ulang dengan sekitar 75 simpul (tonjolan Sarawak dan Sabah, Tanjung Mangkalihat,
   teluk Balikpapan, pantai selatan yang datar, tonjolan Pontianak) menggantikan bentuk membulat sebelumnya. Daratan tetangga (`neighbor`) kini
   berisi Semenanjung Malaya yang lebih lebar dan **Papua Nugini** (jalur sempit di tepi timur, sehingga Papua tidak terpotong lurus).
2. **Relief** (`terrain.js`): `VOLCANOES` (17 gunung api: Merapi, Semeru, Bromo, Agung, Rinjani, Tambora, Kerinci, dst.) menambah kerucut ke peta ketinggian
   dengan kawah kecil; `shade` hillshade otomatis membuatnya tampak berbentuk. Tekstur kanopi (derau frekuensi tinggi) membuat hutan tidak rata.
3. **Danau** (`LAKES`): Toba (elips miring), Poso, Towuti, Singkarak, Ranau. Digambar di tekstur darat sebagai air dengan tepi pasir tipis.
4. **Sungai** (`RIVERS`, `drawRivers()`): 16 sungai besar (Kapuas, Barito, Mahakam, Kayan, Rajang, Batang Hari, Musi, Mamberamo, Digul, Bengawan Solo, dst.),
   berkelok, melebar ke muara, dan dipotong otomatis agar hanya tampil di daratan (`source-atop`).
5. **Laut**: batimetri lebih halus (landai 26 px dari tepi paparan benua, bukan tepi tajam), garis kontur tipis di tepi paparan,
   dan riak memanjang searah angin yang lebih jelas di laut dalam.
6. **Warna**: sawah Jawa tidak lagi hijau neon; daratan tetangga lebih abu-abu agar jelas bukan wilayah yang bisa dimainkan.

**Dicoba lalu dibuang:** lapisan awan melayang. Di peta gelap awan terlihat seperti pulau abu-abu dan membingungkan; keterbacaan lebih penting.

### 27.2 Cara menyetel

- Tambah/ubah gunung api, danau, atau sungai: edit larik `VOLCANOES`, `LAKES`, `RIVERS` di `terrain.js` (koordinat [bujur, lintang]).
- Sungai terlalu tipis/tebal: `wdt` di `drawRivers()`. Relief terlalu lembut/keras: pengali `7` pada `shade` dan `r0 = 5.2 * K` pada kerucut gunung api.
- Mengubah bentuk pulau: edit simpul di `geo.js`; `tests/world.test.js` menjaga slot bangunan tetap di darat dan pelabuhan tetap di laut.
- Waktu hitung tekstur naik sedikit (kerucut, sungai, danau). Bila terasa berat di HP lama: kecilkan `K` (kanvas 2x menjadi 1x) di bagian atas `terrain.js`.

### 27.3 Belum dilakukan / risiko

- **Bentuk pulau masih perkiraan dari ingatan** (tidak ada data geografi resmi di lingkungan kerja). Sulawesi, Papua, Sumatra bagian utara, dan Nusa Tenggara
  belum sedetail Kalimantan. Cara paling akurat: ambil poligon Natural Earth 10m (domain publik), sederhanakan, dan tempel ke `geo.js`.
- Gunung api, danau, dan sungai hanya terlihat jelas bila layar peta dekat ukuran penuh; di HP kecil sebagian halus sekali.
- Belum dilihat di HP sungguhan setelah deploy. `tests/browser_paket_*.py` belum dijalankan ulang.
- Wilayah Nusa Tenggara, Maluku, Papua masih `comingSoon`; Papua dan Maluku sudah punya bentuk dan relief siap pakai.

### 27.4 Cara menerapkan di Codespaces

```bash
cd /workspaces/nusantaratycoon && git pull
unzip -oq nusantaratycoon-update-peta-realistis.zip -d /tmp/upd
cp /tmp/upd/js/data/geo.js js/data/
cp /tmp/upd/js/ui/terrain.js /tmp/upd/js/ui/map.js js/ui/
cp /tmp/upd/dist/nusantara-tycoon.html dist/
cp /tmp/upd/HANDOFF.md .
rm nusantaratycoon-update-peta-realistis.zip
for t in tests/*.test.js; do node $t | tail -1; done   # harus 25 + 10 + 20 tes lolos
git add -A && git commit -m "Peta lebih realistis: Kalimantan, relief, danau, sungai, laut" && git push
```

### 27.5 Prompt untuk sesi berikutnya

> Saya melanjutkan proyek game web "Nusantara Tycoon" (GitHub Pages + Supabase). Baca `HANDOFF.md` di repo `jurkonxcode/nusantaratycoon`
> dulu (terutama bagian 26 dan 27), lalu `README.md`. Jelaskan langkah dengan perintah yang bisa disalin karena saya bekerja dari HP dan
> Codespaces; selalu `git pull` sebelum mulai. Login ditunda. Tugas hari ini: <pilih: "perhalus bentuk Sulawesi dan Papua" / "buka wilayah Nusa Tenggara"
> / "misi harian" / "uji main dan setel keseimbangan">.

| Sesi | File yang berubah |
|---|---|
| 13 | `js/data/geo.js`, `js/ui/terrain.js`, `js/ui/map.js`, `dist/nusantara-tycoon.html`; `HANDOFF.md` |


## 28. Sesi 14: durasi level tinggi, penjualan berwaktu, ekspor (8 November 2026)

**Durasi upgrade** (`core/economy.js`, `growth()`): level 0-2 tetap x`buildGrowth` (1,9) per level; mulai level 2 x`buildGrowthLate` (2,4); infra x`infraGrowthLate` (3,0).
Batas atas `maxDurationHours` (72). Contoh Sawah: 10 dtk, 19 dtk, 36 dtk, 1,4 mnt, 3,3 mnt, 7,9 mnt ... level 8 sekitar 1,9 jam, level 10 sekitar 11 jam.

**Penjualan berwaktu** (`saleTimeEnabled`): `sell()` mengeluarkan barang dari gudang dan membuat `state.shipments[]`; **harga dikunci saat berangkat, kas masuk saat tiba** (`settleShipments`).
Lokal (pasar = wilayah asal komoditas) 15 dtk, lewat truk, tanpa slot, dipercepat tol. Antar pulau 2 mnt + 0,02 mnt/km, dipercepat pelabuhan asal+tujuan, memakai **slot kapal** (`shipSlotsBase` 4 + 1 per level pelabuhan di semua wilayah).

**Ekspor** (`data/exports.js`, `exportGoods`): Singapura 1 jam, Tiongkok 6, Jepang 10, India 14, Belanda 36 jam (dikurangi sampai 30% oleh pelabuhan asal). Syarat level pelabuhan wilayah asal (`minPort`),
muatan maks `exportBatchPerPort` x level pelabuhan, harga lebih tinggi per komoditas, ongkir `exportFreightFactor`, tekanan pasar terpisah (`market['export:<id>']`).

**State baru:** `shipments[]`, `stats.exports`, `market['export:*']` (save lama otomatis kosong lewat `normalize`).
**UI:** kartu Pengiriman (timer) dan kartu Ekspor di tab Pasar (`panels.js`), aksi `ship-export` di `main.js`. **Server nanti:** `settleShipments`, `exportGoods` ikut jadi RPC memakai `now()` server.
**Tes:** `tests/timing.test.js` (11). Total 25 + 10 + 11 + 20 lolos. **Belum:** diuji di browser, keseimbangan angka lewat bermain, percepat kiriman dengan uang, `tools/simulate.js` belum memodelkan waktu kirim.


## 29. Sesi 15: Fase 1, klasifikasi ekspor (8 November 2026)

**Data** (`data/commodities.js`): tiap komoditas punya `exportClass` (`bebas` | `terbatas` | `domestik`) dan, bila `terbatas`, `exportRule: { needBuilding?, quotaPct? }`.
Sekarang: padi = `domestik`; batubara = `terbatas` dengan `quotaPct: 0.25` (DMO); lainnya `bebas`. Permintaan padi dihapus dari `data/exports.js`.
**Logika** (`core/economy.js`): `exportClassOf`, `exportStatus(state, cid)` (`{cls, ok, reason}`; reason selalu menjelaskan cara membuka), `exportPlan(cid, qty)` (pecah `dmoQty` dan `exportQty`).
`exportGoods` menolak komoditas yang tidak boleh. Kuota DMO: `floor(qty x quotaPct)` otomatis dijual tunai di pasar wilayah asal (menambah tekanan stok), sisanya berlayar. Hasil `exportGoods` kini punya `dmoQty` dan `dmoNet`.
`needBuilding` sudah didukung tetapi belum dipakai data apa pun; aktif di Fase 5 (smelter) tanpa ubah kode.
**UI** (`panels.js`, `main.js`, `css/style.css`): lencana 🌍/🔒/🏠 di kartu pasar dan kartu Ekspor; komoditas domestik disembunyikan dari daftar ekspor dan dijelaskan di catatan kartu; pesan sukses menyebut potongan DMO.
**Tes:** `tests/export.test.js` (10 baru); `tests/timing.test.js` tes ongkir kini memakai sawit (bukan padi). Total 25 + 10 + 10 + 11 + 20 lolos. **Tidak ada perubahan state/save.**
**Belum:** diuji di browser; keseimbangan DMO 25%; fakta resmi aturan ekspor belum ditulis ke layar Info (cek BPS/ESDM/Kemendag dulu).

| Sesi | File yang berubah |
|---|---|
| 15 | `js/data/commodities.js`, `js/data/exports.js`, `js/core/economy.js`, `js/ui/panels.js`, `js/main.js`, `css/style.css`, `tests/export.test.js` (baru), `tests/timing.test.js`, `dist/nusantara-tycoon.html`; `HANDOFF.md` |


## 30. Sesi 16: Fase 2a, komoditas dan bangunan baru di Jawa (8 November 2026)

**Komoditas baru** (`data/commodities.js`, semua dari Jawa, dengan musim 12 bulan): `teh` (bebas), `gula` (domestik), `tembakau` (bebas), `garam` (domestik, `freightFactor` 0,5 karena curah murah).
**Bangunan baru** (`data/buildings.js`, `data/regions.js`): `tambak_garam` (biaya 250, 20/mnt), `kebun_teh` (800, 2,2/mnt), `kebun_tebu` (1200, 3,5/mnt, menghasilkan gula), `kebun_tembakau` (1600, 1,1/mnt). Pendapatan level 1 sekitar 50-77/menit, balik modal 5-21 menit (sejajar bangunan lama).
Slot peta (jatuh di daratan, jarak antar slot >= 22 px): garam [107.5,-6.2], teh [106.8,-7.1], tebu [111.6,-8.0], tembakau [114.2,-8.3]. Permintaan wilayah lain diisi (`demand`); ekspor teh dan tembakau ke Singapura/Jepang/Belanda (`data/exports.js`). Gula dan garam tidak punya tujuan ekspor.
**Aset:** `tools/art_jawa.py` (baru) membuat 4 sprite dan 4 ikon; `make_assets.py` dan `art_tiers.py` (warna aksen) diperluas; hiasan `_t2`/`_t3` otomatis. `js/ui/assets.js` dibangun ulang (aset lama tidak berubah byte-nya). Sprite memakai SVG biasa (3-28 KB, setara kebun kopi/sawah).
**Tes:** `tests/jawa.test.js` (10 baru). `economy.test.js` tes `cheapestUpgrade` kini memaksimalkan SEMUA bangunan Jawa (bukan hanya 2). Total 25 + 10 + 10 + 10 + 11 + 20 lolos. Save lama aman (normalize mengisi bangunan baru level 0).
**Belum:** sprite dan ikon belum dilihat di browser (lingkungan pembuat tidak punya perender SVG): cek tampilan di peta dan tab Pasar; keseimbangan angka lewat bermain; fakta resmi (BPS/Kementan) untuk layar Info.
**Berikutnya:** 2b Sumatra (selesai di sesi 18, bagian 32).

| Sesi | File yang berubah |
|---|---|
| 16 | `js/data/{commodities,buildings,regions,exports}.js`, `js/ui/assets.js`, `tools/{art_jawa,make_assets,art_tiers}.py`, `assets/sprites/{kebun_teh,kebun_tebu,kebun_tembakau,tambak_garam}{,_t2,_t3}.svg`, `assets/commodities/{teh,gula,tembakau,garam}.svg`, `tests/jawa.test.js` (baru), `tests/economy.test.js`, `dist/nusantara-tycoon.html`; `HANDOFF.md` |

---

## 31. Sesi 17: Tahap Z1, zoom dan geser peta (8 November 2026)

Rencana ada di `HANDOFF-LANJUTAN-2.md` (bagian 4). Hanya Z1 yang dikerjakan; Z2 (tekstur tajam, label, penggaris km) dan Z3 (geometri akurat) belum.

**Cara kerja.** Zoom mengubah atribut `viewBox` SVG (bukan CSS scale), jadi sprite dan garis tetap tajam. Logika hitungan murni di `js/core/viewport.js` (`fitScale`, `limits`, `clampView`, `toWorld`, `zoomAt`, `panBy`, `centerOn`, `fitView`, `viewBoxOf`, `serialize`, `restore`, `pinch`); kode DOM di `js/ui/map.js` (bagian "Zoom dan geser"). State `view = { x, y, scale }`, `scale` = piksel layar per satuan peta. Batas: minimum = seluruh peta muat di kotak; maksimum = yang lebih besar dari 4x minimum atau 2,4 px/satuan (agar HP cukup besar). Semua angka ada di `NT.config.map` (`maxZoom`, `maxPx`, `fitMinPx`, `startPx`, `tapSlop`, `storeKey`).
**Input** (Pointer Events): satu jari/mouse menggeser; dua jari pinch (titik tengah ikut menggeser); roda mouse zoom ke kursor (bila sudah paling jauh dan menggulung ke bawah, halaman yang menggulung); ketuk dua kali di laut zoom 2x (di atas pulau atau gelembung tidak, supaya tidak bentrok dengan memilih pulau); tombol + / - / reset (44 px, `aria-label`, mati di batas). Gerakan di bawah 6 px dianggap ketukan. Pointer capture baru dipasang setelah melewati ambang (supaya ketukan tetap sampai ke pulau). `focus(regionId)` kini animasi 300 ms (instan bila "Hemat animasi" menyala atau `prefers-reduced-motion`); di desktop tidak mengubah zoom, di HP minimal 0,81 px/satuan.
**Tata letak.** `.map-scroll` bukan lagi kotak gulir: `overflow: hidden`, `touch-action: none`. Desktop: rasio peta (`--map-ar`). HP (<760 px): tinggi `clamp(280px, 44vh, 440px)`; aturan lama `min-width: 760px` dihapus. Tampilan awal: seluruh peta bila "pas layar" >= 0,5 px/satuan (desktop, tablet); kalau tidak (HP), zoom 0,81 di sekitar Jawa. Patokannya skala, bukan lebar layar (kolom peta desktop 1280 px hanya sekitar 708 px).
**Penyimpanan.** Posisi disimpan di `localStorage['nusantara-tycoon-mapview-v1']` sebagai `{cx, cy, z}` (pusat dan zoom relatif "pas layar", jadi tahan layar diputar). Terpisah dari save game dan tidak ke Supabase. Data rusak diabaikan.
**Tes:** `tests/viewport.test.js` (12 baru, Node). `tests/browser_zoom.py` (39 pengecekan: desktop 1280 dengan mouse dan HP 390 dengan sentuhan sungguhan lewat CDP, termasuk pinch). Dijalankan di Chromium; Safari/iOS dan perangkat asli BELUM. Total Node: 25 + 10 + 10 + 10 + 11 + 12 + 20 lolos. Paket C: 33 lolos. Paket B: 21 lolos, 1 gagal ("Pasar: kas bertambah") yang SUDAH gagal sebelum sesi ini (identik pada kode asli): penjualan sejak sesi 14 berwaktu, kas masuk setelah barang tiba; tes perlu menunggu atau disesuaikan.
**Diketahui.**
- Tekstur relief masih K=2, jadi buram di atas sekitar 2x (jadwal Z2). Label pulau dan sprite ikut membesar tanpa aturan tingkat detail (Z2).
- Penelan klik pasca-geser (`click` fase capture) adalah lapisan cadangan: di Chromium pointer capture sudah mencegah klik pulau, jadi tes tidak bisa membuktikan lapisan ini (mutasi lolos). Dibuat untuk browser yang berbeda (Safari iOS); uji di iPhone.
- Tombol zoom (pojok kanan atas) menutupi kompas dekoratif di SVG pada tampilan penuh.
- Roda mouse di atas peta memperbesar peta, bukan menggulung halaman (kecuali sudah paling jauh dan menggulung ke bawah).
- Performa pan di HP lama belum diukur: viewBox berubah tiap bingkai pada SVG dengan banyak filter CSS (`drop-shadow`). Bila tersendat, kurangi filter saat `.dragging`.
**Berikutnya:** Z2, atau 2b Sumatra (timah, lada, minyak bumi); lihat `HANDOFF-LANJUTAN-2.md` bagian 6 untuk pertanyaan terbuka.

| Sesi | File yang berubah |
|---|---|
| 17 | baru: `js/core/viewport.js`, `tests/viewport.test.js`, `tests/browser_zoom.py`; diubah: `js/ui/map.js`, `js/config.js`, `index.html`, `css/style.css`, `dist/nusantara-tycoon.html`; `HANDOFF.md` |

---

## 32. Sesi 18: Fase 2b, Sumatra (timah, lada, minyak bumi) (8 November 2026)

Mengikuti resep `HANDOFF-LANJUTAN-3.md` bagian 3, pola sama dengan Fase 2a.

**Yang ditambah.**
- Komoditas: `lada` (`bebas`), `timah` (`bebas`), `minyak` (`terbatas`, `exportRule: { quotaPct: 0.25 }`, `freightFactor: 0.35`, satuan 1 barel = 136 kg). Musim 12 bulan untuk semuanya.
- Bangunan: `kebun_lada` (1500 / 0,55), `tambang_timah` (3800 / 0,28), `sumur_minyak` (5000 / 7). Terdaftar di wilayah Sumatra dengan slot peta `[105.2,-4.9]`, `[106.1,-2.1]`, `[101.0,1.6]`.
- Permintaan 3 komoditas di keempat wilayah yang bisa dimainkan (Sumatra 0,9, lainnya 1,1 sampai 1,4) dan di pasar ekspor (lihat `js/data/exports.js`).
- Aset: `tools/art_sumatra.py` (3 sprite, 3 ikon), terhubung ke `make_assets.py` dan `art_tiers.py` (warna aksen). `assets.js` naik dari sekitar 380 KB ke 451 KB; `dist/` 704 KB. Aset lama tidak berubah (dibandingkan berkas demi berkas).
- Ikon emoji lada sengaja 🟤 (⚫ sudah dipakai batubara).

**Keputusan yang saya ambil sendiri (belum dikonfirmasi pemilik, mudah diubah di `commodities.js`).** Lada dan timah `bebas`; minyak `terbatas` kuota dalam negeri 25% (sama dengan DMO batubara). Rencana HANDOFF-LANJUTAN-3: timah jadi `terbatas` + `needBuilding` (smelter) di Fase 5.

**Keseimbangan** (`node tools/balance.js`, balik modal level 1 di pasar terbaik): lada 17,0 mnt, timah 16,8 mnt, minyak 17,5 mnt (sasaran 5 sampai 25). Kurva tidak patah. Harga nyata (lada Rp 100.000/kg, timah Rp 500.000/kg, minyak Rp 9.000/kg) adalah perkiraan kasar, **perlu verifikasi** ke sumber resmi.

**Tes:** `tests/sumatra.test.js` (12 baru). Semua tes Node lolos: 25, 10, 10, 10, 12 (sumatra), 11, 12, 20. `economy.test.js` (`cheapestUpgrade`) tidak perlu diubah.

**Belum / diketahui.**
- Sprite dan ikon baru hanya dilihat sebagai gambar SVG terpisah (Chromium), BELUM di dalam peta dan tab Pasar. Risiko utama: tumpukan sprite `sumur_minyak` dan pin Sumatra (31 px, lolos aturan 22 px). Cek di HP.
- Titik `tambang_timah` (Bangka) jatuh di daratan menurut raster, tetapi polygon pulau kecil itu kasar.
- `node tools/simulate.js` tidak berguna sejak sesi 14: bot tetap di kas 50 dan sawah level 1, **identik pada kode sebelum perubahan ini** (bot belum memahami penjualan berwaktu). Jadi simulasi 48 jam TIDAK memvalidasi kemajuan permainan. Perlu diperbaiki sendiri.
- Tes browser (`browser_*.py`) tidak dijalankan di sesi ini.
- Fakta aturan ekspor minyak/timah belum diverifikasi, jangan ditulis ke layar Info.

| Sesi | File yang berubah |
|---|---|
| 18 | `js/data/{commodities,buildings,regions,exports}.js`, `js/ui/assets.js`, `tools/{art_sumatra,make_assets,art_tiers}.py` (baru: `art_sumatra.py`), `assets/sprites/{kebun_lada,tambang_timah,sumur_minyak}*.svg`, `assets/commodities/{lada,timah,minyak}.svg`, `tests/sumatra.test.js`, `dist/nusantara-tycoon.html`, `HANDOFF.md` |

## 33. Sesi 19: peta diganti dengan SVG kabupaten/kota MapChart (8 November 2026)

Pemilik meminta peta lama (poligon digambar dari ingatan) digantikan oleh `MapChart_Map.svg` dan `MapChart_CSV_Export..csv` dari `data_nusantara_tycoon.zip`. Ini mengerjakan sebagian **Z3** (garis pantai akurat) lebih awal; `cellDeg` tetap 0,3 dan `cellPx` 6 (belum 0,15), jadi Z2 dan sisa Z3 belum dikerjakan. Sesi ini tidak menyentuh Fase 2c/2d.

**Cara kerja.** `tools/build_geo.py` (baru) membaca `tools/geo_src/MapChart_Map.svg`, mengubah koordinat SVG menjadi bujur/lintang, mengelompokkan 516 kabupaten/kota ke 7 wilayah game, merasterkan, mengambil kontur luar, menyederhanakannya (toleransi 0,03 derajat, pulau < 0,008 derajat persegi dibuang), lalu **menulis ulang `js/data/geo.js`**. Jangan edit `geo.js` dengan tangan; ubah skripnya dan jalankan `python3 tools/build_geo.py` (tambah `--preview` untuk `/tmp/geo_preview.png`). Peta lama disimpan di `tools/geo_src/geo_hand_drawn.js`.
- **Kalibrasi:** SVG ternyata proyeksi equirectangular. `lon = 0,0576125 x + 93,847`, `lat = 6,99829 - 0,0574196 y`. Galat terhadap 30 koordinat kota yang saya ketahui: rata-rata 0,04 derajat (sekitar 4 km), terburuk 0,18 (Palangka Raya, karena centroid poligon kota bukan titik pusat kota).
- **Pengelompokan:** Bali, NTB, NTT, Maluku, Maluku Utara, Kep. Seribu, dan Kep. Riau/Bangka-Belitung/Natuna lewat daftar nama; sisanya lewat suara titik-titik cincin terhadap poligon lama, dengan aturan koordinat cadangan (22 kabupaten). Jumlah per wilayah cocok dengan jumlah kabupaten/kota nyata: Sumatra 154, Jawa 121 (119 + 2 waduk), Sulawesi 81, Kalimantan 56, Bali-Nusra 41, Maluku 21, Papua 42.
- **Tetangga:** Semenanjung Malaya dan Papua Nugini tetap dari peta lama. Sarawak/Sabah/Brunei dan Timor Leste TIDAK ada di SVG, jadi diturunkan dari peta lama dikurangi daratan Indonesia baru (hanya di kotak koordinat yang hilang, lalu dibuka-morfologi). Bentuknya kasar, hiasan saja.
- **CSV:** isinya hanya 516 nama (semua `#ffff33`, tanpa label), identik dengan id path SVG. Dipakai untuk memeriksa nama, tidak ada atribut lain yang bisa dimasukkan ke game.

**Perubahan lain.** Dua slot jatuh ke laut karena pantai kini akurat; digeser sedikit (aturan jarak >= 22 px tetap lolos): `kebun_tembakau [114.2,-8.3] -> [114.0,-7.9]` (Jawa Timur), `kebun_cengkeh [124.0,1.05] -> [124.7,1.3]` (Minahasa). Pelabuhan dan hub tidak berubah. `dist/` 721 KB -> 767 KB. Atribusi lisensi di `tools/geo_src/ATRIBUSI.txt`.

**Efek yang terlihat.** Bali kini poligon sendiri (bukan menyambung Jawa); Natuna, Anambas, Kep. Riau masuk wilayah Sumatra; Timor Timur jadi daratan tetangga (tidak bisa dimainkan); Kalimantan hanya sisi Indonesia (Sarawak/Sabah jadi tetangga).

**Diuji:** semua tes Node lolos (25, 10, 10, 10, 12, 11, 12, 20). Tes browser: `browser_zoom` 39/0, `browser_paket_c` 33/0, `browser_paket_b` 21/1 (kegagalan lama "Pasar: kas bertambah", bukan dari perubahan ini). Satu tangkapan layar desktop Chromium: peta tampil wajar.

**BELUM diuji / risiko (jujur).**
- Belum dilihat di HP sungguhan, dan tidak diperbesar di zoom tinggi. Pantai lebih rinci: periksa tumpukan sprite dan label di pulau kecil.
- Sungai, danau, gunung api di `terrain.js` ditaruh tangan untuk peta lama; tidak saya periksa ulang terhadap pantai baru (sungai dipotong otomatis ke daratan, jadi paling parah tampak lebih pendek).
- Pantai disederhanakan; sebagian pulau kecil (< 0,008 derajat persegi) hilang. Turunkan `GEO_MINAREA` bila ada yang kurang.
- Waduk Cirata dan Kedungombo ikut sebagai daratan Jawa (tidak digambar sebagai air).
- Lisensi CC BY-SA 4.0: turunan ini wajib atribusi dan share-alike; pemilik perlu memutuskan lisensi repo.
- Fase 2b (Sumatra) di bagian 32 belum dilihat di peta baru: slot minyak/timah/lada lolos tes daratan, tetapi tumpukan sprite belum dilihat.

| Sesi | File yang berubah |
|---|---|
| 19 | `js/data/geo.js` (dibangun ulang), `js/data/regions.js` (2 slot), `tools/build_geo.py` (baru), `tools/geo_src/*` (baru), `dist/nusantara-tycoon.html`, `HANDOFF.md` |

## 34. Sesi 20: Tahap Z2, tekstur tajam, ukuran UI mengikuti zoom, penggaris km (8 November 2026)

Melanjutkan `HANDOFF-LANJUTAN-3.md` bagian 5 (Z2 dikerjakan sebelum 2c/2d karena peta makin padat). **Fase 2c/2d TIDAK dikerjakan**: isi komoditasnya ada di `HANDOFF-LANJUTAN.md` bagian 9 dan berkas itu tidak ada di unggahan sesi ini. Z3 sebagian sudah lewat sesi 19; `cellDeg` masih 0,3.

**1. Tekstur tajam untuk jendela yang terlihat** (`js/ui/terrain.js`).
- `compute(o)` kini menerima jendela `o = { x, y, w, h, k }` (satuan viewBox, `k` = piksel kanvas per satuan; tanpa argumen = seluruh peta pada `K = 2`, persis perilaku lama). Derau memakai koordinat dunia, jadi jendela mana pun sama dengan potongan peta penuh, hanya lebih tajam. Vinyet, bayangan pantai (`sh`), sungai, gunung api, punggung bukit ikut dikonversi.
- Jarak ke pantai (`dt`) dihitung di dalam jendela, maka jendela diberi tepi `EDGE = 30` satuan (jarak terjauh yang dipakai 26) di luar area yang dipasang.
- `refine(svg, rect, need, maxPx)`: area pakai = bagian terlihat + cadangan geser 20% (dibulatkan ke satuan utuh), `k = min(8, need, sqrt(maxPx / luas jendela dengan tepi))` dan harus > K. Hasilnya (laut JPEG, darat PNG) dipasang sebagai `<image class="hi">` tepat setelah gambar dasar (laut; tiap pulau dan tetangga dengan `clip-path` yang sama), jadi urutan lapisan sprite tidak berubah. `clearRefine` membuang dan mencabut URL blob. Hasil async yang basi dibuang lewat penghitung `gen`.
- Pemicu di `js/ui/map.js` (`queueRefine` / `doRefine`): 350 ms setelah zoom atau geser berhenti (tidak saat menggeser atau animasi); `need = skala x min(devicePixelRatio, 2)`; bila `need <= 2` gambar tajam dibuang (peta dasar cukup). Biaya dibatasi oleh ukuran LAYAR, bukan peta: `texMaxPx = 2.400.000` piksel kanvas per render (termasuk tepi).
- Angka di `NT.config.map`: `refineDelay`, `maxDpr`, `texMaxPx`.

**2. Ukuran elemen UI mengikuti zoom.** `--ui-k` dan `--ui-kb` ditulis ke `<svg>` setiap bingkai (`updateScaleUi`, logika murni `NT.viewport.uiScale`). Label pulau, nama laut, dan pin mengecil (dalam satuan peta) di atas 1 px layar per satuan sehingga ukuran di layar kira-kira tetap (batas bawah 30%); gelembung 📦 dan lencana 🔨 mengecil lebih pelan (pangkat 0,45, batas 60%) supaya tetap enak diketuk. Diterapkan lewat properti CSS `scale` pada grup DALAM (`.ui-s`, `.ui-b`) karena grup luar punya atribut `transform="translate(...)"` yang ikut terskala bila `scale` dipasang di situ. **Sprite bangunan sengaja tidak diskalakan** (benda di peta, ikut membesar); kompas dekoratif juga tidak.

**3. Penggaris km** (`.map-ruler`, pojok kiri bawah kotak peta, `aria-hidden`). `NT.viewport.scaleBar` memilih panjang 1-2-5 x 10^n km terbesar yang muat 110 px. Satu satuan peta = 0,05 derajat = 5,566 km di khatulistiwa (kesalahan < 2% di lintang peta).

**Tes.** Node: `viewport.test.js` 14 (2 baru: `uiScale`, `scaleBar`); semua Node: 25, 10, 10, 10, 12, 11, 14, 20 lolos. Browser: `tests/browser_z2.py` (18 baru, Chromium desktop dan HP dpr 3 dengan sentuhan): potongan jendela identik dengan potongan peta penuh (maks selisih 8 dari 255, rata-rata 0,0002; sisa selisih kemungkinan pembulatan jumlah segmen sungai, tidak diselidiki), debounce, 9 gambar tajam terpasang, area tajam mengikuti geser, dibuang saat reset, label tidak membesar 4x, penggaris, tanpa galat JS. `browser_zoom` 39/0, `browser_paket_c` 33/0, `browser_paket_b` 21/1 (kegagalan lama "Pasar: kas bertambah").

**BELUM diuji / risiko (jujur).**
- Waktu render tajam di HP sungguhan. Di Chromium desktop headless sekitar 1,5 detik sampai gambar terpasang (termasuk jeda 350 ms), tetapi komputasinya berjalan di thread utama dan HP lama bisa beberapa kali lebih lambat; selama itu peta tersendat sebentar. Bila terasa, turunkan `texMaxPx` (mis. 1.200.000) atau `maxDpr` ke 1,5; solusi bersih = Web Worker + OffscreenCanvas (belum dikerjakan).
- Memori: satu render memegang sekitar 24 byte per piksel kanvas untuk larik sementara (sampai ~58 MB pada 2,4 juta piksel) selain kanvas; belum diukur di HP.
- Properti CSS `scale` pada elemen SVG: didukung Chrome 104+, Safari 14.1+, Firefox 72+; hanya diuji di Chromium. Safari/iOS belum.
- Tepi area tajam: di luar area pakai tampak tekstur dasar (lebih buram) sampai render ulang selesai; tidak ada jahitan warna yang terlihat di tangkapan layar, tetapi belum diperiksa di semua pulau.
- Sprite besar di zoom maksimum (sekitar 96 px pada 2,4 px/satuan) belum dinilai nyaman atau tidak.
- Tombol zoom masih menutupi kompas dekoratif (catatan lama, belum diubah; pertanyaan 4 di bagian 8 HANDOFF-LANJUTAN-3).

**Berikutnya (urutan usulan).** (a) Pemilik: jalankan di HP, laporkan tersendat atau tidak. (b) Beri `HANDOFF-LANJUTAN.md` (bagian 9) agar Fase 2c Sulawesi dan 2d Kalimantan bisa dikerjakan; keputusan kelas ekspor timah, lada, minyak (bagian 3.4) masih menunggu konfirmasi. (c) Z3 sisa: `cellDeg` 0,3 menjadi 0,15 bersama Fase 6.

| Sesi | File yang berubah |
|---|---|
| 20 | `js/ui/terrain.js`, `js/ui/map.js`, `js/core/viewport.js`, `js/config.js`, `css/style.css`, `tests/viewport.test.js`, `tests/browser_z2.py` (baru), `dist/nusantara-tycoon.html`, `HANDOFF.md` |

## 35. Sesi 21: audit dan perbaikan kecil (8 November 2026)

Pemilik mengunggah repo (commit `a4954861`) dan meminta game diperiksa lalu disempurnakan. Sesi ini audit: semua tes dijalankan, game dibuka di Chromium desktop (1280x800) dan HP (390x780, dpr 2) dengan save buatan (4 wilayah terbuka, semua bangunan Lv 4).

**Temuan audit.** Game berjalan tanpa galat JS. Sprite Sumatra (lada, timah, minyak) tampil di peta dan tidak bertumpuk berat; sprite Jawa juga tampil. Fase 2b dan Z2 sudah ada di repo, sedangkan `HANDOFF-LANJUTAN-3.md` masih menganggapnya belum.

**Diperbaiki.**
1. Tombol zoom menutupi kompas (desktop) dan pin Kalimantan (HP). Kompas dipindah ke `NT.raster.toPx(135.2, 2.4)` (`js/ui/map.js`); di layar < 760 px tombol zoom 38 px dan lebih dekat ke tepi (`css/style.css`).
2. Tes lama `browser_paket_b.py` "Pasar: kas bertambah" gagal sejak sesi 14 karena penjualan berwaktu. Sekarang menguji bahwa penjualan menjadi kiriman berjalan. Hasil 22 lolos, 0 gagal.
3. `tools/simulate.js` tidak lagi macet di kas 50: bot memanggil `E.settleShipments` dan menjual lewat truk ke wilayah asal bila slot kapal penuh. Simulasi 48 jam sekarang bermakna.

**Hasil simulasi 48 jam (angka kasar, bot serakah, bukan pemain nyata).** Aktif (cek tiap 5 menit): sekitar 57 rb/mnt, 3 wilayah terbuka dalam 5 jam. Santai (tiap 60 menit): sekitar 14 rb/mnt. Harian (tiap 8 jam): sekitar 0,6 rb/mnt, hanya Jawa. **Selisih pemain harian dan aktif sekitar 100x**: bahan keputusan desain (gudang penuh 6 jam, waktu bangun). Belum diubah.

**Belum diuji.** HP sungguhan, Safari/iOS, dan Fase 2c/2d (butuh `HANDOFF-LANJUTAN.md` bagian 9, tidak ada di unggahan).

| Sesi | File yang berubah |
|---|---|
| 21 | `js/ui/map.js`, `css/style.css`, `tests/browser_paket_b.py`, `tools/simulate.js`, `dist/nusantara-tycoon.html`, `HANDOFF.md` |

## 36. Sesi 22: perombakan tata letak, navigasi, dan audit sentuhan (8 November 2026)

Permintaan pemilik: struktur tata letak, navigasi, panel, dan header lebih modern dan profesional, lebih mudah dipakai, audit jangkauan sentuhan, informasi lebih mudah dipahami.
Pendekatan: CSS-first. Semua `id`, `data-action`, dan kelas yang dipakai JS dan tes dipertahankan; blok CSS baru ada di akhir `css/style.css` ("Sesi 22").

**Audit awal (HP 390 px):** 97 kontrol di bawah 44 px (chip wilayah 32, segmen pasar 32, tombol Jual 34, tombol geser 30, zoom 38, gelembung 📦 18, istilah inline 17). Header + tab memakai sekitar 140 px dan kartu panduan + target + musim sekitar 250 px sebelum peta.

**Yang diubah.**
1. **Header satu baris** (sticky): logo, nama, gelar, pil Kas (desktop: + perkiraan pemasukan per menit) dan Peradaban (desktop: + persen menuju gelar berikut). Desktop: merek, menu, dan angka dalam satu baris (`.topbar { display: contents }` + grid).
2. **Navigasi bawah di HP/tablet (< 980 px)**: `nav.tabs` tetap satu elemen, di-`position: fixed` di dasar layar (zona jempol, 52 px + area aman iPhone), ikon di atas label, penanda emas pada tab aktif. Tab Pengaturan berlabel "Atur". Desktop: tab berbentuk pil di header.
3. **Lembar wilayah dan toast** menempel tepat di atas navigasi bawah (`--nav-h`); toast saat lembar terbuka turun di bawah header (`--head-h`).
4. **Kartu status** (target, musim) bergaya terang dan ringkas; peta memakai tinggi `clamp(260px, 38vh, 440px)` di HP sehingga peta, chip, dan tombol aksi masuk layar pertama.
5. **Area sentuh >= 44 px** untuk semua kontrol utama: tombol, chip, segmen, zoom peta (44), tombol geser (tinggi 44, jalur 30), gelembung 📦 (lingkaran sentuh transparan `r=30`, `.bubble-hit`), ringkasan lipat. Istilah inline (ongkir, panen raya/paceklik) 32-33 px karena berada di dalam teks (WCAG 2.2, 2.5.8).
6. **Informasi lebih jelas:** tombol berbiaya yang belum terjangkau terisi sebanyak kas yang ada (`--fill`, ditulis di `tick`), baris pemasukan per menit di header, persen menuju gelar, penjelasan pasar dilipat (`details.how`). Teks tidak kurang dari 12 px (kecuali sumbu grafik 11 px).
7. Lebar tombol di baris panel seragam (158 px), judul kartu memakai font sans.

**Tes.** Baru `tests/browser_touch.py` (34 pengecekan: HP 360/390, tablet 768, desktop 1280): ukuran sentuh, header <= 90 px, navigasi menempel di dasar, isi akhir tidak tertutup, 5 tab muat, gelembung >= 36 px, tanpa luapan dan galat. `browser_paket_b.py` disesuaikan: lembar kini menempel di atas navigasi, bukan di dasar layar. Hijau: Node 25/10/10/10/12/11/14/20; browser paket B 22, paket C 33, layout 30, zoom 39, Z2 18, touch 34.

**Belum diuji / risiko.** HP dan Safari/iOS sungguhan (area aman, `dvh`, `:has`), pembaca layar, huruf "Sangat besar" di navigasi bawah (label 12 px tidak ikut skala, cek di Pengaturan > Ukuran teks), tombol zoom yang menutupi pin di tepi kanan peta HP (ukuran 44 px menggantikan 38 px).

| Sesi | File yang berubah |
|---|---|
| 22 | `index.html`, `css/style.css`, `js/ui/panels.js`, `js/ui/map.js`, `tests/browser_paket_b.py`, `tests/browser_touch.py` (baru), `dist/nusantara-tycoon.html`, `HANDOFF.md` |

## 37. Sesi 23: geser peta lebih mulus (8 November 2026)

Keluhan pemilik: penarikan peta kurang smooth dan kurang stabil.
**Penyebab terukur:** peta berisi 45 sprite `.art` berfilter `drop-shadow` dan sekitar 35 animasi CSS (gelembung 📦 `bob`, denyut pin) yang ikut digambar ulang di setiap bingkai geser; peta juga berhenti mendadak saat jari lepas.
**Perubahan.** (1) `js/ui/map.js`: kelas `.moving` pada `.map-scroll` selama geser, pinch, luncur, dan animasi zoom; CSS (blok "Sesi 23" di akhir `css/style.css`) mematikan filter bayangan dan menjeda animasi selama kelas itu aktif. (2) Luncur (inertia) setelah geseran satu jari: kecepatan dari jejak 100 ms terakhir, meluruh eksponensial (konstanta 325 ms), berhenti di tepi peta; mati bila "Hemat animasi". Menyentuh peta menghentikan luncuran.
**Dicoba dan dibuang:** `contain: layout paint` dan `will-change: contents` pada peta membuat bingkai lebih buruk (p50 16,7 menjadi 50 ms di HP); jangan dipakai lagi.
**Tes.** `browser_zoom.py` 41 (tes geser disesuaikan: jari berhenti dulu sebelum lepas; tes luncur baru). Perf (CPU 4x, headless): HP zoom awal bingkai terburuk 117 menjadi 50 ms; HP diperbesar 100 menjadi 83 ms.
**Belum diuji:** HP sungguhan (rasa luncuran: konstanta 325 ms dan ambang 0,15 px/ms di `glide`).

## 38. Sesi 24: Fase 3, sistem populasi (8 November 2026)

Mengikuti `HANDOFF-LANJUTAN.md` bagian 3 dengan "alternatif sederhana" (3.5): kebutuhan penduduk tidak menguras gudang pemain.

**Model (`js/core/population.js`, murni, dites di Node; semua konstanta di `config.js` blok `population`):**
1. **Kepuasan** tiap kategori (pangan, sandang, energi) = min(1, pasokan / kebutuhan + swasembada). Pasokan = laju produksi bangunan penghasil komoditas kebutuhan itu x bobot (`data/regions.js` `popNeeds`: pangan padi/gula 0,5/garam 0,1; sandang batik; energi minyak/batubara sebagai pendekatan listrik) x jangkauan (wilayah sendiri 1; dari wilayah lain 0,1 + 0,225 x (level pelabuhan asal + tujuan), maks 1). Kebutuhan = penduduk x (6 / 0,8 / 4 per menit).
2. **Kesejahteraan** = 100 x (0,5 pangan + 0,25 sandang + 0,25 energi) x bonus (3% per level tol + pelabuhan, maks 20%), maks 100. Awal Jawa tepat 50 (stabil).
3. **Pertumbuhan** per jam: pop x (1 + 0,02 x (kesejahteraan - 50)/50), dibatasi **daya tampung** (1,6 x penduduk awal + 0,3 per level infrastruktur baru **Perumahan**) dan lantai 60% penduduk awal. Dihitung dari timestamp (langkah 0,5 jam, maks 72 jam offline).
4. **Pekerja**: 20 per indeks penduduk; tiap level bangunan butuh 0,5. Produksi wilayah x max(0,5, tersedia/dibutuhkan), maks 1 (tidak ada bonus). Dipasang di `economy.productionRate`.
5. **Pasar**: harga jual wilayah x (pop/pop awal)^0,35 (awal = 1, jadi keseimbangan awal tidak berubah); kedalaman pasar x pop^0,6 (batas 0,5 sampai 3). Ekspor tidak terpengaruh.
6. **Pajak**: kas per menit = pop x kesejahteraan/100 x 16, dihitung dari timestamp (`population.settle`, dipanggil tiap detik, saat memuat, dan saat kembali ke tab). **Sengaja tidak masuk `totalEarned`**: langkah panduan awal "Kumpulkan/Jual" memakai `totalEarned > 0` sebagai tanda sudah berdagang; bila pajak masuk, panduan selesai sendiri setelah 10 detik (ketahuan oleh `browser_layout.py`). Pajak dicatat di `stats.tax` dan dihitung di skor peradaban.
7. **UI**: kotak "Penduduk" di panel wilayah (jiwa perkiraan, kesejahteraan, tiga bilah kebutuhan, peringatan pekerja, petunjuk apa yang kurang, pajak, daya tampung); baris Perumahan di Infrastruktur; pajak ikut di pemasukan per menit; toast pajak setelah pergi lama; istilah `kesejahteraan` dan `pekerja` di glosarium.

**Perubahan lain yang perlu diketahui:** `applyJob` kini rebase SEMUA bangunan wilayah (pekerja dipakai bersama), dan upgrade tanpa timer mengamankan hasil seluruh wilayah. `normalPrice/unitPrice` menerima `state` opsional. `state.population` dan `infra.perumahan` ditambahkan di `state.js` (save lama aman: diisi nilai awal, tanpa pajak surut). Tes lama `economy.test.js` (upgrade termurah) disesuaikan karena Perumahan Rp 350 kini kandidat termurah.

**Tes.** Baru: `tests/population.test.js` (15), `tests/browser_population.py` (14). Hijau: Node 25/10/10/10/15/12/11/14/20; browser paket B 22, paket C 33, layout 30, Z2 18. `browser_zoom.py`: 40 lolos, 1 gagal ("pin Jawa terlihat setelah reset", HP) **juga gagal di repo asli** sebelum perubahan ini; tidak diselidiki. `browser_perf.py` melewati anggaran di sandbox ini dengan angka sebanding repo asli (mesin sandbox lebih lambat); bandingkan di mesin pemilik.

**BELUM dikerjakan / belum diuji (jujur):**
- **Keseimbangan belum disetel.** `tools/simulate.js` belum memuat `population.js`, jadi bot tidak tahu pajak, pekerja, atau Perumahan (bot tidak akan membeli Perumahan). Semua angka di blok `population` adalah tebakan awal; Fase 9. Risiko terbesar: lantai pekerja 50% di Sulawesi/Kalimantan (penduduk awal kecil) pada level bangunan tinggi, dan pertumbuhan 2%/jam yang mungkin terlalu pelan untuk sesi pendek.
- Wilayah baru yang dibuka tanpa pelabuhan mulai dengan kesejahteraan rendah (pangan hanya swasembada 20% + 10% jangkauan); penduduknya turun pelan sampai lantai 60%. Disengaja (mengajarkan pelabuhan), tetapi belum diuji rasanya.
- Kenaikan kelas kota (Desa, Kota Kecil, Metropolitan) dan struktur yang dibuka per kelas (3.4) belum ada. Tab "Info wilayah" (bagian 4) dan kebutuhan listrik (Fase 4) belum ada. Tabel `player_regions` Supabase belum disentuh (populasi ikut di state JSON yang sama).
- Pasokan memakai laju produksi tanpa musim, sehingga paceklik tidak menurunkan kesejahteraan. Pekerja memakai laju sesaat untuk jendela produksi yang belum dikumpulkan (selisih kecil karena gudang maks 6 jam).
- Angka jiwa nyata (indeks x 150 juta) hanya perkiraan kasar; perlu verifikasi BPS sebelum dipakai di layar Info.
- HP sungguhan dan Safari/iOS belum dicoba; tangkapan layar hanya Chromium headless.

| Sesi | File yang berubah |
|---|---|
| 24 | `js/core/population.js` (baru), `js/core/state.js`, `js/core/economy.js`, `js/config.js`, `js/data/regions.js`, `js/data/buildings.js`, `js/main.js`, `js/ui/panels.js`, `css/style.css`, `index.html`, `tests/population.test.js` (baru), `tests/browser_population.py` (baru), `tests/economy.test.js`, `dist/nusantara-tycoon.html`, `HANDOFF.md` |
