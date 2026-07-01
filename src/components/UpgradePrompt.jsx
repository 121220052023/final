import { Crown, Sparkles, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function UpgradePrompt({ feature = 'this feature', requiredPlan = 'Pro', compact = false }) {
  if (compact) {
    return (
      <Link
        to="/pricing"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
      >
        <Lock className="w-3 h-3" />
        Upgrade to {requiredPlan}
      </Link>
    );
  }

  return (
    <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-amber-500/10 border border-amber-500/20 rounded-2xl p-8 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
        <Crown className="w-8 h-8 text-white" />
      </div>
      <h3 className="text-xl font-bold text-foreground mb-2">Premium Feature</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        {feature} is available on the {requiredPlan} plan and above. Upgrade to unlock unlimited access.
      </p>
      <Link
        to="/pricing"
        className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-xl font-bold hover:from-amber-400 hover:to-orange-400 transition-all"
      >
        <Sparkles className="w-4 h-4" />
        See Plans
      </Link>
    </div>
  );
}
