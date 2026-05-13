import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Film, MessageSquare, Heart, Bookmark, Star, BarChart3, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useWatchlist } from '../context/WatchlistContext';
import { useLikedMovies } from '../context/LikedMoviesContext';
import { reviewService } from '../services/reviewService';

const Dashboard = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const { watchlist } = useWatchlist();
  const { likedMovies } = useLikedMovies();

  // 1. Fetch User Reviews
  const { data: userReviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ['userReviews', user?.id],
    queryFn: () => reviewService.getUserReviews(user.id, 1, 100),
    enabled: !!user,
  });

  const userReviews = userReviewsData?.reviews || [];

  // 2. Compute Dashboard Metrics
  const metrics = useMemo(() => {
    // Rating Distribution (1-10 scale for consistency with MovieDetails)
    const ratingCount = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };
    userReviews.forEach(r => {
      const val = Math.round(r.rating);
      if (val >= 1 && val <= 10) ratingCount[val]++;
    });

    const ratingData = Object.entries(ratingCount)
      .map(([name, value]) => ({ 
        name: `${name} Stars`, 
        value,
        index: parseInt(name) - 1
      }))
      .filter(d => d.value > 0);

    // Average Rating
    const totalRating = userReviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = userReviews.length > 0 ? (totalRating / userReviews.length).toFixed(1) : 0;

    // Monthly Review Activity (Simplified)
    const monthlyData = [
      { month: 'Jan', count: 0 }, { month: 'Feb', count: 0 }, { month: 'Mar', count: 0 },
      { month: 'Apr', count: 0 }, { month: 'May', count: 0 }, { month: 'Jun', count: 0 }
    ];
    
    userReviews.forEach(r => {
      const date = new Date(r.created_at);
      const monthIndex = date.getMonth();
      if (monthIndex < 6) monthlyData[monthIndex].count++;
    });

    return {
      stats: {
        totalReviews: userReviews.length,
        avgRating,
        totalLikes: likedMovies.length,
        totalWatchlist: watchlist.length
      },
      ratingData,
      monthlyData
    };
  }, [userReviews, likedMovies, watchlist]);

  const COLORS = [
    '#ef4444', // 1
    '#f97316', // 2
    '#f59e0b', // 3
    '#eab308', // 4
    '#84cc16', // 5
    '#22c55e', // 6
    '#10b981', // 7
    '#06b6d4', // 8
    '#3b82f6', // 9
    '#8b5cf6'  // 10
  ];

  if (authLoading || reviewsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-black text-foreground tracking-tight">
            Welcome back, {profile?.full_name || profile?.username || user?.email?.split('@')[0]}!
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">Your discovery journey at a glance.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {[
            { label: 'Reviews Written', value: metrics.stats.totalReviews, icon: MessageSquare, color: 'text-purple-500', bg: 'bg-purple-500/10' },
            { label: 'Avg. Rating Given', value: `${metrics.stats.avgRating} / 10`, icon: Star, color: 'text-amber-500', bg: 'bg-amber-500/10' },
            { label: 'Movies Liked', value: metrics.stats.totalLikes, icon: Heart, color: 'text-pink-500', bg: 'bg-pink-500/10' },
            { label: 'In Watchlist', value: metrics.stats.totalWatchlist, icon: Bookmark, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-card border border-border/40 shadow-sm rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 ${stat.bg} rounded-xl`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
              <h3 className="text-3xl font-black text-foreground">{stat.value}</h3>
              <p className="text-muted-foreground font-medium">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          <div className="bg-card border border-border/40 shadow-sm rounded-2xl p-8">
            <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-purple-500" />
              Review Activity
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={metrics.monthlyData}>
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted) / 0.4)' }}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card border border-border/40 shadow-sm rounded-2xl p-8">
            <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-3">
              <Star className="w-6 h-6 text-amber-500" />
              Rating Distribution
            </h3>
            {userReviews.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={metrics.ratingData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={90}
                      paddingAngle={8}
                      dataKey="value"
                    >
                      {metrics.ratingData.map((entry) => (
                        <Cell key={`cell-${entry.name}`} fill={COLORS[entry.index]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-4 mt-4">
                  {metrics.ratingData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: COLORS[item.index] }} />
                      {item.name}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground">
                <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
                <p>Write some reviews to see your stats!</p>
              </div>
            )}
          </div>
        </div>

        {userReviews.length > 0 && (
          <div className="bg-card border border-border/40 shadow-sm rounded-2xl p-8 mb-10">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-3">
                <MessageSquare className="w-6 h-6 text-primary" />
                Your Recent Reviews
              </h3>
            </div>
            <div className="space-y-6">
              {userReviews.slice(0, 3).map((review) => (
                <div key={review.id} className="border-b border-border/40 pb-6 last:border-0 last:pb-0">
                  <div className="flex justify-between items-start mb-2">
                    <Link to={`/movie/${review.movie_id}`} className="text-lg font-bold text-foreground hover:text-primary transition-colors">
                      {review.title || 'Review for ' + review.movie_id}
                    </Link>
                    <div className="flex items-center gap-1 bg-amber-500/10 text-amber-500 px-2 py-1 rounded-lg text-sm font-bold">
                      <Star className="w-4 h-4 fill-current" />
                      {review.rating}
                    </div>
                  </div>
                  <p className="text-muted-foreground line-clamp-2">{review.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(review.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-card border border-border/40 shadow-sm rounded-2xl p-8">
            <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-3">
              <Bookmark className="w-6 h-6 text-blue-500" />
              Your Watchlist
            </h3>
            {watchlist.length > 0 ? (
              <div className="space-y-4">
                {watchlist.slice(0, 5).map((movie) => (
                  <Link key={movie.imdbID} to={`/movie/${movie.imdbID}`} className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-all group">
                    <img src={movie.Poster !== 'N/A' ? movie.Poster : 'https://via.placeholder.com/40x60'} alt={movie.Title} className="w-12 h-16 object-cover rounded-lg shadow-sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">{movie.Title}</p>
                      <p className="text-xs text-muted-foreground font-medium">{movie.Year}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-10">Your watchlist is empty</p>
            )}
          </div>

          <div className="bg-card border border-border/40 shadow-sm rounded-2xl p-8">
            <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-3">
              <Heart className="w-6 h-6 text-pink-500" />
              Your Favorites
            </h3>
            {likedMovies.length > 0 ? (
              <div className="space-y-4">
                {likedMovies.slice(0, 5).map((movie) => (
                  <Link key={movie.imdbID} to={`/movie/${movie.imdbID}`} className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-all group">
                    <img src={movie.Poster !== 'N/A' ? movie.Poster : 'https://via.placeholder.com/40x60'} alt={movie.Title} className="w-12 h-16 object-cover rounded-lg shadow-sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">{movie.Title}</p>
                      <p className="text-xs text-muted-foreground font-medium">{movie.Year}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-10">No favorites yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
