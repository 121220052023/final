const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/site_settings?select=*&limit=1`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      }
    );

    const data = await response.json();
    const settings = Array.isArray(data) && data.length > 0 ? data[0] : {};

    return res.status(200).json({
      max_free_watch_minutes: settings.max_free_watch_minutes ?? 120,
      maintenance_mode: settings.maintenance_mode ?? false,
      allow_new_signups: settings.allow_new_signups ?? true,
    });
  } catch (error) {
    console.error('Settings fetch error:', error);
    return res.status(500).json({ error: error.message });
  }
}
