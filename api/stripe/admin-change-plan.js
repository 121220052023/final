import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || process.env.VITE_STRIPE_SECRET_KEY);
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const headers = {
  'apikey': SUPABASE_SERVICE_KEY,
  'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization' });
    }
    const token = authHeader.split(' ')[1];

    // Verify admin via Supabase
    const userResponse = await fetch(
      `${SUPABASE_URL}/auth/v1/user`,
      { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${token}` } }
    );
    const userData = await userResponse.json();
    if (!userData?.id) return res.status(401).json({ error: 'Invalid token' });

    const profileResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?select=role&id=eq.${encodeURIComponent(userData.id)}`,
      { headers }
    );
    const profiles = await profileResponse.json();
    const adminProfile = Array.isArray(profiles) ? profiles[0] : null;
    if (!adminProfile || adminProfile.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { userId, newPlan } = req.body;
    if (!userId || !newPlan) {
      return res.status(400).json({ error: 'Missing userId or newPlan' });
    }

    const validPlans = ['free', 'pro', 'ultimate'];
    if (!validPlans.includes(newPlan)) {
      return res.status(400).json({ error: `Invalid plan. Must be one of: ${validPlans.join(', ')}` });
    }

    // Try Stripe if configured, fall back to direct DB update
    const hasStripe = !!(process.env.STRIPE_PRO_PRICE_ID || process.env.VITE_STRIPE_PRO_PRICE_ID);

    if (hasStripe) {
      try {
        const subResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/subscriptions?select=*&user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=5`,
          { headers }
        );
        const subs = await subResponse.json();
        const activeSub = Array.isArray(subs) ? subs.find(s => ['active', 'trialing'].includes(s.status)) : null;

        const priceMap = {
          pro: process.env.STRIPE_PRO_PRICE_ID || process.env.VITE_STRIPE_PRO_PRICE_ID,
          ultimate: process.env.STRIPE_ULTIMATE_PRICE_ID || process.env.VITE_STRIPE_ULTIMATE_PRICE_ID,
        };

        if (newPlan === 'free') {
          if (activeSub?.stripe_subscription_id) {
            await stripe.subscriptions.update(activeSub.stripe_subscription_id, { cancel_at_period_end: true });
          }
        } else {
          const newPriceId = priceMap[newPlan];
          if (!newPriceId) throw new Error(`${newPlan} price ID not configured`);

          if (activeSub?.stripe_subscription_id) {
            await stripe.subscriptions.update(activeSub.stripe_subscription_id, {
              cancel_at_period_end: false,
              items: [{ id: activeSub.stripe_subscription_item_id, price: newPriceId }],
              proration_behavior: 'always_invoice',
            });
          } else {
            const customerResponse = await fetch(
              `${SUPABASE_URL}/rest/v1/subscriptions?select=stripe_customer_id&user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=1`,
              { headers }
            );
            const customerData = await customerResponse.json();
            let customerId = Array.isArray(customerData) && customerData.length > 0 ? customerData[0]?.stripe_customer_id : null;

            if (!customerId) {
              const userProfileResponse = await fetch(
                `${SUPABASE_URL}/rest/v1/profiles?select=email,full_name&id=eq.${encodeURIComponent(userId)}`,
                { headers }
              );
              const userProfiles = await userProfileResponse.json();
              const userProfile = Array.isArray(userProfiles) ? userProfiles[0] : null;
              const customer = await stripe.customers.create({
                email: userProfile?.email || undefined,
                name: userProfile?.full_name || undefined,
                metadata: { user_id: userId },
              });
              customerId = customer.id;
            }

            const subscription = await stripe.subscriptions.create({
              customer: customerId,
              items: [{ price: newPriceId }],
              metadata: { user_id: userId },
              proration_behavior: 'always_invoice',
            });

            await fetch(`${SUPABASE_URL}/rest/v1/subscriptions`, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                user_id: userId,
                stripe_customer_id: customerId,
                stripe_subscription_id: subscription.id,
                stripe_subscription_item_id: subscription.items.data[0]?.id,
                price_id: newPriceId,
                status: subscription.status,
                current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                cancel_at_period_end: subscription.cancel_at_period_end,
                created_at: new Date().toISOString(),
              }),
            });
          }
        }
      } catch (stripeError) {
        console.error('Stripe operation failed, falling back to direct update:', stripeError.message);
      }
    }

    // Direct DB update: ensure plan exists, then upsert user_plans
    let planResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/plans?select=id,name&name=eq.${newPlan}`,
      { headers }
    );
    let planRows = await planResponse.json();
    let planRecord = Array.isArray(planRows) ? planRows[0] : null;

    if (!planRecord) {
      // Create the plan if it doesn't exist
      const capitalized = newPlan.charAt(0).toUpperCase() + newPlan.slice(1);
      const createResponse = await fetch(`${SUPABASE_URL}/rest/v1/plans`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify({
          name: capitalized,
          description: `${capitalized} plan`,
          price_monthly: newPlan === 'pro' ? 9.99 : 19.99,
          price_yearly: newPlan === 'pro' ? 99.90 : 199.90,
          max_children: newPlan === 'pro' ? 3 : 6,
          max_screens: newPlan === 'pro' ? 2 : 4,
          hd_enabled: true,
          ultra_hd_enabled: newPlan !== 'pro',
          is_active: true,
        }),
      });
      const created = await createResponse.json();
      planRecord = Array.isArray(created) ? created[0] : null;
      if (!planRecord) throw new Error(`Failed to create plan '${capitalized}'`);
    }

    const { data: existingPlan } = await fetch(
      `${SUPABASE_URL}/rest/v1/user_plans?select=id&user_id=eq.${encodeURIComponent(userId)}`,
      { headers }
    ).then(r => r.json());

    const planPayload = {
      user_id: userId,
      plan_id: planRecord.id,
      is_active: newPlan !== 'free',
    };

    if (Array.isArray(existingPlan) && existingPlan.length > 0) {
      await fetch(`${SUPABASE_URL}/rest/v1/user_plans?id=eq.${existingPlan[0].id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(planPayload),
      });
    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/user_plans`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify(planPayload),
      });
    }

    // Send in-app notification
    const capitalized = newPlan.charAt(0).toUpperCase() + newPlan.slice(1);
    await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify({
        user_id: userId,
        type: 'system',
        title: 'Plan Updated',
        message: `Your plan has been changed to ${capitalized} by an admin.`,
      }),
    }).catch(() => {});

    // Try to send email notification
    const profileRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?select=email,full_name,username&id=eq.${encodeURIComponent(userId)}`,
      { headers }
    );
    const profileRows = await profileRes.json();
    const targetProfile = Array.isArray(profileRows) ? profileRows[0] : null;
    if (targetProfile?.email) {
      const displayName = targetProfile.full_name || targetProfile.username || targetProfile.email.split('@')[0];
      const emailBody = `Hi ${displayName},

