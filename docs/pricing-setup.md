# Setup Harga Dinamis (admin.html → pricing.html)

Sekarang harga paket **tidak lagi diedit lewat GitHub**. Alurnya:

`admin.html` (form "Kelola Harga Paket") → API `api/admin/pricing.js` di Vercel → tabel `pricing_plans` di Supabase → API publik `api/pricing.js` → `pricing.html` menampilkannya otomatis.

Kalau API/tabel belum ada atau gagal diakses, `pricing.html` otomatis jatuh ke data cadangan di `assets/js/pricing-data.js` (paket Starter/Professional/Enterprise yang sudah ada sekarang), jadi halaman tidak pernah kosong.

## 1. Buat tabel di Supabase

Buka **Supabase → SQL Editor** pada project yang sama dengan yang dipakai `changelogs`, lalu jalankan:

```sql
create table if not exists public.pricing_plans (
  id uuid primary key default gen_random_uuid(),
  plan_key text unique not null,
  emoji text default '',
  name text not null,
  caption text default '',
  price text not null,
  price_color text default 'gf',
  period text default '',
  popular boolean not null default false,
  card_style text default '',
  features jsonb not null default '[]'::jsonb,
  cta_text text default 'Pilih Paket',
  cta_href text default 'contact.html',
  cta_style text default 'pb-o',
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pricing_plans enable row level security;

-- Baca publik diperbolehkan (dipakai api/pricing.js dengan service/anon key server-side,
-- tapi policy ini juga aman kalau suatu saat dibaca langsung dari frontend)
create policy "Public read pricing_plans"
  on public.pricing_plans for select
  using (true);
```

Tidak perlu env var baru di Vercel — `api/pricing.js` dan `api/admin/pricing.js` memakai `SUPABASE_URL` dan `SUPABASE_SERVICE_KEY` yang sudah kamu isi untuk fitur changelog.

## 2. (Opsional) Migrasi 3 paket yang sudah ada

Supaya data awal sama seperti sekarang, isi tabel dengan 3 baris ini (boleh dijalankan sekali via SQL Editor, atau cukup input manual lewat form admin — hasil akhirnya sama):

```sql
insert into public.pricing_plans (plan_key, emoji, name, caption, price, price_color, period, popular, card_style, features, cta_text, cta_href, cta_style, sort_order)
values
('starter', '🌱', 'Starter', 'Gratis selamanya', 'Rp0', 'gf', '/ bulan · tidak perlu kartu kredit', false, '',
 '[{"text":"Ticket system","note":"(maks 3 panel)","included":true},
   {"text":"Ticket Wizard, Status, Staffconfig","included":true},
   {"text":"HR System (wizard, action, employee list)","included":true},
   {"text":"Welcome & Goodbye wizard","included":true},
   {"text":"AI Chat channel","included":true},
   {"text":"SSRP Image Gen","note":"(3×/hari)","included":true},
   {"text":"Ad Count","note":"(1 sesi aktif)","included":true},
   {"text":"Giveaway","note":"(2/hari)","included":true},
   {"text":"Embed","note":"(maks 5 total) · Announce (3/hari)","included":true},
   {"text":"Server Stats, Forum, Name Change","included":true},
   {"text":"Ads Wizard & Rekap Iklan","included":false},
   {"text":"Payroll · Tax · Bank Virtual","included":false}]'::jsonb,
 'Invite Gratis', '__INVITE__', 'pb-o', 1),

('professional', '⚡', 'Professional', 'Untuk server aktif & tim bisnis', 'Rp10rb', 'gi', '/ bulan per server', true, 'pop',
 '[{"text":"Semua fitur Starter","included":true,"strong":true},
   {"text":"Ticket panel","note":"(maks 6)","included":true},
   {"text":"Ads Wizard & /adsrekap otomatis","included":true},
   {"text":"SSRP Image Gen","note":"(6×/hari)","included":true},
   {"text":"Ad Count","note":"(3 sesi aktif)","included":true},
   {"text":"Giveaway","note":"(5/hari)","included":true},
   {"text":"Embed","note":"(10/hari) · Announce (6/hari)","included":true},
   {"text":"Embed warna custom","included":true},
   {"text":"Prioritas support","included":true},
   {"text":"Payroll · Tax · Bank Virtual","included":false}]'::jsonb,
 'Upgrade Sekarang', 'contact.html', 'pb-i', 2),

('enterprise', '💎', 'Enterprise', 'Untuk komunitas & bisnis besar', 'Rp15rb', 'gv', '/ bulan per server', false, 'ent',
 '[{"text":"Semua fitur Professional","included":true,"strong":true},
   {"text":"Ticket panel","note":"unlimited","included":true},
   {"text":"Payroll otomatis + manual run","included":true},
   {"text":"Tax Wizard (auto dari /accept, per divisi)","included":true},
   {"text":"Bank Virtual (balance · withdraw · transfer)","included":true},
   {"text":"SSRP Image Gen","note":"unlimited","included":true},
   {"text":"Ad Count","note":"unlimited sesi","included":true},
   {"text":"Giveaway","note":"(10/hari)","included":true},
   {"text":"Embed & Announce","note":"unlimited","included":true},
   {"text":"Dedicated support & onboarding","included":true}]'::jsonb,
 'Hubungi Kami', 'contact.html', 'pb-v', 3);
```

Kolom `price_color` pakai kode: `gf` = netral, `gi` = biru, `gv` = emas (mengikuti warna tier Professional/Enterprise di desain baru).

## 3. Cara pakai sehari-hari

Panel harga di `admin.html` sekarang terbagi jadi 3 bagian, dari yang paling cepat sampai paling lengkap:

1. **Update Cepat Harga** — paling atas. Cukup ganti angka di kolom harga sebuah paket lalu klik **Simpan Harga**. Ini dipakai kalau kamu cuma mau naik/turunin harga tanpa mengubah apa pun yang lain (fitur, caption, dll).
2. **Kelola Paket & Fitur** — form lengkap untuk menambah paket baru atau mengubah semuanya (nama, caption, harga, gaya kartu, tombol, dan daftar fitur).
   - Daftar fitur sekarang berupa **baris-baris terpisah**, bukan lagi teks dengan format `|` — tiap fitur punya kolom sendiri: teks fitur, catatan (opsional), centang "Termasuk" (centang = ✓ hijau, kosongkan = – tidak termasuk), dan centang "Tebal" (dipakai untuk baris seperti "Semua fitur Starter"). Klik **+ Tambah Fitur** untuk menambah baris, tombol ↑/↓ untuk mengubah urutan, dan ✕ untuk menghapus satu baris.
   - Di sebelah kanan form ada **pratinjau langsung** yang menampilkan kartu paket persis seperti tampilannya di halaman Harga, ter-update otomatis saat kamu mengetik — jadi tidak perlu bolak-balik buka `pricing.html` untuk mengecek hasilnya.
3. **Paket Tersimpan** — daftar semua paket yang ada. Klik **Edit** untuk membuka paket itu di form "Kelola Paket & Fitur", atau **Hapus** untuk menghapusnya.

Semua perubahan langsung tampil di `pricing.html` begitu disimpan (tanpa deploy, tanpa GitHub). Login admin & hak akses memakai sesi yang **sama** dengan fitur Update & Changelog — tidak perlu login dua kali.
