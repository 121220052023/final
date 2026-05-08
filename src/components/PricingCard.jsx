import { Check } from 'lucide-react';
import { motion } from 'framer-motion';

const PricingCard = ({ title, price, features, icon: Icon, popular = false }) => {
  return (
    <motion.div
      className={`pricing-card ${popular ? 'ring-2 ring-purple-600' : ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
          Most Popular
        </div>
      )}
      
      <div className="flex flex-col items-center mb-6">
        <Icon className="w-12 h-12 text-purple-600 mb-4" />
        <h3 className="text-2xl font-bold text-foreground">{title}</h3>
        <div className="mt-4">
          <span className="text-4xl font-bold text-foreground">${price}</span>
          <span className="text-muted-foreground">/month</span>
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

      <button className={popular ? 'btn-primary w-full' : 'btn-secondary w-full'}>
        Get Started
      </button>
    </motion.div>
  );
};

export default PricingCard;

