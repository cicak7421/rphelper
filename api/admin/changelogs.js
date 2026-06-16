import { createClient } from '@supabase/supabase-js';

const TABLE = 'changelogs';
const ADMIN_LOGIN_HASH = '33e16205130dcfddfbbf48d4b75ec557eb3ba1e05ebc5f38ed296eb9e6118938';

function setCors(req, res) {
  const origin = process.env.DASHBOARD_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Auth');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
}

function fail(res, status, error) {
  return res.status(status).json({ ok: false, error });
}

function getAdminAuth(req) {
  return String(req.headers['x-admin-auth'] || '');
}

function isAdmin(req) {
  return getAdminAuth(req) === ADMIN_LOGIN_HASH;
}

function getSupabaseKey() {
  return process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

function client() {
  const url = process.env.SUPABASE_URL;
  const key = getSupabaseKey();
  if (!url) throw new Error('SUPABASE_URL belum diisi di Vercel.');
  if (!key) throw new Error('SUPABASE_SERVICE_KEY atau SUPABASE_ANON_KEY belum diisi di Vercel.');
  return createClient(url, key);
}

function friendlyError(error) {
  const msg = String(error?.message || error || 'Unknown error');
  if (msg.toLowerCase().includes('invalid api key')) {
    return 'Invalid Supabase API key di Vercel. Update env SUPABASE_SERVICE_KEY dengan service_role key yang benar, lalu redeploy Vercel.';
  }
  return msg;
}

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === 'OPTIONS') return res.status(200).json({ ok: true });
  if (!isAdmin(req)) return fail(res, 401, 'Unauthorized admin session. Login ulang admin.');

  try {
    const sb = client();

    if (req.method === 'GET') {
      const { data, error } = await sb
        .from(TABLE)
        .select('id, version_title, summary, details, created_by, created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return res.status(200).json({ ok: true, data: data || [] });
    }

    if (req.method === 'POST') {
      const payload = req.body || {};
      if (!payload.version_title || !payload.summary) return fail(res, 400, 'Judul dan ringkasan wajib diisi.');
      const { data, error } = await sb
        .from(TABLE)
        .insert([{ version_title: payload.version_title, summary: payload.summary, details: payload.details || [], created_by: payload.created_by || 'Staff RP Assistence' }])
        .select('id, version_title, summary, details, created_by, created_at')
        .single();
      if (error) throw error;
      return res.status(200).json({ ok: true, data });
    }

    if (req.method === 'DELETE') {
      const id = req.query?.id || req.body?.id;
      if (!id) return fail(res, 400, 'ID changelog wajib diisi.');
      const { error } = await sb.from(TABLE).delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    return fail(res, 405, 'Method not allowed.');
  } catch (error) {
    console.error(error);
    return fail(res, 500, friendlyError(error));
  }
}
