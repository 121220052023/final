const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.replace('Bearer ', '');

    // Verify the user with Supabase
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!userRes.ok) return res.status(401).json({ error: 'Invalid token' });
    const userData = await userRes.json();
    const userId = userData.id;

    // Fetch site settings for free watch limit
    const settingsRes = await fetch(`${SUPABASE_URL}/rest/v1/site_settings?select=*&limit=1`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    });
    const settingsData = await settingsRes.json();
    const settings = Array.isArray(settingsData) && settingsData.length > 0 ? settingsData[0] : {};
    const maxFreeMinutes = settings.max_free_watch_minutes ?? 120;

    // Check subscription status
    const subRes = await fetch(
      `${SUPABASE_URL}/rest/v1/subscriptions?select=*&user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=1`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      }
    );
    const subs = await subRes.json();
    const activeSub = Array.isArray(subs) ? subs.find(s => ['active', 'trialing'].includes(s.status)) : null;

    // Paid users have no limit
    if (activeSub) {
      return res.status(200).json({ limited: false, remainingMinutes: null, maxMinutes: null });
    }

    if (req.method === 'GET') {
      // Calculate total watch time today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const historyRes = await fetch(
        `${SUPABASE_URL}/rest/v1/watch_history?select=watched_duration&user_id=eq.${encodeURIComponent(userId)}&watched_at=gte.${today.toISOString()}`,
        {
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          },
        }
      );
      const historyData = await historyRes.json();
      const history = Array.isArray(historyData) ? historyData : [];

      const totalMinutes = history.reduce((sum, h) => sum + (h.watched_duration || 0), 0);
      const remaining = Math.max(0, maxFreeMinutes - totalMinutes);

      return res.status(200).json({
        limited: true,
        remainingMinutes: remaining,
        maxMinutes: maxFreeMinutes,
        usedMinutes: totalMinutes,
      });
    }

    if (req.method === 'POST') {
      const { durationMinutes, movieId, movieTitle } = req.body;
      if (!durationMinutes || !movieId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Log watch time
      const logRes = await fetch(`${SUPABASE_URL}/rest/v1/watch_history`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          movie_id: movieId,
          movie_title: movieTitle || '',
          watched_duration: durationMinutes,
          watched_at: new Date().toISOString(),
        }),
      });

      if (!logRes.ok) {
        const errText = await logRes.text();
        console.error('Failed to log watch time:', errText);
      }

      return res.status(200).json({ logged: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Watch time error:', error);
    return res.status(500).json({ error: error.message });
  }
}
