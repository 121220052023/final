import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Zap, Star, Crown,Percent } from 'lucide-react';
import PricingCard from '../components/PricingCard';
import { useSubscription } from '../context/SubscriptionContext';
import { useTranslation } from '../context/LanguageContext';

const STRIPE_PRICE_IDS = {
  pro: import.meta.env.VITE_STRIPE_PRO_PRICE_ID || '',
  ultimate: import.meta.env.VITE_STRIPE_ULTIMATE_PRICE_ID || '',
  pro_annual: import.meta.env.VITE_STRIPE_PRO_ANNUAL_PRICE_ID || '',
  ultimate_annual: import.meta.env.VITE_STRIPE_ULTIMATE_ANNUAL_PRICE_ID || '',
};

const Pricing = () => {
  const { plan } = useSubscription();
  const { t } = useTranslation();
  const [yearly, setYearly] = useState(false);

  const plans = useMemo(() => [
    {
      title: t('pricing.free', 'Free'),
      price: 0,
      icon: Zap,
      current: plan === 'free',
      billing: null,
      features: [
        t('pricing.featUnlimitedBrowse', 'Browse unlimited movies'),
        t('pricing.featBasicSearch', 'Basic search functionality'),
        t('pricing.featViewDetails', 'View movie details'),
        t('pricing.feat5AI', '5 AI summaries per month'),
        t('pricing.featStandardRecs', 'Standard movie recommendations'),
      ],
    },
    {
      title: t('pricing.pro', 'Pro'),
      price: yearly ? 99.90 : 9.99,
      priceId: yearly ? STRIPE_PRICE_IDS.pro_annual : STRIPE_PRICE_IDS.pro,
      interval: yearly ? 'year' : 'month',
      icon: Star,
      popular: true,
      current: plan === 'pro',
      savings: yearly ? t('pricing.save', 'Save 17%') : null,
      features: [
        t('pricing.featEverythingFree', 'Everything in Free'),
        t('pricing.featUnlimitedAI', 'Unlimited AI summaries'),
        t('pricing.featAdvancedAI', 'Advanced AI recommendations'),
        t('pricing.featPersonalized', 'Personalized watchlist'),
        t('pricing.featGenreFilter', 'Genre-based filtering'),
        t('pricing.featPrioritySupport', 'Priority support'),
        t('pricing.featAdFree', 'Ad-free experience'),
      ],
    },
    {
      title: t('pricing.ultimate', 'Ultimate'),
      price: yearly ? 199.90 : 19.99,
      priceId: yearly ? STRIPE_PRICE_IDS.ultimate_annual : STRIPE_PRICE_IDS.ultimate,
      interval: yearly ? 'year' : 'month',
      icon: Crown,
      current: plan === 'ultimate',
      savings: yearly ? t('pricing.save', 'Save 17%') : null,
      features: [
        t('pricing.featEverythingPro', 'Everything in Pro'),
        t('pricing.featEarlyAccess', 'Exclusive early access to features'),
        t('pricing.featCustomAI', 'Custom AI movie analysis'),
        t('pricing.featBulkRecs', 'Bulk movie recommendations'),
        t('pricing.featAPIAccess', 'API access for developers'),
        t('pricing.featAccountManager', 'Dedicated account manager'),
        t('pricing.featLifetime', 'Lifetime updates'),
      ],
    },
  ], [t, plan, yearly]);

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="container mx-auto">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-5xl font-bold gradient-header bg-clip-text text-transparent mb-4">
            {t('pricing.title', 'Choose Your Plan')}
          </h1>
          <p className="text-muted-foreground text-xl max-w-2xl mx-auto">
            {t('pricing.subtitle', 'Unlock the full power of AI-driven movie discovery with our flexible pricing plans')}
          </p>
        </motion.div>

        <div className="flex items-center justify-center gap-4 mb-12">
          <span className={`text-sm font-bold ${!yearly ? 'text-foreground' : 'text-muted-foreground'}`}>{t('pricing.monthly', 'Monthly')}</span>
          <button
            onClick={() => setYearly(!yearly)}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${yearly ? 'bg-primary' : 'bg-muted'}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${yearly ? 'translate-x-8' : 'translate-x-1'}`} />
          </button>
          <span className={`text-sm font-bold flex items-center gap-1.5 ${yearly ? 'text-foreground' : 'text-muted-foreground'}`}>
            {t('pricing.yearly', 'Yearly')}
            <span className="text-[10px] bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded-full font-bold">{t('pricing.save', 'Save 17%')}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((planItem, index) => (
            <motion.div
              key={planItem.title + (yearly ? '-yearly' : '-monthly')}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <PricingCard {...planItem} />
            </motion.div>
          ))}
        </div>

        <motion.div
          className="mt-20 max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-3xl font-bold text-foreground text-center mb-8">
            {t('pricing.faqTitle', 'Frequently Asked Questions')}
          </h2>
          <div className="space-y-6">
            <div className="bg-card rounded-lg p-6">
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {t('pricing.faqSwitch', 'Can I switch plans anytime?')}
              </h3>
              <p className="text-muted-foreground">
                {t('pricing.faqSwitchAns', 'Yes! You can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle.')}
              </p>
            </div>
            <div className="bg-card rounded-lg p-6">
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {t('pricing.faqPayment', 'What payment methods do you accept?')}
              </h3>
              <p className="text-muted-foreground">
                {t('pricing.faqPaymentAns', 'We accept all major credit cards via Stripe, along with various digital payment methods.')}
              </p>
            </div>
            <div className="bg-card rounded-lg p-6">
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {t('pricing.faqTrial', 'Is there a free trial for paid plans?')}
              </h3>
              <p className="text-muted-foreground">
                {t('pricing.faqTrialAns', 'Yes! All paid plans come with a 14-day free trial. No credit card required to start.')}
              </p>
            </div>
            <div className="bg-card rounded-lg p-6">
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {t('pricing.faqPromo', 'Do you offer promo codes?')}
              </h3>
              <p className="text-muted-foreground">
                {t('pricing.faqPromoAns', 'Yes! Enter a promo code at checkout to get a discount on your subscription.')}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Pricing;
