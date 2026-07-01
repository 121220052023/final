import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { stripeService } from '../services/stripeService';
import { useAuth } from './AuthContext';

const SubscriptionContext = createContext(null);

export function SubscriptionProvider({ children }) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [plan, setPlan] = useState('free');
  const [loading, setLoading] = useState(true);
  const [wasSubscribed, setWasSubscribed] = useState(false);
  const [previousPlan, setPreviousPlan] = useState(null);
  const [isExpired, setIsExpired] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await stripeService.getSubscriptionStatus();
      setSubscription(data.subscription);
      setPlan(data.plan);
      setWasSubscribed(data.wasSubscribed || false);
      setPreviousPlan(data.previousPlan || null);
      setIsExpired(data.isExpired || false);
    } catch {
      setSubscription(null);
      setPlan('free');
      setWasSubscribed(false);
      setPreviousPlan(null);
      setIsExpired(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      refresh();
    } else {
      setSubscription(null);
      setPlan('free');
      setWasSubscribed(false);
      setPreviousPlan(null);
      setIsExpired(false);
      setLoading(false);
    }
  }, [user, refresh]);

  const startCheckout = async (priceId, { coupon, interval } = {}) => {
    const result = await stripeService.createCheckoutSession({ priceId, coupon, interval: interval || 'month' });
    if (result?.url) {
      window.location.href = result.url;
    }
  };

  const openPortal = async () => {
    const { url } = await stripeService.getPortalUrl();
    if (url) {
      window.location.href = url;
    }
  };

  const isProOrAbove = plan === 'pro' || plan === 'ultimate';
  const isUltimate = plan === 'ultimate';

  return (
    <SubscriptionContext.Provider value={{
      subscription,
      plan,
      loading,
      refresh,
      startCheckout,
      openPortal,
      isProOrAbove,
      isUltimate,
      wasSubscribed,
      previousPlan,
      isExpired,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
}
