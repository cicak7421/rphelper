import { createClient } from '@supabase/supabase-js';

const TABLE = 'changelogs';

function setCors(req, res) {
  const origin = process.env.DASHBOARD_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
}

function fail(res, status, error) {
  return res.status(status).json({ ok: false, error });
}

function getSupabaseKey() {
  return process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

function client() {
  const url = process.env.SUPABASE_URL;
  const key = getSupabaseKey();
  if (!url) throw new Error('SUPABASE_URL belum diisi.');
  if (!key) throw new Error('SUPABASE_SERVICE_KEY atau SUPABASE_ANON_KEY belum diisi.');
  return createClient(url, key);
}

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === 'OPTIONS') return res.status(200).json({ ok: true });
  if (req.method !== 'GET') return fail(res, 405, 'Method not allowed.');

  try {
    const { data, error } = await client()
      .from(TABLE)
      .select('id, version_title, summary, details, created_by, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return res.status(200).json({ ok: true, data: data || [] });
  } catch (error) {
    console.error(error);
    return fail(res, 500, String(error?.message || error || 'Unknown error'));
  }
}
