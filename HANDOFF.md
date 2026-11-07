# HANDOFF: Nusantara Tycoon

Dokumen serah-terima untuk melanjutkan proyek di sesi baru (dengan Claude atau siapa pun).
Terakhir diperbarui: 7 November 2026 (sesi 2: dunia nyata + peta pixel art).

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
| Deploy GitHub Pages | Perlu dikonfirmasi (Settings > Pages > `main` / root) |
| Login (email/Google), leaderboard, pasar bersama, proyek nasional | Belum ada |
| Wilayah Kalimantan, Nusa Tenggara, Maluku, Papua | Hanya kerangka di peta (`comingSoon`) |

**Checklist yang perlu dikonfirmasi pemilik di awal sesi berikutnya:**

- [ ] Situs tayang di `https://jurkonxcode.github.io/nusantaratycoon/`
- [ ] Setelah bermain sebentar, tabel `game_saves` di Supabase punya satu baris
- [ ] Muat ulang halaman mempertahankan kas dan level
- [ ] Authentication > Sign In / Providers > **Anonymous sign-ins** menyala
- [ ] Tidak ada toast "Gagal memuat data tersimpan" saat game dibuka

Kalau toast itu muncul, penyebab tersering: login anonim belum menyala, SQL belum sukses, atau
tag script `supabase-js` di `index.html` masih dikomentari.

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
  storage/
    local-storage.js        driver localStorage
    supabase-storage.js     driver Supabase (satu baris JSON per pemain)
    index.js                NT.getStorage() memilih driver
  ui/
    toast.js                notifikasi
    sprites.js              sprite pixel art 8x8 (bangunan, pelabuhan, kapal)
    map.js                  peta pixel art SVG (dibuat sekali; kelas dan lapisan dinamis diperbarui)
    panels.js               panel wilayah, tab pasar, tab info, tick
  main.js                   menyambungkan data, aksi pemain, loop, simpan
supabase/schema.sql         tabel game_saves + RLS (tahap 1) + rencana tabel (tahap 2)
tests/economy.test.js       tes logika inti tanpa browser (musim/peristiwa dimatikan)
tests/world.test.js         tes musim, peristiwa, ongkir km, dan geografi peta
tools/balance.js            cetak harga, ongkir, jarak, dan waktu balik modal tiap bangunan
tools/bundle.js             membuat dist/nusantara-tycoon.html (satu file) untuk pratinjau
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
