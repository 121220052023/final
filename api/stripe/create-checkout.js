import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || process.env.VITE_STRIPE_SECRET_KEY);
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function supabaseFetch(path, options = {}) {
  const url = `${SUPABASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return res.json();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { priceId, userId, email, successUrl, cancelUrl, coupon, interval } = req.body;

    if (!priceId || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user already has an active subscription
    const subs = await supabaseFetch(
      `/rest/v1/subscriptions?select=*&user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=5`
    );

    const existingSub = Array.isArray(subs)
      ? subs.find(s => s.stripe_subscription_id && ['active', 'trialing', 'past_due'].includes(s.status))
      : null;

    if (existingSub && existingSub.stripe_subscription_id) {
      // User has an existing subscription — update it inline instead of creating a new Checkout
      const subscription = await stripe.subscriptions.retrieve(existingSub.stripe_subscription_id);

      // If cancelled at period end, reactivate by removing cancel_at_period_end
      const updateParams = {
        items: [{
          id: subscription.items.data[0].id,
          price: priceId,
        }],
        proration_behavior: 'always_invoice',
        ...(subscription.cancel_at_period_end ? { cancel_at_period_end: false } : {}),
      };

      if (coupon) {
        updateParams.coupon = coupon;
      }

      const updatedSub = await stripe.subscriptions.update(existingSub.stripe_subscription_id, updateParams);

      // Update Supabase with new price
      await supabaseFetch(
        `/rest/v1/subscriptions?stripe_subscription_id=eq.${encodeURIComponent(existingSub.stripe_subscription_id)}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            status: updatedSub.status,
            price_id: priceId,
            current_period_start: new Date(updatedSub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(updatedSub.current_period_end * 1000).toISOString(),
          }),
        }
      );

      return res.status(200).json({
        updated: true,
        url: `${req.headers.origin}/profile?tab=billing&updated=true`,
      });
    }

    // No existing subscription — create a new Checkout Session
    const sessionParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      client_reference_id: userId,
      metadata: { userId, interval: interval || 'month' },
      success_url: successUrl || `${req.headers.origin}/profile?tab=billing&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${req.headers.origin}/pricing`,
      subscription_data: {
        metadata: { userId, interval: interval || 'month' },
        trial_period_days: 14,
      },
    };

    if (coupon) {
      sessionParams.discounts = [{ coupon }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Stripe create-checkout error:', error);
    return res.status(500).json({ error: error.message });
  }
}
