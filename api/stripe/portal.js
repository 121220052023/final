import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || process.env.VITE_STRIPE_SECRET_KEY);
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    const subResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/subscriptions?select=stripe_customer_id&user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=1`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      }
    );

    const subs = await subResponse.json();
    const customerId = Array.isArray(subs) && subs.length > 0 ? subs[0]?.stripe_customer_id : null;

    if (!customerId) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: req.headers.origin + '/profile?tab=billing',
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Stripe portal error:', error);
    return res.status(500).json({ error: error.message });
  }
}
