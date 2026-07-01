const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/subscriptions?select=*&order=created_at.desc`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      }
    );

    const subs = await response.json();
    if (!Array.isArray(subs)) {
      return res.status(200).json({
        totalSubscriptions: 0,
        activeSubscriptions: 0,
        trialing: 0,
        canceled: 0,
        pastDue: 0,
        mrr: 0,
        churnRate: 0,
        planBreakdown: { pro: 0, ultimate: 0 },
        monthlySignups: [],
      });
    }

    const paidPriceIds = [
      process.env.STRIPE_PRO_PRICE_ID,
      process.env.STRIPE_ULTIMATE_PRICE_ID,
      process.env.STRIPE_PRO_ANNUAL_PRICE_ID,
      process.env.STRIPE_ULTIMATE_ANNUAL_PRICE_ID,
    ].filter(Boolean);

    const getPlan = (priceId) => {
      const isPro = priceId === process.env.STRIPE_PRO_PRICE_ID || priceId === process.env.STRIPE_PRO_ANNUAL_PRICE_ID;
      const isUltimate = priceId === process.env.STRIPE_ULTIMATE_PRICE_ID || priceId === process.env.STRIPE_ULTIMATE_ANNUAL_PRICE_ID;
      if (isPro) return 'pro';
      if (isUltimate) return 'ultimate';
      return 'free';
    };

    const isAnnual = (priceId) => {
      return priceId === process.env.STRIPE_PRO_ANNUAL_PRICE_ID || priceId === process.env.STRIPE_ULTIMATE_ANNUAL_PRICE_ID;
    };

    const active = subs.filter(s => ['active', 'trialing'].includes(s.status));
    const trialing = subs.filter(s => s.status === 'trialing');
    const canceled = subs.filter(s => s.status === 'canceled');
    const pastDue = subs.filter(s => s.status === 'past_due');

    let mrr = 0;
    const planBreakdown = { pro: 0, ultimate: 0 };

    active.forEach(s => {
      const plan = getPlan(s.price_id);
      if (plan === 'pro') {
        planBreakdown.pro++;
        mrr += isAnnual(s.price_id) ? (99.90 / 12) : 9.99;
      } else if (plan === 'ultimate') {
        planBreakdown.ultimate++;
        mrr += isAnnual(s.price_id) ? (199.90 / 12) : 19.99;
      }
    });

    // Churn rate: canceled in last 30 days / total active 30 days ago
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const recentlyCanceled = subs.filter(s =>
      s.status === 'canceled' && s.canceled_at && s.canceled_at >= thirtyDaysAgo
    );
    const active30DaysAgo = subs.filter(s =>
      ['active', 'trialing'].includes(s.status) ||
      (s.status === 'canceled' && s.canceled_at && s.canceled_at >= thirtyDaysAgo)
    ).length;
    const churnRate = active30DaysAgo > 0
      ? ((recentlyCanceled.length / active30DaysAgo) * 100).toFixed(1)
      : 0;

    // Monthly signups (last 6 months)
    const monthlySignups = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString();
      const count = subs.filter(s =>
        s.created_at >= startOfMonth && s.created_at <= endOfMonth
      ).length;
      monthlySignups.push({
        month: d.toLocaleString('default', { month: 'short' }),
        count,
      });
    }

    return res.status(200).json({
      totalSubscriptions: subs.length,
      activeSubscriptions: active.length,
      trialing: trialing.length,
      canceled: canceled.length,
      pastDue: pastDue.length,
      mrr: Math.round(mrr * 100) / 100,
      churnRate: parseFloat(churnRate),
      planBreakdown,
      monthlySignups,
    });
  } catch (error) {
    console.error('Stripe analytics error:', error);
    return res.status(500).json({ error: error.message });
  }
}
