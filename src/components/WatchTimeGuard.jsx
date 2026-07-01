import { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { useSubscription } from '../context/SubscriptionContext';
import { watchTimeService } from '../services/watchTimeService';
import UpgradePrompt from './UpgradePrompt';

export default function WatchTimeGuard({ children, movieId, movieTitle, onPlay }) {
  const { isProOrAbove, loading: subLoading } = useSubscription();
  const [remaining, setRemaining] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    if (subLoading) return;
    if (isProOrAbove) {
      setLoading(false);
      return;
    }
    watchTimeService.getRemainingTime().then(data => {
      setRemaining(data.remainingMinutes);
      if (data.limited && data.remainingMinutes <= 0) {
        setShowUpgrade(true);
      }
      setLoading(false);
    });
  }, [isProOrAbove, subLoading]);

  const handlePlay = async () => {
    if (isProOrAbove) {
      onPlay?.();
      return;
    }

    const data = await watchTimeService.getRemainingTime();
    if (data.limited && data.remainingMinutes <= 0) {
      setShowUpgrade(true);
      return;
    }

    setRemaining(data.remainingMinutes);
    onPlay?.();

    // Log 1 minute for each play (simplified - in production track actual duration)
    watchTimeService.logWatchTime({ durationMinutes: 1, movieId, movieTitle });
  };

  if (loading) return null;

  if (showUpgrade) {
    return (
      <div className="space-y-4">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-foreground">Daily watch limit reached</p>
            <p className="text-sm text-muted-foreground mt-1">
              Upgrade to Pro for unlimited watching.
            </p>
          </div>
        </div>
        <UpgradePrompt feature="Unlimited watching" />
      </div>
    );
  }

  return (
    <div>
      {!isProOrAbove && remaining !== null && (
        <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg">
          <Clock className="w-3.5 h-3.5" />
          Free watch time remaining: <span className="font-semibold text-foreground">{Math.floor(remaining)} min</span>
        </div>
      )}
      <div onClick={handlePlay}>
        {children}
      </div>
    </div>
  );
}
