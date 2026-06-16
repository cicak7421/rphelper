import { createClient } from '@supabase/supabase-js';

const DISCORD_API = 'https://discord.com/api/v10';
const ADMIN = 0x8n;
const MANAGE_GUILD = 0x20n;

function setCors(req, res) {
  const origin = process.env.DASHBOARD_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
}

async function discordFetch(path, token, bearer = true) {
  const response = await fetch(DISCORD_API + path, {
    headers: { Authorization: (bearer ? 'Bearer ' : 'Bot ') + token }
  });
  const data = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, data };
}

async function getSupabaseUser(supabaseUrl, serviceKey, accessToken) {
  const response = await fetch(supabaseUrl.replace(/\/$/, '') + '/auth/v1/user', {
    headers: {
      apikey: serviceKey,
      Authorization: 'Bearer ' + accessToken
    }
  });
  const data = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, data };
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

function fail(res, status, error) {
  return res.status(status).json({ ok: false, error });
}

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'POST') {
    return fail(res, 405, 'Method not allowed.');
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;
    const botToken = process.env.DISCORD_TOKEN || process.env.BOT_TOKEN;

    if (!supabaseUrl || !serviceKey) return fail(res, 500, 'Supabase env belum lengkap.');
    if (!botToken) return fail(res, 500, 'Discord bot token env belum diisi.');

    const auth = req.headers.authorization || '';
    const accessToken = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    const body = req.body || {};

    if (!accessToken) return fail(res, 401, 'Missing Supabase access token.');
    if (!body.providerToken) return fail(res, 400, 'Missing Discord provider token.');
    if (!body.guildId) return fail(res, 400, 'Missing guildId.');

    const userResult = await getSupabaseUser(supabaseUrl, serviceKey, accessToken);
    if (!userResult.ok || !userResult.data?.id) {
      return fail(res, 401, 'Invalid Supabase session. Silakan logout lalu login ulang Discord.');
    }
    const user = userResult.data;

    const discordUser = await discordFetch('/users/@me', body.providerToken, true);
    if (!discordUser.ok) return fail(res, 401, 'Discord provider token invalid. Silakan login ulang Discord.');

    const expectedDiscordId = discordIdFromSupabaseUser(user);
    if (expectedDiscordId && expectedDiscordId !== discordUser.data.id) {
      return fail(res, 403, 'Discord user tidak cocok dengan Supabase session.');
    }

    const guilds = await discordFetch('/users/@me/guilds', body.providerToken, true);
    if (!guilds.ok || !Array.isArray(guilds.data)) return fail(res, 403, 'Gagal membaca daftar server user.');

    const guild = guilds.data.find(item => item.id === String(body.guildId));
    if (!guild) return fail(res, 403, 'User tidak ada di server ini.');
    if (!canManage(guild)) return fail(res, 403, 'User bukan owner/admin/manage server.');

    const botGuild = await discordFetch('/guilds/' + body.guildId, botToken, false);
    if (!botGuild.ok) return fail(res, 403, 'Bot belum ada di server ini atau token bot tidak valid.');

    const supabase = createClient(supabaseUrl, serviceKey);

    await supabase.from('dashboard_guild_access').upsert({
      user_id: user.id,
      discord_user_id: discordUser.data.id,
      guild_id: String(body.guildId),
      guild_name: botGuild.data.name || guild.name,
      can_manage: true,
      verified_at: new Date().toISOString()
    }, { onConflict: 'user_id,guild_id' });

    const [channels, roles] = await Promise.all([
      discordFetch('/guilds/' + body.guildId + '/channels', botToken, false),
      discordFetch('/guilds/' + body.guildId + '/roles', botToken, false)
    ]);

    return res.status(200).json({
      ok: true,
      guild: { id: botGuild.data.id, name: botGuild.data.name, icon: botGuild.data.icon || null },
      channels: channels.ok && Array.isArray(channels.data)
        ? channels.data.map(c => ({ id: c.id, name: c.name, type: c.type, parent_id: c.parent_id || null }))
        : [],
      roles: roles.ok && Array.isArray(roles.data)
        ? roles.data.map(r => ({ id: r.id, name: r.name, position: r.position })).sort((a, b) => b.position - a.position)
        : []
    });
  } catch (error) {
    console.error(error);
    return fail(res, 500, 'Internal dashboard API error.');
  }
}
