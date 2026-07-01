import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Film, MessageSquare, Heart, Bookmark, Star, BarChart3, TrendingUp, Clock,
  Quote, Play, ChevronRight, Sparkles, Calendar, ArrowUpRight, Eye, List,
  Grid3X3, Activity
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useWatchlist } from '../context/WatchlistContext';
import { useLikedMovies } from '../context/LikedMoviesContext';
import { useSubscription } from '../context/SubscriptionContext';
import { useTranslation } from '../context/LanguageContext';
import { reviewService } from '../services/reviewService';
import { DashboardSkeleton } from '../components/Skeletons';

const providerLabels = {
  email: { label: 'Email & Password', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  google: { label: 'Google', color: 'text-[#4285F4]', bg: 'bg-[#4285F4]/10' },
  facebook: { label: 'Facebook', color: 'text-[#1877F2]', bg: 'bg-[#1877F2]/10' },
  github: { label: 'GitHub', color: 'text-foreground', bg: 'bg-muted' },
};

const Dashboard = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const { watchlist } = useWatchlist();
  const { likedMovies } = useLikedMovies();
  const { plan } = useSubscription();
  const { t } = useTranslation();

  const { data: userReviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ['userReviews', user?.id],
    queryFn: () => reviewService.getUserReviews(user.id, 1, 100),
    enabled: !!user,
  });

  const userReviews = userReviewsData?.reviews || [];

  const metrics = useMemo(() => {
    const ratingCount = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };
    userReviews.forEach(r => {
      const val = Math.round(r.rating);
      if (val >= 1 && val <= 10) ratingCount[val]++;
    });

    const ratingData = Object.entries(ratingCount)
      .map(([name, value]) => ({ name: `${name}`, value, index: parseInt(name) - 1 }))
      .filter(d => d.value > 0);

    const totalRating = userReviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = userReviews.length > 0 ? (totalRating / userReviews.length).toFixed(1) : '—';

    const monthlyData = [
      { month: 'Jan', count: 0 }, { month: 'Feb', count: 0 }, { month: 'Mar', count: 0 },
      { month: 'Apr', count: 0 }, { month: 'May', count: 0 }, { month: 'Jun', count: 0 }
    ];
    userReviews.forEach(r => {
      const date = new Date(r.created_at);
      const monthIndex = date.getMonth();
      if (monthIndex < 6) monthlyData[monthIndex].count++;
    });

    return { stats: { totalReviews: userReviews.length, avgRating, totalLikes: likedMovies.length, totalWatchlist: watchlist.length }, ratingData, monthlyData };
  }, [userReviews, likedMovies, watchlist]);

  const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6'];

  if (authLoading || reviewsLoading) return <DashboardSkeleton />;

  const provider = user?.app_metadata?.provider || 'email';
  const pInfo = providerLabels[provider] || providerLabels.email;

  const quickLinks = useMemo(() => [
    { label: t('dashboard.browseMovies', 'Browse Movies'), to: '/browse', icon: Film, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: t('nav.watchlist', 'Watchlist'), to: '/watchlist', icon: Bookmark, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: t('nav.trending', 'Trending'), to: '/trending', icon: TrendingUp, color: 'text-red-500', bg: 'bg-red-500/10' },
    { label: t('nav.pricing', 'Pricing'), to: '/pricing', icon: Sparkles, color: 'text-purple-500', bg: 'bg-purple-500/10', highlight: plan === 'free' },
  ], [t, plan]);

  return (
    <div className="min-h-screen bg-background pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-7xl">

        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/5 via-primary/10 to-secondary/5 border border-primary/10 p-8 mb-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${pInfo.bg} ${pInfo.color}`}>
                  {pInfo.label}
                </span>
                {plan !== 'free' && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                    <Star className="w-3 h-3 fill-current" />
                    {plan === 'pro' ? 'Pro' : 'Ultimate'}
                  </span>
                )}
              </div>
              <h1 className="text-3xl lg:text-4xl font-black text-foreground tracking-tight">
                {t('dashboard.welcome', 'Welcome back')}, {profile?.full_name || profile?.username || user?.email?.split('@')[0]}
              </h1>
              <p className="text-muted-foreground mt-2 text-lg">{t('dashboard.subtitle', 'Your discovery journey at a glance.')}</p>
            </div>
            <div className="flex gap-3">
              {quickLinks.map(l => (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                    l.highlight
                      ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                      : 'bg-card text-foreground border-border hover:border-primary/50 hover:text-primary'
                  }`}
                >
                  <l.icon className="w-4 h-4" />
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[
            { label: t('dashboard.reviewsWritten', 'Reviews'), value: metrics.stats.totalReviews, icon: MessageSquare, color: 'text-purple-500' },
            { label: t('dashboard.inWatchlist', 'Watchlist'), value: metrics.stats.totalWatchlist, icon: Bookmark, color: 'text-emerald-500' },
            { label: t('dashboard.moviesLiked', 'Favorites'), value: metrics.stats.totalLikes, icon: Heart, color: 'text-pink-500' },
            { label: t('dashboard.avgRating', 'Rating'), value: metrics.stats.avgRating, icon: Star, color: 'text-amber-500' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="group bg-card border border-border/40 shadow-sm rounded-2xl p-5 hover:border-primary/30 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2.5 rounded-xl bg-muted group-hover:bg-primary/10 transition-colors`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <ArrowUpRight className={`w-4 h-4 text-muted-foreground/30 group-hover:text-${stat.color.split('-')[1]}-500 transition-all`} />
              </div>
              <div className="text-2xl font-black text-foreground">{stat.value}</div>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
          <div className="lg:col-span-2 bg-card border border-border/40 shadow-sm rounded-2xl p-6 lg:p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                {t('dashboard.reviewActivity', 'Review Activity')}
              </h3>
              {userReviews.length > 0 && (
                <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                  {userReviews.length} {t('common.total', 'total')}
                </span>
              )}
            </div>
            {userReviews.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={metrics.monthlyData}>
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip cursor={{ fill: 'hsl(var(--muted) / 0.4)' }} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[260px] text-muted-foreground">
                <Activity className="w-10 h-10 mb-3 opacity-20" />
                <p className="text-sm font-medium">{t('dashboard.noActivity', 'No activity yet')}</p>
                <p className="text-xs mt-1">{t('dashboard.startRating', 'Start rating movies to see your stats')}</p>
              </div>
            )}
          </div>

          <div className="bg-card border border-border/40 shadow-sm rounded-2xl p-6 lg:p-8">
            <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              {t('dashboard.ratingDistribution', 'Rating Distribution')}
            </h3>
            {metrics.ratingData.length > 0 ? (
              <div className="space-y-3">
                {metrics.ratingData.slice().reverse().map(item => (
                  <div key={item.name} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground w-5 text-right">{item.name}</span>
                    <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(item.value / Math.max(...metrics.ratingData.map(d => d.value))) * 100}%`,
                          backgroundColor: COLORS[item.index]
                        }}
                      />
                    </div>
                    <span className="text-xs font-bold text-foreground w-5">{item.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[260px] text-muted-foreground">
                <Star className="w-10 h-10 mb-3 opacity-20" />
                <p className="text-sm font-medium">{t('dashboard.noRatings', 'No ratings yet')}</p>
              </div>
            )}
          </div>
        </div>

        {userReviews.length > 0 && (
          <div className="bg-card border border-border/40 shadow-sm rounded-2xl p-6 lg:p-8 mb-10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                {t('dashboard.yourRecentReviews', 'Recent Reviews')}
              </h3>
              <Link to="/profile" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                {t('dashboard.viewAll', 'View all')} <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-border/60">
              {userReviews.slice(0, 4).map((review) => (
                <div key={review.id} className="py-5 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <Link to={`/movie/${review.movie_id}`} className="text-base font-bold text-foreground hover:text-primary transition-colors line-clamp-1">
                        {review.title || `Movie #${review.movie_id}`}
                      </Link>
                      <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                        {review.content}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-muted-foreground/60 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 bg-amber-500/10 text-amber-500 px-2.5 py-1.5 rounded-lg text-sm font-bold shrink-0">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      {review.rating}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-card border border-border/40 shadow-sm rounded-2xl p-6 lg:p-8">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-emerald-500" />
                {t('dashboard.yourWatchlist', 'Watchlist')}
              </h3>
              {watchlist.length > 0 && (
                <Link to="/watchlist" className="text-xs font-bold text-primary hover:underline">{t('dashboard.seeAll', 'See all')}</Link>
              )}
            </div>
            {watchlist.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {watchlist.slice(0, 6).map((movie) => (
                  <Link key={movie.imdbID} to={`/movie/${movie.imdbID}`} className="group relative overflow-hidden rounded-xl aspect-[2/3] bg-muted">
                    <img
                      src={movie.Poster !== 'N/A' ? movie.Poster : 'https://via.placeholder.com/200x300'}
                      alt={movie.Title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-3">
                      <p className="text-xs font-bold text-white truncate">{movie.Title}</p>
                      <p className="text-[10px] text-white/70">{movie.Year}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <Bookmark className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-sm font-medium">{t('dashboard.emptyWatchlist', 'Your watchlist is empty')}</p>
                <Link to="/browse" className="text-xs text-primary mt-2 font-bold hover:underline">{t('dashboard.browseMovies', 'Browse movies')}</Link>
              </div>
            )}
          </div>

          <div className="bg-card border border-border/40 shadow-sm rounded-2xl p-6 lg:p-8">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-500" />
                {t('dashboard.yourFavorites', 'Favorites')}
              </h3>
              {likedMovies.length > 0 && (
                <Link to="/liked-movies" className="text-xs font-bold text-primary hover:underline">{t('dashboard.seeAll', 'See all')}</Link>
              )}
            </div>
            {likedMovies.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {likedMovies.slice(0, 6).map((movie) => (
                  <Link key={movie.imdbID} to={`/movie/${movie.imdbID}`} className="group relative overflow-hidden rounded-xl aspect-[2/3] bg-muted">
                    <img
                      src={movie.Poster !== 'N/A' ? movie.Poster : 'https://via.placeholder.com/200x300'}
                      alt={movie.Title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-3">
                      <p className="text-xs font-bold text-white truncate">{movie.Title}</p>
                      <p className="text-[10px] text-white/70">{movie.Year}</p>
                    </div>
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-pink-500/80 flex items-center justify-center">
                      <Heart className="w-3 h-3 text-white fill-white" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <Heart className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-sm font-medium">{t('dashboard.emptyFavorites', 'No favorites yet')}</p>
                <Link to="/browse" className="text-xs text-primary mt-2 font-bold hover:underline">{t('dashboard.discoverMovies', 'Discover movies')}</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
