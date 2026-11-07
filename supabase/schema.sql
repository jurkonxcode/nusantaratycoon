-- Skema awal Supabase untuk Nusantara Tycoon. BELUM DIUJI: jalankan di SQL Editor
-- pada proyek percobaan dulu.
--
-- TAHAP 1: satu baris JSON per pemain (cocok dengan js/storage/supabase-storage.js).
-- TAHAP 2+: pindahkan ke tabel terpisah dan Postgres function (lihat bagian bawah).

-- ============ TAHAP 1: simpan state ============

create table if not exists public.game_saves (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  state      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.game_saves enable row level security;

create policy "baca save sendiri" on public.game_saves
  for select using (auth.uid() = user_id);

create policy "buat save sendiri" on public.game_saves
  for insert with check (auth.uid() = user_id);

create policy "ubah save sendiri" on public.game_saves
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "hapus save sendiri" on public.game_saves
  for delete using (auth.uid() = user_id);

-- ============ TAHAP 2: rencana tabel multiplayer (belum dipakai) ============
-- players(id, display_name, cash, total_earned, created_at)
-- player_regions(player_id, region_id, unlocked, tol_level, port_level)
-- player_buildings(player_id, building_id, level, last_collected)
-- inventory(player_id, commodity_id, qty)
-- market_state(region_id, commodity_id, stock, updated_at)      -- dibagi semua pemain
-- national_projects(id, name, goal, progress)                   -- tol, pelabuhan nasional
-- contributions(project_id, player_id, amount)
--
-- Aturan penting (sell, collect, upgrade, unlock) dibuat sebagai Postgres function
-- (create function ... security definer) dan tabel di atas dikunci dengan RLS
-- agar pemain tidak bisa mengubah kas atau stok langsung lewat API.
