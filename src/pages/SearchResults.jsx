import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { tmdbApi } from '../services/tmdb';
import { Search, Star, Calendar, Film, Heart, PlusCircle, MinusCircle, Sparkles } from 'lucide-react';
import { useWatchlist } from '../context/WatchlistContext';
import { useLikedMovies } from '../context/LikedMoviesContext';

const SearchResults = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [totalResults, setTotalResults] = useState(0);
  const navigate = useNavigate();
  const { watchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const { likedMovies, addToLikedMovies, removeFromLikedMovies } = useLikedMovies();

  useEffect(() => {
    const query = searchParams.get('q');
    if (query) {
      setSearchQuery(query);
      performSearch(query);
    }
  }, [searchParams]);

  const performSearch = async (query) => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const data = await tmdbApi.searchMovies(query);
      setMovies(data.results || []);
      setTotalResults(data.total_results || 0);
    } catch (error) {
      console.error('Error searching movies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchParams({ q: searchQuery });
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
          Search Movies
        </h1>
        <p className="text-muted-foreground text-lg">Find your perfect film</p>
      </motion.div>

      {/* Search Bar */}
      <motion.form
        onSubmit={handleSearch}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="max-w-3xl mx-auto mb-12"
      >
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search for movies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-14 pr-32 py-4 rounded-full bg-card border-2 border-border text-foreground placeholder-muted-foreground focus:border-purple-600 focus:outline-none transition-all duration-300 text-lg"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 btn-primary px-6 py-2"
          >
            Search
          </button>
        </div>
      </motion.form>

      {/* Results Count */}
      {searchParams.get('q') && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center mb-8"
        >
          <p className="text-muted-foreground text-lg">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5 animate-spin" />
                Searching...
              </span>
            ) : (
              <>
                Found <span className="text-purple-600 font-bold">{totalResults}</span> results for{' '}
                <span className="text-foreground font-semibold">"{searchParams.get('q')}"</span>
              </>
            )}
          </p>
        </motion.div>
      )}

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
      ) : movies.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {movies.map((movie, index) => (
            <motion.div
              key={movie.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="movie-card group"
              onClick={() => navigate(`/movie/${movie.id}`, { state: { type: movie.media_type || (movie.first_air_date ? 'tv' : 'movie') } })}
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
      ) : searchParams.get('q') && !loading ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <Film className="w-24 h-24 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-foreground mb-2">No results found</h2>
          <p className="text-muted-foreground text-lg">
            Try searching with different keywords
          </p>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <Search className="w-24 h-24 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-foreground mb-2">Start Searching</h2>
          <p className="text-muted-foreground text-lg">
            Enter a movie title to find amazing films
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default SearchResults;
