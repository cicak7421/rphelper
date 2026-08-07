# RP Assistence Dashboard Setup

Dashboard ini memakai GitHub Pages untuk frontend, Supabase untuk auth/database, dan API kecil di hosting bot untuk validasi owner/admin server.

## File utama

- `dashboard.html` — UI dashboard customer/admin server.
- `assets/js/dashboard.js` — login Discord, pilih server, validasi, dan simpan config.
- `assets/css/dashboard.css` — style dashboard.
- `bot-api/dashboard-api.js` — API validator yang dijalankan di hosting bot.

## Supabase Auth

Aktifkan Discord provider di Supabase Auth, lalu gunakan scope:

```text
identify guilds
```

Callback URL sesuaikan dengan domain GitHub Pages/custom domain dashboard.

## Hosting bot API

Jalankan file API di hosting bot:

```bash
node bot-api/dashboard-api.js
```

ENV yang dibutuhkan:

```env
DASHBOARD_API_PORT=8787
DASHBOARD_ORIGIN=https://rpassistence.my.id
SUPABASE_URL=isi_url_supabase
SUPABASE_SERVICE_KEY=isi_service_role_key
DISCORD_TOKEN=isi_token_bot
```

Setelah API punya URL publik, isi file `assets/js/supabase-config.js`:

```js
window.RP_ASSISTENCE_DASHBOARD_API = "https://domain-api-bot-lu";
```

## Database minimal

Buat table `dashboard_guild_access` untuk menyimpan hasil verifikasi server. Dashboard juga memakai table bot yang sudah ada: `ai_chat_config`, `welcome_configs`, dan `ticket_configs`.

```sql
create table if not exists public.dashboard_guild_access (
  user_id uuid not null,
  discord_user_id text not null,
  guild_id text not null,
  guild_name text,
  can_manage boolean not null default false,
  verified_at timestamptz not null default now(),
  primary key (user_id, guild_id)
);
```
