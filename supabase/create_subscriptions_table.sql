-- Create subscriptions table for Stripe integration
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'incomplete',
  price_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);

-- Index for fast lookups by stripe subscription id
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub_id ON public.subscriptions(stripe_subscription_id);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription
CREATE POLICY "Users can read own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage all subscriptions (for webhooks)
CREATE POLICY "Service role can manage all subscriptions"
  ON public.subscriptions FOR ALL
  USING (true)
  WITH CHECK (true);

-- Allow the function to update subscriptions
CREATE OR REPLACE FUNCTION public.upsert_subscription(
  p_user_id UUID,
  p_stripe_customer_id TEXT,
  p_stripe_subscription_id TEXT,
  p_status TEXT,
  p_price_id TEXT,
  p_current_period_start TIMESTAMPTZ,
  p_current_period_end TIMESTAMPTZ,
  p_cancel_at_period_end BOOLEAN
) RETURNS public.subscriptions AS $$
DECLARE
  result public.subscriptions;
BEGIN
  INSERT INTO public.subscriptions (
    user_id, stripe_customer_id, stripe_subscription_id,
    status, price_id, current_period_start, current_period_end, cancel_at_period_end
  ) VALUES (
    p_user_id, p_stripe_customer_id, p_stripe_subscription_id,
    p_status, p_price_id, p_current_period_start, p_current_period_end, p_cancel_at_period_end
  )
  ON CONFLICT (stripe_subscription_id)
  DO UPDATE SET
    status = EXCLUDED.status,
    price_id = EXCLUDED.price_id,
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    cancel_at_period_end = EXCLUDED.cancel_at_period_end,
    updated_at = now()
  RETURNING * INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
