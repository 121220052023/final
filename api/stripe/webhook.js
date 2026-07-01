import Stripe from 'stripe';

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || process.env.VITE_STRIPE_SECRET_KEY);
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

function buffer(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    const rawBody = await buffer(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = session.metadata?.userId || session.client_reference_id;
      const subscriptionId = session.subscription;
      const customerId = session.customer;

      if (userId && subscriptionId) {
        try {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);

          await fetch(`${SUPABASE_URL}/rest/v1/subscriptions`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation',
            },
            body: JSON.stringify({
              user_id: userId,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              status: subscription.status,
              price_id: subscription.items.data[0]?.price?.id,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
              trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
            }),
          });
        } catch (err) {
          console.error('Failed to save subscription:', err);
        }
      }
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object;
      const subscriptionId = invoice.subscription;

      if (subscriptionId) {
        try {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const userId = subscription.metadata?.userId;

          if (userId) {
            await fetch(
              `${SUPABASE_URL}/rest/v1/subscriptions?stripe_subscription_id=eq.${encodeURIComponent(subscriptionId)}`,
              {
                method: 'PATCH',
                headers: {
                  'apikey': SUPABASE_SERVICE_KEY,
                  'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  status: subscription.status,
                  current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                  current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                  price_id: subscription.items.data[0]?.price?.id,
                }),
              }
            );
          }
        } catch (err) {
          console.error('Failed to update subscription:', err);
        }
      }
      break;
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const userId = subscription.metadata?.userId;

      if (userId) {
        try {
          const status = event.type === 'customer.subscription.deleted' ? 'canceled' : subscription.status;

          await fetch(
            `${SUPABASE_URL}/rest/v1/subscriptions?stripe_subscription_id=eq.${encodeURIComponent(subscription.id)}`,
            {
              method: 'PATCH',
              headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                status,
                cancel_at_period_end: subscription.cancel_at_period_end,
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              }),
            }
          );
        } catch (err) {
          console.error('Failed to update subscription:', err);
        }
      }
      break;
    }
  }

  return res.status(200).json({ received: true });
}
