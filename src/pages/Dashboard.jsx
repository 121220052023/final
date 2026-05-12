import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Film, Clock, Heart, Bookmark, TrendingUp, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useWatchlist } from '../context/WatchlistContext';
import { useLikedMovies } from '../context/LikedMoviesContext';
import { watchHistoryService } from '../services/supabaseService';

const Dashboard = () => {
  const { user, profile, session, loading: authLoading } = useAuth();
  const { watchlist } = useWatchlist();
  const { likedMovies } = useLikedMovies();

  // 1. Fetch Watch History
  const { data: watchHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ['watchHistory', user?.id, 50],
    queryFn: () => watchHistoryService.get(user.id, session.access_token, 50),
    enabled: !!user && !!session,
  });

  // 2. Compute Dashboard Metrics
  const metrics = useMemo(() => {
    if (!watchHistory.length) {
      return {
        stats: { totalWatched: 0, totalSeconds: 0, favoriteGenre: 'N/A' },
        genreData: [],
        weeklyData: [
          { day: 'Sun', movies: 0 }, { day: 'Mon', movies: 0 }, { day: 'Tue', movies: 0 },
          { day: 'Wed', movies: 0 }, { day: 'Thu', movies: 0 }, { day: 'Fri', movies: 0 }, { day: 'Sat', movies: 0 }
        ]
      };
    }

    // Calculate Total Seconds
    const totalSeconds = watchHistory.reduce((sum, h) => sum + (h.last_position || 0), 0);

    // Calculate Genre Distribution
    const genreCount = {};
    watchHistory.forEach(h => {
      if (h.genre) {
        h.genre.split(', ').forEach(g => {
          genreCount[g] = (genreCount[g] || 0) + 1;
        });
      }
    });

    const genreData = Object.entries(genreCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Calculate Weekly Activity
    const dayCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    watchHistory.forEach(h => {
      if (h.watched_at) {
        const date = new Date(h.watched_at);
        dayCounts[date.getDay()] = (dayCounts[date.getDay()] || 0) + 1;
      }
    });
    const weeklyData = dayLabels.map((day, i) => ({ day, movies: dayCounts[i] || 0 }));

    return {
      stats: {
        totalWatched: watchHistory.length,
        totalSeconds,
        favoriteGenre: genreData[0]?.name || 'N/A'
      },
      genreData,
      weeklyData
    };
  }, [watchHistory]);

  const formatWatchTime = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = Math.floor(totalSeconds % 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const COLORS = ['#8b5cf6', '#06b6d4', '#ec4899', '#f59e0b', '#10b981'];

  if (authLoading || historyLoading) {
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
          <p className="text-muted-foreground mt-2 text-lg">Your cinematic journey at a glance.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {[
            { label: 'Movies Watched', value: metrics.stats.totalWatched, icon: Film, color: 'text-purple-500', bg: 'bg-purple-500/10' },
            { label: 'Total Watch Time', value: formatWatchTime(metrics.stats.totalSeconds), icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { label: 'Liked Movies', value: likedMovies.length, icon: Heart, color: 'text-pink-500', bg: 'bg-pink-500/10' },
            { label: 'In Watchlist', value: watchlist.length, icon: Bookmark, color: 'text-amber-500', bg: 'bg-amber-500/10' },
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
              Weekly Activity
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={metrics.weeklyData}>
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted) / 0.4)' }}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                />
                <Bar dataKey="movies" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card border border-border/40 shadow-sm rounded-2xl p-8">
            <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-blue-500" />
              Genre Distribution
            </h3>
            {metrics.genreData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={metrics.genreData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={90}
                      paddingAngle={8}
                      dataKey="value"
                    >
                      {metrics.genreData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-4 mt-4">
                  {metrics.genreData.map((genre, i) => (
                    <div key={genre.name} className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: COLORS[i] }} />
                      {genre.name}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground">
                <Film className="w-12 h-12 mb-4 opacity-20" />
                <p>Watch some movies to see your stats!</p>
              </div>
            )}
          </div>
        </div>

        {watchHistory.length > 0 && (
          <div className="bg-card border border-border/40 shadow-sm rounded-2xl p-8 mb-10">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-3">
                <Clock className="w-6 h-6 text-primary" />
                Continue Watching
              </h3>
              <Link to="/history" className="text-sm font-bold text-primary hover:underline">View All History</Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {watchHistory.slice(0, 6).map((item) => {
                const baseMovieId = item.movie_type === 'tv' && item.movie_id?.includes('-S')
                  ? item.movie_id.split('-S')[0]
                  : item.movie_id;
                return (
                  <Link key={item.id} to={`/movie/${baseMovieId}`} className="group space-y-3">
                    <div className="relative aspect-[2/3] rounded-2xl overflow-hidden shadow-md group-hover:shadow-xl transition-all duration-300">
                      <img
                        src={item.poster_url || 'https://via.placeholder.com/200x300'}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/40">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">{item.title}</p>
                      <p className="text-xs text-muted-foreground font-medium">{Math.round(item.progress)}% watched</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-card border border-border/40 shadow-sm rounded-2xl p-8">
            <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-3">
              <Bookmark className="w-6 h-6 text-amber-500" />
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