Your Oceanic plan has been updated to ${capitalized} by an admin.

Log in to start enjoying your new benefits:
${process.env.VITE_APP_URL || 'https://ocean-of-movies-pi.vercel.app'}

- The Oceanic Team`;

      await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=email&id=eq.${encodeURIComponent(adminProfile.id)}`, { headers })
        .then(r => r.json())
        .then(async (adminRows) => {
          const adminEmail = Array.isArray(adminRows) ? adminRows[0]?.email : null;
          if (adminEmail) {
            const transporter = nodemailer.createTransport({
              host: process.env.SMTP_HOST || 'smtp.gmail.com',
              port: parseInt(process.env.SMTP_PORT || '587'),
              secure: parseInt(process.env.SMTP_PORT || '587') === 465,
              auth: process.env.SMTP_USER && process.env.SMTP_PASS
                ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
                : undefined,
            });
            await transporter.sendMail({
              from: `"${process.env.FROM_NAME || 'Oceanic Admin'}" <${process.env.FROM_EMAIL || 'noreply@oceanofmovies.com'}>`,
              to: targetProfile.email,
              subject: `Your Oceanic Plan Has Been Updated to ${capitalized}`,
              text: emailBody,
            }).catch(() => {});
          }
        }).catch(() => {});
    }

    return res.status(200).json({ success: true, plan: newPlan });
  } catch (error) {
    console.error('Admin change plan error:', error);
    return res.status(500).json({ error: error.message });
  }
}