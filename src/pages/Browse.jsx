import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { tmdbApi } from '../services/tmdb';
import { Film, Star, Calendar, Sparkles, Heart, PlusCircle, MinusCircle } from 'lucide-react';
import { useWatchlist } from '../context/WatchlistContext';
import { useLikedMovies } from '../context/LikedMoviesContext';

const Browse = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('popular');
  const navigate = useNavigate();
  const { watchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const { likedMovies, addToLikedMovies, removeFromLikedMovies } = useLikedMovies();

  const categories = [
    { id: 'popular', label: 'Popular', icon: '🔥' },
    { id: 'top_rated', label: 'Top Rated', icon: '⭐' },
    { id: 'upcoming', label: 'Upcoming', icon: '📅' },
    { id: 'now_playing', label: 'Now Playing', icon: '🎬' },
  ];

  useEffect(() => {
    fetchMovies(category);
  }, [category]);

  const fetchMovies = async (type) => {
    setLoading(true);
    try {
      let data;
      switch (type) {
        case 'popular':
          data = await tmdbApi.getPopularMovies();
          break;
        case 'top_rated':
          data = await tmdbApi.getTopRatedMovies();
          break;
        case 'upcoming':
          data = await tmdbApi.getUpcomingMovies();
          break;
        case 'now_playing':
          data = await tmdbApi.getNowPlayingMovies();
          break;
        default:
          data = await tmdbApi.getPopularMovies();
      }
      setMovies(data.results || []);
    } catch (error) {
      console.error('Error fetching movies:', error);
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

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <h1 className="text-5xl font-bold gradient-header bg-clip-text text-transparent mb-3">
          Browse Movies
        </h1>
        <p className="text-muted-foreground text-lg">Discover your next favorite film</p>
      </motion.div>

      {/* Category Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex flex-wrap justify-center gap-4 mb-12"
      >
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`px-6 py-3 rounded-full font-semibold transition-all duration-300 flex items-center gap-2 ${
              category === cat.id
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg scale-105'
                : 'bg-card text-foreground hover:bg-accent border border-border'
            }`}
          >
            <span className="text-xl">{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
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
          {movies.map((movie, index) => (
            <motion.div
              key={movie.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="movie-card group"
              onClick={() => navigate(`/movie/${movie.id}`)}
            >
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
                      <span>{movie.vote_average?.toFixed(1)}</span>
                    </div>
                    {movie.release_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{movie.release_date.split('-')[0]}</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => handleWatchlistToggle(e, movie)}
                    className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
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

      {movies.length === 0 && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <Film className="w-24 h-24 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-xl">No movies found</p>
        </motion.div>
      )}
    </div>
  );
};

export default Browse;
