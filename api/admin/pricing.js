import { createClient } from '@supabase/supabase-js';

const TABLE = 'pricing_plans';
const ADMIN_LOGIN_HASH = '33e16205130dcfddfbbf48d4b75ec557eb3ba1e05ebc5f38ed296eb9e6118938';

function setCors(req, res) {
  const origin = process.env.DASHBOARD_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Auth');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
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
  if (msg.toLowerCase().includes('relation') && msg.toLowerCase().includes('does not exist')) {
    return 'Tabel pricing_plans belum ada di Supabase. Jalankan SQL setup dari docs/pricing-setup.md.';
  }
  return msg;
}

const SELECT_COLUMNS = 'id, plan_key, emoji, name, caption, price, price_color, period, popular, card_style, features, cta_text, cta_href, cta_style, sort_order, active, created_at, updated_at';

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === 'OPTIONS') return res.status(200).json({ ok: true });
  if (!isAdmin(req)) return fail(res, 401, 'Unauthorized admin session. Login ulang admin.');

  try {
    const sb = client();

    if (req.method === 'GET') {
      const { data, error } = await sb
        .from(TABLE)
        .select(SELECT_COLUMNS)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return res.status(200).json({ ok: true, data: data || [] });
    }

    if (req.method === 'POST') {
      const payload = req.body || {};
      if (!payload.plan_key || !payload.name || !payload.price) return fail(res, 400, 'ID paket, nama, dan harga wajib diisi.');
      const { data, error } = await sb
        .from(TABLE)
        .insert([{
          plan_key: payload.plan_key,
          emoji: payload.emoji || '',
          name: payload.name,
          caption: payload.caption || '',
          price: payload.price,
          price_color: payload.price_color || 'gf',
          period: payload.period || '',
          popular: !!payload.popular,
          card_style: payload.card_style || '',
          features: payload.features || [],
          cta_text: payload.cta_text || 'Pilih Paket',
          cta_href: payload.cta_href || 'contact.html',
          cta_style: payload.cta_style || 'pb-o',
          sort_order: Number.isFinite(payload.sort_order) ? payload.sort_order : 0,
          active: payload.active !== false
        }])
        .select(SELECT_COLUMNS)
        .single();
      if (error) throw error;
      return res.status(200).json({ ok: true, data });
    }

    if (req.method === 'PUT') {
      const id = req.query?.id || req.body?.id;
      if (!id) return fail(res, 400, 'ID record wajib diisi untuk update.');
      const payload = req.body || {};
      const update = {
        plan_key: payload.plan_key,
        emoji: payload.emoji || '',
        name: payload.name,
        caption: payload.caption || '',
        price: payload.price,
        price_color: payload.price_color || 'gf',
        period: payload.period || '',
        popular: !!payload.popular,
        card_style: payload.card_style || '',
        features: payload.features || [],
        cta_text: payload.cta_text || 'Pilih Paket',
        cta_href: payload.cta_href || 'contact.html',
        cta_style: payload.cta_style || 'pb-o',
        sort_order: Number.isFinite(payload.sort_order) ? payload.sort_order : 0,
        active: payload.active !== false,
        updated_at: new Date().toISOString()
      };
      const { data, error } = await sb.from(TABLE).update(update).eq('id', id).select(SELECT_COLUMNS).single();
      if (error) throw error;
      return res.status(200).json({ ok: true, data });
    }

    if (req.method === 'DELETE') {
      const id = req.query?.id || req.body?.id;
      if (!id) return fail(res, 400, 'ID paket wajib diisi.');
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
