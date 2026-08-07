export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.DASHBOARD_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  return res.status(200).json({
    ok: true,
    service: 'rp-assistence-dashboard-api-vercel',
    runtime: 'vercel-serverless'
  });
}
