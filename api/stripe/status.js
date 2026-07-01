const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/subscriptions?select=*&user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=5`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      }
    );

    const subs = await response.json();
    const activeSub = Array.isArray(subs) ? subs.find(s => ['active', 'trialing'].includes(s.status)) : null;
    const latestSub = Array.isArray(subs) && subs.length > 0 ? subs[0] : null;

    if (!activeSub && !latestSub) {
      return res.status(200).json({ subscription: null, plan: 'free', wasSubscribed: false });
    }

    const sub = activeSub || latestSub;
    const isActive = ['active', 'trialing'].includes(sub.status);

    const getPlanFromPrice = (priceId) => {
      if (!priceId) return 'free';
      if (priceId.startsWith('manual_')) return priceId.replace('manual_', '');
      if (priceId === process.env.STRIPE_PRO_PRICE_ID || priceId === process.env.STRIPE_PRO_ANNUAL_PRICE_ID) return 'pro';
      if (priceId === process.env.STRIPE_ULTIMATE_PRICE_ID || priceId === process.env.STRIPE_ULTIMATE_ANNUAL_PRICE_ID) return 'ultimate';
      return 'free';
    };

    const plan = isActive ? getPlanFromPrice(sub.price_id) : 'free';

    const paidPriceIds = [
      ...['pro', 'ultimate'].map(p => `manual_${p}`),
      process.env.STRIPE_PRO_PRICE_ID,
      process.env.STRIPE_ULTIMATE_PRICE_ID,
      process.env.STRIPE_PRO_ANNUAL_PRICE_ID,
      process.env.STRIPE_ULTIMATE_ANNUAL_PRICE_ID,
    ].filter(Boolean);

    const wasSubscribed = Array.isArray(subs) && subs.some(s =>
      !['incomplete', 'incomplete_expired'].includes(s.status) &&
      paidPriceIds.includes(s.price_id)
    );

    const previousPlan = wasSubscribed && !isActive
      ? getPlanFromPrice(sub.price_id)
      : null;

    const isExpired = wasSubscribed && !isActive;

    return res.status(200).json({
      subscription: {
        id: sub.stripe_subscription_id,
        status: sub.status,
        plan,
        currentPeriodStart: sub.current_period_start,
        currentPeriodEnd: sub.current_period_end,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        priceId: sub.price_id,
        trialEnd: sub.trial_end,
      },
      plan,
      wasSubscribed,
      previousPlan,
      isExpired,
    });
  } catch (error) {
    console.error('Stripe status error:', error);
    return res.status(500).json({ error: error.message });
  }
}
