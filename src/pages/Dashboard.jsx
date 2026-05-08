import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Film, Clock, Heart, Bookmark, TrendingUp, Calendar, Star, BarChart3 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useWatchlist } from '../context/WatchlistContext'
import { useLikedMovies } from '../context/LikedMoviesContext'
import { watchHistoryService } from '../services/supabaseService'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const Dashboard = () => {
  const { user, profile, session, loading: authLoading } = useAuth()
  const { watchlist } = useWatchlist()
  const { likedMovies } = useLikedMovies()
  const [watchHistory, setWatchHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalWatched: 0,
    totalSeconds: 0,
    avgRating: 0,
    favoriteGenre: 'N/A',
  })
  const [genreData, setGenreData] = useState([])
  const [weeklyData, setWeeklyData] = useState([])

  useEffect(() => {
    if (authLoading) return

    const loadDashboard = async () => {
      if (!user || !session) {
        setLoading(false)
        return
      }
      try {
        const history = await watchHistoryService.get(user.id, session.access_token, 50)
        setWatchHistory(history)

        const totalSeconds = history.reduce((sum, h) => {
          return sum + (h.last_position || 0)
        }, 0)

        const genreCount = {}
        history.forEach(h => {
          if (h.genre) {
            h.genre.split(', ').forEach(g => {
              genreCount[g] = (genreCount[g] || 0) + 1
            })
          }
        })

        // For entries without genre, fetch from TMDB in background (don't block UI)
        const missingGenre = history.filter(h => !h.genre)
        if (missingGenre.length > 0) {
          Promise.allSettled(
            missingGenre.slice(0, 10).map(async (h) => {
              try {
                const resp = await fetch(`https://api.themoviedb.org/3/movie/${h.movie_id}?api_key=${import.meta.env.VITE_TMDB_API_KEY}`)
                if (resp.ok) {
                  const data = await resp.json()
                  return { movieId: h.movie_id, genres: data.genres?.map(g => g.name).join(', ') || null }
                }
              } catch { return null }
            })
          ).then(results => {
            results.forEach(r => {
              if (r.status === 'fulfilled' && r.value?.genres) {
                r.value.genres.split(', ').forEach(g => {
                  genreCount[g] = (genreCount[g] || 0) + 1
                })
              }
            })
            const genreArray = Object.entries(genreCount)
              .map(([name, value]) => ({ name, value }))
              .sort((a, b) => b.value - a.value)
              .slice(0, 5)
            setGenreData(genreArray)
          })
        }

        const genreArray = Object.entries(genreCount)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5)
        setGenreData(genreArray.length > 0 ? genreArray : [])

        const favoriteGenre = genreArray.length > 0 ? genreArray[0].name : 'N/A'

        // Build weekly data from actual history
        const dayCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
        const now = new Date()
        const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        history.forEach(h => {
          if (h.watched_at) {
            const date = new Date(h.watched_at)
            dayCounts[date.getDay()] = (dayCounts[date.getDay()] || 0) + 1
          }
        })
        const weekArray = dayLabels.map((day, i) => ({ day, movies: dayCounts[i] || 0 }))
        setWeeklyData(weekArray)

        setStats({
          totalWatched: history.length,
          totalSeconds: totalSeconds,
          avgRating: 0,
          favoriteGenre,
        })
      } catch (error) {
        // Silently handle error
      } finally {
        setLoading(false)
      }
    }
    loadDashboard()
  }, [user, authLoading, session])


  const formatWatchTime = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600)
    const mins = Math.floor((totalSeconds % 3600) / 60)
    const secs = Math.floor(totalSeconds % 60)
    if (hrs > 0) return `${hrs}h ${mins}m`
    if (mins > 0) return `${mins}m ${secs}s`
    return `${secs}s`
  }

  const COLORS = ['#8b5cf6', '#06b6d4', '#ec4899', '#f59e0b', '#10b981']

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 -500 -transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-foreground">
            Welcome back, {profile?.username || user?.email?.split('@')[0]}!
          </h1>
          <p className="text-muted-foreground mt-1">Your personal movie dashboard</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500/10 rounded-xl">
                <Film className="w-6 h-6 text-purple-500" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-foreground">{stats.totalWatched}</h3>
            <p className="text-muted-foreground text-sm">Movies Watched</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <Clock className="w-6 h-6 text-blue-500" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-foreground">{formatWatchTime(stats.totalSeconds)}</h3>
            <p className="text-muted-foreground text-sm">Total Watch Time</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-pink-500/10 rounded-xl">
                <Heart className="w-6 h-6 text-pink-500" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-foreground">{likedMovies.length}</h3>
            <p className="text-muted-foreground text-sm">Liked Movies</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-amber-500/10 rounded-xl">
                <Bookmark className="w-6 h-6 text-amber-500" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-foreground">{watchlist.length}</h3>
            <p className="text-muted-foreground text-sm">In Watchlist</p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-card rounded-2xl p-6">
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-500" />
              Weekly Activity
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={weeklyData}>
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />                <Bar dataKey="movies" fill="hsl(270, 70%, 60%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card rounded-2xl p-6">
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Genre Distribution
            </h3>
            {genreData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={genreData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {genreData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-3 mt-2">
                  {genreData.map((genre, i) => (
                    <div key={genre.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                      {genre.name}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                Watch some movies to see your genre distribution!
              </div>
            )}
          </div>
        </div>

        {watchHistory.length > 0 && (
          <div className="bg-card rounded-2xl p-6 mb-8">
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Continue Watching
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {watchHistory.slice(0, 6).map((item) => {
                // Extract base movie ID for TV episodes
                const baseMovieId = item.movie_type === 'tv' && item.movie_id?.includes('-S')
                  ? item.movie_id.split('-S')[0]
                  : item.movie_id
                return (
                <Link key={item.id} to={`/movie/${baseMovieId}`} className="group">
                  <div className="relative rounded-xl overflow-hidden mb-2">
                    <img
                      src={item.poster_url || 'https://via.placeholder.com/200x300'}
                      alt={item.title}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-card">
                      <div
                        className="h-full bg-purple-500"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{Math.round(item.progress)}% watched • {formatWatchTime(item.last_position)}</p>
                </Link>
                )
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card rounded-2xl p-6">
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-amber-500" />
              Your Watchlist
            </h3>
            {watchlist.length > 0 ? (
              <div className="space-y-3">
                {watchlist.slice(0, 5).map((movie) => (
                  <Link key={movie.imdbID} to={`/movie/${movie.imdbID}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <img src={movie.Poster !== 'N/A' ? movie.Poster : 'https://via.placeholder.com/40x60'} alt={movie.Title} className="w-10 h-14 object-cover rounded" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{movie.Title}</p>
                      <p className="text-xs text-muted-foreground">{movie.Year}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">Your watchlist is empty</p>
            )}
          </div>

          <div className="bg-card rounded-2xl p-6">
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-500" />
              Your Favorites
            </h3>
            {likedMovies.length > 0 ? (
              <div className="space-y-3">
                {likedMovies.slice(0, 5).map((movie) => (
                  <Link key={movie.imdbID} to={`/movie/${movie.imdbID}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <img src={movie.Poster !== 'N/A' ? movie.Poster : 'https://via.placeholder.com/40x60'} alt={movie.Title} className="w-10 h-14 object-cover rounded" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{movie.Title}</p>
                      <p className="text-xs text-muted-foreground">{movie.Year}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">No favorites yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
