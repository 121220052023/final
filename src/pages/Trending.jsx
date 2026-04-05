import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { tmdbApi } from '../services/tmdb';
import { TrendingUp, Star, Calendar, Film, Heart, PlusCircle, MinusCircle, Trophy } from 'lucide-react';
import { useWatchlist } from '../context/WatchlistContext';
import { useLikedMovies } from '../context/LikedMoviesContext';

const Trending = () => {
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeWindow, setTimeWindow] = useState('week');
  const navigate = useNavigate();
  const { watchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const { likedMovies, addToLikedMovies, removeFromLikedMovies } = useLikedMovies();

  useEffect(() => {
    fetchTrendingMovies(timeWindow);
  }, [timeWindow]);

  const fetchTrendingMovies = async (window) => {
    setLoading(true);
    try {
      const data = await tmdbApi.getTrendingMovies(window);
      setTrendingMovies(data.results || []);
    } catch (error) {
      console.error('Error fetching trending movies:', error);
    } finally {
      setLoading(false);
    }
  };

  const convertToMovieFormat = (tmdbMovie) => ({
    imdbID: tmdbMovie.id.toString(),
    Title: tmdbMovie.title,
    Year: tmdbMovie.release_date?.split('-')[0] || 'N/A',
    Poster: tmdbMovie.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}` : 'N/A',
    Plot: tmdbMovie.overview || 'No plot available',
  });

  const isInWatchlist = (movieId) => watchlist.some(m => m.imdbID === movieId.toString());
  const isLiked = (movieId) => likedMovies.some(m => m.imdbID === movieId.toString());

  const handleWatchlistToggle = (e, movie) => {
    e.stopPropagation();
    const formattedMovie = convertToMovieFormat(movie);
    if (isInWatchlist(movie.id)) {
      removeFromWatchlist(movie.id.toString());
    } else {
      addToWatchlist(formattedMovie);
    }
  };

  const handleLikeToggle = (e, movie) => {
    e.stopPropagation();
    const formattedMovie = convertToMovieFormat(movie);
    if (isLiked(movie.id)) {
      removeFromLikedMovies(movie.id.toString());
    } else {
      addToLikedMovies(formattedMovie);
    }
  };

  const getRankColor = (index) => {
    if (index === 0) return 'from-yellow-500 to-yellow-600';
    if (index === 1) return 'from-gray-400 to-gray-500';
    if (index === 2) return 'from-orange-600 to-orange-700';
    return 'from-purple-600 to-blue-600';
  };

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <div className="flex items-center justify-center gap-3 mb-3">
          <TrendingUp className="w-12 h-12 text-purple-600" />
          <h1 className="text-5xl font-bold gradient-header bg-clip-text text-transparent">
            Trending Movies
          </h1>
        </div>
        <p className="text-muted-foreground text-lg">What's hot right now</p>
      </motion.div>

      {/* Time Window Selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex justify-center gap-4 mb-12"
      >
        <button
          onClick={() => setTimeWindow('day')}
          className={`px-8 py-3 rounded-full font-semibold transition-all duration-300 ${timeWindow === 'day'
            ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg scale-105'
            : 'bg-card text-foreground hover:bg-accent border border-border'
            }`}
        >
          🔥 Today
        </button>
        <button
          onClick={() => setTimeWindow('week')}
          className={`px-8 py-3 rounded-full font-semibold transition-all duration-300 ${timeWindow === 'week'
            ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg scale-105'
            : 'bg-card text-foreground hover:bg-accent border border-border'
            }`}
        >
          📅 This Week
        </button>
      </motion.div>

      {/* Movies Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="shimmer rounded-lg h-96"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {trendingMovies.map((movie, index) => (
            <motion.div
              key={movie.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="movie-card group relative"
              onClick={() => navigate(`/movie/${movie.id}`, { state: { type: movie.media_type || 'movie' } })}
            >
              {/* Ranking Badge */}
              <div className={`absolute top-2 left-2 z-10 bg-gradient-to-r ${getRankColor(index)} text-white rounded-full w-12 h-12 flex items-center justify-center font-bold shadow-lg`}>
                {index < 3 ? (
                  <Trophy className="w-6 h-6" />
                ) : (
                  `#${index + 1}`
                )}
              </div>

              {/* Like Button */}
              <button
                onClick={(e) => handleLikeToggle(e, movie)}
                className="absolute top-2 right-2 z-10 bg-black bg-opacity-50 p-2 rounded-full hover:bg-opacity-70 transition-all"
              >
                <Heart
                  className={`w-5 h-5 ${isLiked(movie.id) ? 'text-red-500 fill-red-500' : 'text-white'}`}
                />
              </button>

              {/* Movie Poster */}
              <div className="relative h-96 overflow-hidden">
                <img
                  src={
                    movie.poster_path
                      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                      : 'https://via.placeholder.com/500x750?text=No+Image'
                  }
                  alt={movie.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />

                {/* Hover Overlay */}
                <motion.div
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                  className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent flex flex-col items-center justify-end p-4 gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                >
                  <div className="flex items-center gap-4 text-white text-sm mb-2">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">{movie.vote_average?.toFixed(1)}</span>
                    </div>
                    {movie.release_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{movie.release_date.split('-')[0]}</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/watch/${movie.id}`, { state: { type: movie.media_type || 'movie' } }); }}
                    className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
                  >
                    <PlayCircle className="w-4 h-4" />
                    Watch Now
                  </button>
                  <button
                    onClick={(e) => handleWatchlistToggle(e, movie)}
                    className="btn-secondary w-full flex items-center justify-center gap-2 text-sm mt-2"
                  >
                    {isInWatchlist(movie.id) ? (
                      <>
                        <MinusCircle className="w-4 h-4" />
                        Remove from Watchlist
                      </>
                    ) : (
                      <>
                        <PlusCircle className="w-4 h-4" />
                        Add to Watchlist
                      </>
                    )}
                  </button>
                </motion.div>
              </div>

              {/* Movie Info */}
              <div className="p-4">
                <h3 className="text-lg font-bold text-foreground truncate">{movie.title}</h3>
                <p className="text-muted-foreground text-sm line-clamp-2 mt-1">
                  {movie.overview || 'No description available'}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {trendingMovies.length === 0 && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <Film className="w-24 h-24 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-xl">No trending movies found</p>
        </motion.div>
      )}
    </div>
  );
};

export default Trending;
