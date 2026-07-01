import { X, Crown } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSubscription } from '../context/SubscriptionContext';

export default function ExpiredPlanBanner() {
  const { isExpired, previousPlan } = useSubscription();
  const [dismissed, setDismissed] = useState(false);

  if (!isExpired || dismissed) return null;

  return (
    <div className="relative bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-amber-500/20 border-b border-amber-500/30">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Crown className="w-5 h-5 text-amber-400 shrink-0" />
          <p className="text-sm text-foreground">
            Your {previousPlan ? `${previousPlan.charAt(0).toUpperCase() + previousPlan.slice(1)} plan` : 'paid plan'} has ended.{' '}
            <Link to="/pricing" className="text-amber-400 font-semibold hover:underline">
              Renew now
            </Link>{' '}
            to keep enjoying premium features.
          </p>
        </div>
        <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
