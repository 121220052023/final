import { supabase } from '../lib/supabase';

const API_BASE = '/api/stripe';

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
}

async function parseResponse(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(text || `Server returned ${res.status}`);
  }
}

export const stripeService = {
  createCheckoutSession: async ({ priceId, coupon, interval }) => {
    if (!priceId) throw new Error('Price ID is not configured. Contact support.');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const res = await fetch(`${API_BASE}/create-checkout`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        priceId,
        userId: user.id,
        email: user.email,
        coupon: coupon || null,
        interval: interval || 'month',
      }),
    });

    if (!res.ok) {
      const err = await parseResponse(res);
      throw new Error(err.error || 'Failed to create checkout session');
    }

    return parseResponse(res);
  },

  getPortalUrl: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const res = await fetch(`${API_BASE}/portal`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ userId: user.id }),
    });

    if (!res.ok) {
      const err = await parseResponse(res);
      throw new Error(err.error || 'Failed to create portal session');
    }

    return parseResponse(res);
  },

  getSubscriptionStatus: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { subscription: null, plan: 'free' };

    try {
      const res = await fetch(`${API_BASE}/status?userId=${encodeURIComponent(user.id)}`, {
        headers: await getAuthHeaders(),
      });

      if (!res.ok) {
        return { subscription: null, plan: 'free' };
      }

      return parseResponse(res);
    } catch {
      return { subscription: null, plan: 'free' };
    }
  },

  PLANS: {
    free: { id: 'free', title: 'Free', price: 0 },
    pro: { id: 'pro', title: 'Pro', price: 9.99 },
    ultimate: { id: 'ultimate', title: 'Ultimate', price: 19.99 },
  },
};
