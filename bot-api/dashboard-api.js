// Bot-hosted validator API for RP Assistence Dashboard
// Jalankan di hosting bot: node bot-api/dashboard-api.js
import http from 'http';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const PORT = Number(process.env.DASHBOARD_API_PORT || 8787);
const ORIGIN = process.env.DASHBOARD_ORIGIN || '*';
const DISCORD_API = 'https://discord.com/api/v10';
const ADMIN = 0x8n;
const MANAGE_GUILD = 0x20n;

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const botToken = process.env.DISCORD_TOKEN || process.env.BOT_TOKEN;

function send(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  });
  res.end(JSON.stringify(data));
}

async function readBody(req) {
  return await new Promise(resolve => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { resolve({}); }
    });
  });
}

async function discordFetch(path, token, bearer = true) {
  const res = await fetch(DISCORD_API + path, { headers: { Authorization: (bearer ? 'Bearer ' : 'Bot ') + token } });
  const data = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data };
}

function discordIdFromSupabaseUser(user) {
  const meta = user.user_metadata || {};
  if (meta.provider_id) return String(meta.provider_id);
  if (meta.sub) return String(meta.sub);
  if (meta.id) return String(meta.id);
  const identity = (user.identities || []).find(item => item.provider === 'discord');
  return identity?.identity_data?.sub || identity?.identity_data?.provider_id || identity?.id || null;
}

function canManage(guild) {
  const perms = BigInt(guild.permissions || '0');
  return Boolean(guild.owner) || (perms & ADMIN) === ADMIN || (perms & MANAGE_GUILD) === MANAGE_GUILD;
}

async function verifyRequest(req, body) {
  const auth = req.headers.authorization || '';
  const accessToken = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!accessToken) return { ok: false, status: 401, error: 'Missing Supabase access token.' };
  if (!body.providerToken) return { ok: false, status: 400, error: 'Missing Discord provider token.' };
  if (!body.guildId) return { ok: false, status: 400, error: 'Missing guildId.' };
  if (!botToken) return { ok: false, status: 500, error: 'Bot token env belum diisi.' };

  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData?.user) return { ok: false, status: 401, error: 'Invalid Supabase session.' };

  const discordUser = await discordFetch('/users/@me', body.providerToken, true);
  if (!discordUser.ok) return { ok: false, status: 401, error: 'Discord provider token invalid.' };

  const expectedDiscordId = discordIdFromSupabaseUser(userData.user);
  if (expectedDiscordId && expectedDiscordId !== discordUser.data.id) {
    return { ok: false, status: 403, error: 'Discord user tidak cocok dengan Supabase session.' };
  }

  const guilds = await discordFetch('/users/@me/guilds', body.providerToken, true);
  if (!guilds.ok || !Array.isArray(guilds.data)) return { ok: false, status: 403, error: 'Gagal membaca daftar server user.' };
  const guild = guilds.data.find(item => item.id === String(body.guildId));
  if (!guild) return { ok: false, status: 403, error: 'User tidak ada di server ini.' };
  if (!canManage(guild)) return { ok: false, status: 403, error: 'User bukan owner/admin/manage server.' };

  const botGuild = await discordFetch('/guilds/' + body.guildId, botToken, false);
  if (!botGuild.ok) return { ok: false, status: 403, error: 'Bot belum ada di server ini atau token bot tidak valid.' };

  await supabase.from('dashboard_guild_access').upsert({
    user_id: userData.user.id,
    discord_user_id: discordUser.data.id,
    guild_id: String(body.guildId),
    guild_name: botGuild.data.name || guild.name,
    can_manage: true,
    verified_at: new Date().toISOString()
  }, { onConflict: 'user_id,guild_id' });

  return { ok: true, user: userData.user, discordUser: discordUser.data, guild: botGuild.data };
}

async function guildDetails(req, res) {
  const body = await readBody(req);
  const verified = await verifyRequest(req, body);
  if (!verified.ok) return send(res, verified.status, verified);

  const [channels, roles] = await Promise.all([
    discordFetch('/guilds/' + body.guildId + '/channels', botToken, false),
    discordFetch('/guilds/' + body.guildId + '/roles', botToken, false)
  ]);

  return send(res, 200, {
    ok: true,
    guild: { id: verified.guild.id, name: verified.guild.name, icon: verified.guild.icon || null },
    channels: channels.ok && Array.isArray(channels.data) ? channels.data.map(c => ({ id: c.id, name: c.name, type: c.type, parent_id: c.parent_id || null })) : [],
    roles: roles.ok && Array.isArray(roles.data) ? roles.data.map(r => ({ id: r.id, name: r.name, position: r.position })).sort((a, b) => b.position - a.position) : []
  });
}

async function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 200, { ok: true });
  if (req.method === 'GET' && req.url === '/health') return send(res, 200, { ok: true, service: 'rp-assistence-dashboard-api' });
  if (req.method === 'POST' && req.url === '/api/dashboard/guild-details') return guildDetails(req, res);
  return send(res, 404, { ok: false, error: 'Not found.' });
}

http.createServer((req, res) => {
  handler(req, res).catch(error => {
    console.error(error);
    send(res, 500, { ok: false, error: 'Internal dashboard API error.' });
  });
}).listen(PORT, () => console.log('RP Assistence Dashboard API running on port ' + PORT));
