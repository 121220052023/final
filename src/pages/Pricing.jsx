import { motion } from 'framer-motion';
import { Zap, Star, Crown } from 'lucide-react';
import PricingCard from '../components/PricingCard';

const Pricing = () => {
  const plans = [
    {
      title: 'Free',
      price: 0,
      icon: Zap,
      features: [
        'Browse unlimited movies',
        'Basic search functionality',
        'View movie details',
        '5 AI summaries per month',
        'Standard movie recommendations',
      ],
    },
    {
      title: 'Pro',
      price: 9.99,
      icon: Star,
      popular: true,
      features: [
        'Everything in Free',
        'Unlimited AI summaries',
        'Advanced AI recommendations',
        'Personalized watchlist',
        'Genre-based filtering',
        'Priority support',
        'Ad-free experience',
      ],
    },
    {
      title: 'Ultimate',
      price: 19.99,
      icon: Crown,
      features: [
        'Everything in Pro',
        'Exclusive early access to features',
        'Custom AI movie analysis',
        'Bulk movie recommendations',
        'API access for developers',
        'Dedicated account manager',
        'Lifetime updates',
      ],
    },
  ];

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="container mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-5xl font-bold gradient-header bg-clip-text text-transparent mb-4">
            Choose Your Plan
          </h1>
          <p className="text-muted-foreground text-xl max-w-2xl mx-auto">
            Unlock the full power of AI-driven movie discovery with our flexible pricing plans
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <PricingCard {...plan} />
            </motion.div>
          ))}
        </div>

        {/* FAQ Section */}
        <motion.div
          className="mt-20 max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-3xl font-bold text-foreground text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div className="bg-card rounded-lg p-6">
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Can I switch plans anytime?
              </h3>
              <p className="text-muted-foreground">
                Yes! You can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle.
              </p>
            </div>
            <div className="bg-card rounded-lg p-6">
              <h3 className="text-xl font-semibold text-foreground mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-muted-foreground">
                We accept all major credit cards, PayPal, and various digital payment methods.
              </p>
            </div>
            <div className="bg-card rounded-lg p-6">
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Is there a free trial for paid plans?
              </h3>
              <p className="text-muted-foreground">
                Yes! All paid plans come with a 14-day free trial. No credit card required to start.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Pricing;

