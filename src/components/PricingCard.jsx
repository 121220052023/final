import { Check, Loader, Percent } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useSubscription } from '../context/SubscriptionContext';
import { useTranslation } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const PricingCard = ({ title, price, priceId, features, icon: Icon, popular = false, current = false, savings = null, interval = 'month', billing = null }) => {
  const [loading, setLoading] = useState(false);
  const [coupon, setCoupon] = useState('');
  const [showCoupon, setShowCoupon] = useState(false);
  const { startCheckout } = useSubscription();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleClick = async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to subscribe');
      navigate('/login');
      return;
    }
    if (price === 0 && current) {
      toast.info('You are already on the Free plan');
      return;
    }
    if (price === 0) {
      toast.info('Select a paid plan to upgrade');
      return;
    }
    if (!priceId) {
      toast.error('Payment is not configured yet. Please contact support.');
      return;
    }
    setLoading(true);
    try {
      await startCheckout(priceId, { coupon: coupon.trim() || undefined, interval });
    } catch (error) {
      toast.error(error.message || 'Failed to start checkout');
      setLoading(false);
    }
  };

  return (
    <motion.div
      className={`pricing-card ${popular ? 'ring-2 ring-purple-600' : ''} ${current ? 'ring-1 ring-primary/40' : ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
          {t('pricing.mostPopular', 'Most Popular')}
        </div>
      )}
      {current && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
          {t('pricing.currentPlan', 'Current Plan')}
        </div>
      )}

      <div className="flex flex-col items-center mb-6">
        <Icon className={`w-12 h-12 mb-4 ${current ? 'text-primary' : 'text-purple-600'}`} />
        <h3 className="text-2xl font-bold text-foreground">{title}</h3>
        <div className="mt-4 text-center">
          <span className="text-4xl font-bold text-foreground">
            {price === 0 ? t('pricing.free', 'Free') : `$${price.toFixed(2)}`}
          </span>
          {price > 0 && (
            <span className="text-muted-foreground">
              /{interval === 'year' ? t('pricing.perYear', 'yr') : t('pricing.perMonth', 'mo')}
            </span>
          )}
          {savings && price > 0 && (
            <div className="mt-1 text-xs font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full inline-block">
              {savings}
            </div>
          )}
        </div>
      </div>

      <ul className="space-y-3 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <span className="text-muted-foreground">{feature}</span>
          </li>
        ))}
      </ul>

      {price > 0 && (
        <div className="mb-4">
          {showCoupon ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
                placeholder={t('pricing.promoPlaceholder', 'Promo code')}
                className="text-input flex-1 text-sm"
              />
              <button
                onClick={() => setShowCoupon(false)}
                className="text-xs text-muted-foreground hover:text-foreground font-bold"
              >
                Hide
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowCoupon(true)}
              className="text-xs text-muted-foreground hover:text-primary font-bold flex items-center gap-1 mx-auto"
            >
              <Percent className="w-3 h-3" />
              {t('pricing.havePromo', 'Have a promo code?')}
            </button>
          )}
        </div>
      )}

      <button
        onClick={handleClick}
        disabled={loading}
        className={popular && (!current || price === 0)
          ? 'btn-primary w-full'
          : 'btn-secondary w-full'
        }
      >
        {loading ? <Loader className="h-4 w-4 animate-spin" /> : null}
        {loading ? t('common.loading', 'Redirecting...') : price === 0 && current ? t('pricing.free', 'Free') : price === 0 ? t('pricing.upgrade', 'Upgrade') : current ? t('pricing.switch', 'Switch Plan') : t('pricing.subscribe', 'Subscribe')}
      </button>
    </motion.div>
  );
};

export default PricingCard;
